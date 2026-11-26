import uuid
from datetime import datetime, timedelta
from typing import Optional, List
from pydantic import BaseModel, EmailStr, Field
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from sqlalchemy import desc

from backend.config.settings import settings
from backend.shared.database import get_db
from backend.shared.security import (
    hash_password, verify_password, validate_password_strength,
    create_access_token, create_refresh_token, decode_token,
    CurrentUser, get_current_user, require_roles, log_audit
)
from backend.database.models import User, RefreshToken, AuditLog, AccountLink

router = APIRouter(prefix="/auth", tags=["Identity & Access Adapter"])

class RegisterRequest(BaseModel):
    fullName: str = Field(..., min_length=2, max_length=128)
    email: EmailStr
    phone: Optional[str] = Field(None, max_length=32)
    organisation: str = Field(..., min_length=2, max_length=128)
    requestedRole: str = Field(..., example="field_operator") # field_operator, agronomist, researcher, farmer, administrator
    password: str
    confirmPassword: str

class LoginRequest(BaseModel):
    email: EmailStr
    password: str

class RefreshRequest(BaseModel):
    refreshToken: str

class PasswordResetRequest(BaseModel):
    email: EmailStr

class ConfirmPasswordResetRequest(BaseModel):
    token: str
    newPassword: str
    confirmPassword: str

@router.post("/register", status_code=status.HTTP_201_CREATED)
def register(payload: RegisterRequest, db: Session = Depends(get_db)):
    """
    NS-AUTH-01 & NS-REG-01: User registration.
    NS-AUTH-02: Min 12-char password with letters and numbers.
    NS-AUTH-04: Generic reply regardless of existing email to prevent account enumeration.
    """
    if payload.password != payload.confirmPassword:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Passwords do not match")

    if not validate_password_strength(payload.password):
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Password must have at least 12 characters and contain both letters and numbers."
        )

    allowed_roles = ["field_operator", "agronomist", "researcher", "farmer"]
    if payload.requestedRole.lower() not in allowed_roles:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"Invalid role. Must be one of: {allowed_roles}")

    existing = db.query(User).filter(User.email == payload.email.lower()).first()
    if existing:
        # Per NS-AUTH-04: Return same generic response so email existence is not leaked
        return {
            "message": "Registration received. If the email is valid, a verification link has been sent.",
            "status": "pending_verification"
        }

    user_id = f"usr_{uuid.uuid4().hex[:8]}"
    verify_token = f"vtok_{uuid.uuid4().hex}"
    
    # Farmers auto-approved (D-S1), Operator/Agronomist/Researcher require admin approval (NS-AUTH-05)
    needs_approval = payload.requestedRole.lower() in ("field_operator", "agronomist", "researcher")

    user = User(
        id=user_id,
        email=payload.email.lower(),
        full_name=payload.fullName,
        phone=payload.phone,
        organisation=payload.organisation,
        role=payload.requestedRole.lower(),
        password_hash=hash_password(payload.password),
        is_verified=False,
        is_approved=not needs_approval,
        verification_token=verify_token,
        created_at=datetime.utcnow()
    )
    db.add(user)
    db.commit()

    log_audit(db, user.id, user.role, "REGISTER", user.id, "SUCCESS", f"User registered as {user.role}")

    return {
        "message": "Registration received. If the email is valid, a verification link has been sent.",
        "status": "pending_verification",
        "verificationToken": verify_token # Exposed for seamless development / testing verification
    }

@router.get("/verify")
def verify_email(token: str = Query(...), db: Session = Depends(get_db)):
    """NS-AUTH-03: Verify email using token valid for 24 hours."""
    user = db.query(User).filter(User.verification_token == token).first()
    if not user:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid or expired verification token")

    # Invalidate token after one use
    user.is_verified = True
    user.verification_token = None
    db.commit()

    log_audit(db, user.id, user.role, "VERIFY_EMAIL", user.id, "SUCCESS", "Email verified")
    return {
        "message": "Email verified successfully.",
        "isApproved": user.is_approved,
        "role": user.role
    }

