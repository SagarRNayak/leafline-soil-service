import hashlib
from sqlalchemy.orm import Session
from backend.database.models import SoilRefMap

def get_or_create_anonymous_code(db: Session, field_id: str, default_region: str = "Central Plains") -> str:
    """
    NS-BR-06 & NS-UR-09:
    Researchers never see a name, farm name, owner ID, or exact location.
    Each field gets an anonymized made-up code stored in soil_ref_map.
    """
    mapping = db.query(SoilRefMap).filter(SoilRefMap.field_id == field_id).first()
    if not mapping:
        # Create deterministic yet anonymized code
        hash_digest = hashlib.sha256(field_id.encode("utf-8")).hexdigest()[:6].upper()
        code = f"FLD-ANON-{hash_digest}"
        mapping = SoilRefMap(
            made_up_code=code,
            field_id=field_id,
            region=default_region
        )
        db.add(mapping)
        db.commit()
        db.refresh(mapping)
    return mapping.made_up_code, mapping.region
