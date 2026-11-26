import pytest
from datetime import date, timedelta
from fastapi import HTTPException
from backend.modules.soil_data.rules import validate_measurement_ranges, validate_sample_date, validate_units
from backend.modules.npk.rules import evaluate_nitrogen, evaluate_phosphorus, evaluate_potassium, analyze_npk
from backend.modules.ph_moisture.rules import evaluate_ph, evaluate_moisture, analyze_ph_moisture
from backend.modules.deficiency.rules import calculate_severity, get_nutrient_severity
from backend.modules.soil_health.rules import calculate_soil_health

def test_measurement_range_valid():
    # Valid ranges: N=25, P=20, K=180, pH=6.5, moisture=30.0, depth=20.0
    validate_measurement_ranges(25.0, 20.0, 180.0, 6.5, 30.0, 20.0)

def test_measurement_range_out_of_bounds():
    # Negative N
    with pytest.raises(HTTPException) as exc:
        validate_measurement_ranges(-1.0, 20.0, 180.0, 6.5, 30.0, 20.0)
    assert exc.value.status_code == 422

    # N > 1000
    with pytest.raises(HTTPException) as exc:
        validate_measurement_ranges(1005.0, 20.0, 180.0, 6.5, 30.0, 20.0)
    assert exc.value.status_code == 422

    # K > 1500
    with pytest.raises(HTTPException) as exc:
        validate_measurement_ranges(25.0, 20.0, 1501.0, 6.5, 30.0, 20.0)
    assert exc.value.status_code == 422

    # pH > 14.0 or more than 1 decimal place
    with pytest.raises(HTTPException) as exc:
        validate_measurement_ranges(25.0, 20.0, 180.0, 15.0, 30.0, 20.0)
    assert exc.value.status_code == 422

    with pytest.raises(HTTPException) as exc:
        validate_measurement_ranges(25.0, 20.0, 180.0, 6.55, 30.0, 20.0)
    assert exc.value.status_code == 422

    # Moisture > 100
    with pytest.raises(HTTPException) as exc:
        validate_measurement_ranges(25.0, 20.0, 180.0, 6.5, 105.0, 20.0)
    assert exc.value.status_code == 422

def test_sample_date_validation():
    today = date.today()
    validate_sample_date(today)
    validate_sample_date(today - timedelta(days=365))

    # Future date rejected
    with pytest.raises(HTTPException) as exc:
        validate_sample_date(today + timedelta(days=1))
    assert exc.value.status_code == 422

    # > 5 years old rejected
    with pytest.raises(HTTPException) as exc:
        validate_sample_date(today - timedelta(days=5 * 366 + 10))
    assert exc.value.status_code == 422

def test_units_validation():
    valid_units = {
        "nitrogen": "mg/kg",
        "phosphorus": "mg/kg",
        "potassium": "mg/kg",
        "ph": "none",
        "moisture": "%"
    }
    validate_units(valid_units)

    # Invalid unit rejected (NS-BR-04)
    with pytest.raises(HTTPException) as exc:
        validate_units({"nitrogen": "ppm"})
    assert exc.value.status_code == 422

def test_npk_boundaries():
    # Nitrogen limits: LOW < 20, GOOD 20-40, HIGH > 40
    assert evaluate_nitrogen(19.9) == "LOW"
    assert evaluate_nitrogen(20.0) == "OK"
    assert evaluate_nitrogen(30.0) == "OK"
    assert evaluate_nitrogen(40.0) == "OK"
    assert evaluate_nitrogen(40.1) == "HIGH"

    # Phosphorus limits: LOW < 15, GOOD 15-30, HIGH > 30
    assert evaluate_phosphorus(14.9) == "LOW"
    assert evaluate_phosphorus(15.0) == "OK"
    assert evaluate_phosphorus(22.0) == "OK"
    assert evaluate_phosphorus(30.0) == "OK"
    assert evaluate_phosphorus(30.1) == "HIGH"

    # Potassium limits: LOW < 120, GOOD 120-250, HIGH > 250
    assert evaluate_potassium(119.9) == "LOW"
    assert evaluate_potassium(120.0) == "OK"
    assert evaluate_potassium(180.0) == "OK"
    assert evaluate_potassium(250.0) == "OK"
    assert evaluate_potassium(250.1) == "HIGH"

