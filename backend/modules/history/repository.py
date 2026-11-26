from datetime import date
from typing import List, Optional, Tuple
from sqlalchemy.orm import Session
from sqlalchemy import desc
from backend.database.models import SoilSample, SoilMeasurement, SoilHealthResult, NutrientFlag, SoilRefMap

class SoilHistoryRepository:
    def __init__(self, db: Session):
        self.db = db

    def query_history(
        self,
        field_id: Optional[str] = None,
        region: Optional[str] = None,
        from_date: Optional[date] = None,
        to_date: Optional[date] = None,
        page: int = 1,
        size: int = 20
    ) -> Tuple[List[SoilSample], int]:
        query = self.db.query(SoilSample).filter(SoilSample.state != "REMOVED")

        if field_id:
            query = query.filter(SoilSample.field_id == field_id)

        if region:
            # Join with soil_ref_map for region filter
            query = query.join(SoilRefMap, SoilSample.field_id == SoilRefMap.field_id).filter(
                SoilRefMap.region.ilike(f"%{region}%")
            )

        if from_date:
            query = query.filter(SoilSample.sample_date >= from_date)
        if to_date:
            query = query.filter(SoilSample.sample_date <= to_date)

        total = query.count()
        offset = (page - 1) * size
        results = query.order_by(desc(SoilSample.sample_date), desc(SoilSample.created_at)).offset(offset).limit(size).all()
        return results, total

    def get_field_region(self, field_id: str) -> str:
        mapping = self.db.query(SoilRefMap).filter(SoilRefMap.field_id == field_id).first()
        return mapping.region if mapping else "General Agricultural Region"
