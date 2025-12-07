from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import Response
from sqlalchemy.orm import Session
from sqlalchemy import func, extract
from datetime import datetime, timedelta
from typing import Optional
from ..database import get_db
from ..models import Personnel, Attendance, Session as SessionModel
from ..utils.auth import get_current_user
from ..models import AdminUser
from ..services.statistics_pdf import StatisticsPDFGenerator

router = APIRouter(prefix="/api/statistics", tags=["statistics"])

@router.get("/personnel/{personnel_id}/yearly")
async def get_personnel_yearly_stats(
    personnel_id: int,
    year: Optional[int] = Query(None, description="Jahr (Standard: aktuelles Jahr)"),
    db: Session = Depends(get_db),
    current_user: AdminUser = Depends(get_current_user)
):
    """
    Jahresstatistik für eine einzelne Person
    - Anzahl Einsätze, Übungen, Arbeitsdienste
    - Gesamtstunden
    - Anwesenheitsquote
    - Monatliche Aufschlüsselung
    """
    # Validate personnel exists
    personnel = db.query(Personnel).filter(Personnel.id == personnel_id).first()
    if not personnel:
        raise HTTPException(status_code=404, detail="Person nicht gefunden")
    
    # Default to current year
    if year is None:
        year = datetime.now().year
    
    # Date range for the year
    start_date = datetime(year, 1, 1)
    end_date = datetime(year, 12, 31, 23, 59, 59)
    
    # Get all attendances for this person in the year
    attendances = db.query(Attendance).join(
        SessionModel, Attendance.session_id == SessionModel.id
    ).filter(
        Attendance.personnel_id == personnel_id,
        SessionModel.started_at >= start_date,
        SessionModel.started_at <= end_date
    ).all()
    
    # Calculate statistics
    total_sessions = len(attendances)
    
    # Count by event type
    event_type_counts = {}
    total_hours = 0.0
    monthly_data = {i: {"count": 0, "hours": 0.0} for i in range(1, 13)}
    
    for att in attendances:
        session = att.session
        event_type = session.event_type
        
        # Count by type
        if event_type not in event_type_counts:
            event_type_counts[event_type] = 0
        event_type_counts[event_type] += 1
        
        # Calculate hours
        if att.checked_out_at:
            duration = (att.checked_out_at - att.checked_in_at).total_seconds() / 3600
        elif session.ended_at:
            duration = (session.ended_at - att.checked_in_at).total_seconds() / 3600
        else:
            duration = 0
        
        total_hours += duration
        
        # Monthly breakdown
        month = session.started_at.month
        monthly_data[month]["count"] += 1
        monthly_data[month]["hours"] += duration
    
    # Get total sessions in the year for attendance rate
    total_sessions_in_year = db.query(SessionModel).filter(
        SessionModel.started_at >= start_date,
        SessionModel.started_at <= end_date
    ).count()
    
    attendance_rate = (total_sessions / total_sessions_in_year * 100) if total_sessions_in_year > 0 else 0
    
    return {
        "personnel": {
            "id": personnel.id,
            "stammrollennummer": personnel.stammrollennummer,
            "vorname": personnel.vorname,
            "nachname": personnel.nachname,
            "dienstgrad": personnel.dienstgrad
        },
        "year": year,
        "summary": {
            "total_sessions": total_sessions,
            "total_hours": round(total_hours, 2),
            "attendance_rate": round(attendance_rate, 2),
            "event_types": event_type_counts
        },
        "monthly": [
            {
                "month": i,
                "month_name": datetime(year, i, 1).strftime("%B"),
                "count": monthly_data[i]["count"],
                "hours": round(monthly_data[i]["hours"], 2)
            }
            for i in range(1, 13)
        ]
    }

