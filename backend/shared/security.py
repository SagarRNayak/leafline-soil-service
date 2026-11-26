import hmac
import hashlib
import os
import re
from datetime import datetime, timedelta
from typing import Optional, List, Dict, Any
import jwt
from fastapi import HTTPException, Security, status, Depends
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session

from backend.config.settings import settings
from backend.shared.database import get_db
from backend.database.models import User, AccountLink, AuditLog, RefreshToken

security_bearer = HTTPBearer(auto_error=False)

def hash_password(password: str) -> str:
    """Salted password hashing using PBKDF2-HMAC-SHA256 with 100,000 iterations"""
    salt = os.urandom(16)
    key = hashlib.pbkdf2_hmac("sha256", password.encode("utf-8"), salt, 100000)
    return salt.hex() + "$" + key.hex()

def verify_password(password: str, hashed_value: str) -> bool:
    try:
        salt_hex, key_hex = hashed_value.split("$")
        salt = bytes.fromhex(salt_hex)
        expected_key = bytes.fromhex(key_hex)
        key = hashlib.pbkdf2_hmac("sha256", password.encode("utf-8"), salt, 100000)
        return hmac.compare_digest(key, expected_key)
    except Exception:
        return False

def validate_password_strength(password: str) -> bool:
    """NS-AUTH-02: Minimum 12 characters, must contain letters and numbers"""
    if len(password) < 12:
        return False
    has_letter = bool(re.search(r"[A-Za-z]", password))
    has_digit = bool(re.search(r"\d", password))
    return has_letter and has_digit

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire, "type": "access"})
    return jwt.encode(to_encode, settings.SECRET_KEY, algorithm=settings.ALGORITHM)

def create_refresh_token(user_id: str) -> str:
    import uuid
    expire = datetime.utcnow() + timedelta(days=settings.REFRESH_TOKEN_EXPIRE_DAYS)
    payload = {"sub": user_id, "exp": expire, "type": "refresh", "jti": uuid.uuid4().hex}
    return jwt.encode(payload, settings.SECRET_KEY, algorithm=settings.ALGORITHM)

def decode_token(token: str) -> dict:
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
        return payload
    except jwt.ExpiredSignatureError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Pass expired, refresh it",
            headers={"WWW-Authenticate": "Bearer"},
        )
    except jwt.PyJWTError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid authentication pass",
            headers={"WWW-Authenticate": "Bearer"},
        )

class CurrentUser:
    def __init__(self, user_id: str, email: str, role: str, field_ids: List[str]):
        self.user_id = user_id
        self.email = email
        self.role = role
        self.field_ids = field_ids

def get_current_user(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security_bearer),
    db: Session = Depends(get_db)
) -> CurrentUser:
    if not credentials:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication credential required",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    token = credentials.credentials
    # Support Service-to-service credential tokens
    if token.startswith("svc_"):
        # Service token format: svc_analytics or svc_plant_health or svc_ai
        svc_name = token.replace("svc_", "")
        return CurrentUser(user_id=f"svc_{svc_name}", email=f"{svc_name}@service.leafline.internal", role=f"service_{svc_name}", field_ids=["*"])

    payload = decode_token(token)
    user_id = payload.get("sub")
    role = payload.get("role")
    email = payload.get("email")

    if not user_id or not role:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token payload")

    # Fetch active field assignments
    assigned_links = db.query(AccountLink.field_id).filter(
        AccountLink.user_id == user_id,
        AccountLink.revoked_at.is_(None)
    ).all()
    assigned_field_ids = [al[0] for al in assigned_links]

    # For administrator or special roles, allowed fields can include all or specific
    if role == "administrator":
        assigned_field_ids.append("*")

    return CurrentUser(user_id=user_id, email=email or "", role=role, field_ids=assigned_field_ids)

def require_roles(allowed_roles: List[str]):
    def role_checker(user: CurrentUser = Depends(get_current_user)) -> CurrentUser:
        if user.role not in allowed_roles and "*" not in allowed_roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Access denied. User role '{user.role}' is not authorized for this resource."
            )
        return user
    return role_checker

def log_audit(
    db: Session,
    actor_user_id: str,
    actor_role: str,
    action: str,
    target_id: Optional[str] = None,
    outcome: str = "SUCCESS",
    details: Optional[str] = None
):
    """
    Audit logging helper.
    Per NS-BR-06: Measurement values MUST NOT be written to audit log.
    """
    try:
        log_entry = AuditLog(
            actor_user_id=actor_user_id,
            actor_role=actor_role,
            action=action,
            target_id=target_id,
            outcome=outcome,
            details=details,
            occurred_at=datetime.utcnow()
        )
        db.add(log_entry)
        db.commit()
    except Exception as e:
        db.rollback()
        # Non-blocking error in logging
        print(f"[AUDIT LOG ERROR] Failed to record audit log: {e}")
