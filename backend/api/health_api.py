from datetime import date
from typing import Optional, List
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from sqlalchemy import desc

from backend.shared.database import get_db
from backend.shared.security import CurrentUser, get_current_user, log_audit
from backend.database.models import SoilSample, SoilHealthResult, NutrientFlag

router = APIRouter(tags=["Soil Health"])

@router.get("/soil-health")
def get_soil_health(
    fieldId: str = Query(..., description="Field identifier"),
    date_val: Optional[date] = Query(None, alias="date", description="Target date"),
    current_user: CurrentUser = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    GET /api/v1/soil/soil-health: Health and nutrient flags for a field.
    Allowed for Agronomist (assigned), Farmer (own), Administrator, AI Analytics, Plant Health.
    """
    if current_user.role != "administrator" and not current_user.role.startswith("service_"):
        if "*" not in current_user.field_ids and fieldId not in current_user.field_ids:
            log_audit(db, current_user.user_id, current_user.role, "GET_SOIL_HEALTH", fieldId, "DENIED", "Field not assigned")
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Field not found or not authorized")

    # Query for the latest ready sample on or before date
    query = db.query(SoilSample).filter(
        SoilSample.field_id == fieldId,
        SoilSample.state == "READY",
        SoilSample.is_current == True
    )
    if date_val:
        query = query.filter(SoilSample.sample_date <= date_val)

    sample = query.order_by(desc(SoilSample.sample_date), desc(SoilSample.created_at)).first()

    if not sample:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"No soil health data available for field '{fieldId}'"
        )

    health = db.query(SoilHealthResult).filter(
        SoilHealthResult.sample_id == sample.id,
        SoilHealthResult.version == sample.version
    ).first()

    flags = db.query(NutrientFlag).filter(
        NutrientFlag.sample_id == sample.id,
        NutrientFlag.version == sample.version
    ).all()

    log_audit(db, current_user.user_id, current_user.role, "GET_SOIL_HEALTH", fieldId, "SUCCESS")

    return {
        "fieldId": fieldId,
        "sampleId": sample.id,
        "version": sample.version,
        "sampleDate": sample.sample_date.isoformat(),
        "healthStatus": health.health_status if health else "UNKNOWN",
        "ruleVersion": health.rule_version if health else None,
        "aiView": health.model_version if (health and health.model_version) else "AI View Pending",
        "analysedAt": health.analysed_at.isoformat() if health else None,
        "flags": [
            {
                "nutrient": f.nutrient,
                "state": f.state,
                "severity": f.severity,
                "ruleFlag": f.rule_flag,
                "aiFlag": f.ai_flag,
                "aiScore": f.ai_score,
                "disagreement": f.disagreement
            }
            for f in flags
        ]
    }
