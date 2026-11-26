from typing import Dict, Literal
from backend.config.settings import settings

FlagState = Literal["LOW", "OK", "HIGH"]

def evaluate_ph(ph: float) -> FlagState:
    limits = settings.LIMITS
    if ph < limits.PH_LOW:
        return "LOW"
    elif ph > limits.PH_HIGH:
        return "HIGH"
    return "OK"

def evaluate_moisture(moisture: float) -> FlagState:
    limits = settings.LIMITS
    if moisture < limits.MOISTURE_LOW:
        return "LOW"
    elif moisture > limits.MOISTURE_HIGH:
        return "HIGH"
    return "OK"

def analyze_ph_moisture(ph: float, moisture: float) -> Dict[str, FlagState]:
    return {
        "ph": evaluate_ph(ph),
        "moisture": evaluate_moisture(moisture)
    }
