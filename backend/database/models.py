from datetime import datetime
from sqlalchemy import (
    Column, String, Integer, Float, Date, DateTime, Boolean, Text, ForeignKey, UniqueConstraint, Index
)
from sqlalchemy.orm import relationship, foreign
from backend.shared.database import Base

class SoilSample(Base):
    __tablename__ = "soil_sample"

    id = Column(String(64), primary_key=True, index=True)
    version = Column(Integer, primary_key=True, default=1)
    supersedes_id = Column(String(64), nullable=True)
    field_id = Column(String(64), nullable=False, index=True)
    owner_user_id = Column(String(64), nullable=False, index=True)
    sample_date = Column(Date, nullable=False, index=True)
    depth_cm = Column(Float, nullable=False)
    lab_reference = Column(String(40), nullable=True)
    state = Column(String(32), nullable=False, default="RECEIVED", index=True) # RECEIVED, ANALYSING, READY, ANALYSIS_FAILED, REMOVED
    is_current = Column(Boolean, default=True, index=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    measurements = relationship(
        "SoilMeasurement",
        primaryjoin="and_(SoilSample.id==foreign(SoilMeasurement.sample_id), SoilSample.version==foreign(SoilMeasurement.version))",
        cascade="all, delete-orphan"
    )
    flags = relationship(
        "NutrientFlag",
        primaryjoin="and_(SoilSample.id==foreign(NutrientFlag.sample_id), SoilSample.version==foreign(NutrientFlag.version))",
        cascade="all, delete-orphan"
    )
    health_results = relationship(
        "SoilHealthResult",
        primaryjoin="and_(SoilSample.id==foreign(SoilHealthResult.sample_id), SoilSample.version==foreign(SoilHealthResult.version))",
        cascade="all, delete-orphan"
    )
    jobs = relationship(
        "AnalysisJob",
        primaryjoin="and_(SoilSample.id==foreign(AnalysisJob.sample_id), SoilSample.version==foreign(AnalysisJob.version))",
        cascade="all, delete-orphan"
    )

    __table_args__ = (
        Index("ix_field_date_depth_current", "field_id", "sample_date", "depth_cm", "is_current"),
    )

class SoilMeasurement(Base):
    __tablename__ = "soil_measurement"

    id = Column(Integer, primary_key=True, autoincrement=True)
    sample_id = Column(String(64), nullable=False, index=True)
    version = Column(Integer, nullable=False, default=1)
    nitrogen_mg_kg = Column(Float, nullable=False)
    phosphorus_mg_kg = Column(Float, nullable=False)
    potassium_mg_kg = Column(Float, nullable=False)
    ph = Column(Float, nullable=False)
    moisture_pct = Column(Float, nullable=False)

class AnalysisJob(Base):
    __tablename__ = "analysis_job"

    id = Column(Integer, primary_key=True, autoincrement=True)
    sample_id = Column(String(64), nullable=False, index=True)
    version = Column(Integer, nullable=False, default=1)
    job_status = Column(String(32), nullable=False, default="QUEUED", index=True) # QUEUED, ANALYSING, COMPLETED, FAILED
    attempts = Column(Integer, default=0, nullable=False)
    locked_by = Column(String(64), nullable=True)
    locked_until = Column(DateTime, nullable=True)
    last_error = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

class SoilHealthResult(Base):
    __tablename__ = "soil_health_result"

    id = Column(Integer, primary_key=True, autoincrement=True)
    sample_id = Column(String(64), nullable=False, index=True)
    version = Column(Integer, nullable=False, default=1)
    health_status = Column(String(16), nullable=False) # GOOD, FAIR, POOR
    rule_version = Column(String(32), nullable=False)
    model_version = Column(String(64), nullable=True)
    analysed_at = Column(DateTime, default=datetime.utcnow, nullable=False)

class NutrientFlag(Base):
    __tablename__ = "nutrient_flag"

    id = Column(Integer, primary_key=True, autoincrement=True)
    sample_id = Column(String(64), nullable=False, index=True)
    version = Column(Integer, nullable=False, default=1)
    nutrient = Column(String(32), nullable=False) # nitrogen, phosphorus, potassium, ph, moisture
    state = Column(String(16), nullable=False) # LOW, OK, HIGH or DEFICIENT, OK, EXCESS
    severity = Column(String(16), nullable=True) # slight, moderate, severe
    rule_flag = Column(String(16), nullable=False)
    ai_flag = Column(String(16), nullable=True)
    ai_score = Column(Float, nullable=True)
    model_version = Column(String(64), nullable=True)
    disagreement = Column(Boolean, default=False, nullable=False)

class AccountLink(Base):
    """Field assignments to users (administered by Administrator)"""
    __tablename__ = "account_link"

    id = Column(Integer, primary_key=True, autoincrement=True)
    user_id = Column(String(64), nullable=False, index=True)
    field_id = Column(String(64), nullable=False, index=True)
    role = Column(String(32), nullable=False)
    granted_by = Column(String(64), nullable=False)
    granted_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    revoked_at = Column(DateTime, nullable=True)

class SoilRefMap(Base):
    """Anonymous field mapping for researchers"""
    __tablename__ = "soil_ref_map"

    id = Column(Integer, primary_key=True, autoincrement=True)
    made_up_code = Column(String(32), unique=True, nullable=False, index=True)
    field_id = Column(String(64), unique=True, nullable=False, index=True)
    region = Column(String(64), nullable=False, index=True)

class AuditLog(Base):
    """Audit trail. Per NS-BR-06 & spec: NEVER store measurement values in audit_log"""
    __tablename__ = "audit_log"

    id = Column(Integer, primary_key=True, autoincrement=True)
    actor_user_id = Column(String(64), nullable=False, index=True)
    actor_role = Column(String(32), nullable=False)
    action = Column(String(64), nullable=False, index=True)
    target_id = Column(String(64), nullable=True)
    outcome = Column(String(16), nullable=False) # SUCCESS, FAILURE, DENIED
    details = Column(String(255), nullable=True)
    occurred_at = Column(DateTime, default=datetime.utcnow, nullable=False, index=True)

# Identity adapter tables (Mock Identity Service mode & local persistence)
class User(Base):
    __tablename__ = "users"

    id = Column(String(64), primary_key=True, index=True)
    email = Column(String(128), unique=True, nullable=False, index=True)
    full_name = Column(String(128), nullable=False)
    phone = Column(String(32), nullable=True)
    organisation = Column(String(128), nullable=False)
    role = Column(String(32), nullable=False) # field_operator, agronomist, researcher, farmer, administrator
    password_hash = Column(String(255), nullable=False)
    is_verified = Column(Boolean, default=False, nullable=False)
    is_approved = Column(Boolean, default=False, nullable=False)
    verification_token = Column(String(128), nullable=True)
    reset_token = Column(String(128), nullable=True)
    reset_token_expires = Column(DateTime, nullable=True)
    failed_login_attempts = Column(Integer, default=0, nullable=False)
    locked_until = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

class RefreshToken(Base):
    __tablename__ = "refresh_tokens"

    id = Column(Integer, primary_key=True, autoincrement=True)
    token = Column(String(255), unique=True, nullable=False, index=True)
    user_id = Column(String(64), nullable=False, index=True)
    expires_at = Column(DateTime, nullable=False)
    revoked = Column(Boolean, default=False, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
