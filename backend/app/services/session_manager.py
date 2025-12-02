from datetime import datetime, timedelta
from sqlalchemy.orm import Session
from ..models import Session as SessionModel, Attendance
from typing import List

class SessionManager:
    @staticmethod
    def should_auto_end(session: SessionModel) -> bool:
        """Check if session should be automatically ended"""
        if not session.is_active:
            return False
        
        if session.event_type == "Einsatz":
            return False  # Einsatz can only be ended manually
        
        # Check if 3 hours have passed
        if session.started_at:
            elapsed = datetime.utcnow() - session.started_at
            if elapsed >= timedelta(hours=3):
                return True
        
        return False
    
    @staticmethod
    def auto_end_sessions(db: Session) -> List[int]:
        """Auto-end sessions that have exceeded 3 hours (except Einsatz)"""
        ended_sessions = []
        
        active_sessions = db.query(SessionModel).filter(
            SessionModel.is_active == True
        ).all()
        
        for session in active_sessions:
            if SessionManager.should_auto_end(session):
                session.is_active = False
                session.ended_at = datetime.utcnow()
                
                # Auto checkout all attendees
                active_attendances = db.query(Attendance).filter(
                    Attendance.session_id == session.id,
                    Attendance.checked_out_at == None
                ).all()
                
                for attendance in active_attendances:
                    attendance.checked_out_at = datetime.utcnow()
                
                ended_sessions.append(session.id)
        
        if ended_sessions:
            db.commit()
        
        return ended_sessions
    
    @staticmethod
    def end_session(db: Session, session_id: int) -> bool:
        """Manually end a session"""
        session = db.query(SessionModel).filter(SessionModel.id == session_id).first()
        
        if not session or not session.is_active:
            return False
        
        session.is_active = False
        session.ended_at = datetime.utcnow()
        
        # Checkout all attendees
        active_attendances = db.query(Attendance).filter(
            Attendance.session_id == session.id,
            Attendance.checked_out_at == None
        ).all()
        
        for attendance in active_attendances:
            attendance.checked_out_at = datetime.utcnow()
        
        db.commit()
        return True
