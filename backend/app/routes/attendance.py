from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel
from datetime import datetime
from ..database import get_db
from ..models import Attendance, Personnel, Session as SessionModel, DIENSTGRADE
from ..services.qr_generator import QRGenerator

router = APIRouter(prefix="/api/attendance", tags=["attendance"])

class CheckInRequest(BaseModel):
    session_id: int
    stammrollennummer: str

class CheckOutRequest(BaseModel):
    session_id: int
    stammrollennummer: str

class ValidateTokenRequest(BaseModel):
    token: str

@router.post("/checkin")
async def check_in(
    request: CheckInRequest,
    db: Session = Depends(get_db)
):
    """Check in personnel to a session"""
    # Verify session exists and is active
    session = db.query(SessionModel).filter(SessionModel.id == request.session_id).first()
    if not session:
        raise HTTPException(status_code=404, detail="Session nicht gefunden")
    
    if not session.is_active:
        raise HTTPException(status_code=400, detail="Session ist nicht aktiv")
    
    # Verify personnel exists
    personnel = db.query(Personnel).filter(
        Personnel.stammrollennummer == request.stammrollennummer,
        Personnel.is_active == True
    ).first()
    
    if not personnel:
        raise HTTPException(status_code=404, detail="Personal nicht gefunden")
    
    # Check if already checked in
    existing = db.query(Attendance).filter(
        Attendance.session_id == request.session_id,
        Attendance.personnel_id == personnel.id,
        Attendance.checked_out_at == None
    ).first()
    
    if existing:
        raise HTTPException(status_code=400, detail="Bereits eingecheckt")
    
    # Create attendance record
    attendance = Attendance(
        session_id=request.session_id,
        personnel_id=personnel.id,
        checked_in_at=datetime.utcnow()
    )
    db.add(attendance)
    db.commit()
    db.refresh(attendance)
    
    dienstgrad_info = DIENSTGRADE.get(personnel.dienstgrad, (personnel.dienstgrad, 0))
    
    return {
        "message": "Erfolgreich eingecheckt",
        "attendance_id": attendance.id,
        "personnel": {
            "id": personnel.id,
            "vorname": personnel.vorname,
            "nachname": personnel.nachname,
            "dienstgrad": dienstgrad_info[0]
        },
        "checked_in_at": attendance.checked_in_at
    }

@router.post("/checkout")
async def check_out(
    request: CheckOutRequest,
    db: Session = Depends(get_db)
):
    """Check out personnel from a session"""
    # Verify personnel exists
    personnel = db.query(Personnel).filter(
        Personnel.stammrollennummer == request.stammrollennummer
    ).first()
    
    if not personnel:
        raise HTTPException(status_code=404, detail="Personal nicht gefunden")
    
    # Find active attendance
    attendance = db.query(Attendance).filter(
        Attendance.session_id == request.session_id,
        Attendance.personnel_id == personnel.id,
        Attendance.checked_out_at == None
    ).first()
    
    if not attendance:
        raise HTTPException(status_code=404, detail="Kein aktiver Check-in gefunden")
    
    # Update checkout time
    attendance.checked_out_at = datetime.utcnow()
    db.commit()
    
    return {
        "message": "Erfolgreich ausgecheckt",
        "personnel": {
            "vorname": personnel.vorname,
            "nachname": personnel.nachname
        },
        "checked_out_at": attendance.checked_out_at
    }

@router.get("/session/{session_id}/active")
async def get_active_attendees(
    session_id: int,
    db: Session = Depends(get_db)
):
    """Get all currently checked-in personnel for a session"""
    attendances = db.query(Attendance).filter(
        Attendance.session_id == session_id,
        Attendance.checked_out_at == None
    ).all()
    
    result = []
    for att in attendances:
        personnel = att.personnel
        dienstgrad_info = DIENSTGRADE.get(personnel.dienstgrad, (personnel.dienstgrad, 0))
        result.append({
            "attendance_id": att.id,
            "personnel_id": personnel.id,
            "stammrollennummer": personnel.stammrollennummer,
            "vorname": personnel.vorname,
            "nachname": personnel.nachname,
            "dienstgrad": personnel.dienstgrad,
            "dienstgrad_name": dienstgrad_info[0],
            "checked_in_at": att.checked_in_at
        })
    
    return result

@router.post("/validate-token")
async def validate_qr_token(
    request: ValidateTokenRequest,
    db: Session = Depends(get_db)
):
    """Validate QR code token and return session info"""
    payload = QRGenerator.validate_session_token(request.token)
    
    if not payload:
        raise HTTPException(status_code=400, detail="Ungültiger oder abgelaufener QR-Code")
    
    session_id = payload.get("session_id")
    if not session_id:
        raise HTTPException(status_code=400, detail="Ungültiger QR-Code")
    
    # Verify session exists and is active
    session = db.query(SessionModel).filter(SessionModel.id == session_id).first()
    if not session:
        raise HTTPException(status_code=404, detail="Session nicht gefunden")
    
    if not session.is_active:
        raise HTTPException(status_code=400, detail="Session ist nicht aktiv")
    
    return {
        "valid": True,
        "session_id": session_id
    }
