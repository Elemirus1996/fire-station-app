from sqlalchemy import Column, Integer, String, Boolean, DateTime, ForeignKey, Text, JSON, Float
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import relationship
from datetime import datetime

Base = declarative_base()

# Dienstgrade Hierarchie
DIENSTGRADE = {
    "FM": ("Feuerwehrmann", 1),
    "OFM": ("Oberfeuerwehrmann", 2),
    "HFM": ("Hauptfeuerwehrmann", 3),
    "UBM": ("Unterbrandmeister", 4),
    "BM": ("Brandmeister", 5),
    "OBM": ("Oberbrandmeister", 6),
    "HBM": ("Hauptbrandmeister", 7),
    "BI": ("Brandinspektor", 8),
}
MIN_RANG_EINSATZ_BEENDEN = 4


class AdminUser(Base):
    __tablename__ = "admin_users"
    
    id = Column(Integer, primary_key=True, index=True)
    username = Column(String(50), unique=True, index=True, nullable=False)
    hashed_password = Column(String(255), nullable=False)
    role = Column(String(50), default="mitglied")
    created_at = Column(DateTime, default=datetime.utcnow)
    last_login = Column(DateTime)


class Role(Base):
    __tablename__ = "roles"
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(50), unique=True, nullable=False)
    permissions = Column(JSON, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)


class Group(Base):
    __tablename__ = "groups"
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), nullable=False)
    description = Column(Text)
    color = Column(String(20))
    created_at = Column(DateTime, default=datetime.utcnow)


class Personnel(Base):
    __tablename__ = "personnel"
    
    id = Column(Integer, primary_key=True, index=True)
    stammrollennummer = Column(String(20), unique=True, nullable=False, index=True)
    vorname = Column(String(100), nullable=False)
    nachname = Column(String(100), nullable=False)
    dienstgrad = Column(String(10), nullable=False)
    group_id = Column(Integer, ForeignKey("groups.id"))
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    group = relationship("Group", backref="members")
    attendances = relationship("Attendance", back_populates="personnel")
    trainings = relationship("PersonnelTraining", back_populates="personnel")


class Session(Base):
    __tablename__ = "sessions"
    
    id = Column(Integer, primary_key=True, index=True)
    event_type = Column(String(50), nullable=False)  # Einsatz, Übungsdienst, Arbeitsdienst-A/B/C
    started_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    ended_at = Column(DateTime)
    is_active = Column(Boolean, default=True)
    auto_end_scheduled = Column(Boolean, default=False)
    created_by = Column(Integer, ForeignKey("admin_users.id"))
    
    attendances = relationship("Attendance", back_populates="session")


class Attendance(Base):
    __tablename__ = "attendances"
    
    id = Column(Integer, primary_key=True, index=True)
    session_id = Column(Integer, ForeignKey("sessions.id"), nullable=False)
    personnel_id = Column(Integer, ForeignKey("personnel.id"), nullable=False)
    checked_in_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    checked_out_at = Column(DateTime)
    
    session = relationship("Session", back_populates="attendances")
    personnel = relationship("Personnel", back_populates="attendances")


class FireStation(Base):
    __tablename__ = "fire_stations"
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(200), nullable=False)
    logo_path = Column(String(500))
    street = Column(String(200))
    city = Column(String(100))
    postal_code = Column(String(20))
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


class SystemSettings(Base):
    __tablename__ = "system_settings"
    
    id = Column(Integer, primary_key=True, index=True)
    backup_enabled = Column(Boolean, default=False)
    backup_path = Column(String(500), default="./backups")
    backup_schedule_time = Column(String(5), default="02:00")
    backup_retention_days = Column(Integer, default=30)
    # Note: New columns added for QR code configuration. SQLAlchemy will auto-create these on first run.
    # For existing databases, run: ALTER TABLE system_settings ADD COLUMN kiosk_base_url VARCHAR(500) DEFAULT 'http://localhost:5173';
    # ALTER TABLE system_settings ADD COLUMN kiosk_show_attendance_list BOOLEAN DEFAULT TRUE;
    kiosk_base_url = Column(String(500), default="http://localhost:5173")
    kiosk_show_attendance_list = Column(Boolean, default=True)
    screensaver_enabled = Column(Boolean, default=True)
    screensaver_timeout = Column(Integer, default=300)  # seconds
    screensaver_show_logo = Column(Boolean, default=True)
    screensaver_show_clock = Column(Boolean, default=True)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


class News(Base):
    __tablename__ = "news"
    
    id = Column(Integer, primary_key=True, index=True)
    title = Column(String(200), nullable=False)
    content = Column(Text, nullable=False)
    priority = Column(String(20), default="normal")  # low, normal, high, urgent
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    expires_at = Column(DateTime)
    created_by = Column(String(100))



class UserPreferences(Base):
    __tablename__ = "user_preferences"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("admin_users.id"), unique=True)
    theme = Column(String(20), default="auto")  # light/dark/auto
    font_size = Column(String(20), default="normal")  # normal/large/extra-large
    high_contrast = Column(Boolean, default=False)
    language = Column(String(10), default="de")
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


class Announcement(Base):
    __tablename__ = "announcements"
    
    id = Column(Integer, primary_key=True, index=True)
    title = Column(String(200), nullable=False)
    content = Column(Text, nullable=False)
    priority = Column(String(20), default="normal")  # normal/high/urgent
    valid_from = Column(DateTime, default=datetime.utcnow)
    valid_until = Column(DateTime)
    target_groups = Column(JSON)
    created_by = Column(Integer, ForeignKey("admin_users.id"))
    created_at = Column(DateTime, default=datetime.utcnow)


class Training(Base):
    __tablename__ = "trainings"
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(200), nullable=False)
    category = Column(String(100))
    duration_hours = Column(Integer)
    validity_months = Column(Integer)
    created_at = Column(DateTime, default=datetime.utcnow)


class PersonnelTraining(Base):
    __tablename__ = "personnel_trainings"
    
    id = Column(Integer, primary_key=True, index=True)
    personnel_id = Column(Integer, ForeignKey("personnel.id"), nullable=False)
    training_id = Column(Integer, ForeignKey("trainings.id"), nullable=False)
    completed_date = Column(DateTime, nullable=False)
    expires_date = Column(DateTime)
    certificate_number = Column(String(100))
    
    personnel = relationship("Personnel", back_populates="trainings")
    training = relationship("Training")


class AuditLog(Base):
    __tablename__ = "audit_logs"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("admin_users.id"))
    action = Column(String(100), nullable=False)
    entity_type = Column(String(50))
    entity_id = Column(Integer)
    changes = Column(JSON)
    ip_address = Column(String(50))
    timestamp = Column(DateTime, default=datetime.utcnow, index=True)
