from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime
from ..database import get_db
from ..models import PersonnelAdmin, Personnel, AuditLog, AdminUser, DIENSTGRADE
from ..utils.auth import verify_password, get_password_hash, create_access_token
from ..utils.permissions import check_permission

router = APIRouter(prefix="/api/personnel-admin", tags=["personnel-admin"])

class PersonnelAdminCreate(BaseModel):
    personnel_id: int
    password: str
    role: str = "admin"

class PersonnelAdminUpdate(BaseModel):
    password: Optional[str] = None
    role: Optional[str] = None
    is_active: Optional[bool] = None

class PersonnelLoginRequest(BaseModel):
    stammrollennummer: str
    password: str

@router.post("/create")
async def create_personnel_admin(
    data: PersonnelAdminCreate,
    db: Session = Depends(get_db),
    current_user: AdminUser = Depends(get_current_user)
):
    """Create personnel admin access"""
    check_permission(current_user, "admin:write")
    
    # Verify personnel exists
    personnel = db.query(Personnel).filter(Personnel.id == data.personnel_id).first()
    if not personnel:
        raise HTTPException(status_code=404, detail="Personal nicht gefunden")
    
    # Check if already has admin access
    existing = db.query(PersonnelAdmin).filter(
        PersonnelAdmin.personnel_id == data.personnel_id
    ).first()
    if existing:
        raise HTTPException(status_code=400, detail="Personal hat bereits Admin-Zugriff")
    
    # Create admin access
    hashed_pwd = get_password_hash(data.password)
    admin = PersonnelAdmin(
        personnel_id=data.personnel_id,
        hashed_password=hashed_pwd,
        role=data.role,
        created_by=current_user.id
    )
    
    db.add(admin)
    db.commit()
    
    # Log action
    log = AuditLog(
        user_id=current_user.id,
        action="CREATE_PERSONNEL_ADMIN",
        entity_type="PersonnelAdmin",
        entity_id=admin.id,
        changes={"personnel_id": data.personnel_id, "role": data.role}
    )
    db.add(log)
    db.commit()
    
    return {"message": "Admin-Zugriff erfolgreich erstellt"}

@router.post("/login")
async def personnel_admin_login(
    login: PersonnelLoginRequest,
    db: Session = Depends(get_db)
):
    """Login for personnel with admin access"""
    # Find personnel by stammrollennummer
    personnel = db.query(Personnel).filter(
        Personnel.stammrollennummer == login.stammrollennummer,
        Personnel.is_active == True
    ).first()
    
    if not personnel:
        raise HTTPException(status_code=401, detail="Ungültige Anmeldedaten")
    
    # Check if has admin access
    admin = db.query(PersonnelAdmin).filter(
        PersonnelAdmin.personnel_id == personnel.id,
        PersonnelAdmin.is_active == True
    ).first()
    
    if not admin:
        raise HTTPException(status_code=401, detail="Kein Admin-Zugriff")
    
    # Verify password
    if not verify_password(login.password, admin.hashed_password):
        raise HTTPException(status_code=401, detail="Ungültige Anmeldedaten")
    
    # Update last login
    admin.last_login = datetime.utcnow()
    db.commit()
    
    # Create token
    access_token = create_access_token(
        data={
            "sub": personnel.stammrollennummer,
            "type": "personnel_admin",
            "personnel_id": personnel.id,
            "role": admin.role
        }
    )
    
    dienstgrad_info = DIENSTGRADE.get(personnel.dienstgrad, (personnel.dienstgrad, 0))
    
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user": {
            "id": personnel.id,
            "stammrollennummer": personnel.stammrollennummer,
            "vorname": personnel.vorname,
            "nachname": personnel.nachname,
            "dienstgrad": dienstgrad_info[0],
            "role": admin.role
        }
    }

@router.get("")
async def list_personnel_admins(
    db: Session = Depends(get_db),
    current_user: AdminUser = Depends(get_current_user)
):
    """List all personnel with admin access"""
    check_permission(current_user, "admin:read")
    
    admins = db.query(PersonnelAdmin).all()
    
    result = []
    for admin in admins:
        personnel = db.query(Personnel).filter(Personnel.id == admin.personnel_id).first()
        if personnel:
            dienstgrad_info = DIENSTGRADE.get(personnel.dienstgrad, (personnel.dienstgrad, 0))
            result.append({
                "id": admin.id,
                "personnel_id": personnel.id,
                "stammrollennummer": personnel.stammrollennummer,
                "vorname": personnel.vorname,
                "nachname": personnel.nachname,
                "dienstgrad": dienstgrad_info[0],
                "role": admin.role,
                "is_active": admin.is_active,
                "last_login": admin.last_login,
                "created_at": admin.created_at
            })
    
    return result

@router.put("/{admin_id}")
async def update_personnel_admin(
    admin_id: int,
    data: PersonnelAdminUpdate,
    db: Session = Depends(get_db),
    current_user: AdminUser = Depends(get_current_user)
):
    """Update personnel admin access"""
    check_permission(current_user, "admin:write")
    
    admin = db.query(PersonnelAdmin).filter(PersonnelAdmin.id == admin_id).first()
    if not admin:
        raise HTTPException(status_code=404, detail="Admin-Zugriff nicht gefunden")
    
    changes = {}
    if data.password:
        admin.hashed_password = get_password_hash(data.password)
        changes["password"] = "updated"
    
    if data.role is not None:
        changes["role"] = {"old": admin.role, "new": data.role}
        admin.role = data.role
    
    if data.is_active is not None:
        changes["is_active"] = {"old": admin.is_active, "new": data.is_active}
        admin.is_active = data.is_active
    
    db.commit()
    
    # Log action
    log = AuditLog(
        user_id=current_user.id,
        action="UPDATE_PERSONNEL_ADMIN",
        entity_type="PersonnelAdmin",
        entity_id=admin_id,
        changes=changes
    )
    db.add(log)
    db.commit()
    
    return {"message": "Admin-Zugriff erfolgreich aktualisiert"}

@router.delete("/{admin_id}")
async def delete_personnel_admin(
    admin_id: int,
    db: Session = Depends(get_db),
    current_user: AdminUser = Depends(get_current_user)
):
    """Remove personnel admin access"""
    check_permission(current_user, "admin:write")
    
    admin = db.query(PersonnelAdmin).filter(PersonnelAdmin.id == admin_id).first()
    if not admin:
        raise HTTPException(status_code=404, detail="Admin-Zugriff nicht gefunden")
    
    personnel_id = admin.personnel_id
    db.delete(admin)
    db.commit()
    
    # Log action
    log = AuditLog(
        user_id=current_user.id,
        action="DELETE_PERSONNEL_ADMIN",
        entity_type="PersonnelAdmin",
        entity_id=admin_id,
        changes={"personnel_id": personnel_id}
    )
    db.add(log)
    db.commit()
    
    return {"message": "Admin-Zugriff erfolgreich entfernt"}
