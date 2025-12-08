"""
Database migration script to add Calendar and Duty management tables
Adds: CalendarEvent, EventParticipant, DutySchedule, PersonnelAdmin
"""

from sqlalchemy import create_engine, text
import os
from dotenv import load_dotenv

load_dotenv()

DATABASE_URL = os.getenv(
    "DATABASE_URL",
    "postgresql://feuerwehr:feuerwehr123@localhost:5432/feuerwehr_db"
)

engine = create_engine(DATABASE_URL)

def run_migration():
    """Run database migration"""
    print("Starting database migration...")
    
    with engine.connect() as conn:
        # Create CalendarEvent table
        print("Creating calendar_events table...")
        conn.execute(text("""
            CREATE TABLE IF NOT EXISTS calendar_events (
                id SERIAL PRIMARY KEY,
                title VARCHAR(200) NOT NULL,
                description TEXT,
                event_type VARCHAR(50) NOT NULL,
                start_time TIMESTAMP NOT NULL,
                end_time TIMESTAMP NOT NULL,
                location VARCHAR(200),
                all_day BOOLEAN DEFAULT FALSE,
                recurrence VARCHAR(50),
                max_participants INTEGER,
                registration_required BOOLEAN DEFAULT FALSE,
                created_by INTEGER REFERENCES admin_users(id),
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        """))
        
        # Create indexes for calendar_events
        conn.execute(text("CREATE INDEX IF NOT EXISTS idx_calendar_start ON calendar_events(start_time);"))
        conn.execute(text("CREATE INDEX IF NOT EXISTS idx_calendar_type ON calendar_events(event_type);"))
        
        # Create EventParticipant table
        print("Creating event_participants table...")
        conn.execute(text("""
            CREATE TABLE IF NOT EXISTS event_participants (
                id SERIAL PRIMARY KEY,
                event_id INTEGER NOT NULL REFERENCES calendar_events(id) ON DELETE CASCADE,
                personnel_id INTEGER NOT NULL REFERENCES personnel(id),
                status VARCHAR(20) DEFAULT 'registered',
                registered_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                notes TEXT,
                UNIQUE(event_id, personnel_id)
            );
        """))
        
        conn.execute(text("CREATE INDEX IF NOT EXISTS idx_event_participants_event ON event_participants(event_id);"))
        conn.execute(text("CREATE INDEX IF NOT EXISTS idx_event_participants_personnel ON event_participants(personnel_id);"))
        
        # Create DutySchedule table
        print("Creating duty_schedules table...")
        conn.execute(text("""
            CREATE TABLE IF NOT EXISTS duty_schedules (
                id SERIAL PRIMARY KEY,
                personnel_id INTEGER NOT NULL REFERENCES personnel(id),
                duty_type VARCHAR(50) NOT NULL,
                start_time TIMESTAMP NOT NULL,
                end_time TIMESTAMP NOT NULL,
                notes TEXT,
                created_by INTEGER REFERENCES admin_users(id),
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        """))
        
        conn.execute(text("CREATE INDEX IF NOT EXISTS idx_duty_start ON duty_schedules(start_time);"))
        conn.execute(text("CREATE INDEX IF NOT EXISTS idx_duty_personnel ON duty_schedules(personnel_id);"))
        
        # Create PersonnelAdmin table
        print("Creating personnel_admin table...")
        conn.execute(text("""
            CREATE TABLE IF NOT EXISTS personnel_admin (
                id SERIAL PRIMARY KEY,
                personnel_id INTEGER NOT NULL UNIQUE REFERENCES personnel(id) ON DELETE CASCADE,
                hashed_password VARCHAR(255) NOT NULL,
                role VARCHAR(50) DEFAULT 'admin',
                is_active BOOLEAN DEFAULT TRUE,
                last_login TIMESTAMP,
                created_by INTEGER REFERENCES admin_users(id),
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        """))
        
        conn.execute(text("CREATE INDEX IF NOT EXISTS idx_personnel_admin_personnel ON personnel_admin(personnel_id);"))
        
        conn.commit()
        print("✅ Migration completed successfully!")
        print("\nNew tables created:")
        print("  - calendar_events")
        print("  - event_participants")
        print("  - duty_schedules")
        print("  - personnel_admin")

if __name__ == "__main__":
    try:
        run_migration()
    except Exception as e:
        print(f"❌ Migration failed: {e}")
        raise
