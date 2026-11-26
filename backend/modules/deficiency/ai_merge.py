from typing import Dict, Any, List, Optional

def merge_rule_and_ai_flags(
    rule_flags: List[Dict[str, Any]],
    ai_flags: Optional[List[Dict[str, Any]]] = None,
    model_version: Optional[str] = None
) -> List[Dict[str, Any]]:
    """
    Merges rule-based flags with Soil & Nutrient AI view.
    Rules:
    - Retain rule-based flag as the primary truth.
    - If AI agrees, record ai_flag and confidence score, disagreement = False.
    - If AI disagrees, retain rule-based flag, record ai_flag, disagreement = True.
    - If AI is unavailable (None or empty), ai_flag = None, disagreement = False.
    """
    ai_map = {}
    if ai_flags:
        for f in ai_flags:
            nutrient = f.get("nutrient", "").lower()
            ai_map[nutrient] = f

    merged = []
    for rf in rule_flags:
        nutrient = rf["nutrient"].lower()
        rule_state = rf["state"] # DEFICIENT, OK, EXCESS or LOW, OK, HIGH
        severity = rf.get("severity")
        
        ai_entry = ai_map.get(nutrient)
        if ai_entry:
            ai_state = ai_entry.get("state")
            ai_score = ai_entry.get("score")
            # Normalize state comparisons (LOW == DEFICIENT, HIGH == EXCESS)
            norm_rule = "DEFICIENT" if rule_state in ("LOW", "DEFICIENT") else ("EXCESS" if rule_state in ("HIGH", "EXCESS") else "OK")
            norm_ai = "DEFICIENT" if ai_state in ("LOW", "DEFICIENT") else ("EXCESS" if ai_state in ("HIGH", "EXCESS") else "OK")
            
            disagreement = (norm_rule != norm_ai)
            merged.append({
                "nutrient": nutrient,
                "state": norm_rule, # Retain rule-based flag as primary
                "severity": severity,
                "rule_flag": norm_rule,
                "ai_flag": norm_ai,
                "ai_score": ai_score,
                "model_version": model_version or "soil-ai-1.0.0",
                "disagreement": disagreement
            })
        else:
            norm_rule = "DEFICIENT" if rule_state in ("LOW", "DEFICIENT") else ("EXCESS" if rule_state in ("HIGH", "EXCESS") else "OK")
            merged.append({
                "nutrient": nutrient,
                "state": norm_rule,
                "severity": severity,
                "rule_flag": norm_rule,
                "ai_flag": None,
                "ai_score": None,
                "model_version": model_version,
                "disagreement": False
            })

    return merged
