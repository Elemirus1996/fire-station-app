from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session
from pydantic import BaseModel
from ..database import get_db
from ..models import SystemSettings, AdminUser
from ..utils.auth import get_current_user
from ..utils.permissions import check_permission
from ..services.backup_manager import BackupManager
import os

router = APIRouter(prefix="/api/backup", tags=["backup"])

@router.post("/create")
async def create_backup(
    db: Session = Depends(get_db),
    current_user: AdminUser = Depends(get_current_user)
):
    """Create a backup manually"""
    check_permission(current_user, "backup:create")
    
    settings = db.query(SystemSettings).first()
    backup_path = settings.backup_path if settings else "./backups"
    
    success, result = BackupManager.create_backup(backup_path)
    
    if success:
        return {"message": "Backup erfolgreich erstellt", "filename": result}
    else:
        raise HTTPException(status_code=500, detail=result)

@router.get("/list")
async def list_backups(
    db: Session = Depends(get_db),
    current_user: AdminUser = Depends(get_current_user)
):
    """List all available backups"""
    check_permission(current_user, "backup:read")
    
    settings = db.query(SystemSettings).first()
    backup_path = settings.backup_path if settings else "./backups"
    
    backups = BackupManager.list_backups(backup_path)
    return {"backups": backups}

@router.get("/download/{filename}")
async def download_backup(
    filename: str,
    db: Session = Depends(get_db),
    current_user: AdminUser = Depends(get_current_user)
):
    """Download a backup file"""
    check_permission(current_user, "backup:read")
    
    settings = db.query(SystemSettings).first()
    backup_path = settings.backup_path if settings else "./backups"
    
    file_path = os.path.join(backup_path, filename)
    
    if not os.path.exists(file_path):
        raise HTTPException(status_code=404, detail="Backup-Datei nicht gefunden")
    
    return FileResponse(
        file_path,
        media_type="application/zip",
        filename=filename
    )

class RestoreRequest(BaseModel):
    filename: str

@router.post("/restore")
async def restore_backup(
    request: RestoreRequest,
    db: Session = Depends(get_db),
    current_user: AdminUser = Depends(get_current_user)
):
    """Restore from a backup"""
    check_permission(current_user, "backup:restore")
    
    settings = db.query(SystemSettings).first()
    backup_path = settings.backup_path if settings else "./backups"
    
    file_path = os.path.join(backup_path, request.filename)
    success, message = BackupManager.restore_backup(file_path)
    
    if success:
        return {"message": message}
    else:
        raise HTTPException(status_code=500, detail=message)

@router.delete("/{filename}")
async def delete_backup(
    filename: str,
    db: Session = Depends(get_db),
    current_user: AdminUser = Depends(get_current_user)
):
    """Delete a backup file"""
    check_permission(current_user, "backup:delete")
    
    settings = db.query(SystemSettings).first()
    backup_path = settings.backup_path if settings else "./backups"
    
    success, message = BackupManager.delete_backup(backup_path, filename)
    
    if success:
        return {"message": message}
    else:
        raise HTTPException(status_code=500, detail=message)