def test_ph_moisture_boundaries():
    # pH: LOW < 6.0, GOOD 6.0-7.5, HIGH > 7.5
    assert evaluate_ph(5.9) == "LOW"
    assert evaluate_ph(6.0) == "OK"
    assert evaluate_ph(7.0) == "OK"
    assert evaluate_ph(7.5) == "OK"
    assert evaluate_ph(7.6) == "HIGH"

    # Moisture: LOW < 15, GOOD 15-45, HIGH > 45
    assert evaluate_moisture(14.9) == "LOW"
    assert evaluate_moisture(15.0) == "OK"
    assert evaluate_moisture(30.0) == "OK"
    assert evaluate_moisture(45.0) == "OK"
    assert evaluate_moisture(45.1) == "HIGH"

def test_severity_rules():
    # Nitrogen limit: 20 low.
    # 10% below 20 is 18.0 -> slight
    # 20% below 20 is 16.0 -> moderate
    # 30% below 20 is 14.0 -> severe
    st, sev = get_nutrient_severity("nitrogen", 18.5)
    assert st == "DEFICIENT" and sev == "slight"

    st, sev = get_nutrient_severity("nitrogen", 16.0)
    assert st == "DEFICIENT" and sev == "moderate"

    st, sev = get_nutrient_severity("nitrogen", 13.0)
    assert st == "DEFICIENT" and sev == "severe"

    # OK has no severity
    st, sev = get_nutrient_severity("nitrogen", 25.0)
    assert st == "OK" and sev is None

    # High Nitrogen (Limit 40)
    # 43 is 7.5% above -> slight
    st, sev = get_nutrient_severity("nitrogen", 43.0)
    assert st == "EXCESS" and sev == "slight"

    # 48 is 20% above -> moderate
    st, sev = get_nutrient_severity("nitrogen", 48.0)
    assert st == "EXCESS" and sev == "moderate"

    # 55 is 37.5% above -> severe
    st, sev = get_nutrient_severity("nitrogen", 55.0)
    assert st == "EXCESS" and sev == "severe"

def test_soil_health_combinations():
    # 1. All OK -> GOOD
    flags_good = [
        {"nutrient": "nitrogen", "state": "OK", "severity": None},
        {"nutrient": "phosphorus", "state": "OK", "severity": None},
        {"nutrient": "potassium", "state": "OK", "severity": None},
        {"nutrient": "ph", "state": "OK", "severity": None},
        {"nutrient": "moisture", "state": "OK", "severity": None},
    ]
    assert calculate_soil_health(flags_good) == "GOOD"

    # 2. One outside good range, slight/moderate -> FAIR
    flags_fair = [
        {"nutrient": "nitrogen", "state": "DEFICIENT", "severity": "slight"},
        {"nutrient": "phosphorus", "state": "OK", "severity": None},
        {"nutrient": "potassium", "state": "OK", "severity": None},
        {"nutrient": "ph", "state": "OK", "severity": None},
        {"nutrient": "moisture", "state": "OK", "severity": None},
    ]
    assert calculate_soil_health(flags_fair) == "FAIR"

    # 3. Two outside good range -> POOR
    flags_poor_multiple = [
        {"nutrient": "nitrogen", "state": "DEFICIENT", "severity": "slight"},
        {"nutrient": "phosphorus", "state": "EXCESS", "severity": "slight"},
        {"nutrient": "potassium", "state": "OK", "severity": None},
        {"nutrient": "ph", "state": "OK", "severity": None},
        {"nutrient": "moisture", "state": "OK", "severity": None},
    ]
    assert calculate_soil_health(flags_poor_multiple) == "POOR"

    # 4. One outside good range but SEVERE -> POOR
    flags_poor_severe = [
        {"nutrient": "nitrogen", "state": "DEFICIENT", "severity": "severe"},
        {"nutrient": "phosphorus", "state": "OK", "severity": None},
        {"nutrient": "potassium", "state": "OK", "severity": None},
        {"nutrient": "ph", "state": "OK", "severity": None},
        {"nutrient": "moisture", "state": "OK", "severity": None},
    ]
    assert calculate_soil_health(flags_poor_severe) == "POOR"
