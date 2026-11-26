from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel, Field
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from backend.shared.database import get_db
from backend.shared.security import CurrentUser, get_current_user, require_roles, log_audit
from backend.database.models import AccountLink, User, SoilRefMap

router = APIRouter(tags=["Field Assignments & Account Admin"])

class FieldAssignmentRequest(BaseModel):
    userId: str = Field(..., example="usr_123")
    fieldId: str = Field(..., example="fld_0412")
    role: str = Field(..., example="field_operator")

@router.get("/fields")
def get_user_fields(
    current_user: CurrentUser = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Returns fields accessible to the current user"""
    if current_user.role == "administrator":
        # Admin can access all mapped fields
        maps = db.query(SoilRefMap).all()
        return [{"fieldId": m.field_id, "region": m.region, "code": m.made_up_code} for m in maps]
    
    links = db.query(AccountLink).filter(
        AccountLink.user_id == current_user.user_id,
        AccountLink.revoked_at.is_(None)
    ).all()
    
    res = []
    for l in links:
        ref = db.query(SoilRefMap).filter(SoilRefMap.field_id == l.field_id).first()
        res.append({
            "fieldId": l.field_id,
            "role": l.role,
            "region": ref.region if ref else "General Agricultural Region"
        })
    return res

@router.get("/assignments")
def list_field_assignments(
    current_user: CurrentUser = Depends(require_roles(["administrator"])),
    db: Session = Depends(get_db)
):
    """BE1-P-04: Administrator lists all field assignments"""
    links = db.query(AccountLink).all()
    result = []
    for l in links:
        user = db.query(User).filter(User.id == l.user_id).first()
        result.append({
            "id": l.id,
            "userId": l.user_id,
            "userName": user.full_name if user else "Unknown",
            "userEmail": user.email if user else "Unknown",
            "fieldId": l.field_id,
            "role": l.role,
            "grantedBy": l.granted_by,
            "grantedAt": l.granted_at.isoformat(),
            "revokedAt": l.revoked_at.isoformat() if l.revoked_at else None,
            "isActive": l.revoked_at is None
        })
    return result

@router.post("/assignments", status_code=status.HTTP_201_CREATED)
def create_field_assignment(
    payload: FieldAssignmentRequest,
    current_user: CurrentUser = Depends(require_roles(["administrator"])),
    db: Session = Depends(get_db)
):
    """
    BE1-P-04: Assign a user to a field.
    NS-AUTH-12: Refuse any self-role raising or illegal modification.
    """
    # Check target user
    target_user = db.query(User).filter(User.id == payload.userId).first()
    if not target_user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")

    # Prevent raising caller's own role
    if payload.userId == current_user.user_id and payload.role != current_user.role:
        log_audit(db, current_user.user_id, current_user.role, "ASSIGN_FIELD", payload.fieldId, "DENIED", "Self-promotion disallowed")
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Self-promotion disallowed: cannot alter own role"
        )

    # Check if active assignment exists
    existing = db.query(AccountLink).filter(
        AccountLink.user_id == payload.userId,
        AccountLink.field_id == payload.fieldId,
        AccountLink.revoked_at.is_(None)
    ).first()
    if existing:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="User is already assigned to this field")

    link = AccountLink(
        user_id=payload.userId,
        field_id=payload.fieldId,
        role=payload.role,
        granted_by=current_user.user_id,
        granted_at=datetime.utcnow()
    )
    db.add(link)
    db.commit()
    db.refresh(link)

    log_audit(
        db,
        current_user.user_id,
        current_user.role,
        "ASSIGN_FIELD",
        payload.fieldId,
        "SUCCESS",
        f"Assigned user {payload.userId} to field {payload.fieldId} as {payload.role}"
    )

    return {"message": "Field assigned successfully", "assignmentId": link.id}

@router.delete("/assignments/{id}")
def revoke_field_assignment(
    id: int,
    current_user: CurrentUser = Depends(require_roles(["administrator"])),
    db: Session = Depends(get_db)
):
    """Revoke a field assignment (soft revocation preserving history)"""
    link = db.query(AccountLink).filter(AccountLink.id == id).first()
    if not link:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Assignment not found")

    link.revoked_at = datetime.utcnow()
    db.commit()

    log_audit(
        db,
        current_user.user_id,
        current_user.role,
        "REVOKE_FIELD_ASSIGNMENT",
        link.field_id,
        "SUCCESS",
        f"Revoked assignment for user {link.user_id} on field {link.field_id}"
    )

    return {"message": "Field assignment revoked successfully"}
