from datetime import date, datetime
from typing import Optional, Dict, Any, List
from pydantic import BaseModel, Field
from fastapi import APIRouter, Depends, HTTPException, status, Query
from fastapi.responses import HTMLResponse
from sqlalchemy.orm import Session

from backend.shared.database import get_db
from backend.shared.security import CurrentUser, get_current_user, require_roles, log_audit
from backend.modules.soil_data.service import SoilDataService
from backend.database.models import SoilSample, SoilMeasurement, SoilHealthResult, NutrientFlag

router = APIRouter(tags=["Soil Measurements"])

class SoilMeasurementSubmissionRequest(BaseModel):
    fieldId: str = Field(..., example="fld_0412")
    sampleDate: date = Field(..., example="2026-10-20")
    depthCm: float = Field(..., ge=0, le=100, example=20.0)
    nitrogenMgKg: float = Field(..., ge=0, le=1000, example=28.0)
    phosphorusMgKg: float = Field(..., ge=0, le=1000, example=22.0)
    potassiumMgKg: float = Field(..., ge=0, le=1500, example=180.0)
    ph: float = Field(..., ge=0.0, le=14.0, example=6.8)
    moisturePct: float = Field(..., ge=0.0, le=100.0, example=31.0)
    labReference: Optional[str] = Field(None, max_length=40, example="LAB-REF-9021")
    units: Optional[Dict[str, str]] = None

class SoilMeasurementCorrectionRequest(BaseModel):
    nitrogenMgKg: Optional[float] = Field(None, ge=0, le=1000)
    phosphorusMgKg: Optional[float] = Field(None, ge=0, le=1000)
    potassiumMgKg: Optional[float] = Field(None, ge=0, le=1500)
    ph: Optional[float] = Field(None, ge=0.0, le=14.0)
    moisturePct: Optional[float] = Field(None, ge=0.0, le=100.0)
    depthCm: Optional[float] = Field(None, ge=0.0, le=100.0)
    labReference: Optional[str] = Field(None, max_length=40)

@router.post("/soil-measurements", status_code=status.HTTP_202_ACCEPTED)
def submit_soil_sample(
    payload: SoilMeasurementSubmissionRequest,
    current_user: CurrentUser = Depends(require_roles(["field_operator", "administrator"])),
    db: Session = Depends(get_db)
):
    """
    POST /api/v1/soil/soil-measurements: Submit a new soil sample.
    Returns HTTP 202 Accepted with sampleId and state RECEIVED.
    """
    service = SoilDataService(db)
    result = service.submit_sample(
        current_user=current_user,
        field_id=payload.fieldId,
        sample_date=payload.sampleDate,
        depth_cm=payload.depthCm,
        nitrogen_mg_kg=payload.nitrogenMgKg,
        phosphorus_mg_kg=payload.phosphorusMgKg,
        potassium_mg_kg=payload.potassiumMgKg,
        ph=payload.ph,
        moisture_pct=payload.moisturePct,
        lab_reference=payload.labReference,
        units=payload.units
    )
    return result

