from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import List, Optional
from ..database import get_db
from ..models import Personnel, AdminUser, DIENSTGRADE
from ..utils.auth import get_current_user
from ..utils.permissions import check_permission

router = APIRouter(prefix="/api/personnel", tags=["personnel"])

class PersonnelCreate(BaseModel):
    stammrollennummer: str
    vorname: str
    nachname: str
    dienstgrad: str
    group_id: Optional[int] = None
    is_active: bool = True

class PersonnelUpdate(BaseModel):
    stammrollennummer: Optional[str] = None
    vorname: Optional[str] = None
    nachname: Optional[str] = None
    dienstgrad: Optional[str] = None
    group_id: Optional[int] = None
    is_active: Optional[bool] = None

@router.get("")
async def list_personnel(
    active_only: bool = True,
    db: Session = Depends(get_db)
):
    """List all personnel"""
    query = db.query(Personnel)
    if active_only:
        query = query.filter(Personnel.is_active == True)
    
    personnel = query.all()
    
    result = []
    for p in personnel:
        dienstgrad_info = DIENSTGRADE.get(p.dienstgrad, (p.dienstgrad, 0))
        result.append({
            "id": p.id,
            "stammrollennummer": p.stammrollennummer,
            "vorname": p.vorname,
            "nachname": p.nachname,
            "dienstgrad": p.dienstgrad,
            "dienstgrad_name": dienstgrad_info[0],
            "dienstgrad_level": dienstgrad_info[1],
            "group_id": p.group_id,
            "is_active": p.is_active,
            "created_at": p.created_at
        })
    
    return result

@router.get("/{personnel_id}")
async def get_personnel(
    personnel_id: int,
    db: Session = Depends(get_db)
):
    """Get personnel by ID"""
    personnel = db.query(Personnel).filter(Personnel.id == personnel_id).first()
    if not personnel:
        raise HTTPException(status_code=404, detail="Personal nicht gefunden")
    
    dienstgrad_info = DIENSTGRADE.get(personnel.dienstgrad, (personnel.dienstgrad, 0))
    return {
        "id": personnel.id,
        "stammrollennummer": personnel.stammrollennummer,
        "vorname": personnel.vorname,
        "nachname": personnel.nachname,
        "dienstgrad": personnel.dienstgrad,
        "dienstgrad_name": dienstgrad_info[0],
        "dienstgrad_level": dienstgrad_info[1],
        "group_id": personnel.group_id,
        "is_active": personnel.is_active,
        "created_at": personnel.created_at
    }

@router.post("")
async def create_personnel(
    personnel: PersonnelCreate,
    db: Session = Depends(get_db),
    current_user: AdminUser = Depends(get_current_user)
):
    """Create new personnel"""
    check_permission(current_user, "personnel:create")
    
    # Check if stammrollennummer already exists
    existing = db.query(Personnel).filter(
        Personnel.stammrollennummer == personnel.stammrollennummer
    ).first()
    
    if existing:
        raise HTTPException(status_code=400, detail="Stammrollennummer bereits vergeben")
    
    # Validate dienstgrad
    if personnel.dienstgrad not in DIENSTGRADE:
        raise HTTPException(status_code=400, detail="Ungültiger Dienstgrad")
    
    new_personnel = Personnel(**personnel.dict())
    db.add(new_personnel)
    db.commit()
    db.refresh(new_personnel)
    
    return {"id": new_personnel.id, "message": "Personal erfolgreich erstellt"}

@router.put("/{personnel_id}")
async def update_personnel(
    personnel_id: int,
    personnel_update: PersonnelUpdate,
    db: Session = Depends(get_db),
    current_user: AdminUser = Depends(get_current_user)
):
    """Update personnel"""
    check_permission(current_user, "personnel:update")
    
    personnel = db.query(Personnel).filter(Personnel.id == personnel_id).first()
    if not personnel:
        raise HTTPException(status_code=404, detail="Personal nicht gefunden")
    
    update_data = personnel_update.dict(exclude_unset=True)
    
    # Check stammrollennummer uniqueness if being updated
    if "stammrollennummer" in update_data:
        existing = db.query(Personnel).filter(
            Personnel.stammrollennummer == update_data["stammrollennummer"],
            Personnel.id != personnel_id
        ).first()
        if existing:
            raise HTTPException(status_code=400, detail="Stammrollennummer bereits vergeben")
    
    # Validate dienstgrad if being updated
    if "dienstgrad" in update_data and update_data["dienstgrad"] not in DIENSTGRADE:
        raise HTTPException(status_code=400, detail="Ungültiger Dienstgrad")
    
    for field, value in update_data.items():
        setattr(personnel, field, value)
    
    db.commit()
    return {"message": "Personal erfolgreich aktualisiert"}

@router.delete("/{personnel_id}")
async def delete_personnel(
    personnel_id: int,
    permanent: bool = False,
    db: Session = Depends(get_db),
    current_user: AdminUser = Depends(get_current_user)
):
    """Delete personnel (soft delete by default, or permanent if specified)"""
    check_permission(current_user, "personnel:delete")
    
    personnel = db.query(Personnel).filter(Personnel.id == personnel_id).first()
    if not personnel:
        raise HTTPException(status_code=404, detail="Personal nicht gefunden")
    
    if permanent:
        # Permanent deletion - remove from database
        db.delete(personnel)
        db.commit()
        return {"message": "Personal permanent gelöscht"}
    else:
        # Soft delete - set is_active to False
        personnel.is_active = False
        db.commit()
        return {"message": "Personal erfolgreich deaktiviert"}

@router.get("/by-nummer/{stammrollennummer}")
async def get_by_nummer(
    stammrollennummer: str,
    db: Session = Depends(get_db)
):
    """Get personnel by stammrollennummer"""
    personnel = db.query(Personnel).filter(
        Personnel.stammrollennummer == stammrollennummer,
        Personnel.is_active == True
    ).first()
    
    if not personnel:
        raise HTTPException(status_code=404, detail="Personal nicht gefunden")
    
    dienstgrad_info = DIENSTGRADE.get(personnel.dienstgrad, (personnel.dienstgrad, 0))
    return {
        "id": personnel.id,
        "stammrollennummer": personnel.stammrollennummer,
        "vorname": personnel.vorname,
        "nachname": personnel.nachname,
        "dienstgrad": personnel.dienstgrad,
        "dienstgrad_name": dienstgrad_info[0],
        "dienstgrad_level": dienstgrad_info[1],
        "group_id": personnel.group_id
    }
