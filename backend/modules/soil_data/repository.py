import uuid
from datetime import datetime, timedelta, date
from typing import Optional, List, Tuple
from sqlalchemy.orm import Session
from sqlalchemy import func, and_
from backend.database.models import SoilSample, SoilMeasurement, AnalysisJob, AccountLink
from backend.config.settings import settings

class SoilDataRepository:
    def __init__(self, db: Session):
        self.db = db

    def check_duplicate_sample(self, field_id: str, sample_date: date, depth_cm: float) -> bool:
        """
        NS-BR-08: Only one current sample can exist for the same field, date and depth.
        """
        existing = self.db.query(SoilSample).filter(
            SoilSample.field_id == field_id,
            SoilSample.sample_date == sample_date,
            SoilSample.depth_cm == depth_cm,
            SoilSample.is_current == True,
            SoilSample.state != "REMOVED"
        ).first()
        return existing is not None

    def count_hourly_submissions(self, user_id: str) -> int:
        """Rate limit: count submissions by caller in the last 1 hour"""
        one_hour_ago = datetime.utcnow() - timedelta(hours=1)
        return self.db.query(func.count(SoilSample.id)).filter(
            SoilSample.owner_user_id == user_id,
            SoilSample.created_at >= one_hour_ago
        ).scalar() or 0

    def create_sample_and_job(
        self,
        field_id: str,
        owner_user_id: str,
        sample_date: date,
        depth_cm: float,
        nitrogen: float,
        phosphorus: float,
        potassium: float,
        ph: float,
        moisture: float,
        lab_reference: Optional[str] = None,
        sample_id: Optional[str] = None,
        version: int = 1,
        supersedes_id: Optional[str] = None
    ) -> Tuple[SoilSample, AnalysisJob]:
        if not sample_id:
            sample_id = f"smp_{uuid.uuid4().hex[:8]}"

        # If this is a new version superseding an older one, mark previous version is_current=False
        if supersedes_id:
            prev_samples = self.db.query(SoilSample).filter(
                SoilSample.id == supersedes_id
            ).all()
            for ps in prev_samples:
                ps.is_current = False

        sample = SoilSample(
            id=sample_id,
            version=version,
            supersedes_id=supersedes_id,
            field_id=field_id,
            owner_user_id=owner_user_id,
            sample_date=sample_date,
            depth_cm=depth_cm,
            lab_reference=lab_reference,
            state="RECEIVED",
            is_current=True,
            created_at=datetime.utcnow()
        )
        self.db.add(sample)

        measurement = SoilMeasurement(
            sample_id=sample_id,
            version=version,
            nitrogen_mg_kg=nitrogen,
            phosphorus_mg_kg=phosphorus,
            potassium_mg_kg=potassium,
            ph=ph,
            moisture_pct=moisture
        )
        self.db.add(measurement)

        job = AnalysisJob(
            sample_id=sample_id,
            version=version,
            job_status="QUEUED",
            attempts=0,
            created_at=datetime.utcnow(),
            updated_at=datetime.utcnow()
        )
        self.db.add(job)

        self.db.commit()
        self.db.refresh(sample)
        self.db.refresh(job)
        return sample, job

    def get_sample(self, sample_id: str, version: Optional[int] = None) -> Optional[SoilSample]:
        query = self.db.query(SoilSample).filter(SoilSample.id == sample_id)
        if version is not None:
            query = query.filter(SoilSample.version == version)
        else:
            query = query.filter(SoilSample.is_current == True)
        return query.first()

    def get_all_sample_versions(self, sample_id: str) -> List[SoilSample]:
        return self.db.query(SoilSample).filter(
            SoilSample.id == sample_id
        ).order_by(SoilSample.version.asc()).all()

    def get_measurement_for_sample(self, sample_id: str, version: int) -> Optional[SoilMeasurement]:
        return self.db.query(SoilMeasurement).filter(
            SoilMeasurement.sample_id == sample_id,
            SoilMeasurement.version == version
        ).first()

    def check_user_field_assignment(self, user_id: str, field_id: str) -> bool:
        """Check if user is assigned to field"""
        link = self.db.query(AccountLink).filter(
            AccountLink.user_id == user_id,
            AccountLink.field_id == field_id,
            AccountLink.revoked_at.is_(None)
        ).first()
        return link is not None
