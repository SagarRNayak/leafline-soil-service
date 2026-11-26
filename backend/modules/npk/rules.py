from typing import Dict, Literal
from backend.config.settings import settings

FlagState = Literal["LOW", "OK", "HIGH"]

def evaluate_nitrogen(n: float) -> FlagState:
    limits = settings.LIMITS
    if n < limits.N_LOW:
        return "LOW"
    elif n > limits.N_HIGH:
        return "HIGH"
    return "OK"

def evaluate_phosphorus(p: float) -> FlagState:
    limits = settings.LIMITS
    if p < limits.P_LOW:
        return "LOW"
    elif p > limits.P_HIGH:
        return "HIGH"
    return "OK"

def evaluate_potassium(k: float) -> FlagState:
    limits = settings.LIMITS
    if k < limits.K_LOW:
        return "LOW"
    elif k > limits.K_HIGH:
        return "HIGH"
    return "OK"

def analyze_npk(n: float, p: float, k: float) -> Dict[str, FlagState]:
    return {
        "nitrogen": evaluate_nitrogen(n),
        "phosphorus": evaluate_phosphorus(p),
        "potassium": evaluate_potassium(k)
    }
