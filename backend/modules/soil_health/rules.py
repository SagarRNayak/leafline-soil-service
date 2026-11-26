from typing import List, Dict, Any, Literal
from backend.config.settings import settings

HealthStatus = Literal["GOOD", "FAIR", "POOR"]

def calculate_soil_health(flags: List[Dict[str, Any]]) -> HealthStatus:
    """
    NS-FR-05 & Section 7.3:
    GOOD: All five values are within their good ranges (state == 'OK').
    FAIR: One value is outside its good range, and none is severe.
    POOR: Two or more values are outside their good ranges, or any one value is severe.
    """
    outside_range_count = 0
    has_severe = False

    for f in flags:
        state = f.get("state")
        severity = f.get("severity")
        if state != "OK":
            outside_range_count += 1
            if severity == "severe":
                has_severe = True

    if has_severe or outside_range_count >= 2:
        return "POOR"
    elif outside_range_count == 1:
        return "FAIR"
    else:
        return "GOOD"
