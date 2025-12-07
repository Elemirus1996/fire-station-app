#!/usr/bin/env python3
"""
Recreate Database
Löscht und erstellt die Datenbank komplett neu
"""

import sys
import os

# Add parent directory to path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

print("=" * 60)
print("Database Recreation")
print("=" * 60)

# Check if database file exists
db_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), "fire_station.db")
print(f"\nDatenbank-Pfad: {db_path}")

if os.path.exists(db_path):
    print(f"✓ Datenbank existiert ({os.path.getsize(db_path)} bytes)")
    
    # Backup old database
    backup_path = db_path + ".backup"
    print(f"\nErstelle Backup: {backup_path}")
    import shutil
    shutil.copy2(db_path, backup_path)
    print("✓ Backup erstellt")
    
    # Delete old database
    print("\nLösche alte Datenbank...")
    os.remove(db_path)
    print("✓ Alte Datenbank gelöscht")
else:
    print("⚠ Datenbank existiert noch nicht")

# Import after removing old DB
from app.database import engine, SessionLocal
from app.models import Base
from app.seed import seed_initial_data

print("\n" + "=" * 60)
print("Erstelle neue Datenbank...")
print("=" * 60)

try:
    # Create all tables
    Base.metadata.create_all(bind=engine)
    print("✓ Tabellen erstellt")
    
    # Verify tables
    from sqlalchemy import inspect
    inspector = inspect(engine)
    tables = inspector.get_table_names()
    print(f"\nGefundene Tabellen ({len(tables)}):")
    for table in tables:
        print(f"  - {table}")
    
    # Seed initial data
    print("\n" + "=" * 60)
    print("Füge initiale Daten ein...")
    print("=" * 60)
    seed_initial_data()
    
    # Verify data
    db = SessionLocal()
    from app.models import AdminUser, Personnel, Group
    
    admin_count = db.query(AdminUser).count()
    personnel_count = db.query(Personnel).count()
    group_count = db.query(Group).count()
    
    print("\n" + "=" * 60)
    print("Datenbank erfolgreich erstellt!")
    print("=" * 60)
    print(f"\nAdmin-Users: {admin_count}")
    print(f"Personnel: {personnel_count}")
    print(f"Gruppen: {group_count}")
    
    if admin_count > 0:
        admin = db.query(AdminUser).first()
        print(f"\n✓ Login möglich mit:")
        print(f"  Username: {admin.username}")
        print(f"  Passwort: feuerwehr2025")
    
    db.close()
    
    print("\n" + "=" * 60)
    print("✓ Fertig! Backend jetzt neu starten:")
    print("  sudo systemctl restart feuerwehr-backend")
    print("=" * 60)
    
except Exception as e:
    print(f"\n✗ Fehler: {e}")
    import traceback
    traceback.print_exc()
    sys.exit(1)
