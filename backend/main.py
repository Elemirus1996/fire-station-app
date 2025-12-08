from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from apscheduler.schedulers.background import BackgroundScheduler
from apscheduler.triggers.cron import CronTrigger
import os
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

from app.database import init_db, SessionLocal
from app.seed import seed_initial_data
from app.services.session_manager import SessionManager
from app.services.backup_manager import BackupManager
from app.models import SystemSettings

# Import routes
from app.routes import (
    auth, personnel, sessions, attendance, settings, 
    backup, export, announcements, news, statistics, 
    system, events, calendar, duty, personnel_admin, audit
)

app = FastAPI(
    title="Feuerwehr Anwesenheitssystem",
    description="Digitale Anwesenheitserfassung für Feuerwachen",
    version="1.0.0"
)

# CORS configuration - Load from environment or use defaults
cors_origins = os.getenv("CORS_ORIGINS", "http://localhost:5173,http://localhost:3000").split(",")
app.add_middleware(
    CORSMiddleware,
    allow_origins=cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(auth.router)
app.include_router(personnel.router)
app.include_router(sessions.router)
app.include_router(attendance.router)
app.include_router(settings.router)
app.include_router(backup.router)
app.include_router(export.router)
app.include_router(announcements.router)
app.include_router(news.router)
app.include_router(statistics.router)
app.include_router(system.router)
app.include_router(events.router)
app.include_router(calendar.router)
app.include_router(duty.router)
app.include_router(personnel_admin.router)
app.include_router(audit.router)

# Serve uploaded files
os.makedirs("./uploads", exist_ok=True)
app.mount("/uploads", StaticFiles(directory="./uploads"), name="uploads")

# Background scheduler
scheduler = BackgroundScheduler()

def auto_end_sessions_job():
    """Background job to auto-end sessions after 3 hours"""
    db = SessionLocal()
    try:
        ended_sessions = SessionManager.auto_end_sessions(db)
        if ended_sessions:
            print(f"Auto-ended sessions: {ended_sessions}")
    finally:
        db.close()

def auto_backup_job():
    """Background job for automatic backups"""
    db = SessionLocal()
    try:
        settings = db.query(SystemSettings).first()
        if settings and settings.backup_enabled:
            success, result = BackupManager.create_backup(settings.backup_path)
            if success:
                print(f"Auto-backup created: {result}")
                # Delete old backups
                deleted = BackupManager.delete_old_backups(
                    settings.backup_path, 
                    settings.backup_retention_days
                )
                if deleted:
                    print(f"Deleted {deleted} old backups")
    finally:
        db.close()

@app.on_event("startup")
async def startup_event():
    """Initialize database and start background tasks"""
    # Initialize database
    init_db()
    
    # Seed initial data
    seed_initial_data()
    
    # Start background scheduler
    scheduler.add_job(
        auto_end_sessions_job,
        'interval',
        seconds=60,
        id='auto_end_sessions'
    )
    
    # Add daily backup job at configured time
    db = SessionLocal()
    try:
        settings = db.query(SystemSettings).first()
        if settings and settings.backup_enabled:
            hour, minute = map(int, settings.backup_schedule_time.split(':'))
            scheduler.add_job(
                auto_backup_job,
                CronTrigger(hour=hour, minute=minute),
                id='auto_backup'
            )
    finally:
        db.close()
    
    scheduler.start()
    print("Scheduler started")

@app.on_event("shutdown")
async def shutdown_event():
    """Cleanup on shutdown"""
    scheduler.shutdown()
    print("Scheduler stopped")

@app.get("/")
async def root():
    return {
        "message": "Feuerwehr Anwesenheitssystem API",
        "version": "1.0.0",
        "status": "running"
    }

@app.get("/api/health")
async def health_check():
    return {"status": "healthy"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
