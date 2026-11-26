from typing import Optional, Tuple
from backend.config.settings import settings

def calculate_severity(value: float, low_limit: float, high_limit: float) -> Tuple[str, Optional[str]]:
    """
    Returns (status, severity)
    status: DEFICIENT, OK, EXCESS
    severity: slight, moderate, severe (or None for OK)
    
    Severity rules:
    - Slight: within 10% of the limit (<= 10%)
    - Moderate: from 10% to 25% (10% < pct <= 25%)
    - Severe: beyond 25% (> 25%)
    """
    if value < low_limit:
        pct = ((low_limit - value) / low_limit) * 100.0
        if pct <= settings.LIMITS.SLIGHT_PCT:
            severity = "slight"
        elif pct <= settings.LIMITS.MODERATE_PCT:
            severity = "moderate"
        else:
            severity = "severe"
        return "DEFICIENT", severity
    elif value > high_limit:
        pct = ((value - high_limit) / high_limit) * 100.0
        if pct <= settings.LIMITS.SLIGHT_PCT:
            severity = "slight"
        elif pct <= settings.LIMITS.MODERATE_PCT:
            severity = "moderate"
        else:
            severity = "severe"
        return "EXCESS", severity
    else:
        return "OK", None

def get_nutrient_severity(nutrient: str, value: float) -> Tuple[str, Optional[str]]:
    limits = settings.LIMITS
    mapping = {
        "nitrogen": (limits.N_LOW, limits.N_HIGH),
        "phosphorus": (limits.P_LOW, limits.P_HIGH),
        "potassium": (limits.K_LOW, limits.K_HIGH),
        "ph": (limits.PH_LOW, limits.PH_HIGH),
        "moisture": (limits.MOISTURE_LOW, limits.MOISTURE_HIGH),
    }
    low, high = mapping[nutrient]
    return calculate_severity(value, low, high)