@router.post("/login")
def login(payload: LoginRequest, db: Session = Depends(get_db)):
    """
    NS-AUTH-06 & NS-AUTH-07:
    Login with email and password.
    Returns access pass (30 min) and refresh pass (7 days).
    Locks account for 15 minutes after 5 failed attempts in 15 minutes.
    """
    now = datetime.utcnow()
    user = db.query(User).filter(User.email == payload.email.lower()).first()

    # Generic message for non-existent user or wrong password (NS-AUTH-04)
    generic_err = "Email or password is wrong"

    if not user:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail=generic_err)

    # Check lock
    if user.locked_until and user.locked_until > now:
        mins_remaining = int((user.locked_until - now).total_seconds() / 60) + 1
        raise HTTPException(
            status_code=status.HTTP_423_LOCKED,
            detail=f"Account locked due to multiple failed logins. Try again in {mins_remaining} minutes."
        )

    # Verify password
    if not verify_password(payload.password, user.password_hash):
        user.failed_login_attempts += 1
        if user.failed_login_attempts >= 5:
            user.locked_until = now + timedelta(minutes=15)
            user.failed_login_attempts = 0
            db.commit()
            log_audit(db, user.id, user.role, "LOGIN_LOCKOUT", user.id, "FAILURE", "5 failed attempts; locked for 15m")
            raise HTTPException(
                status_code=status.HTTP_423_LOCKED,
                detail="Account locked for 15 minutes due to 5 consecutive failed logins."
            )
        db.commit()
        log_audit(db, user.id, user.role, "LOGIN_FAILED", user.id, "FAILURE", "Wrong password")
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail=generic_err)

    # Check email verification
    if not user.is_verified:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Account email is pending verification. Please check your email for the verification link."
        )

    # Check admin approval
    if not user.is_approved:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Account registration is pending Administrator approval. Please contact your administrator."
        )

    # Reset failed attempts
    user.failed_login_attempts = 0
    user.locked_until = None

    # Fetch assigned field IDs
    links = db.query(AccountLink.field_id).filter(
        AccountLink.user_id == user.id,
        AccountLink.revoked_at.is_(None)
    ).all()
    assigned_field_ids = [l[0] for l in links]

    # Create tokens
    access_token = create_access_token({
        "sub": user.id,
        "email": user.email,
        "role": user.role,
        "name": user.full_name,
        "field_ids": assigned_field_ids
    })

    refresh_token_str = create_refresh_token(user.id)
    # Save refresh token in DB for tracking and rotation
    rt_entry = RefreshToken(
        token=refresh_token_str,
        user_id=user.id,
        expires_at=now + timedelta(days=settings.REFRESH_TOKEN_EXPIRE_DAYS),
        revoked=False
    )
    db.add(rt_entry)
    db.commit()

    log_audit(db, user.id, user.role, "LOGIN_SUCCESS", user.id, "SUCCESS")

    return {
        "accessToken": access_token,
        "refreshToken": refresh_token_str,
        "tokenType": "bearer",
        "expiresInMinutes": settings.ACCESS_TOKEN_EXPIRE_MINUTES,
        "user": {
            "id": user.id,
            "email": user.email,
            "fullName": user.full_name,
            "role": user.role,
            "organisation": user.organisation,
            "assignedFields": assigned_field_ids
        }
    }

@router.post("/refresh")
def refresh_token(payload: RefreshRequest, db: Session = Depends(get_db)):
    """
    NS-AUTH-06: Exchange refresh pass for new access pass and rotated refresh pass.
    If an already-revoked refresh token is reused, revoke all active sessions for that user!
    """
    token_entry = db.query(RefreshToken).filter(RefreshToken.token == payload.refreshToken).first()
    if not token_entry:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid refresh token")

    if token_entry.revoked:
        # Potential replay attack: revoke all tokens for this user
        db.query(RefreshToken).filter(RefreshToken.user_id == token_entry.user_id).update({"revoked": True})
        db.commit()
        log_audit(db, token_entry.user_id, "unknown", "REVOKE_ALL_SESSIONS", token_entry.user_id, "FAILURE", "Reused revoked refresh token")
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Revoked token reuse detected. All sessions cancelled.")

    if token_entry.expires_at < datetime.utcnow():
        token_entry.revoked = True
        db.commit()
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Refresh token expired. Please log in again.")

    # Mark current refresh token as used/revoked (rotation)
    token_entry.revoked = True

    user = db.query(User).filter(User.id == token_entry.user_id).first()
    if not user or not user.is_approved:
        db.commit()
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User account is inactive or not approved")

    # Issue new pair
    links = db.query(AccountLink.field_id).filter(
        AccountLink.user_id == user.id,
        AccountLink.revoked_at.is_(None)
    ).all()
    assigned_field_ids = [l[0] for l in links]

    new_access_token = create_access_token({
        "sub": user.id,
        "email": user.email,
        "role": user.role,
        "name": user.full_name,
        "field_ids": assigned_field_ids
    })
    new_refresh_token_str = create_refresh_token(user.id)

    new_rt_entry = RefreshToken(
        token=new_refresh_token_str,
        user_id=user.id,
        expires_at=datetime.utcnow() + timedelta(days=settings.REFRESH_TOKEN_EXPIRE_DAYS),
        revoked=False
    )
    db.add(new_rt_entry)
    db.commit()

    return {
        "accessToken": new_access_token,
        "refreshToken": new_refresh_token_str,
        "tokenType": "bearer"
    }

@router.post("/logout")
def logout(payload: RefreshRequest, current_user: CurrentUser = Depends(get_current_user), db: Session = Depends(get_db)):
    """NS-AUTH-08: Logout revokes refresh token at once."""
    token_entry = db.query(RefreshToken).filter(RefreshToken.token == payload.refreshToken).first()
    if token_entry:
        token_entry.revoked = True
        db.commit()
    log_audit(db, current_user.user_id, current_user.role, "LOGOUT", current_user.user_id, "SUCCESS")
    return {"message": "Logged out successfully"}

