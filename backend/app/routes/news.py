from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime
from ..database import get_db
from ..models import News, AdminUser
from ..utils.auth import get_current_user

router = APIRouter(prefix="/api/news", tags=["news"])

class NewsCreate(BaseModel):
    title: str
    content: str
    priority: Optional[str] = "normal"  # low, normal, high, urgent
    expires_at: Optional[datetime] = None

class NewsUpdate(BaseModel):
    title: Optional[str] = None
    content: Optional[str] = None
    priority: Optional[str] = None
    expires_at: Optional[datetime] = None
    is_active: Optional[bool] = None

@router.get("")
async def list_news(
    active_only: bool = True,
    skip: int = 0,
    limit: int = 50,
    db: Session = Depends(get_db)
):
    """List all news items"""
    query = db.query(News)
    
    if active_only:
        query = query.filter(News.is_active == True)
        # Filter out expired news
        query = query.filter(
            (News.expires_at.is_(None)) | (News.expires_at > datetime.now())
        )
    
    news_items = query.order_by(News.created_at.desc()).offset(skip).limit(limit).all()
    
    return [{
        "id": n.id,
        "title": n.title,
        "content": n.content,
        "priority": n.priority,
        "is_active": n.is_active,
        "created_at": n.created_at,
        "expires_at": n.expires_at,
        "created_by": n.created_by
    } for n in news_items]

@router.get("/{news_id}")
async def get_news(
    news_id: int,
    db: Session = Depends(get_db)
):
    """Get news item details"""
    news = db.query(News).filter(News.id == news_id).first()
    if not news:
        raise HTTPException(status_code=404, detail="News nicht gefunden")
    
    return {
        "id": news.id,
        "title": news.title,
        "content": news.content,
        "priority": news.priority,
        "is_active": news.is_active,
        "created_at": news.created_at,
        "expires_at": news.expires_at,
        "created_by": news.created_by
    }

@router.post("")
async def create_news(
    news: NewsCreate,
    db: Session = Depends(get_db),
    current_user: AdminUser = Depends(get_current_user)
):
    """Create new news item - Admin only"""
    new_news = News(
        title=news.title,
        content=news.content,
        priority=news.priority,
        expires_at=news.expires_at,
        created_by=current_user.username
    )
    
    db.add(new_news)
    db.commit()
    db.refresh(new_news)
    
    return {
        "id": new_news.id,
        "title": new_news.title,
        "content": new_news.content,
        "priority": new_news.priority,
        "is_active": new_news.is_active,
        "created_at": new_news.created_at,
        "expires_at": new_news.expires_at
    }

@router.put("/{news_id}")
async def update_news(
    news_id: int,
    news_update: NewsUpdate,
    db: Session = Depends(get_db),
    current_user: AdminUser = Depends(get_current_user)
):
    """Update news item - Admin only"""
    news = db.query(News).filter(News.id == news_id).first()
    if not news:
        raise HTTPException(status_code=404, detail="News nicht gefunden")
    
    if news_update.title is not None:
        news.title = news_update.title
    if news_update.content is not None:
        news.content = news_update.content
    if news_update.priority is not None:
        news.priority = news_update.priority
    if news_update.expires_at is not None:
        news.expires_at = news_update.expires_at
    if news_update.is_active is not None:
        news.is_active = news_update.is_active
    
    db.commit()
    db.refresh(news)
    
    return {
        "id": news.id,
        "title": news.title,
        "content": news.content,
        "priority": news.priority,
        "is_active": news.is_active,
        "created_at": news.created_at,
        "expires_at": news.expires_at
    }

@router.delete("/{news_id}")
async def delete_news(
    news_id: int,
    db: Session = Depends(get_db),
    current_user: AdminUser = Depends(get_current_user)
):
    """Delete news item - Admin only"""
    news = db.query(News).filter(News.id == news_id).first()
    if not news:
        raise HTTPException(status_code=404, detail="News nicht gefunden")
    
    db.delete(news)
    db.commit()
    
    return {"message": "News erfolgreich gelöscht"}
