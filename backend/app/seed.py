from sqlalchemy.orm import Session
from .models import AdminUser, Personnel, Group, Role, FireStation, SystemSettings, Training
from .utils.auth import get_password_hash
from .database import SessionLocal
from datetime import datetime

def seed_initial_data():
    """Seed initial data for the application"""
    db = SessionLocal()
    
    try:
        # Check if data already exists
        if db.query(AdminUser).first():
            print("Daten bereits vorhanden, Seeding übersprungen")
            return
        
        # Create admin user
        admin = AdminUser(
            username="admin",
            hashed_password=get_password_hash("feuerwehr2025"),
            role="admin"
        )
        db.add(admin)
        
        # Create roles
        roles = [
            Role(name="admin", permissions=["*"]),
            Role(name="wehrfuehrer", permissions=[
                "personnel:*", "sessions:*", "reports:export", 
                "backup:create", "settings:*", "announcements:*",
                "groups:*", "trainings:*"
            ]),
            Role(name="gruppenfuehrer", permissions=[
                "personnel:read", "sessions:end", "reports:export", "announcements:read"
            ]),
            Role(name="mitglied", permissions=["personnel:read:own", "attendance:read:own"])
        ]
        for role in roles:
            db.add(role)
        
        # Create groups
        groups = [
            Group(name="Jugend", description="Jugendfeuerwehr", color="#0066CC"),
            Group(name="Aktive", description="Aktive Mannschaft", color="#CC0000"),
            Group(name="Altersabteilung", description="Altersabteilung", color="#CCCC00"),
            Group(name="Ehrenabteilung", description="Ehrenabteilung", color="#00CC00")
        ]
        for group in groups:
            db.add(group)
        
        db.flush()  # Get IDs
        
        # Create demo personnel
        personnel_data = [
            ("1001", "Max", "Müller", "BI", groups[1].id),
            ("1002", "Anna", "Schmidt", "HBM", groups[1].id),
            ("1003", "Peter", "Weber", "BM", groups[1].id),
            ("1004", "Lisa", "Meyer", "UBM", groups[1].id),
            ("1005", "Thomas", "Wagner", "HFM", groups[1].id),
            ("1006", "Sarah", "Becker", "OFM", groups[1].id),
            ("1007", "Michael", "Schulz", "FM", groups[1].id),
            ("2001", "Julia", "Fischer", "FM", groups[0].id),
            ("2002", "Leon", "Hoffmann", "FM", groups[0].id),
            ("3001", "Hans", "Richter", "OBM", groups[2].id),
        ]
        
        for stamm, vorname, nachname, dienstgrad, group_id in personnel_data:
            p = Personnel(
                stammrollennummer=stamm,
                vorname=vorname,
                nachname=nachname,
                dienstgrad=dienstgrad,
                group_id=group_id,
                is_active=True
            )
            db.add(p)
        
        # Create fire station
        fire_station = FireStation(
            name="Freiwillige Feuerwehr Musterstadt",
            street="Feuerwehrstraße 1",
            city="Musterstadt",
            postal_code="12345"
        )
        db.add(fire_station)
        
        # Create system settings
        settings = SystemSettings(
            backup_enabled=False,
            backup_path="./backups",
            backup_schedule_time="02:00",
            backup_retention_days=30
        )
        db.add(settings)
        
        # Create standard trainings
        trainings = [
            Training(name="Atemschutz G26.3", category="Atemschutz", 
                    duration_hours=40, validity_months=12),
            Training(name="Maschinist", category="Technik", 
                    duration_hours=35, validity_months=None),
            Training(name="Gruppenführer", category="Führung", 
                    duration_hours=70, validity_months=None),
            Training(name="Zugführer", category="Führung", 
                    duration_hours=70, validity_months=None),
            Training(name="Erste Hilfe", category="Medizin", 
                    duration_hours=16, validity_months=24),
            Training(name="Sprechfunker", category="Kommunikation", 
                    duration_hours=16, validity_months=None)
        ]
        for training in trainings:
            db.add(training)
        
        db.commit()
        print("Initiale Daten erfolgreich angelegt")
        print("Admin Login: admin / feuerwehr2025")
        
    except Exception as e:
        print(f"Fehler beim Seeding: {e}")
        db.rollback()
    finally:
        db.close()
