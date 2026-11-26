import os
import random
import pytest
from datetime import date, timedelta
from fastapi.testclient import TestClient

from backend.main import app, worker
from backend.shared.database import Base, engine
from backend.database.seed.seed_data import seed_database

client = TestClient(app)

@pytest.fixture(scope="module", autouse=True)
def setup_test_db():
    seed_database()
    yield

def test_health_check():
    response = client.get("/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "healthy"
    assert data["service"] == "Leafline Nutrient & Soil Service"
    assert data["database"] == "connected"

def test_password_strength_enforcement():
    payload = {
        "fullName": "Test User",
        "email": "shortpass@leafline.ag",
        "organisation": "Leafline Test",
        "requestedRole": "field_operator",
        "password": "Short1",
        "confirmPassword": "Short1"
    }
    res = client.post("/auth/register", json=payload)
    assert res.status_code == 422

    payload["password"] = "AllLettersPasswordNoDigits"
    payload["confirmPassword"] = "AllLettersPasswordNoDigits"
    res = client.post("/auth/register", json=payload)
    assert res.status_code == 422

def test_login_and_token_generation():
    res = client.post("/auth/login", json={
        "email": "operator@leafline.ag",
        "password": "Operator123456"
    })
    assert res.status_code == 200
    data = res.json()
    assert "accessToken" in data
    assert "refreshToken" in data
    assert data["user"]["role"] == "field_operator"

def test_soil_sample_submission_and_worker_processing():
    login_res = client.post("/auth/login", json={
        "email": "operator@leafline.ag",
        "password": "Operator123456"
    })
    token = login_res.json()["accessToken"]
    headers = {"Authorization": f"Bearer {token}"}

    # Generate a unique depth to ensure test idempotency across runs
    test_depth = float(random.randint(50, 95))
    sample_date = (date.today() - timedelta(days=3)).isoformat()
    submission_data = {
        "fieldId": "fld_0412",
        "sampleDate": sample_date,
        "depthCm": test_depth,
        "nitrogenMgKg": 25.0,
        "phosphorusMgKg": 20.0,
        "potassiumMgKg": 180.0,
        "ph": 6.8,
        "moisturePct": 25.0,
        "labReference": f"LAB-TEST-{int(test_depth)}"
    }

    # 1. Submit sample -> HTTP 202
    sub_res = client.post("/api/v1/soil/soil-measurements", json=submission_data, headers=headers)
    assert sub_res.status_code == 202
    sub_data = sub_res.json()
    sample_id = sub_data["sampleId"]
    assert sub_data["state"] == "RECEIVED"

    # 2. Duplicate submission test -> HTTP 409
    dup_res = client.post("/api/v1/soil/soil-measurements", json=submission_data, headers=headers)
    assert dup_res.status_code == 409

    # 3. Trigger worker analysis
    worker.run_once()

    # 4. Read sample detail -> state should be READY, health should be GOOD
    get_res = client.get(f"/api/v1/soil/soil-measurements/{sample_id}", headers=headers)
    assert get_res.status_code == 200
    get_data = get_res.json()
    assert get_data["state"] == "READY"
    assert get_data["health"]["status"] == "GOOD"
    assert len(get_data["flags"]) == 5

    # 5. Correct sample within 7 days -> HTTP 202, creates version 2
    correct_res = client.post(
        f"/api/v1/soil/soil-measurements/{sample_id}/corrections",
        json={"nitrogenMgKg": 16.0}, # Changes N to deficient
        headers=headers
    )
    assert correct_res.status_code == 202
    assert correct_res.json()["version"] == 2

    # Process corrected sample with worker
    worker.run_once()

    # Read version 2: N should be DEFICIENT, health should be FAIR
    v2_res = client.get(f"/api/v1/soil/soil-measurements/{sample_id}?version=2", headers=headers)
    assert v2_res.status_code == 200
    assert v2_res.json()["health"]["status"] == "FAIR"

    # Old version 1 should still exist and be intact (ADR-S1)
    v1_res = client.get(f"/api/v1/soil/soil-measurements/{sample_id}?version=1", headers=headers)
    assert v1_res.status_code == 200
    assert v1_res.json()["version"] == 1
    assert v1_res.json()["health"]["status"] == "GOOD"

def test_researcher_anonymous_history():
    res = client.post("/auth/login", json={
        "email": "researcher@leafline.ag",
        "password": "Researcher123456"
    })
    token = res.json()["accessToken"]
    headers = {"Authorization": f"Bearer {token}"}

    hist_res = client.get("/api/v1/soil/soil-history", headers=headers)
    assert hist_res.status_code == 200
    hist_data = hist_res.json()
    assert hist_data["isAnonymous"] is True
    assert len(hist_data["items"]) > 0

    first_item = hist_data["items"][0]
    assert "anonymousFieldCode" in first_item
    assert first_item["anonymousFieldCode"].startswith("FLD-ANON-")
    assert "region" in first_item

    # Check privacy: NO personal/location disclosure
    assert "farmerName" not in first_item
    assert "farmName" not in first_item
    assert "ownerUserId" not in first_item
    assert "fieldId" not in first_item
