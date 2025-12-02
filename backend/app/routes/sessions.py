from fastapi import APIRouter, Depends, HTTPException, Header
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime
from ..database import get_db
from ..models import Session as SessionModel, Attendance, Personnel, AdminUser, MIN_RANG_EINSATZ_BEENDEN, DIENSTGRADE
from ..utils.auth import get_current_user, decode_token
from ..utils.permissions import check_permission
from ..services.session_manager import SessionManager

router = APIRouter(prefix="/api/sessions", tags=["sessions"])

class SessionCreate(BaseModel):
    event_type: str  # Einsatz, Übungsdienst, Arbeitsdienst-A/B/C

class SessionEnd(BaseModel):
    pass

class SessionEndWithRank(BaseModel):
    stammrollennummer: str

@router.get("")
async def list_sessions(
    active_only: bool = False,
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db)
):
    """List all sessions"""
    query = db.query(SessionModel)
    if active_only:
        query = query.filter(SessionModel.is_active == True)
    
    sessions = query.order_by(SessionModel.started_at.desc()).offset(skip).limit(limit).all()
    
    result = []
    for s in sessions:
        attendances = db.query(Attendance).filter(Attendance.session_id == s.id).all()
        active_count = sum(1 for a in attendances if a.checked_out_at is None)
        
        # Calculate duration
        if s.is_active:
            duration_seconds = int((datetime.now() - s.started_at).total_seconds())
        elif s.ended_at:
            duration_seconds = int((s.ended_at - s.started_at).total_seconds())
        else:
            duration_seconds = 0
        
        result.append({
            "id": s.id,
            "event_type": s.event_type,
            "started_at": s.started_at,
            "ended_at": s.ended_at,
            "is_active": s.is_active,
            "total_attendees": len(attendances),
            "active_attendees": active_count,
            "duration_seconds": duration_seconds
        })
    
    return result

@router.get("/{session_id}")
async def get_session(
    session_id: int,
    db: Session = Depends(get_db)
):
    """Get session details"""
    session = db.query(SessionModel).filter(SessionModel.id == session_id).first()
    if not session:
        raise HTTPException(status_code=404, detail="Session nicht gefunden")
    
    # Get attendances with personnel info
    attendances = db.query(Attendance).filter(Attendance.session_id == session_id).all()
    
    attendance_list = []
    for att in attendances:
        personnel = att.personnel
        dienstgrad_info = DIENSTGRADE.get(personnel.dienstgrad, (personnel.dienstgrad, 0))
        attendance_list.append({
            "id": att.id,
            "personnel_id": personnel.id,
            "stammrollennummer": personnel.stammrollennummer,
            "vorname": personnel.vorname,
            "nachname": personnel.nachname,
            "dienstgrad": personnel.dienstgrad,
            "dienstgrad_name": dienstgrad_info[0],
            "checked_in_at": att.checked_in_at,
            "checked_out_at": att.checked_out_at
        })
    
    return {
        "id": session.id,
        "event_type": session.event_type,
        "started_at": session.started_at,
        "ended_at": session.ended_at,
        "is_active": session.is_active,
        "attendances": attendance_list
    }

@router.post("")
async def create_session(
    session: SessionCreate,
    db: Session = Depends(get_db),
    authorization: Optional[str] = Header(None)
):
    """Create new session - accessible from kiosk without auth or with admin auth"""
    # Try to get user from token if provided
    current_user = None
    if authorization and authorization.startswith("Bearer "):
        token = authorization.replace("Bearer ", "")
        payload = decode_token(token)
        if payload:
            username = payload.get("sub")
            if username:
                current_user = db.query(AdminUser).filter(AdminUser.username == username).first()
    
    # If user is authenticated, check permissions
    if current_user:
        check_permission(current_user, "sessions:create")
    
    valid_types = ["Einsatz", "Übungsdienst", "Arbeitsdienst-A", "Arbeitsdienst-B", "Arbeitsdienst-C"]
    if session.event_type not in valid_types:
        raise HTTPException(status_code=400, detail="Ungültiger Event-Typ")
    
    new_session = SessionModel(
        event_type=session.event_type,
        created_by=current_user.id if current_user else None,
        is_active=True
    )
    db.add(new_session)
    db.commit()
    db.refresh(new_session)
    
    return {
        "id": new_session.id,
        "event_type": new_session.event_type,
        "started_at": new_session.started_at,
        "is_active": new_session.is_active
    }

