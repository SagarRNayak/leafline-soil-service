from datetime import date, datetime, timedelta
from typing import Optional, Dict, Any
from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from backend.config.settings import settings
from backend.shared.security import CurrentUser, log_audit
from backend.modules.soil_data.rules import validate_measurement_ranges, validate_sample_date, validate_units
from backend.modules.soil_data.repository import SoilDataRepository

class SoilDataService:
    def __init__(self, db: Session):
        self.db = db
        self.repo = SoilDataRepository(db)

    def submit_sample(
        self,
        current_user: CurrentUser,
        field_id: str,
        sample_date: date,
        depth_cm: float,
        nitrogen_mg_kg: float,
        phosphorus_mg_kg: float,
        potassium_mg_kg: float,
        ph: float,
        moisture_pct: float,
        lab_reference: Optional[str] = None,
        units: Optional[Dict[str, str]] = None
    ) -> Dict[str, Any]:
        # 1. Permission check: Only assigned fields can be submitted
        if current_user.role != "field_operator" and current_user.role != "administrator":
            log_audit(self.db, current_user.user_id, current_user.role, "SUBMIT_SAMPLE", field_id, "DENIED", "Role unauthorized")
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Only Field Operators assigned to this field can submit soil samples"
            )

        if "*" not in current_user.field_ids and field_id not in current_user.field_ids:
            if not self.repo.check_user_field_assignment(current_user.user_id, field_id):
                log_audit(self.db, current_user.user_id, current_user.role, "SUBMIT_SAMPLE", field_id, "DENIED", "Field not assigned")
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail=f"User is not assigned to field '{field_id}'"
                )

        # 2. Submission Rate Limit (100 per hour)
        recent_count = self.repo.count_hourly_submissions(current_user.user_id)
        if recent_count >= settings.SUBMISSION_RATE_LIMIT_PER_HOUR:
            log_audit(self.db, current_user.user_id, current_user.role, "SUBMIT_SAMPLE", field_id, "FAILURE", "Rate limit exceeded")
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail=f"Rate limit exceeded: maximum {settings.SUBMISSION_RATE_LIMIT_PER_HOUR} submissions per hour"
            )

        # 3. Unit Validation (fixed units)
        if units:
            validate_units(units)

        # 4. Measurement Range Validation (NS-BR-02)
        validate_measurement_ranges(
            n=nitrogen_mg_kg,
            p=phosphorus_mg_kg,
            k=potassium_mg_kg,
            ph=ph,
            moisture=moisture_pct,
            depth=depth_cm
        )

        # 5. Date Validation (NS-BR-07)
        validate_sample_date(sample_date)

        # 6. Duplicate check (NS-BR-08)
        if self.repo.check_duplicate_sample(field_id, sample_date, depth_cm):
            log_audit(self.db, current_user.user_id, current_user.role, "SUBMIT_SAMPLE", field_id, "FAILURE", "Duplicate sample")
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=f"Duplicate sample: a current sample already exists for field '{field_id}', date '{sample_date}' and depth {depth_cm} cm."
            )

        # 7. Persist sample in one transaction with state RECEIVED
        sample, job = self.repo.create_sample_and_job(
            field_id=field_id,
            owner_user_id=current_user.user_id,
            sample_date=sample_date,
            depth_cm=depth_cm,
            nitrogen=nitrogen_mg_kg,
            phosphorus=phosphorus_mg_kg,
            potassium=potassium_mg_kg,
            ph=ph,
            moisture=moisture_pct,
            lab_reference=lab_reference,
            version=1
        )

        log_audit(self.db, current_user.user_id, current_user.role, "SUBMIT_SAMPLE", sample.id, "SUCCESS", f"Sample received version 1 for field {field_id}")

        # Per spec: Return 202 with sample ID and state RECEIVED
        return {
            "sampleId": sample.id,
            "version": sample.version,
            "fieldId": sample.field_id,
            "sampleDate": sample.sample_date.isoformat(),
            "state": sample.state,
            "message": "Soil sample received and analysis queued"
        }

    def correct_sample(
        self,
        current_user: CurrentUser,
        sample_id: str,
        changed_values: Dict[str, Any]
    ) -> Dict[str, Any]:
        """
        NS-BR-01 & NS-UR-04:
        A sample is never overwritten. A correction creates a new version that points to the old one.
        Must be within 7 days of original submission. Owner Field Operator only.
        """
        current_sample = self.repo.get_sample(sample_id)
        if not current_sample:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Sample not found")

        # Check ownership
        if current_sample.owner_user_id != current_user.user_id and current_user.role != "administrator":
            log_audit(self.db, current_user.user_id, current_user.role, "CORRECT_SAMPLE", sample_id, "DENIED", "Not owner")
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Only the owner Field Operator can correct this sample")

        # Check 7-day correction window
        created_delta = datetime.utcnow() - current_sample.created_at
        if created_delta.days > settings.MAX_CORRECTION_DAYS:
            log_audit(self.db, current_user.user_id, current_user.role, "CORRECT_SAMPLE", sample_id, "FAILURE", "7-day window expired")
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=f"Correction window closed: corrections only allowed within {settings.MAX_CORRECTION_DAYS} days of submission"
            )

        # Get current measurement values to merge
        curr_meas = self.repo.get_measurement_for_sample(sample_id, current_sample.version)
        if not curr_meas:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Measurement data not found")

        # Merge changed values
        nitrogen = changed_values.get("nitrogenMgKg", curr_meas.nitrogen_mg_kg)
        phosphorus = changed_values.get("phosphorusMgKg", curr_meas.phosphorus_mg_kg)
        potassium = changed_values.get("potassiumMgKg", curr_meas.potassium_mg_kg)
        ph = changed_values.get("ph", curr_meas.ph)
        moisture = changed_values.get("moisturePct", curr_meas.moisture_pct)
        depth = changed_values.get("depthCm", current_sample.depth_cm)

        # Validate ranges
        validate_measurement_ranges(nitrogen, phosphorus, potassium, ph, moisture, depth)

        # New version number
        new_version = current_sample.version + 1

        # Create new version
        new_sample, job = self.repo.create_sample_and_job(
            field_id=current_sample.field_id,
            owner_user_id=current_user.user_id,
            sample_date=current_sample.sample_date,
            depth_cm=depth,
            nitrogen=nitrogen,
            phosphorus=phosphorus,
            potassium=potassium,
            ph=ph,
            moisture=moisture,
            lab_reference=changed_values.get("labReference", current_sample.lab_reference),
            sample_id=sample_id,
            version=new_version,
            supersedes_id=current_sample.id
        )

        log_audit(self.db, current_user.user_id, current_user.role, "CORRECT_SAMPLE", sample_id, "SUCCESS", f"Created corrected version {new_version}")

        return {
            "sampleId": sample_id,
            "version": new_version,
            "supersedesVersion": current_sample.version,
            "state": "RECEIVED",
            "message": f"Sample correction accepted. Created version {new_version} and queued analysis."
        }
