from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime
from ..database import get_db
from ..models import CalendarEvent, EventParticipant, Personnel, AdminUser
from ..utils.auth import get_current_user
from ..utils.permissions import check_permission

router = APIRouter(prefix="/api/calendar", tags=["calendar"])

class EventCreate(BaseModel):
    title: str
    description: Optional[str] = None
    event_type: str
    start_time: datetime
    end_time: datetime
    location: Optional[str] = None
    all_day: bool = False
    recurrence: str = "none"
    max_participants: Optional[int] = None
    registration_required: bool = False

class EventUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    event_type: Optional[str] = None
    start_time: Optional[datetime] = None
    end_time: Optional[datetime] = None
    location: Optional[str] = None
    all_day: Optional[bool] = None
    max_participants: Optional[int] = None
    registration_required: Optional[bool] = None

class ParticipantRegister(BaseModel):
    personnel_id: int
    notes: Optional[str] = None

@router.get("")
async def list_events(
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    event_type: Optional[str] = None,
    db: Session = Depends(get_db)
):
    """List all calendar events"""
    query = db.query(CalendarEvent)
    
    if start_date:
        query = query.filter(CalendarEvent.start_time >= datetime.fromisoformat(start_date))
    if end_date:
        query = query.filter(CalendarEvent.end_time <= datetime.fromisoformat(end_date))
    if event_type:
        query = query.filter(CalendarEvent.event_type == event_type)
    
    events = query.order_by(CalendarEvent.start_time).all()
    
    result = []
    for event in events:
        participants_count = db.query(EventParticipant).filter(
            EventParticipant.event_id == event.id
        ).count()
        
        result.append({
            "id": event.id,
            "title": event.title,
            "description": event.description,
            "event_type": event.event_type,
            "start_time": event.start_time,
            "end_time": event.end_time,
            "location": event.location,
            "all_day": event.all_day,
            "recurrence": event.recurrence,
            "max_participants": event.max_participants,
            "registration_required": event.registration_required,
            "participants_count": participants_count,
            "created_at": event.created_at
        })
    
    return result

@router.get("/{event_id}")
async def get_event(
    event_id: int,
    db: Session = Depends(get_db)
):
    """Get event details"""
    event = db.query(CalendarEvent).filter(CalendarEvent.id == event_id).first()
    if not event:
        raise HTTPException(status_code=404, detail="Event nicht gefunden")
    
    # Get participants
    participants = db.query(EventParticipant).filter(
        EventParticipant.event_id == event_id
    ).all()
    
    participant_list = []
    for p in participants:
        personnel = p.personnel if hasattr(p, 'personnel') else db.query(Personnel).filter(Personnel.id == p.personnel_id).first()
        if personnel:
            participant_list.append({
                "id": p.id,
                "personnel_id": personnel.id,
                "vorname": personnel.vorname,
                "nachname": personnel.nachname,
                "status": p.status,
                "registered_at": p.registered_at,
                "notes": p.notes
            })
    
    return {
        "id": event.id,
        "title": event.title,
        "description": event.description,
        "event_type": event.event_type,
        "start_time": event.start_time,
        "end_time": event.end_time,
        "location": event.location,
        "all_day": event.all_day,
        "recurrence": event.recurrence,
        "max_participants": event.max_participants,
        "registration_required": event.registration_required,
        "participants": participant_list,
        "created_at": event.created_at
    }

@router.post("")
async def create_event(
    event: EventCreate,
    db: Session = Depends(get_db),
    current_user: AdminUser = Depends(get_current_user)
):
    """Create new calendar event"""
    check_permission(current_user, "calendar:write")
    
    new_event = CalendarEvent(
        title=event.title,
        description=event.description,
        event_type=event.event_type,
        start_time=event.start_time,
        end_time=event.end_time,
        location=event.location,
        all_day=event.all_day,
        recurrence=event.recurrence,
        max_participants=event.max_participants,
        registration_required=event.registration_required,
        created_by=current_user.id
    )
    
    db.add(new_event)
    db.commit()
    db.refresh(new_event)
    
    return {"id": new_event.id, "message": "Event erfolgreich erstellt"}

@router.put("/{event_id}")
async def update_event(
    event_id: int,
    event_update: EventUpdate,
    db: Session = Depends(get_db),
    current_user: AdminUser = Depends(get_current_user)
):
    """Update calendar event"""
    check_permission(current_user, "calendar:write")
    
    event = db.query(CalendarEvent).filter(CalendarEvent.id == event_id).first()
    if not event:
        raise HTTPException(status_code=404, detail="Event nicht gefunden")
    
    update_data = event_update.dict(exclude_unset=True)
    for field, value in update_data.items():
        setattr(event, field, value)
    
    db.commit()
    return {"message": "Event erfolgreich aktualisiert"}

@router.delete("/{event_id}")
async def delete_event(
    event_id: int,
    db: Session = Depends(get_db),
    current_user: AdminUser = Depends(get_current_user)
):
    """Delete calendar event"""
    check_permission(current_user, "calendar:write")
    
    event = db.query(CalendarEvent).filter(CalendarEvent.id == event_id).first()
    if not event:
        raise HTTPException(status_code=404, detail="Event nicht gefunden")
    
    # Delete participants first
    db.query(EventParticipant).filter(EventParticipant.event_id == event_id).delete()
    
    db.delete(event)
    db.commit()
    
    return {"message": "Event erfolgreich gelöscht"}

@router.post("/{event_id}/register")
async def register_participant(
    event_id: int,
    registration: ParticipantRegister,
    db: Session = Depends(get_db)
):
    """Register participant for event"""
    event = db.query(CalendarEvent).filter(CalendarEvent.id == event_id).first()
    if not event:
        raise HTTPException(status_code=404, detail="Event nicht gefunden")
    
    # Check if already registered
    existing = db.query(EventParticipant).filter(
        EventParticipant.event_id == event_id,
        EventParticipant.personnel_id == registration.personnel_id
    ).first()
    
    if existing:
        raise HTTPException(status_code=400, detail="Bereits angemeldet")
    
    # Check max participants
    if event.max_participants:
        current_count = db.query(EventParticipant).filter(
            EventParticipant.event_id == event_id
        ).count()
        if current_count >= event.max_participants:
            raise HTTPException(status_code=400, detail="Maximale Teilnehmerzahl erreicht")
    
    participant = EventParticipant(
        event_id=event_id,
        personnel_id=registration.personnel_id,
        notes=registration.notes
    )
    
    db.add(participant)
    db.commit()
    
    return {"message": "Erfolgreich angemeldet"}

@router.delete("/{event_id}/unregister/{personnel_id}")
async def unregister_participant(
    event_id: int,
    personnel_id: int,
    db: Session = Depends(get_db)
):
    """Unregister participant from event"""
    participant = db.query(EventParticipant).filter(
        EventParticipant.event_id == event_id,
        EventParticipant.personnel_id == personnel_id
    ).first()
    
    if not participant:
        raise HTTPException(status_code=404, detail="Anmeldung nicht gefunden")
    
    db.delete(participant)
    db.commit()
    
    return {"message": "Erfolgreich abgemeldet"}
