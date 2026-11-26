import os
import time
import uuid
import traceback
from datetime import datetime, timedelta
from typing import Optional
from sqlalchemy.orm import Session
from sqlalchemy import or_, and_

from backend.shared.database import SessionLocal
from backend.database.models import SoilSample, SoilMeasurement, AnalysisJob, SoilHealthResult, NutrientFlag
from backend.config.settings import settings
from backend.modules.npk.rules import analyze_npk
from backend.modules.ph_moisture.rules import analyze_ph_moisture
from backend.modules.deficiency.rules import get_nutrient_severity
from backend.modules.deficiency.ai_merge import merge_rule_and_ai_flags
from backend.modules.soil_health.rules import calculate_soil_health
from backend.worker.ai_client import SoilAIClient

class SoilAnalysisWorker:
    def __init__(self, worker_id: Optional[str] = None):
        self.worker_id = worker_id or f"worker_{uuid.uuid4().hex[:6]}"
        self.ai_client = SoilAIClient()
        self.is_running = False

    def pick_and_lock_job(self, db: Session) -> Optional[AnalysisJob]:
        """
        BE2-M2-01: Selects one QUEUED job or one whose lock has expired.
        Locks it atomically for this worker so no other worker takes it.
        """
        now = datetime.utcnow()
        lock_duration = timedelta(minutes=5)

        job = db.query(AnalysisJob).filter(
            or_(
                AnalysisJob.job_status == "QUEUED",
                and_(
                    AnalysisJob.job_status == "ANALYSING",
                    AnalysisJob.locked_until < now
                )
            )
        ).order_by(AnalysisJob.created_at.asc()).first()

        if job:
            job.job_status = "ANALYSING"
            job.locked_by = self.worker_id
            job.locked_until = now + lock_duration
            job.attempts += 1
            job.updated_at = now

            # Update sample state to ANALYSING (BE2-M2-02)
            sample = db.query(SoilSample).filter(
                SoilSample.id == job.sample_id,
                SoilSample.version == job.version
            ).first()
            if sample:
                sample.state = "ANALYSING"

            db.commit()
            db.refresh(job)
            return job
        return None

    def process_job(self, job_id: int) -> bool:
        db = SessionLocal()
        try:
            job = db.query(AnalysisJob).filter(AnalysisJob.id == job_id).first()
            if not job:
                return False

            sample = db.query(SoilSample).filter(
                SoilSample.id == job.sample_id,
                SoilSample.version == job.version
            ).first()

            meas = db.query(SoilMeasurement).filter(
                SoilMeasurement.sample_id == job.sample_id,
                SoilMeasurement.version == job.version
            ).first()

            if not sample or not meas:
                job.job_status = "FAILED"
                job.last_error = "Missing sample or measurement record"
                db.commit()
                return False

            # Step 1: Calculate rule-based flags and severities
            rule_flags = []
            nutrients_data = [
                ("nitrogen", meas.nitrogen_mg_kg),
                ("phosphorus", meas.phosphorus_mg_kg),
                ("potassium", meas.potassium_mg_kg),
                ("ph", meas.ph),
                ("moisture", meas.moisture_pct),
            ]

            for nutrient_name, val in nutrients_data:
                state, severity = get_nutrient_severity(nutrient_name, val)
                rule_flags.append({
                    "nutrient": nutrient_name,
                    "state": state,
                    "severity": severity,
                    "value": val
                })

            # Step 2: Call Soil & Nutrient AI private API
            ai_result = self.ai_client.analyze_soil(
                sample_ref=sample.id,
                version=sample.version,
                nitrogen=meas.nitrogen_mg_kg,
                phosphorus=meas.phosphorus_mg_kg,
                potassium=meas.potassium_mg_kg,
                ph=meas.ph,
                moisture=meas.moisture_pct
            )

            # Step 3: Merge AI and rule-based flags
            ai_flags = ai_result.get("flags") if ai_result else None
            model_ver = ai_result.get("modelVersion") if ai_result else None
            
            final_flags = merge_rule_and_ai_flags(
                rule_flags=rule_flags,
                ai_flags=ai_flags,
                model_version=model_ver
            )

            # Step 4: Calculate overall soil health score
            health_status = calculate_soil_health(final_flags)

            # Step 5: Save results atomically in DB
            # Remove existing flags/health results for this version if re-running
            db.query(NutrientFlag).filter(
                NutrientFlag.sample_id == sample.id,
                NutrientFlag.version == sample.version
            ).delete()
            db.query(SoilHealthResult).filter(
                SoilHealthResult.sample_id == sample.id,
                SoilHealthResult.version == sample.version
            ).delete()

            # Insert nutrient flags
            for ff in final_flags:
                flag_rec = NutrientFlag(
                    sample_id=sample.id,
                    version=sample.version,
                    nutrient=ff["nutrient"],
                    state=ff["state"],
                    severity=ff["severity"],
                    rule_flag=ff["rule_flag"],
                    ai_flag=ff.get("ai_flag"),
                    ai_score=ff.get("ai_score"),
                    model_version=ff.get("model_version"),
                    disagreement=ff.get("disagreement", False)
                )
                db.add(flag_rec)

            # Insert soil health result
            health_rec = SoilHealthResult(
                sample_id=sample.id,
                version=sample.version,
                health_status=health_status,
                rule_version=settings.RULE_VERSION,
                model_version=model_ver or "AI View Pending",
                analysed_at=datetime.utcnow()
            )
            db.add(health_rec)

            # Update sample state to READY
            sample.state = "READY"

            # Update job state to COMPLETED
            job.job_status = "COMPLETED"
            job.locked_by = None
            job.locked_until = None
            job.updated_at = datetime.utcnow()

            db.commit()
            print(f"[{self.worker_id}] Successfully analyzed sample {sample.id} v{sample.version}: Health={health_status}")
            return True

        except Exception as e:
            db.rollback()
            err_msg = traceback.format_exc()
            print(f"[{self.worker_id}] Error analyzing job {job_id}: {err_msg}")
            try:
                job = db.query(AnalysisJob).filter(AnalysisJob.id == job_id).first()
                if job:
                    job.attempts += 1
                    if job.attempts >= settings.MAX_AI_RETRIES:
                        job.job_status = "FAILED"
                        job.last_error = str(e)
                        sample = db.query(SoilSample).filter(
                            SoilSample.id == job.sample_id,
                            SoilSample.version == job.version
                        ).first()
                        if sample:
                            sample.state = "ANALYSIS_FAILED"
                    else:
                        job.job_status = "QUEUED" # Re-queue for retry
                    job.locked_by = None
                    job.locked_until = None
                    db.commit()
            except Exception:
                pass
            return False
        finally:
            db.close()

    def run_once(self) -> int:
        """Process any pending jobs immediately (great for tests & synchronous runs)"""
        db = SessionLocal()
        count = 0
        try:
            while True:
                job = self.pick_and_lock_job(db)
                if not job:
                    break
                self.process_job(job.id)
                count += 1
        finally:
            db.close()
        return count

    def start_polling(self, poll_interval: float = 2.0):
        self.is_running = True
        print(f"[{self.worker_id}] Analysis worker started. Polling every {poll_interval}s...")
        while self.is_running:
            try:
                self.run_once()
            except Exception as e:
                print(f"[{self.worker_id}] Polling error: {e}")
            time.sleep(poll_interval)

    def stop(self):
        self.is_running = False
