from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime
from ..database import get_db
from ..models import Announcement, AdminUser
from ..utils.auth import get_current_user
from ..utils.permissions import check_permission

router = APIRouter(prefix="/api/announcements", tags=["announcements"])

class AnnouncementCreate(BaseModel):
    title: str
    content: str
    priority: Optional[str] = "normal"  # normal/high/urgent
    valid_from: Optional[datetime] = None
    valid_until: Optional[datetime] = None
    target_groups: Optional[List[int]] = None

class AnnouncementUpdate(BaseModel):
    title: Optional[str] = None
    content: Optional[str] = None
    priority: Optional[str] = None
    valid_from: Optional[datetime] = None
    valid_until: Optional[datetime] = None
    target_groups: Optional[List[int]] = None

@router.get("/active")
async def get_active_announcements(db: Session = Depends(get_db)):
    """Get all currently active announcements (no auth required for kiosk)"""
    now = datetime.utcnow()
    
    # Define priority order for sorting
    from sqlalchemy import case
    priority_order = case(
        (Announcement.priority == 'urgent', 1),
        (Announcement.priority == 'high', 2),
        (Announcement.priority == 'normal', 3),
        else_=4
    )
    
    announcements = db.query(Announcement).filter(
        Announcement.valid_from <= now,
        (Announcement.valid_until == None) | (Announcement.valid_until >= now)
    ).order_by(
        priority_order,
        Announcement.created_at.desc()
    ).all()
    
    result = []
    for ann in announcements:
        result.append({
            "id": ann.id,
            "title": ann.title,
            "content": ann.content,
            "priority": ann.priority,
            "valid_from": ann.valid_from,
            "valid_until": ann.valid_until,
            "created_at": ann.created_at
        })
    
    return result

@router.get("")
async def list_announcements(
    db: Session = Depends(get_db),
    current_user: AdminUser = Depends(get_current_user)
):
    """List all announcements (admin only)"""
    check_permission(current_user, "announcements:read")
    
    announcements = db.query(Announcement).order_by(Announcement.created_at.desc()).all()
    
    result = []
    for ann in announcements:
        result.append({
            "id": ann.id,
            "title": ann.title,
            "content": ann.content,
            "priority": ann.priority,
            "valid_from": ann.valid_from,
            "valid_until": ann.valid_until,
            "created_by": ann.created_by,
            "created_at": ann.created_at
        })
    
    return result

@router.get("/{announcement_id}")
async def get_announcement(
    announcement_id: int,
    db: Session = Depends(get_db),
    current_user: AdminUser = Depends(get_current_user)
):
    """Get specific announcement"""
    check_permission(current_user, "announcements:read")
    
    announcement = db.query(Announcement).filter(Announcement.id == announcement_id).first()
    if not announcement:
        raise HTTPException(status_code=404, detail="Ankündigung nicht gefunden")
    
    return {
        "id": announcement.id,
        "title": announcement.title,
        "content": announcement.content,
        "priority": announcement.priority,
        "valid_from": announcement.valid_from,
        "valid_until": announcement.valid_until,
        "target_groups": announcement.target_groups,
        "created_by": announcement.created_by,
        "created_at": announcement.created_at
    }

@router.post("")
async def create_announcement(
    announcement: AnnouncementCreate,
    db: Session = Depends(get_db),
    current_user: AdminUser = Depends(get_current_user)
):
    """Create new announcement"""
    check_permission(current_user, "announcements:create")
    
    new_announcement = Announcement(
        title=announcement.title,
        content=announcement.content,
        priority=announcement.priority,
        valid_from=announcement.valid_from or datetime.utcnow(),
        valid_until=announcement.valid_until,
        target_groups=announcement.target_groups,
        created_by=current_user.id
    )
    db.add(new_announcement)
    db.commit()
    db.refresh(new_announcement)
    
    return {
        "id": new_announcement.id,
        "title": new_announcement.title,
        "content": new_announcement.content,
        "priority": new_announcement.priority,
        "valid_from": new_announcement.valid_from,
        "valid_until": new_announcement.valid_until
    }

@router.put("/{announcement_id}")
async def update_announcement(
    announcement_id: int,
    announcement_update: AnnouncementUpdate,
    db: Session = Depends(get_db),
    current_user: AdminUser = Depends(get_current_user)
):
    """Update announcement"""
    check_permission(current_user, "announcements:update")
    
    announcement = db.query(Announcement).filter(Announcement.id == announcement_id).first()
    if not announcement:
        raise HTTPException(status_code=404, detail="Ankündigung nicht gefunden")
    
    if announcement_update.title is not None:
        announcement.title = announcement_update.title
    if announcement_update.content is not None:
        announcement.content = announcement_update.content
    if announcement_update.priority is not None:
        announcement.priority = announcement_update.priority
    if announcement_update.valid_from is not None:
        announcement.valid_from = announcement_update.valid_from
    if announcement_update.valid_until is not None:
        announcement.valid_until = announcement_update.valid_until
    if announcement_update.target_groups is not None:
        announcement.target_groups = announcement_update.target_groups
    
    db.commit()
    db.refresh(announcement)
    
    return {
        "id": announcement.id,
        "title": announcement.title,
        "content": announcement.content,
        "priority": announcement.priority,
        "valid_from": announcement.valid_from,
        "valid_until": announcement.valid_until
    }

@router.delete("/{announcement_id}")
async def delete_announcement(
    announcement_id: int,
    db: Session = Depends(get_db),
    current_user: AdminUser = Depends(get_current_user)
):
    """Delete announcement"""
    check_permission(current_user, "announcements:delete")
    
    announcement = db.query(Announcement).filter(Announcement.id == announcement_id).first()
    if not announcement:
        raise HTTPException(status_code=404, detail="Ankündigung nicht gefunden")
    
    db.delete(announcement)
    db.commit()
    
    return {"message": "Ankündigung erfolgreich gelöscht"}
