#!/usr/bin/env python3
"""
Check Personnel in Database
Überprüft ob Personal in der Datenbank vorhanden ist
"""

import sys
import os

# Add parent directory to path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from app.database import SessionLocal, engine
from app.models import Personnel, Group, Base
from app.seed import seed_initial_data

print("=" * 60)
print("Personnel Database Check")
print("=" * 60)

# Create all tables
Base.metadata.create_all(bind=engine)

db = SessionLocal()

try:
    # Count personnel
    personnel_count = db.query(Personnel).count()
    print(f"\n✓ Personnel in DB: {personnel_count}")
    
    if personnel_count == 0:
        print("\n⚠ Keine Personnel gefunden! Seeding ausführen...")
        db.close()
        seed_initial_data()
        db = SessionLocal()
        personnel_count = db.query(Personnel).count()
        print(f"✓ Nach Seeding: {personnel_count} Personnel")
    
    # List all personnel
    print("\nPersonal-Liste:")
    print("-" * 60)
    personnel = db.query(Personnel).all()
    for p in personnel:
        group_name = p.group.name if p.group else "Keine Gruppe"
        status = "✓ Aktiv" if p.is_active else "✗ Inaktiv"
        print(f"  {p.stammrollennummer:6} | {p.vorname} {p.nachname:15} | {p.dienstgrad:3} | {group_name:15} | {status}")
    
    # Check groups
    print("\n" + "=" * 60)
    groups = db.query(Group).all()
    print(f"Gruppen in DB: {len(groups)}")
    for g in groups:
        member_count = len(g.members)
        print(f"  - {g.name:20} ({member_count} Mitglieder)")
    
    print("\n" + "=" * 60)
    print("✓ Check abgeschlossen!")
    
except Exception as e:
    print(f"\n✗ Fehler: {e}")
    import traceback
    traceback.print_exc()
finally:
    db.close()
