from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from typing import Optional, List
from datetime import datetime, timedelta
from ..database import get_db
from ..models import AuditLog, AdminUser, Personnel
from ..utils.auth import get_current_user
from ..utils.permissions import check_permission

router = APIRouter(prefix="/api/audit", tags=["audit"])

@router.get("")
async def get_audit_logs(
    action: Optional[str] = None,
    entity_type: Optional[str] = None,
    entity_id: Optional[int] = None,
    user_id: Optional[int] = None,
    start_date: Optional[datetime] = None,
    end_date: Optional[datetime] = None,
    limit: int = Query(100, le=1000),
    offset: int = 0,
    db: Session = Depends(get_db),
    current_user: AdminUser = Depends(get_current_user)
):
    """Get audit logs with filtering"""
    check_permission(current_user, "admin:read")
    
    query = db.query(AuditLog)
    
    if action:
        query = query.filter(AuditLog.action == action)
    
    if entity_type:
        query = query.filter(AuditLog.entity_type == entity_type)
    
    if entity_id:
        query = query.filter(AuditLog.entity_id == entity_id)
    
    if user_id:
        query = query.filter(AuditLog.user_id == user_id)
    
    if start_date:
        query = query.filter(AuditLog.timestamp >= start_date)
    
    if end_date:
        query = query.filter(AuditLog.timestamp <= end_date)
    
    total = query.count()
    logs = query.order_by(AuditLog.timestamp.desc()).offset(offset).limit(limit).all()
    
    # Enrich with user information
    result = []
    for log in logs:
        user = db.query(AdminUser).filter(AdminUser.id == log.user_id).first()
        user_info = {"username": user.username} if user else {"username": "Unknown"}
        
        result.append({
            "id": log.id,
            "timestamp": log.timestamp,
            "user_id": log.user_id,
            "user": user_info,
            "action": log.action,
            "entity_type": log.entity_type,
            "entity_id": log.entity_id,
            "changes": log.changes,
            "ip_address": log.ip_address,
            "user_agent": log.user_agent
        })
    
    return {
        "total": total,
        "offset": offset,
        "limit": limit,
        "logs": result
    }

@router.get("/actions")
async def get_audit_actions(
    db: Session = Depends(get_db),
    current_user: AdminUser = Depends(get_current_user)
):
    """Get list of unique audit actions"""
    check_permission(current_user, "admin:read")
    
    actions = db.query(AuditLog.action).distinct().all()
    return [action[0] for action in actions]

@router.get("/entity-types")
async def get_entity_types(
    db: Session = Depends(get_db),
    current_user: AdminUser = Depends(get_current_user)
):
    """Get list of unique entity types"""
    check_permission(current_user, "admin:read")
    
    types = db.query(AuditLog.entity_type).distinct().all()
    return [t[0] for t in types if t[0]]

@router.get("/recent")
async def get_recent_logs(
    hours: int = Query(24, ge=1, le=168),  # Last 1-168 hours (1 week)
    db: Session = Depends(get_db),
    current_user: AdminUser = Depends(get_current_user)
):
    """Get recent audit logs"""
    check_permission(current_user, "admin:read")
    
    since = datetime.utcnow() - timedelta(hours=hours)
    
    logs = db.query(AuditLog).filter(
        AuditLog.timestamp >= since
    ).order_by(AuditLog.timestamp.desc()).limit(100).all()
    
    result = []
    for log in logs:
        user = db.query(AdminUser).filter(AdminUser.id == log.user_id).first()
        user_info = {"username": user.username} if user else {"username": "Unknown"}
        
        result.append({
            "id": log.id,
            "timestamp": log.timestamp,
            "user_id": log.user_id,
            "user": user_info,
            "action": log.action,
            "entity_type": log.entity_type,
            "entity_id": log.entity_id,
            "changes": log.changes
        })
    
    return result

@router.get("/statistics")
async def get_audit_statistics(
    days: int = Query(30, ge=1, le=365),
    db: Session = Depends(get_db),
    current_user: AdminUser = Depends(get_current_user)
):
    """Get audit log statistics"""
    check_permission(current_user, "admin:read")
    
    since = datetime.utcnow() - timedelta(days=days)
    
    # Total logs
    total = db.query(AuditLog).filter(AuditLog.timestamp >= since).count()
    
    # Logs by action
    from sqlalchemy import func
    by_action = db.query(
        AuditLog.action,
        func.count(AuditLog.id).label("count")
    ).filter(
        AuditLog.timestamp >= since
    ).group_by(AuditLog.action).all()
    
    # Logs by user
    by_user = db.query(
        AuditLog.user_id,
        func.count(AuditLog.id).label("count")
    ).filter(
        AuditLog.timestamp >= since
    ).group_by(AuditLog.user_id).order_by(func.count(AuditLog.id).desc()).limit(10).all()
    
    # Enrich user info
    user_stats = []
    for user_id, count in by_user:
        user = db.query(AdminUser).filter(AdminUser.id == user_id).first()
        user_stats.append({
            "user_id": user_id,
            "username": user.username if user else "Unknown",
            "count": count
        })
    
    return {
        "period_days": days,
        "total_logs": total,
        "by_action": [{"action": action, "count": count} for action, count in by_action],
        "by_user": user_stats
    }