@router.post("/{session_id}/end")
async def end_session(
    session_id: int,
    db: Session = Depends(get_db),
    current_user: AdminUser = Depends(get_current_user)
):
    """End a session manually (admin interface)"""
    session = db.query(SessionModel).filter(SessionModel.id == session_id).first()
    if not session:
        raise HTTPException(status_code=404, detail="Session nicht gefunden")
    
    if not session.is_active:
        raise HTTPException(status_code=400, detail="Session ist bereits beendet")
    
    # Check permission
    check_permission(current_user, "sessions:end")
    
    success = SessionManager.end_session(db, session_id)
    
    if success:
        return {"message": "Session erfolgreich beendet"}
    else:
        raise HTTPException(status_code=400, detail="Fehler beim Beenden der Session")

@router.post("/{session_id}/end-with-rank")
async def end_session_with_rank(
    session_id: int,
    request: SessionEndWithRank,
    db: Session = Depends(get_db)
):
    """End a session with rank validation (kiosk interface for Einsatz)"""
    session = db.query(SessionModel).filter(SessionModel.id == session_id).first()
    if not session:
        raise HTTPException(status_code=404, detail="Session nicht gefunden")
    
    if not session.is_active:
        raise HTTPException(status_code=400, detail="Session ist bereits beendet")
    
    # Only Einsatz requires rank validation for ending
    if session.event_type == "Einsatz":
        # Find personnel by stammrollennummer
        personnel = db.query(Personnel).filter(
            Personnel.stammrollennummer == request.stammrollennummer,
            Personnel.is_active == True
        ).first()
        
        if not personnel:
            raise HTTPException(status_code=404, detail="Personal nicht gefunden")
        
        # Get dienstgrad level
        dienstgrad_info = DIENSTGRADE.get(personnel.dienstgrad, (personnel.dienstgrad, 0))
        dienstgrad_level = dienstgrad_info[1]
        
        # Check if rank is sufficient (UBM = Level 4 or higher)
        if dienstgrad_level < MIN_RANG_EINSATZ_BEENDEN:
            raise HTTPException(
                status_code=403, 
                detail=f"Unzureichender Dienstgrad. Mindestens {DIENSTGRADE.get('UBM', ('UBM', 4))[0]} erforderlich."
            )
    
    success = SessionManager.end_session(db, session_id)
    
    if success:
        return {"message": "Session erfolgreich beendet"}
    else:
        raise HTTPException(status_code=400, detail="Fehler beim Beenden der Session")

@router.get("/active/current")
async def get_active_sessions(db: Session = Depends(get_db)):
    """Get all currently active sessions"""
    sessions = db.query(SessionModel).filter(SessionModel.is_active == True).all()
    
    result = []
    for s in sessions:
        attendances = db.query(Attendance).filter(
            Attendance.session_id == s.id,
            Attendance.checked_out_at == None
        ).all()
        
        active_personnel = []
        for att in attendances:
            p = att.personnel
            dienstgrad_info = DIENSTGRADE.get(p.dienstgrad, (p.dienstgrad, 0))
            active_personnel.append({
                "id": p.id,
                "stammrollennummer": p.stammrollennummer,
                "vorname": p.vorname,
                "nachname": p.nachname,
                "dienstgrad": p.dienstgrad,
                "dienstgrad_name": dienstgrad_info[0],
                "checked_in_at": att.checked_in_at
            })
        
        result.append({
            "id": s.id,
            "event_type": s.event_type,
            "started_at": s.started_at,
            "active_personnel": active_personnel
        })
    
    return result
