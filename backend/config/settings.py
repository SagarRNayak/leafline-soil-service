import os
from pydantic import BaseModel
from typing import Dict, Any

class SoilNutrientLimits(BaseModel):
    # Nitrogen (mg/kg)
    N_LOW: float = 20.0
    N_HIGH: float = 40.0
    # Phosphorus (mg/kg)
    P_LOW: float = 15.0
    P_HIGH: float = 30.0
    # Potassium (mg/kg)
    K_LOW: float = 120.0
    K_HIGH: float = 250.0
    # pH (unitless)
    PH_LOW: float = 6.0
    PH_HIGH: float = 7.5
    # Moisture (%)
    MOISTURE_LOW: float = 15.0
    MOISTURE_HIGH: float = 45.0

    # Severity percentage thresholds
    SLIGHT_PCT: float = 10.0
    MODERATE_PCT: float = 25.0

class Settings:
    PROJECT_NAME: str = "Leafline - Nutrient & Soil Management Service"
    VERSION: str = "1.0.0"
    API_V1_STR: str = "/api/v1/soil"
    
    # Environment
    ENVIRONMENT: str = os.getenv("ENVIRONMENT", "development")
    MOCK_AUTH_MODE: bool = os.getenv("MOCK_AUTH_MODE", "true").lower() in ("true", "1", "yes")

    # Security
    SECRET_KEY: str = os.getenv("SECRET_KEY", "leafline-soil-intelligence-super-secret-key-2026")
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "30"))
    REFRESH_TOKEN_EXPIRE_DAYS: int = int(os.getenv("REFRESH_TOKEN_EXPIRE_DAYS", "7"))
    
    # Database
    DB_HOST: str = os.getenv("DB_HOST", "")
    DB_PORT: str = os.getenv("DB_PORT", "3306")
    DB_NAME: str = os.getenv("DB_NAME", "leafline_soil")
    DB_USER: str = os.getenv("DB_USER", "leafline_user")
    DB_PASSWORD: str = os.getenv("DB_PASSWORD", "")
    
    _db_url_env = os.getenv("DATABASE_URL")
    if _db_url_env:
        DATABASE_URL: str = _db_url_env
    elif DB_HOST:
        DATABASE_URL: str = f"mysql+pymysql://{DB_USER}:{DB_PASSWORD}@{DB_HOST}:{DB_PORT}/{DB_NAME}"
    else:
        # Default to SQLite for local development / testing without a local MySQL service
        DATABASE_URL: str = "sqlite:///./leafline_soil.db"

    # External Service URLs
    SOIL_AI_URL: str = os.getenv("SOIL_AI_URL", "http://localhost:9002/internal/soil-analyze")
    IDENTITY_SERVICE_URL: str = os.getenv("IDENTITY_SERVICE_URL", "http://localhost:8000/auth")
    
    # Soil Rules
    RULE_VERSION: str = "SUNFLOWER_RULES_V1"
    LIMITS: SoilNutrientLimits = SoilNutrientLimits()
    
    # Rate limits & Constraints
    SUBMISSION_RATE_LIMIT_PER_HOUR: int = 100
    MAX_CORRECTION_DAYS: int = 7
    MAX_AI_RETRIES: int = 3
    MAX_HISTORY_YEARS: int = 5

settings = Settings()
