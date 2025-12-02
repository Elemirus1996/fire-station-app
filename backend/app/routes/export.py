from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse, Response
from sqlalchemy.orm import Session
from pydantic import BaseModel
from io import BytesIO
from ..database import get_db
from ..models import Session as SessionModel, AdminUser
from ..utils.auth import get_current_user
from ..utils.permissions import check_permission
from ..services.qr_generator import QRGenerator
from ..services.pdf_generator import PDFGenerator

router = APIRouter(prefix="/api", tags=["export"])

# QR Code routes
@router.get("/sessions/{session_id}/qr")
async def get_session_qr(
    session_id: int,
    db: Session = Depends(get_db)
):
    """Generate QR code for session check-in"""
    session = db.query(SessionModel).filter(SessionModel.id == session_id).first()
    if not session:
        raise HTTPException(status_code=404, detail="Session nicht gefunden")
    
    if not session.is_active:
        raise HTTPException(status_code=400, detail="Session ist nicht aktiv")
    
    qr_bytes = QRGenerator.generate_qr_code(session_id)
    
    return Response(
        content=qr_bytes,
        media_type="image/png",
        headers={"Content-Disposition": f"inline; filename=session_{session_id}_qr.png"}
    )

class TokenValidateRequest(BaseModel):
    token: str

@router.post("/checkin/validate-token")
async def validate_checkin_token(request: TokenValidateRequest):
    """Validate QR code token"""
    payload = QRGenerator.validate_session_token(request.token)
    
    if not payload:
        raise HTTPException(status_code=400, detail="Ungültiger oder abgelaufener Token")
    
    return {
        "valid": True,
        "session_id": payload.get("session_id")
    }

# PDF Export routes
@router.get("/sessions/{session_id}/pdf")
async def export_session_pdf(
    session_id: int,
    db: Session = Depends(get_db),
    current_user: AdminUser = Depends(get_current_user)
):
    """Export session as PDF"""
    check_permission(current_user, "reports:export")
    
    pdf_bytes = PDFGenerator.generate_session_pdf(db, session_id)
    
    if not pdf_bytes:
        raise HTTPException(status_code=404, detail="Session nicht gefunden")
    
    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={"Content-Disposition": f"attachment; filename=session_{session_id}.pdf"}
    )
