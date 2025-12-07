from fastapi import APIRouter, Depends
from typing import List
import asyncio
import json
from datetime import datetime

router = APIRouter(prefix="/api", tags=["events"])

# Simple timestamp-based refresh trigger
last_refresh_time = datetime.now()

@router.get("/events/last-refresh")
async def get_last_refresh():
    """Get timestamp of last refresh trigger"""
    return {
        "timestamp": last_refresh_time.isoformat(),
        "unix_timestamp": last_refresh_time.timestamp()
    }

@router.post("/events/refresh-kiosk")
async def trigger_kiosk_refresh():
    """Trigger kiosk refresh (called from admin after changes)"""
    global last_refresh_time
    last_refresh_time = datetime.now()
    
    return {
        "status": "ok", 
        "message": "Kiosk refresh triggered",
        "timestamp": last_refresh_time.isoformat()
    }
