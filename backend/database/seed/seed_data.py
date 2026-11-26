import uuid
from datetime import datetime, date, timedelta
from sqlalchemy.orm import Session

from backend.shared.database import SessionLocal, engine, Base
from backend.database.models import (
    User, SoilSample, SoilMeasurement, SoilHealthResult, NutrientFlag,
    AccountLink, SoilRefMap, AuditLog
)
from backend.shared.security import hash_password
from backend.config.settings import settings
from backend.modules.deficiency.rules import get_nutrient_severity
from backend.modules.soil_health.rules import calculate_soil_health

def seed_database():
    Base.metadata.create_all(bind=engine)
    db: Session = SessionLocal()

    try:
        # Check if already seeded
        if db.query(User).count() > 0:
            print("Database already has users. Skipping seed.")
            return

        print("Seeding Leafline database with demo users, fields, and soil measurements...")

        # 1. Create Default Users
        users_data = [
            {
                "id": "usr_operator_1",
                "email": "operator@leafline.ag",
                "full_name": "Marcus Vance",
                "phone": "+1-555-0101",
                "organisation": "Prairie Sun Agriculture",
                "role": "field_operator",
                "password": "Operator123456",
                "is_verified": True,
                "is_approved": True
            },
            {
                "id": "usr_agronomist_1",
                "email": "agronomist@leafline.ag",
                "full_name": "Dr. Elena Rostova",
                "phone": "+1-555-0102",
                "organisation": "Leafline Agronomy Services",
                "role": "agronomist",
                "password": "Agronomist123456",
                "is_verified": True,
                "is_approved": True
            },
            {
                "id": "usr_researcher_1",
                "email": "researcher@leafline.ag",
                "full_name": "Dr. Sarah Chen",
                "phone": "+1-555-0103",
                "organisation": "Sunflower Genetics Institute",
                "role": "researcher",
                "password": "Researcher123456",
                "is_verified": True,
                "is_approved": True
            },
            {
                "id": "usr_farmer_1",
                "email": "farmer@leafline.ag",
                "full_name": "John Miller",
                "phone": "+1-555-0104",
                "organisation": "Miller Family Sunflowers",
                "role": "farmer",
                "password": "Farmer123456",
                "is_verified": True,
                "is_approved": True
            },
            {
                "id": "usr_admin_1",
                "email": "admin@leafline.ag",
                "full_name": "Chief Administrator",
                "phone": "+1-555-0100",
                "organisation": "Leafline Global Operations",
                "role": "administrator",
                "password": "Admin123456",
                "is_verified": True,
                "is_approved": True
            },
            {
                "id": "usr_pending_1",
                "email": "pending.operator@leafline.ag",
                "full_name": "Liam Scott",
                "phone": "+1-555-0105",
                "organisation": "Highland Fields",
                "role": "field_operator",
                "password": "Pending123456",
                "is_verified": True,
                "is_approved": False
            }
        ]

        for u in users_data:
            user = User(
                id=u["id"],
                email=u["email"],
                full_name=u["full_name"],
                phone=u["phone"],
                organisation=u["organisation"],
                role=u["role"],
                password_hash=hash_password(u["password"]),
                is_verified=u["is_verified"],
                is_approved=u["is_approved"],
                created_at=datetime.utcnow() - timedelta(days=30)
            )
            db.add(user)

        # 2. Seed Fields & SoilRefMap (Anonymized codes for researchers)
        fields_data = [
            ("fld_0412", "FLD-ANON-7A12", "North Valley - Sector A"),
            ("fld_0413", "FLD-ANON-8B34", "Central Plains - Block 4"),
            ("fld_0414", "FLD-ANON-9C56", "Southern Basin - Plot 9"),
            ("fld_0415", "FLD-ANON-3D78", "Eastern Highlands - Ridge 2"),
            ("fld_0416", "FLD-ANON-1E90", "River Delta - Field 11")
        ]

        for f_id, code, region in fields_data:
            s_map = SoilRefMap(
                made_up_code=code,
                field_id=f_id,
                region=region
            )
            db.add(s_map)

        # 3. Seed Field Assignments in account_link
        assignments = [
            ("usr_operator_1", "fld_0412", "field_operator"),
            ("usr_operator_1", "fld_0413", "field_operator"),
            ("usr_operator_1", "fld_0414", "field_operator"),
            ("usr_agronomist_1", "fld_0412", "agronomist"),
            ("usr_agronomist_1", "fld_0413", "agronomist"),
            ("usr_agronomist_1", "fld_0414", "agronomist"),
            ("usr_agronomist_1", "fld_0415", "agronomist"),
            ("usr_farmer_1", "fld_0412", "farmer"),
        ]

        for u_id, f_id, role in assignments:
            link = AccountLink(
                user_id=u_id,
                field_id=f_id,
                role=role,
                granted_by="usr_admin_1",
                granted_at=datetime.utcnow() - timedelta(days=25)
            )
            db.add(link)

        # 4. Seed Soil Samples & Realistic Measurements
        sample_batches = [
            # Field 0412: Healthy sample (GOOD)
            {
                "id": "smp_9a31", "version": 1, "field_id": "fld_0412", "owner": "usr_operator_1",
                "days_ago": 18, "depth": 20.0, "lab_ref": "LAB-2026-A1",
                "n": 28.0, "p": 22.0, "k": 185.0, "ph": 6.8, "moisture": 31.0
            },
            # Field 0412: Corrected version 2 (GOOD)
            {
                "id": "smp_9a31", "version": 2, "supersedes": "smp_9a31", "field_id": "fld_0412", "owner": "usr_operator_1",
                "days_ago": 15, "depth": 20.0, "lab_ref": "LAB-2026-A1-REV",
                "n": 30.0, "p": 24.0, "k": 190.0, "ph": 6.9, "moisture": 32.0
            },
            # Field 0413: Moderate N deficiency (FAIR - 1 value outside, slight/moderate)
            {
                "id": "smp_8b22", "version": 1, "field_id": "fld_0413", "owner": "usr_operator_1",
                "days_ago": 12, "depth": 25.0, "lab_ref": "LAB-2026-B4",
                "n": 17.5, "p": 20.0, "k": 175.0, "ph": 6.7, "moisture": 28.0
            },
            # Field 0414: High acidity & Severe P deficiency (POOR - multiple outside or severe)
            {
                "id": "smp_7c19", "version": 1, "field_id": "fld_0414", "owner": "usr_operator_1",
                "days_ago": 8, "depth": 15.0, "lab_ref": "LAB-2026-C9",
                "n": 22.0, "p": 9.5, "k": 140.0, "ph": 5.4, "moisture": 18.0
            },
            # Field 0415: Excessive Nitrogen & Low Moisture (POOR)
            {
                "id": "smp_6d45", "version": 1, "field_id": "fld_0415", "owner": "usr_operator_1",
                "days_ago": 4, "depth": 30.0, "lab_ref": "LAB-2026-D2",
                "n": 52.0, "p": 25.0, "k": 210.0, "ph": 7.1, "moisture": 12.0
            },
            # Field 0416: Balanced recent sample (GOOD)
            {
                "id": "smp_5e88", "version": 1, "field_id": "fld_0416", "owner": "usr_operator_1",
                "days_ago": 1, "depth": 20.0, "lab_ref": "LAB-2026-E11",
                "n": 34.0, "p": 28.0, "k": 220.0, "ph": 7.0, "moisture": 36.0
            }
        ]

        for sb in sample_batches:
            sample_date = date.today() - timedelta(days=sb["days_ago"])
            created_at = datetime.utcnow() - timedelta(days=sb["days_ago"])
            supersedes = sb.get("supersedes")
            is_curr = (sb["version"] == 2 if sb["id"] == "smp_9a31" else True)
            if sb["id"] == "smp_9a31" and sb["version"] == 1:
                is_curr = False

            sample = SoilSample(
                id=sb["id"],
                version=sb["version"],
                supersedes_id=supersedes,
                field_id=sb["field_id"],
                owner_user_id=sb["owner"],
                sample_date=sample_date,
                depth_cm=sb["depth"],
                lab_reference=sb["lab_ref"],
                state="READY",
                is_current=is_curr,
                created_at=created_at
            )
            db.add(sample)

            meas = SoilMeasurement(
                sample_id=sb["id"],
                version=sb["version"],
                nitrogen_mg_kg=sb["n"],
                phosphorus_mg_kg=sb["p"],
                potassium_mg_kg=sb["k"],
                ph=sb["ph"],
                moisture_pct=sb["moisture"]
            )
            db.add(meas)

            # Generate flags & severities
            flags_list = []
            nutrients = [
                ("nitrogen", sb["n"]),
                ("phosphorus", sb["p"]),
                ("potassium", sb["k"]),
                ("ph", sb["ph"]),
                ("moisture", sb["moisture"])
            ]
            for n_name, val in nutrients:
                st, sev = get_nutrient_severity(n_name, val)
                flag_rec = NutrientFlag(
                    sample_id=sb["id"],
                    version=sb["version"],
                    nutrient=n_name,
                    state=st,
                    severity=sev,
                    rule_flag=st,
                    ai_flag=st,
                    ai_score=0.92,
                    model_version="soil-ai-1.2.0",
                    disagreement=False
                )
                db.add(flag_rec)
                flags_list.append({"nutrient": n_name, "state": st, "severity": sev})

            # Calculate health
            health_status = calculate_soil_health(flags_list)
            health = SoilHealthResult(
                sample_id=sb["id"],
                version=sb["version"],
                health_status=health_status,
                rule_version=settings.RULE_VERSION,
                model_version="soil-ai-1.2.0",
                analysed_at=created_at + timedelta(minutes=2)
            )
            db.add(health)

        # 5. Add initial audit logs (No measurement values!)
        audit_entries = [
            ("usr_operator_1", "field_operator", "SUBMIT_SAMPLE", "smp_9a31", "SUCCESS", "Sample submitted"),
            ("usr_operator_1", "field_operator", "CORRECT_SAMPLE", "smp_9a31", "SUCCESS", "Created corrected version 2"),
            ("usr_operator_1", "field_operator", "SUBMIT_SAMPLE", "smp_8b22", "SUCCESS", "Sample submitted"),
            ("usr_agronomist_1", "agronomist", "READ_SOIL_HISTORY", "fld_0412", "SUCCESS", "Viewed field history"),
            ("usr_admin_1", "administrator", "ASSIGN_FIELD", "fld_0412", "SUCCESS", "Assigned usr_operator_1 to fld_0412")
        ]
        for a_usr, a_role, a_action, a_tgt, a_out, a_det in audit_entries:
            log = AuditLog(
                actor_user_id=a_usr,
                actor_role=a_role,
                action=a_action,
                target_id=a_tgt,
                outcome=a_out,
                details=a_det,
                occurred_at=datetime.utcnow() - timedelta(days=5)
            )
            db.add(log)

        db.commit()
        print("Database seeding completed successfully!")
    except Exception as e:
        db.rollback()
        print(f"Error seeding database: {e}")
        raise e
    finally:
        db.close()

if __name__ == "__main__":
    seed_database()