@router.get("/soil-measurements/{id}")
def get_soil_sample(
    id: str,
    version: Optional[int] = None,
    current_user: CurrentUser = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    GET /api/v1/soil/soil-measurements/{id}: Read one sample.
    Allowed for owner Field Operator, assigned Agronomist, Administrator, or Service credential.
    Others get 404.
    """
    query = db.query(SoilSample).filter(SoilSample.id == id)
    if version:
        query = query.filter(SoilSample.version == version)
    else:
        query = query.filter(SoilSample.is_current == True)
    sample = query.first()

    if not sample or sample.state == "REMOVED":
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Sample not found")

    # Authorization check
    if current_user.role != "administrator" and not current_user.role.startswith("service_"):
        if current_user.role == "field_operator" and sample.owner_user_id != current_user.user_id:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Sample not found or unauthorized")
        if current_user.role in ("agronomist", "farmer") and "*" not in current_user.field_ids and sample.field_id not in current_user.field_ids:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Sample not found or unauthorized")

    # Fetch measurements
    meas = db.query(SoilMeasurement).filter(
        SoilMeasurement.sample_id == sample.id,
        SoilMeasurement.version == sample.version
    ).first()

    # Fetch health
    health = db.query(SoilHealthResult).filter(
        SoilHealthResult.sample_id == sample.id,
        SoilHealthResult.version == sample.version
    ).first()

    # Fetch flags
    flags = db.query(NutrientFlag).filter(
        NutrientFlag.sample_id == sample.id,
        NutrientFlag.version == sample.version
    ).all()

    return {
        "sampleId": sample.id,
        "version": sample.version,
        "supersedesId": sample.supersedes_id,
        "fieldId": sample.field_id,
        "ownerUserId": sample.owner_user_id,
        "sampleDate": sample.sample_date.isoformat(),
        "depthCm": sample.depth_cm,
        "labReference": sample.lab_reference,
        "state": sample.state,
        "createdAt": sample.created_at.isoformat(),
        "measurements": {
            "nitrogenMgKg": meas.nitrogen_mg_kg if meas else None,
            "phosphorusMgKg": meas.phosphorus_mg_kg if meas else None,
            "potassiumMgKg": meas.potassium_mg_kg if meas else None,
            "ph": meas.ph if meas else None,
            "moisturePct": meas.moisture_pct if meas else None
        } if meas else None,
        "health": {
            "status": health.health_status,
            "ruleVersion": health.rule_version,
            "modelVersion": health.model_version,
            "analysedAt": health.analysed_at.isoformat()
        } if health else None,
        "flags": [
            {
                "nutrient": f.nutrient,
                "state": f.state,
                "severity": f.severity,
                "ruleFlag": f.rule_flag,
                "aiFlag": f.ai_flag,
                "aiScore": f.ai_score,
                "disagreement": f.disagreement
            }
            for f in flags
        ]
    }

@router.post("/soil-measurements/{id}/corrections", status_code=status.HTTP_202_ACCEPTED)
def correct_soil_sample(
    id: str,
    payload: SoilMeasurementCorrectionRequest,
    current_user: CurrentUser = Depends(require_roles(["field_operator", "administrator"])),
    db: Session = Depends(get_db)
):
    """
    POST /api/v1/soil/soil-measurements/{id}/corrections: Correct a sample within 7 days.
    Creates a new version pointing to previous version. Old version is preserved.
    """
    service = SoilDataService(db)
    changed = payload.dict(exclude_unset=True)
    result = service.correct_sample(current_user, id, changed)
    return result

@router.get("/soil-data")
def get_soil_data(
    fieldId: str = Query(..., description="Field identifier"),
    fromDate: Optional[date] = Query(None, alias="from"),
    toDate: Optional[date] = Query(None, alias="to"),
    page: int = Query(1, ge=1),
    size: int = Query(20, ge=1, le=100),
    current_user: CurrentUser = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    GET /api/v1/soil/soil-data: Measurement values for a field.
    Allowed for AI Analytics, Plant Health, assigned Agronomist, owner Field Operator.
    Returns READY samples only. No farmer names.
    """
    if current_user.role != "administrator" and not current_user.role.startswith("service_"):
        if "*" not in current_user.field_ids and fieldId not in current_user.field_ids:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied for field")

    query = db.query(SoilSample).filter(
        SoilSample.field_id == fieldId,
        SoilSample.state == "READY",
        SoilSample.is_current == True
    )
    if fromDate:
        query = query.filter(SoilSample.sample_date >= fromDate)
    if toDate:
        query = query.filter(SoilSample.sample_date <= toDate)

    total = query.count()
    samples = query.order_by(SoilSample.sample_date.desc()).offset((page - 1) * size).limit(size).all()

    items = []
    for s in samples:
        meas = db.query(SoilMeasurement).filter(
            SoilMeasurement.sample_id == s.id,
            SoilMeasurement.version == s.version
        ).first()
        items.append({
            "sampleId": s.id,
            "version": s.version,
            "fieldId": s.field_id,
            "sampleDate": s.sample_date.isoformat(),
            "depthCm": s.depth_cm,
            "nitrogenMgKg": meas.nitrogen_mg_kg if meas else None,
            "phosphorusMgKg": meas.phosphorus_mg_kg if meas else None,
            "potassiumMgKg": meas.potassium_mg_kg if meas else None,
            "ph": meas.ph if meas else None,
            "moisturePct": meas.moisture_pct if meas else None
        })

    return {
        "fieldId": fieldId,
        "total": total,
        "page": page,
        "size": size,
        "samples": items
    }

@router.get("/soil-measurements/{id}/report")
def get_soil_health_report(
    id: str,
    version: Optional[int] = None,
    format: Optional[str] = Query("json", description="json or html"),
    current_user: CurrentUser = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Download/Generate a formal Soil Health Diagnostic Report.
    Includes benchmark ranges, measured values, severities, AI view, and agronomic advice.
    """
    query = db.query(SoilSample).filter(SoilSample.id == id)
    if version:
        query = query.filter(SoilSample.version == version)
    else:
        query = query.filter(SoilSample.is_current == True)
    sample = query.first()

    if not sample or sample.state == "REMOVED":
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Sample not found")

    meas = db.query(SoilMeasurement).filter(
        SoilMeasurement.sample_id == sample.id,
        SoilMeasurement.version == sample.version
    ).first()

    health = db.query(SoilHealthResult).filter(
        SoilHealthResult.sample_id == sample.id,
        SoilHealthResult.version == sample.version
    ).first()

    flags = db.query(NutrientFlag).filter(
        NutrientFlag.sample_id == sample.id,
        NutrientFlag.version == sample.version
    ).all()

    # Recommendations based on status
    recommendations = []
    for f in flags:
        if f.state in ("DEFICIENT", "LOW"):
            if f.nutrient == "nitrogen":
                recommendations.append("Apply nitrogen-rich starter fertilizer (e.g. ammonium nitrate or urea) to support vegetative sunflower canopy growth.")
            elif f.nutrient == "phosphorus":
                recommendations.append("Apply superphosphate or rock phosphate during pre-planting to stimulate root system establishment.")
            elif f.nutrient == "potassium":
                recommendations.append("Incorporate potassium sulfate or muriate of potash to enhance sunflower stem strength and drought resistance.")
            elif f.nutrient == "ph":
                recommendations.append("Soil is acidic (< 6.0). Consider agricultural lime (calcium carbonate) application to neutralize soil pH.")
            elif f.nutrient == "moisture":
                recommendations.append("Soil moisture is low (< 15%). Schedule drip or pivot irrigation prior to flowering stage.")
        elif f.state in ("EXCESS", "HIGH"):
            if f.nutrient == "nitrogen":
                recommendations.append("Nitrogen excess detected (> 40 mg/kg). Suspend nitrogen fertilization to avoid excessive foliage and disease susceptibility.")
            elif f.nutrient == "ph":
                recommendations.append("Soil is alkaline (> 7.5). Monitor micronutrient availability (Iron, Zinc) and consider elemental sulfur application.")
            elif f.nutrient == "moisture":
                recommendations.append("High soil moisture (> 45%). Ensure adequate sub-surface drainage to prevent waterlogging and Sclerotinia root rot.")

    if not recommendations:
        recommendations.append("All measured parameters are within optimal sunflower cultivation ranges. Maintain current soil management practices.")

    report_payload = {
        "reportTitle": "Sunflower Soil Health & Nutrient Diagnostic Certificate",
        "service": "Leafline Platform - Service 2: Nutrient & Soil Intelligence",
        "sampleId": sample.id,
        "fieldId": sample.field_id,
        "sampleDate": sample.sample_date.isoformat(),
        "version": sample.version,
        "labReference": sample.lab_reference,
        "sampleDepthCm": sample.depth_cm,
        "healthStatus": health.health_status if health else "ANALYSING",
        "ruleVersion": health.rule_version if health else "SUNFLOWER_RULES_V1",
        "aiModel": health.model_version if health else "soil-ai-1.2.0",
        "analysedAt": health.analysed_at.isoformat() if health else None,
        "measurements": {
            "nitrogen": {"value": meas.nitrogen_mg_kg if meas else None, "unit": "mg/kg", "goodRange": "20 – 40"},
            "phosphorus": {"value": meas.phosphorus_mg_kg if meas else None, "unit": "mg/kg", "goodRange": "15 – 30"},
            "potassium": {"value": meas.potassium_mg_kg if meas else None, "unit": "mg/kg", "goodRange": "120 – 250"},
            "ph": {"value": meas.ph if meas else None, "unit": "pH", "goodRange": "6.0 – 7.5"},
            "moisture": {"value": meas.moisture_pct if meas else None, "unit": "%", "goodRange": "15 – 45%"}
        },
        "flags": [
            {
                "nutrient": f.nutrient,
                "status": f.state,
                "severity": f.severity,
                "aiView": f.ai_flag,
                "aiConfidence": f"{int(f.ai_score * 100)}%" if f.ai_score else None,
                "disagreement": f.disagreement
            }
            for f in flags
        ],
        "recommendations": recommendations,
        "generatedAt": datetime.utcnow().isoformat()
    }

    if format == "html":
        # Render a standalone, printable HTML certificate
        status_color = "#10b981" if report_payload["healthStatus"] == "GOOD" else "#f59e0b" if report_payload["healthStatus"] == "FAIR" else "#ef4444"
        table_rows = "".join([
            f"""<tr>
                <td style='padding:10px; border-bottom:1px solid #e2e8f0; font-weight:bold; text-transform:capitalize;'>{f['nutrient']}</td>
                <td style='padding:10px; border-bottom:1px solid #e2e8f0; font-family:monospace; font-weight:bold;'>{report_payload['measurements'][f['nutrient']]['value']} {report_payload['measurements'][f['nutrient']]['unit']}</td>
                <td style='padding:10px; border-bottom:1px solid #e2e8f0;'>{report_payload['measurements'][f['nutrient']]['goodRange']}</td>
                <td style='padding:10px; border-bottom:1px solid #e2e8f0;'><span style='background:#f1f5f9; padding:3px 8px; border-radius:6px; font-weight:bold; font-size:11px;'>{f['status']} {f['severity'] or ''}</span></td>
                <td style='padding:10px; border-bottom:1px solid #e2e8f0; font-family:monospace; color:#15803d;'>{f['aiView'] or 'AI Pending'} {f['aiConfidence'] or ''}</td>
            </tr>"""
            for f in report_payload["flags"]
        ])
        rec_list = "".join([f"<li style='margin-bottom:6px;'>{r}</li>" for r in recommendations])
        html_content = f"""<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>Leafline Soil Certificate - {sample.id}</title>
    <style>
        body {{ font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; margin: 40px; color: #1e293b; background: #fff; }}
        .header {{ border-bottom: 2px solid #052e16; padding-bottom: 16px; margin-bottom: 24px; display: flex; justify-content: space-between; align-items: flex-start; }}
        .badge {{ background-color: {status_color}; color: white; padding: 6px 14px; border-radius: 9999px; font-weight: 800; font-size: 13px; text-transform: uppercase; }}
        .meta-grid {{ display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; margin-bottom: 24px; background: #f8fafc; padding: 16px; border-radius: 12px; border: 1px solid #e2e8f0; font-size: 13px; }}
        table {{ width: 100%; border-collapse: collapse; margin-bottom: 24px; font-size: 13px; }}
        th {{ background: #f1f5f9; text-align: left; padding: 10px; font-size: 12px; text-transform: uppercase; letter-spacing: 0.05em; color: #475569; }}
        .rec-box {{ background: #f0fdf4; border: 1px solid #bbf7d0; padding: 16px; border-radius: 12px; margin-bottom: 24px; font-size: 13px; }}
        .rec-box h4 {{ margin: 0 0 10px 0; color: #14532d; font-size: 13px; text-transform: uppercase; }}
        @media print {{
            body {{ margin: 0; padding: 20px; }}
            .no-print {{ display: none !important; }}
        }}
    </style>
</head>
<body>
    <div class="no-print" style="margin-bottom:20px; display:flex; gap:10px;">
        <button onclick="window.print()" style="background:#052e16; color:white; border:none; padding:10px 20px; border-radius:8px; font-weight:bold; cursor:pointer;">🖨️ Print / Save as PDF</button>
    </div>
    <div class="header">
        <div>
            <h1 style="color:#052e16; margin:0 0 6px 0; font-size:24px;">LEAFLINE SOIL & NUTRIENT INTELLIGENCE</h1>
            <p style="margin:0; font-size:13px; color:#64748b;">Sunflower Agronomic Health Diagnostic Certificate</p>
        </div>
        <div style="text-align:right;">
            <span class="badge">{report_payload['healthStatus']}</span>
            <p style="margin:6px 0 0 0; font-size:11px; color:#64748b;">Rule Engine: {report_payload['ruleVersion']}</p>
        </div>
    </div>

    <div class="meta-grid">
        <div><strong>Sample ID:</strong><br><span style="font-family:monospace;">{sample.id} (v{sample.version})</span></div>
        <div><strong>Field ID:</strong><br><span style="font-family:monospace;">{sample.field_id}</span></div>
        <div><strong>Sample Date:</strong><br>{sample.sample_date.isoformat()}</div>
        <div><strong>AI Model:</strong><br><span style="color:#15803d; font-weight:bold;">{report_payload['aiModel']}</span></div>
    </div>

    <h3 style="font-size:14px; text-transform:uppercase; color:#0f172a; margin-bottom:10px;">Nutrient & Soil Diagnostics</h3>
    <table>
        <thead>
            <tr>
                <th>Parameter</th>
                <th>Measured Value</th>
                <th>Good Benchmark</th>
                <th>Status</th>
                <th>AI Validation</th>
            </tr>
        </thead>
        <tbody>
            {table_rows}
        </tbody>
    </table>

    <div class="rec-box">
        <h4>Agronomic Field Recommendations</h4>
        <ul style="margin:0; padding-left:20px; color:#14532d;">
            {rec_list}
        </ul>
    </div>

    <div style="border-top:1px solid #e2e8f0; padding-top:12px; font-size:11px; color:#94a3b8; display:flex; justify-content:space-between;">
        <span>Generated by Leafline Nutrient & Soil Intelligence Service (Service 2)</span>
        <span>Certificate Timestamp: {report_payload['generatedAt']}</span>
    </div>
</body>
</html>"""
        return HTMLResponse(content=html_content, status_code=200)

    return report_payload

