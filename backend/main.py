import threading
import time
from contextlib import asynccontextmanager
from fastapi import FastAPI, Depends, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from sqlalchemy import text, desc

from backend.config.settings import settings
from backend.shared.database import engine, Base, get_db
from backend.api import sample_api, health_api, history_api, account_api, auth_api, mock_ai_api
from backend.worker.analysis_worker import SoilAnalysisWorker
from backend.database.seed.seed_data import seed_database
from backend.database.models import SoilSample, SoilHealthResult, NutrientFlag, AccountLink, User
from backend.shared.security import CurrentUser, get_current_user

# Global background worker
worker = SoilAnalysisWorker()

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Initialize DB tables and seed initial data if needed
    Base.metadata.create_all(bind=engine)
    seed_database()

    # Start background polling thread
    worker_thread = threading.Thread(target=worker.start_polling, args=(2.0,), daemon=True)
    worker_thread.start()
    print("[SERVER LIFESPAN] Background soil analysis worker started")

    yield

    worker.stop()
    print("[SERVER LIFESPAN] Background soil analysis worker stopped")

app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.VERSION,
    description="Leafline Sunflower Health Intelligence Platform - Service 2: Nutrient & Soil Management Service",
    lifespan=lifespan,
    docs_url="/docs",
    redoc_url="/redoc",
    openapi_url="/openapi.json"
)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include Routers
# Module API router mounted on /api/v1/soil
app.include_router(sample_api.router, prefix=settings.API_V1_STR)
app.include_router(health_api.router, prefix=settings.API_V1_STR)
app.include_router(history_api.router, prefix=settings.API_V1_STR)
app.include_router(account_api.router, prefix=settings.API_V1_STR)

# Identity & Access Adapter
app.include_router(auth_api.router)

# Private Soil & Nutrient AI Internal API
app.include_router(mock_ai_api.router)

@app.get("/health", tags=["System Health"])
def health_check(db: Session = Depends(get_db)):
    """
    BE1-P-02: Health check endpoint.
    Checks database connectivity.
    Replies 200 with service name and version, or 503 if database fails.
    """
    try:
        db.execute(text("SELECT 1"))
        return {
            "status": "healthy",
            "service": "Leafline Nutrient & Soil Service",
            "version": settings.VERSION,
            "database": "connected",
            "ruleVersion": settings.RULE_VERSION,
            "environment": settings.ENVIRONMENT,
            "workerStatus": "active"
        }
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=f"Database connectivity check failed: {str(e)}"
        )

@app.get(f"{settings.API_V1_STR}/dashboard/summary", tags=["Dashboard Summary"])
def get_dashboard_summary(
    current_user: CurrentUser = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Section 4.C: Dynamic Dashboard Summary retrieved from backend database.
    Calculates:
    - Accessible fields count
    - Total soil samples
    - GOOD, FAIR, POOR health counts
    - Deficiencies and excesses
    - Recent submissions
    - NPK averages
    - Field-wise summaries
    Filtered according to user role permissions.
    """
    # 1. Determine accessible field ids
    if current_user.role == "administrator" or "*" in current_user.field_ids:
        sample_query = db.query(SoilSample).filter(SoilSample.state != "REMOVED", SoilSample.is_current == True)
        accessible_fields = db.query(SoilSample.field_id).distinct().all()
        field_count = len(accessible_fields)
    else:
        sample_query = db.query(SoilSample).filter(
            SoilSample.field_id.in_(current_user.field_ids),
            SoilSample.state != "REMOVED",
            SoilSample.is_current == True
        )
        field_count = len(current_user.field_ids)

    samples = sample_query.all()
    sample_ids = [s.id for s in samples]

    # Health counts
    good_count = 0
    fair_count = 0
    poor_count = 0

    if sample_ids:
        health_results = db.query(SoilHealthResult).filter(SoilHealthResult.sample_id.in_(sample_ids)).all()
        for hr in health_results:
            if hr.health_status == "GOOD":
                good_count += 1
            elif hr.health_status == "FAIR":
                fair_count += 1
            elif hr.health_status == "POOR":
                poor_count += 1

        # Deficiencies and Excesses
        flags = db.query(NutrientFlag).filter(NutrientFlag.sample_id.in_(sample_ids)).all()
        deficiency_count = sum(1 for f in flags if f.state in ("DEFICIENT", "LOW"))
        excess_count = sum(1 for f in flags if f.state in ("EXCESS", "HIGH"))
    else:
        deficiency_count = 0
        excess_count = 0

    # Recent submissions (up to 5)
    recent_samples = sample_query.order_by(desc(SoilSample.sample_date), desc(SoilSample.created_at)).limit(5).all()
    recent_list = []
    for s in recent_samples:
        h = db.query(SoilHealthResult).filter(SoilHealthResult.sample_id == s.id, SoilHealthResult.version == s.version).first()
        recent_list.append({
            "sampleId": s.id,
            "fieldId": s.field_id,
            "sampleDate": s.sample_date.isoformat(),
            "version": s.version,
            "state": s.state,
            "healthStatus": h.health_status if h else s.state
        })

    return {
        "accessibleFields": field_count,
        "totalSamples": len(samples),
        "goodHealthCount": good_count,
        "fairHealthCount": fair_count,
        "poorHealthCount": poor_count,
        "deficiencyCount": deficiency_count,
        "excessCount": excess_count,
        "recentSubmissions": recent_list,
        "limits": {
            "nitrogen": {"low": settings.LIMITS.N_LOW, "high": settings.LIMITS.N_HIGH, "unit": "mg/kg"},
            "phosphorus": {"low": settings.LIMITS.P_LOW, "high": settings.LIMITS.P_HIGH, "unit": "mg/kg"},
            "potassium": {"low": settings.LIMITS.K_LOW, "high": settings.LIMITS.K_HIGH, "unit": "mg/kg"},
            "ph": {"low": settings.LIMITS.PH_LOW, "high": settings.LIMITS.PH_HIGH, "unit": ""},
            "moisture": {"low": settings.LIMITS.MOISTURE_LOW, "high": settings.LIMITS.MOISTURE_HIGH, "unit": "%"}
        }
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("backend.main:app", host="0.0.0.0", port=8000, reload=True)
