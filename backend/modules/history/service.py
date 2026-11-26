from datetime import date
from typing import Optional, Dict, Any, List
from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from backend.shared.security import CurrentUser, log_audit
from backend.modules.history.repository import SoilHistoryRepository
from backend.modules.history.anonymizer import get_or_create_anonymous_code
from backend.database.models import SoilMeasurement, SoilHealthResult, NutrientFlag

class SoilHistoryService:
    def __init__(self, db: Session):
        self.db = db
        self.repo = SoilHistoryRepository(db)

    def get_soil_history(
        self,
        current_user: CurrentUser,
        field_id: Optional[str] = None,
        region: Optional[str] = None,
        from_date: Optional[date] = None,
        to_date: Optional[date] = None,
        page: int = 1,
        size: int = 20,
        anonymous: Optional[bool] = None
    ) -> Dict[str, Any]:
        # Role validation
        # Researcher: MUST be anonymous
        is_researcher = (current_user.role == "researcher")
        force_anonymous = is_researcher or (anonymous is True)

        if not is_researcher and current_user.role not in ("agronomist", "field_operator", "farmer", "administrator") and not current_user.role.startswith("service_"):
            log_audit(self.db, current_user.user_id, current_user.role, "READ_SOIL_HISTORY", field_id, "DENIED", "Unauthorized role")
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Unauthorized to access soil history")

        # Field restriction check for non-researchers
        if not is_researcher and current_user.role not in ("administrator") and not current_user.role.startswith("service_"):
            if field_id:
                if "*" not in current_user.field_ids and field_id not in current_user.field_ids:
                    log_audit(self.db, current_user.user_id, current_user.role, "READ_SOIL_HISTORY", field_id, "DENIED", "Field not assigned")
                    raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Field not found or not authorized")

        samples, total = self.repo.query_history(
            field_id=field_id if not is_researcher else None,
            region=region,
            from_date=from_date,
            to_date=to_date,
            page=page,
            size=size
        )

        history_items = []
        for s in samples:
            # Get latest measurement
            meas = self.db.query(SoilMeasurement).filter(
                SoilMeasurement.sample_id == s.id,
                SoilMeasurement.version == s.version
            ).first()

            # Get health result
            health = self.db.query(SoilHealthResult).filter(
                SoilHealthResult.sample_id == s.id,
                SoilHealthResult.version == s.version
            ).first()

            # Get flags
            flags = self.db.query(NutrientFlag).filter(
                NutrientFlag.sample_id == s.id,
                NutrientFlag.version == s.version
            ).all()

            flags_summary = [
                {
                    "nutrient": f.nutrient,
                    "state": f.state,
                    "severity": f.severity,
                    "disagreement": f.disagreement
                }
                for f in flags
            ]

            if force_anonymous:
                anon_code, reg = get_or_create_anonymous_code(self.db, s.field_id)
                history_items.append({
                    "sampleId": f"anon_{s.id[-6:]}",
                    "anonymousFieldCode": anon_code,
                    "region": reg,
                    "sampleDate": s.sample_date.isoformat(),
                    "depthCm": s.depth_cm,
                    "version": s.version,
                    "state": s.state,
                    "healthStatus": health.health_status if health else "ANALYSING",
                    "nitrogenMgKg": meas.nitrogen_mg_kg if meas else None,
                    "phosphorusMgKg": meas.phosphorus_mg_kg if meas else None,
                    "potassiumMgKg": meas.potassium_mg_kg if meas else None,
                    "ph": meas.ph if meas else None,
                    "moisturePct": meas.moisture_pct if meas else None,
                    "flags": flags_summary
                })
            else:
                history_items.append({
                    "sampleId": s.id,
                    "fieldId": s.field_id,
                    "ownerUserId": s.owner_user_id,
                    "sampleDate": s.sample_date.isoformat(),
                    "depthCm": s.depth_cm,
                    "version": s.version,
                    "supersedesId": s.supersedes_id,
                    "labReference": s.lab_reference,
                    "state": s.state,
                    "createdAt": s.created_at.isoformat(),
                    "healthStatus": health.health_status if health else (s.state if s.state != "READY" else "UNKNOWN"),
                    "healthAnalysedAt": health.analysed_at.isoformat() if health else None,
                    "nitrogenMgKg": meas.nitrogen_mg_kg if meas else None,
                    "phosphorusMgKg": meas.phosphorus_mg_kg if meas else None,
                    "potassiumMgKg": meas.potassium_mg_kg if meas else None,
                    "ph": meas.ph if meas else None,
                    "moisturePct": meas.moisture_pct if meas else None,
                    "flags": flags_summary
                })

        log_audit(
            self.db,
            current_user.user_id,
            current_user.role,
            "READ_SOIL_HISTORY",
            field_id or region or "all",
            "SUCCESS",
            f"Retrieved {len(history_items)} history items (anonymous={force_anonymous})"
        )

        return {
            "total": total,
            "page": page,
            "size": size,
            "items": history_items,
            "isAnonymous": force_anonymous
        }
