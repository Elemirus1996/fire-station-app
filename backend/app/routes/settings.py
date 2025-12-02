from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Optional
import os
import shutil
from ..database import get_db
from ..models import FireStation, SystemSettings, AdminUser
from ..utils.auth import get_current_user
from ..utils.permissions import check_permission
from ..services.backup_manager import BackupManager

router = APIRouter(prefix="/api/settings", tags=["settings"])

# Fire Station Settings
class FireStationUpdate(BaseModel):
    name: Optional[str] = None
    street: Optional[str] = None
    city: Optional[str] = None
    postal_code: Optional[str] = None

@router.get("/firestation")
async def get_firestation_settings(db: Session = Depends(get_db)):
    """Get fire station settings"""
    fire_station = db.query(FireStation).first()
    
    if not fire_station:
        # Create default
        fire_station = FireStation(
            name="Freiwillige Feuerwehr",
            street="",
            city="",
            postal_code=""
        )
        db.add(fire_station)
        db.commit()
        db.refresh(fire_station)
    
    return {
        "id": fire_station.id,
        "name": fire_station.name,
        "logo_path": fire_station.logo_path,
        "street": fire_station.street,
        "city": fire_station.city,
        "postal_code": fire_station.postal_code
    }

@router.put("/firestation")
async def update_firestation_settings(
    settings: FireStationUpdate,
    db: Session = Depends(get_db),
    current_user: AdminUser = Depends(get_current_user)
):
    """Update fire station settings"""
    check_permission(current_user, "settings:update")
    
    fire_station = db.query(FireStation).first()
    
    if not fire_station:
        fire_station = FireStation()
        db.add(fire_station)
    
    update_data = settings.dict(exclude_unset=True)
    for field, value in update_data.items():
        setattr(fire_station, field, value)
    
    db.commit()
    return {"message": "Einstellungen erfolgreich aktualisiert"}

@router.post("/firestation/logo")
async def upload_logo(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: AdminUser = Depends(get_current_user)
):
    """Upload fire station logo"""
    check_permission(current_user, "settings:update")
    
    # Validate file type
    allowed_types = ["image/png", "image/jpeg", "image/jpg", "image/svg+xml"]
    if file.content_type not in allowed_types:
        raise HTTPException(status_code=400, detail="Ungültiger Dateityp. Erlaubt: PNG, JPG, SVG")
    
    # Validate file size (max 2MB)
    content = await file.read()
    if len(content) > 2 * 1024 * 1024:
        raise HTTPException(status_code=400, detail="Datei zu groß. Maximum: 2MB")
    
    # Save file
    upload_dir = "./uploads/logo"
    os.makedirs(upload_dir, exist_ok=True)
    
    # Use original filename with timestamp
    from datetime import datetime
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    ext = os.path.splitext(file.filename)[1]
    filename = f"logo_{timestamp}{ext}"
    file_path = os.path.join(upload_dir, filename)
    
    with open(file_path, "wb") as f:
        f.write(content)
    
    # Update database
    fire_station = db.query(FireStation).first()
    if not fire_station:
        fire_station = FireStation()
        db.add(fire_station)
    
    # Delete old logo if exists
    if fire_station.logo_path and os.path.exists(fire_station.logo_path):
        try:
            os.remove(fire_station.logo_path)
        except:
            pass
    
    fire_station.logo_path = file_path
    db.commit()
    
    return {"message": "Logo erfolgreich hochgeladen", "path": file_path}

@router.get("/firestation/logo")
async def get_logo(db: Session = Depends(get_db)):
    """Get fire station logo"""
    fire_station = db.query(FireStation).first()
    
    if not fire_station or not fire_station.logo_path:
        raise HTTPException(status_code=404, detail="Kein Logo vorhanden")
    
    if not os.path.exists(fire_station.logo_path):
        raise HTTPException(status_code=404, detail="Logo-Datei nicht gefunden")
    
    return FileResponse(fire_station.logo_path)

# Backup Settings
class BackupSettingsUpdate(BaseModel):
    backup_enabled: Optional[bool] = None
    backup_path: Optional[str] = None
    backup_schedule_time: Optional[str] = None
    backup_retention_days: Optional[int] = None

class ValidatePathRequest(BaseModel):
    path: str

@router.get("/backup")
async def get_backup_settings(db: Session = Depends(get_db)):
    """Get backup settings"""
    settings = db.query(SystemSettings).first()
    
    if not settings:
        settings = SystemSettings()
        db.add(settings)
        db.commit()
        db.refresh(settings)
    
    return {
        "backup_enabled": settings.backup_enabled,
        "backup_path": settings.backup_path,
        "backup_schedule_time": settings.backup_schedule_time,
        "backup_retention_days": settings.backup_retention_days
    }

@router.put("/backup")
async def update_backup_settings(
    settings: BackupSettingsUpdate,
    db: Session = Depends(get_db),
    current_user: AdminUser = Depends(get_current_user)
):
    """Update backup settings"""
    check_permission(current_user, "settings:update")
    
    sys_settings = db.query(SystemSettings).first()
    if not sys_settings:
        sys_settings = SystemSettings()
        db.add(sys_settings)
    
    update_data = settings.dict(exclude_unset=True)
    for field, value in update_data.items():
        setattr(sys_settings, field, value)
    
    db.commit()
    return {"message": "Backup-Einstellungen erfolgreich aktualisiert"}

@router.post("/backup/validate-path")
async def validate_backup_path(request: ValidatePathRequest):
    """Validate backup path"""
    is_valid, message = BackupManager.validate_backup_path(request.path)
    return {
        "valid": is_valid,
        "message": message
    }

# System Settings
class SystemSettingsUpdate(BaseModel):
    kiosk_base_url: Optional[str] = None
    kiosk_show_attendance_list: Optional[bool] = None

@router.get("/system")
async def get_system_settings(db: Session = Depends(get_db)):
    """Get system settings including kiosk configuration"""
    settings = db.query(SystemSettings).first()
    
    if not settings:
        settings = SystemSettings()
        db.add(settings)
        db.commit()
        db.refresh(settings)
    
    return {
        "kiosk_base_url": settings.kiosk_base_url,
        "kiosk_show_attendance_list": settings.kiosk_show_attendance_list
    }

@router.put("/system")
async def update_system_settings(
    settings: SystemSettingsUpdate,
    db: Session = Depends(get_db),
    current_user: AdminUser = Depends(get_current_user)
):
    """Update system settings"""
    check_permission(current_user, "settings:update")
    
    sys_settings = db.query(SystemSettings).first()
    if not sys_settings:
        sys_settings = SystemSettings()
        db.add(sys_settings)
    
    update_data = settings.dict(exclude_unset=True)
    
    # Validate kiosk_base_url if provided
    if "kiosk_base_url" in update_data:
        url = update_data["kiosk_base_url"]
        if url and not (url.startswith("http://") or url.startswith("https://")):
            raise HTTPException(
                status_code=400, 
                detail="Base-URL muss mit http:// oder https:// beginnen"
            )
    
    for field, value in update_data.items():
        setattr(sys_settings, field, value)
    
    db.commit()
    return {"message": "System-Einstellungen erfolgreich aktualisiert"}
