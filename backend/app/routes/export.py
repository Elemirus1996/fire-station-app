from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import Response
from sqlalchemy.orm import Session
from ..database import get_db
from ..models import AdminUser
from ..utils.auth import get_current_user
from ..utils.permissions import check_permission
from ..services.pdf_generator import PDFGenerator

router = APIRouter(prefix="/api/export", tags=["export"])

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