@router.get("/unit/yearly")
async def get_unit_yearly_stats(
    year: Optional[int] = Query(None, description="Jahr (Standard: aktuelles Jahr)"),
    db: Session = Depends(get_db),
    current_user: AdminUser = Depends(get_current_user)
):
    """
    Gesamt-Jahresstatistik für die gesamte Einheit
    - Gesamtanzahl Sessions nach Typ
    - Durchschnittliche Teilnahme pro Session
    - Top 10 aktivste Mitglieder
    - Monatliche Übersicht
    - Teilnahme nach Dienstgrad
    """
    # Default to current year
    if year is None:
        year = datetime.now().year
    
    # Date range for the year
    start_date = datetime(year, 1, 1)
    end_date = datetime(year, 12, 31, 23, 59, 59)
    
    # Get all sessions in the year
    sessions = db.query(SessionModel).filter(
        SessionModel.started_at >= start_date,
        SessionModel.started_at <= end_date
    ).all()
    
    total_sessions = len(sessions)
    
    # Count by event type
    event_type_counts = {}
    monthly_sessions = {i: {} for i in range(1, 13)}
    total_attendances = 0
    
    for session in sessions:
        event_type = session.event_type
        if event_type not in event_type_counts:
            event_type_counts[event_type] = 0
        event_type_counts[event_type] += 1
        
        # Monthly breakdown
        month = session.started_at.month
        if event_type not in monthly_sessions[month]:
            monthly_sessions[month][event_type] = 0
        monthly_sessions[month][event_type] += 1
        
        # Count attendances
        total_attendances += len(session.attendances)
    
    avg_attendance_per_session = (total_attendances / total_sessions) if total_sessions > 0 else 0
    
    # Get personnel statistics
    personnel_stats = db.query(
        Personnel.id,
        Personnel.stammrollennummer,
        Personnel.vorname,
        Personnel.nachname,
        Personnel.dienstgrad,
        func.count(Attendance.id).label('attendance_count')
    ).join(
        Attendance, Personnel.id == Attendance.personnel_id
    ).join(
        SessionModel, Attendance.session_id == SessionModel.id
    ).filter(
        SessionModel.started_at >= start_date,
        SessionModel.started_at <= end_date
    ).group_by(
        Personnel.id
    ).order_by(
        func.count(Attendance.id).desc()
    ).limit(10).all()
    
    # Statistics by rank
    rank_stats = db.query(
        Personnel.dienstgrad,
        func.count(Attendance.id).label('attendance_count')
    ).join(
        Attendance, Personnel.id == Attendance.personnel_id
    ).join(
        SessionModel, Attendance.session_id == SessionModel.id
    ).filter(
        SessionModel.started_at >= start_date,
        SessionModel.started_at <= end_date
    ).group_by(
        Personnel.dienstgrad
    ).all()
    
    # Format monthly data
    monthly_data = []
    for month in range(1, 13):
        monthly_data.append({
            "month": month,
            "month_name": datetime(year, month, 1).strftime("%B"),
            "sessions_by_type": monthly_sessions[month],
            "total_sessions": sum(monthly_sessions[month].values())
        })
    
    return {
        "year": year,
        "summary": {
            "total_sessions": total_sessions,
            "total_attendances": total_attendances,
            "average_attendance_per_session": round(avg_attendance_per_session, 2),
            "event_types": event_type_counts
        },
        "top_personnel": [
            {
                "id": p.id,
                "stammrollennummer": p.stammrollennummer,
                "name": f"{p.vorname} {p.nachname}",
                "dienstgrad": p.dienstgrad,
                "attendance_count": p.attendance_count,
                "attendance_rate": round((p.attendance_count / total_sessions * 100), 2) if total_sessions > 0 else 0
            }
            for p in personnel_stats
        ],
        "by_rank": [
            {
                "dienstgrad": rank.dienstgrad,
                "attendance_count": rank.attendance_count
            }
            for rank in rank_stats
        ],
        "monthly": monthly_data
    }

