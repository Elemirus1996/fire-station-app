from fastapi import APIRouter, Depends
from typing import List
import asyncio
from datetime import datetime

router = APIRouter(prefix="/api", tags=["events"])

# Simple event broadcasting system
class EventBroadcaster:
    def __init__(self):
        self.listeners: List[asyncio.Queue] = []
    
    async def broadcast(self, event: dict):
        """Broadcast event to all listeners"""
        for queue in self.listeners:
            await queue.put(event)
    
    async def subscribe(self):
        """Subscribe to events"""
        queue = asyncio.Queue()
        self.listeners.append(queue)
        try:
            while True:
                event = await queue.get()
                yield event
        finally:
            self.listeners.remove(queue)

broadcaster = EventBroadcaster()

@router.get("/events/stream")
async def event_stream():
    """SSE endpoint for kiosk to receive updates"""
    from fastapi.responses import StreamingResponse
    
    async def generate():
        async for event in broadcaster.subscribe():
            yield f"data: {event}\n\n"
    
    return StreamingResponse(generate(), media_type="text/event-stream")

@router.post("/events/refresh-kiosk")
async def trigger_kiosk_refresh():
    """Trigger kiosk refresh (called from admin after changes)"""
    await broadcaster.broadcast({
        "type": "refresh",
        "timestamp": datetime.now().isoformat()
    })
    return {"status": "ok", "message": "Kiosk refresh triggered"}