@router.post("/password-reset")
def request_password_reset(payload: PasswordResetRequest, db: Session = Depends(get_db)):
    """NS-AUTH-09: Emailed link valid for 30 minutes, works once."""
    user = db.query(User).filter(User.email == payload.email.lower()).first()
    reset_tok = None
    if user:
        reset_tok = f"rst_{uuid.uuid4().hex}"
        user.reset_token = reset_tok
        user.reset_token_expires = datetime.utcnow() + timedelta(minutes=30)
        db.commit()
        log_audit(db, user.id, user.role, "REQUEST_PASSWORD_RESET", user.id, "SUCCESS")

    # Generic response
    return {
        "message": "If the email is registered, a password reset link has been dispatched.",
        "resetToken": reset_tok # Provided for seamless dev mode testing
    }

@router.post("/confirm-reset")
def confirm_password_reset(payload: ConfirmPasswordResetRequest, db: Session = Depends(get_db)):
    if payload.newPassword != payload.confirmPassword:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Passwords do not match")

    if not validate_password_strength(payload.newPassword):
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Password must have at least 12 characters and contain both letters and numbers."
        )

    now = datetime.utcnow()
    user = db.query(User).filter(
        User.reset_token == payload.token,
        User.reset_token_expires > now
    ).first()

    if not user:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid or expired reset token")

    # Update password
    user.password_hash = hash_password(payload.newPassword)
    user.reset_token = None
    user.reset_token_expires = None

    # Cancel all existing refresh tokens for this user (NS-AUTH-09)
    db.query(RefreshToken).filter(RefreshToken.user_id == user.id).update({"revoked": True})
    db.commit()

    log_audit(db, user.id, user.role, "CONFIRM_PASSWORD_RESET", user.id, "SUCCESS", "All previous tokens cancelled")

    return {"message": "Password reset successfully. Please log in with your new password."}

@router.get("/me")
def get_current_user_profile(
    current_user: CurrentUser = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    user = db.query(User).filter(User.id == current_user.user_id).first()
    if not user:
        return {
            "id": current_user.user_id,
            "role": current_user.role,
            "email": current_user.email,
            "assignedFields": current_user.field_ids
        }
    return {
        "id": user.id,
        "email": user.email,
        "fullName": user.full_name,
        "role": user.role,
        "organisation": user.organisation,
        "isVerified": user.is_verified,
        "isApproved": user.is_approved,
        "assignedFields": current_user.field_ids
    }

# Administrator user approvals & audit management
@router.get("/admin/users")
def list_users_for_admin(
    status_filter: Optional[str] = Query(None, description="pending, approved, rejected"),
    current_user: CurrentUser = Depends(require_roles(["administrator"])),
    db: Session = Depends(get_db)
):
    query = db.query(User)
    if status_filter == "pending":
        query = query.filter(User.is_approved == False)
    elif status_filter == "approved":
        query = query.filter(User.is_approved == True)
    
    users = query.order_by(desc(User.created_at)).all()
    return [
        {
            "id": u.id,
            "email": u.email,
            "fullName": u.full_name,
            "role": u.role,
            "organisation": u.organisation,
            "isVerified": u.is_verified,
            "isApproved": u.is_approved,
            "createdAt": u.created_at.isoformat()
        }
        for u in users
    ]

@router.post("/admin/users/{id}/approve")
def approve_user_registration(
    id: str,
    current_user: CurrentUser = Depends(require_roles(["administrator"])),
    db: Session = Depends(get_db)
):
    user = db.query(User).filter(User.id == id).first()
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
    user.is_approved = True
    db.commit()
    log_audit(db, current_user.user_id, current_user.role, "APPROVE_USER", user.id, "SUCCESS", f"Approved user {user.email}")
    return {"message": f"User {user.email} approved successfully"}

@router.post("/admin/users/{id}/reject")
def reject_user_registration(
    id: str,
    current_user: CurrentUser = Depends(require_roles(["administrator"])),
    db: Session = Depends(get_db)
):
    user = db.query(User).filter(User.id == id).first()
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
    user.is_approved = False
    db.commit()
    log_audit(db, current_user.user_id, current_user.role, "REJECT_USER", user.id, "SUCCESS", f"Rejected user {user.email}")
    return {"message": f"User {user.email} registration rejected"}

@router.get("/admin/audit-logs")
def get_audit_logs(
    page: int = Query(1, ge=1),
    size: int = Query(50, ge=1, le=200),
    current_user: CurrentUser = Depends(require_roles(["administrator"])),
    db: Session = Depends(get_db)
):
    """
    NS-UR-11 & NS-BR-06:
    Administrator activity logs.
    Strictly free of soil measurement values!
    """
    offset = (page - 1) * size
    total = db.query(AuditLog).count()
    logs = db.query(AuditLog).order_by(desc(AuditLog.occurred_at)).offset(offset).limit(size).all()
    return {
        "total": total,
        "page": page,
        "size": size,
        "items": [
            {
                "id": l.id,
                "actorUserId": l.actor_user_id,
                "actorRole": l.actor_role,
                "action": l.action,
                "targetId": l.target_id,
                "outcome": l.outcome,
                "details": l.details,
                "occurredAt": l.occurred_at.isoformat()
            }
            for l in logs
        ]
    }