@router.get("/personnel/{personnel_id}/history")
async def get_personnel_history(
    personnel_id: int,
    start_date: Optional[str] = Query(None, description="Startdatum (YYYY-MM-DD)"),
    end_date: Optional[str] = Query(None, description="Enddatum (YYYY-MM-DD)"),
    db: Session = Depends(get_db),
    current_user: AdminUser = Depends(get_current_user)
):
    """
    Detaillierte Teilnahmehistorie für eine Person
    """
    # Validate personnel exists
    personnel = db.query(Personnel).filter(Personnel.id == personnel_id).first()
    if not personnel:
        raise HTTPException(status_code=404, detail="Person nicht gefunden")
    
    # Parse dates
    if start_date:
        start_dt = datetime.strptime(start_date, "%Y-%m-%d")
    else:
        start_dt = datetime.now() - timedelta(days=365)
    
    if end_date:
        end_dt = datetime.strptime(end_date, "%Y-%m-%d")
        end_dt = end_dt.replace(hour=23, minute=59, second=59)
    else:
        end_dt = datetime.now()
    
    # Get attendances
    attendances = db.query(Attendance).join(
        SessionModel, Attendance.session_id == SessionModel.id
    ).filter(
        Attendance.personnel_id == personnel_id,
        SessionModel.started_at >= start_dt,
        SessionModel.started_at <= end_dt
    ).order_by(SessionModel.started_at.desc()).all()
    
    history = []
    for att in attendances:
        session = att.session
        duration_minutes = None
        if att.checked_out_at:
            duration_minutes = int((att.checked_out_at - att.checked_in_at).total_seconds() / 60)
        elif session.ended_at:
            duration_minutes = int((session.ended_at - att.checked_in_at).total_seconds() / 60)
        
        history.append({
            "session_id": session.id,
            "event_type": session.event_type,
            "date": session.started_at.strftime("%Y-%m-%d"),
            "time": session.started_at.strftime("%H:%M"),
            "checked_in_at": att.checked_in_at.isoformat(),
            "checked_out_at": att.checked_out_at.isoformat() if att.checked_out_at else None,
            "duration_minutes": duration_minutes
        })
    
    return {
        "personnel": {
            "id": personnel.id,
            "stammrollennummer": personnel.stammrollennummer,
            "name": f"{personnel.vorname} {personnel.nachname}",
            "dienstgrad": personnel.dienstgrad
        },
        "period": {
            "start": start_dt.strftime("%Y-%m-%d"),
            "end": end_dt.strftime("%Y-%m-%d")
        },
        "total_attendances": len(history),
        "history": history
    }

@router.get("/personnel/{personnel_id}/yearly/pdf")
async def download_personnel_yearly_pdf(
    personnel_id: int,
    year: Optional[int] = Query(None, description="Jahr (Standard: aktuelles Jahr)"),
    db: Session = Depends(get_db),
    current_user: AdminUser = Depends(get_current_user)
):
    """
    Download Jahresstatistik als PDF für eine einzelne Person
    """
    # Get stats data first
    stats_response = await get_personnel_yearly_stats(personnel_id, year, db, current_user)
    
    # Generate PDF
    pdf_bytes = StatisticsPDFGenerator.generate_personnel_yearly_pdf(db, personnel_id, year or datetime.now().year, stats_response)
    
    if not pdf_bytes:
        raise HTTPException(status_code=500, detail="Fehler beim Generieren des PDFs")
    
    personnel = db.query(Personnel).filter(Personnel.id == personnel_id).first()
    filename = f"Statistik_{personnel.nachname}_{personnel.vorname}_{year or datetime.now().year}.pdf"
    
    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={
            "Content-Disposition": f"attachment; filename={filename}"
        }
    )

@router.get("/unit/yearly/pdf")
async def download_unit_yearly_pdf(
    year: Optional[int] = Query(None, description="Jahr (Standard: aktuelles Jahr)"),
    db: Session = Depends(get_db),
    current_user: AdminUser = Depends(get_current_user)
):
    """
    Download Gesamt-Jahresbericht als PDF
    """
    # Get stats data first
    stats_response = await get_unit_yearly_stats(year, db, current_user)
    
    # Generate PDF
    pdf_bytes = StatisticsPDFGenerator.generate_unit_yearly_pdf(db, year or datetime.now().year, stats_response)
    
    if not pdf_bytes:
        raise HTTPException(status_code=500, detail="Fehler beim Generieren des PDFs")
    
    filename = f"Jahresbericht_Einheit_{year or datetime.now().year}.pdf"
    
    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={
            "Content-Disposition": f"attachment; filename={filename}"
        }
    )

