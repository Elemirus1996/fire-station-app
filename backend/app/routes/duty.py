from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Optional
from datetime import datetime
from ..database import get_db
from ..models import DutySchedule, Personnel, AdminUser, DIENSTGRADE
from ..utils.auth import get_current_user
from ..utils.permissions import check_permission

router = APIRouter(prefix="/api/duty", tags=["duty"])

class DutyCreate(BaseModel):
    title: str
    duty_type: str
    start_time: datetime
    end_time: datetime
    personnel_id: int
    notes: Optional[str] = None

class DutyUpdate(BaseModel):
    title: Optional[str] = None
    duty_type: Optional[str] = None
    start_time: Optional[datetime] = None
    end_time: Optional[datetime] = None
    personnel_id: Optional[int] = None
    notes: Optional[str] = None

@router.get("")
async def list_duties(
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    personnel_id: Optional[int] = None,
    db: Session = Depends(get_db),
    current_user: AdminUser = Depends(get_current_user)
):
    """List duty schedules"""
    check_permission(current_user, "duty:read")
    
    query = db.query(DutySchedule)
    
    if start_date:
        query = query.filter(DutySchedule.start_time >= datetime.fromisoformat(start_date))
    if end_date:
        query = query.filter(DutySchedule.end_time <= datetime.fromisoformat(end_date))
    if personnel_id:
        query = query.filter(DutySchedule.personnel_id == personnel_id)
    
    duties = query.order_by(DutySchedule.start_time).all()
    
    result = []
    for duty in duties:
        personnel = db.query(Personnel).filter(Personnel.id == duty.personnel_id).first()
        if personnel:
            dienstgrad_info = DIENSTGRADE.get(personnel.dienstgrad, (personnel.dienstgrad, 0))
            result.append({
                "id": duty.id,
                "title": duty.title,
                "duty_type": duty.duty_type,
                "start_time": duty.start_time,
                "end_time": duty.end_time,
                "personnel": {
                    "id": personnel.id,
                    "vorname": personnel.vorname,
                    "nachname": personnel.nachname,
                    "dienstgrad": dienstgrad_info[0]
                },
                "notes": duty.notes,
                "created_at": duty.created_at
            })
    
    return result

@router.post("")
async def create_duty(
    duty: DutyCreate,
    db: Session = Depends(get_db),
    current_user: AdminUser = Depends(get_current_user)
):
    """Create duty schedule"""
    check_permission(current_user, "duty:write")
    
    # Verify personnel exists
    personnel = db.query(Personnel).filter(Personnel.id == duty.personnel_id).first()
    if not personnel:
        raise HTTPException(status_code=404, detail="Personal nicht gefunden")
    
    new_duty = DutySchedule(
        title=duty.title,
        duty_type=duty.duty_type,
        start_time=duty.start_time,
        end_time=duty.end_time,
        personnel_id=duty.personnel_id,
        notes=duty.notes,
        created_by=current_user.id
    )
    
    db.add(new_duty)
    db.commit()
    db.refresh(new_duty)
    
    return {"id": new_duty.id, "message": "Dienst erfolgreich erstellt"}

@router.put("/{duty_id}")
async def update_duty(
    duty_id: int,
    duty_update: DutyUpdate,
    db: Session = Depends(get_db),
    current_user: AdminUser = Depends(get_current_user)
):
    """Update duty schedule"""
    check_permission(current_user, "duty:write")
    
    duty = db.query(DutySchedule).filter(DutySchedule.id == duty_id).first()
    if not duty:
        raise HTTPException(status_code=404, detail="Dienst nicht gefunden")
    
    update_data = duty_update.dict(exclude_unset=True)
    
    # Verify personnel if being updated
    if "personnel_id" in update_data:
        personnel = db.query(Personnel).filter(Personnel.id == update_data["personnel_id"]).first()
        if not personnel:
            raise HTTPException(status_code=404, detail="Personal nicht gefunden")
    
    for field, value in update_data.items():
        setattr(duty, field, value)
    
    db.commit()
    return {"message": "Dienst erfolgreich aktualisiert"}

@router.delete("/{duty_id}")
async def delete_duty(
    duty_id: int,
    db: Session = Depends(get_db),
    current_user: AdminUser = Depends(get_current_user)
):
    """Delete duty schedule"""
    check_permission(current_user, "duty:write")
    
    duty = db.query(DutySchedule).filter(DutySchedule.id == duty_id).first()
    if not duty:
        raise HTTPException(status_code=404, detail="Dienst nicht gefunden")
    
    db.delete(duty)
    db.commit()
    
    return {"message": "Dienst erfolgreich gelöscht"}
