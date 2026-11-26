from datetime import date, datetime, timedelta
from typing import Dict, Any, Tuple
from fastapi import HTTPException, status
from backend.config.settings import settings

def validate_measurement_ranges(
    n: float, p: float, k: float, ph: float, moisture: float, depth: float
) -> None:
    """
    NS-BR-02: A value outside its possible range is refused (422).
    Nitrogen: 0-1000 mg/kg
    Phosphorus: 0-1000 mg/kg
    Potassium: 0-1500 mg/kg
    pH: 0.0-14.0 (1 decimal place)
    Moisture: 0-100 %
    Depth: 0-100 cm
    """
    errors = []
    if not (0.0 <= n <= 1000.0):
        errors.append(f"Nitrogen ({n} mg/kg) must be between 0 and 1000 mg/kg")
    if not (0.0 <= p <= 1000.0):
        errors.append(f"Phosphorus ({p} mg/kg) must be between 0 and 1000 mg/kg")
    if not (0.0 <= k <= 1500.0):
        errors.append(f"Potassium ({k} mg/kg) must be between 0 and 1500 mg/kg")
    if not (0.0 <= ph <= 14.0):
        errors.append(f"pH ({ph}) must be between 0.0 and 14.0")
    if round(ph, 1) != ph:
        errors.append(f"pH ({ph}) must have at most 1 decimal place")
    if not (0.0 <= moisture <= 100.0):
        errors.append(f"Moisture ({moisture}%) must be between 0 and 100%")
    if not (0.0 <= depth <= 100.0):
        errors.append(f"Depth ({depth} cm) must be between 0 and 100 cm")

    if errors:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail={"message": "Invalid measurement range", "errors": errors}
        )

def validate_sample_date(sample_date: date) -> None:
    """
    NS-BR-07: Sample date cannot be in the future or more than 5 years old.
    """
    today = date.today()
    if sample_date > today:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Sample date cannot be in the future"
        )
    five_years_ago = today - timedelta(days=5 * 365.25)
    if sample_date < five_years_ago:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Sample date cannot be older than 5 years"
        )

def validate_units(units: Dict[str, str]) -> None:
    """
    NS-BR-04: Units are fixed: mg/kg for NPK, none for pH, percent for moisture.
    Another unit is refused with 422, never converted silently.
    """
    expected = {
        "nitrogen": "mg/kg",
        "phosphorus": "mg/kg",
        "potassium": "mg/kg",
        "ph": "none",
        "moisture": "%"
    }
    for key, expected_unit in expected.items():
        if key in units and units[key].lower() != expected_unit:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail=f"Invalid unit for {key}: expected '{expected_unit}', got '{units[key]}'"
            )
