from datetime import date
from typing import Optional
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from backend.shared.database import get_db
from backend.shared.security import CurrentUser, get_current_user
from backend.modules.history.service import SoilHistoryService

router = APIRouter(tags=["Soil History"])

@router.get("/soil-history")
def get_soil_history(
    fieldId: Optional[str] = Query(None, description="Field identifier"),
    region: Optional[str] = Query(None, description="Agricultural region"),
    fromDate: Optional[date] = Query(None, alias="from"),
    toDate: Optional[date] = Query(None, alias="to"),
    page: int = Query(1, ge=1),
    size: int = Query(20, ge=1, le=100),
    anonymous: Optional[bool] = Query(None, description="Enforce anonymous view"),
    current_user: CurrentUser = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    GET /api/v1/soil/soil-history: Historical soil measurements and trends.
    For Breeder/Researcher: always returns anonymous made-up codes and regions only (no farmer names or exact locations).
    """
    service = SoilHistoryService(db)
    return service.get_soil_history(
        current_user=current_user,
        field_id=fieldId,
        region=region,
        from_date=fromDate,
        to_date=toDate,
        page=page,
        size=size,
        anonymous=anonymous
    )
