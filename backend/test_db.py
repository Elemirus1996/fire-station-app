#!/usr/bin/env python3
"""
Test-Script für Datenbank-Funktionalität
Führt grundlegende Datenbank-Tests durch
"""

import sys
import os

# Stelle sicher dass wir die app importieren können
sys.path.insert(0, os.path.dirname(__file__))

print("=" * 60)
print("Datenbank Test-Script")
print("=" * 60)
print()

# 1. Prüfe Imports
print("1. Teste Imports...")
try:
    from app.database import init_db, SessionLocal, engine, DATABASE_URL
    from app.seed import seed_initial_data
    from app.models import AdminUser, Personnel, FireStation, SystemSettings
    print("   ✓ Alle Module erfolgreich importiert")
except Exception as e:
    print(f"   ✗ Import-Fehler: {e}")
    sys.exit(1)

print()

# 2. Zeige Datenbank-Konfiguration
print("2. Datenbank-Konfiguration:")
print(f"   DATABASE_URL: {DATABASE_URL}")
print(f"   Engine: {engine}")
print()

# 3. Prüfe ob Datenbank-Datei existiert
if DATABASE_URL.startswith("sqlite:///"):
    db_file = DATABASE_URL.replace("sqlite:///", "").replace("./", "")
    db_path = os.path.abspath(db_file)
    print(f"3. Datenbank-Datei:")
    print(f"   Pfad: {db_path}")
    if os.path.exists(db_path):
        size = os.path.getsize(db_path)
        print(f"   ✓ Datei existiert ({size} bytes)")
    else:
        print(f"   ✗ Datei existiert NICHT")
    print()

# 4. Initialisiere Datenbank
print("4. Initialisiere Datenbank...")
try:
    init_db()
    print("   ✓ Tabellen erstellt")
except Exception as e:
    print(f"   ✗ Fehler: {e}")
    import traceback
    traceback.print_exc()
    sys.exit(1)

print()

# 5. Prüfe erstellte Tabellen
print("5. Prüfe Tabellen...")
try:
    from sqlalchemy import inspect
    inspector = inspect(engine)
    tables = inspector.get_table_names()
    print(f"   Gefundene Tabellen ({len(tables)}):")
    for table in tables:
        print(f"   - {table}")
except Exception as e:
    print(f"   ✗ Fehler: {e}")

print()

# 6. Prüfe ob Admin existiert
print("6. Prüfe Admin-User...")
db = SessionLocal()
try:
    admin_count = db.query(AdminUser).count()
    print(f"   Admin-Users in DB: {admin_count}")
    
    if admin_count == 0:
        print("   → Keine Admin-User gefunden, führe Seeding aus...")
        seed_initial_data()
        admin_count = db.query(AdminUser).count()
        print(f"   ✓ Nach Seeding: {admin_count} Admin-Users")
    else:
        print("   ✓ Admin-User bereits vorhanden")
        admin = db.query(AdminUser).first()
        print(f"   Username: {admin.username}")
        print(f"   Role: {admin.role}")
except Exception as e:
    print(f"   ✗ Fehler: {e}")
    import traceback
    traceback.print_exc()
finally:
    db.close()

print()

# 7. Test: Eintrag erstellen und lesen
print("7. Test: Daten schreiben und lesen...")
db = SessionLocal()
try:
    # Prüfe FireStation
    station = db.query(FireStation).first()
    if not station:
        print("   Erstelle Test-FireStation...")
        station = FireStation(
            name="Test-Feuerwehr",
            street="Teststraße 1",
            city="Teststadt",
            postal_code="12345"
        )
        db.add(station)
        db.flush()
        print(f"   ✓ FireStation erstellt (ID: {station.id})")
    
    db.commit()
    db.refresh(station)
    
    # Lese zurück
    station_read = db.query(FireStation).filter_by(id=station.id).first()
    if station_read:
        print(f"   ✓ FireStation gelesen: {station_read.name}")
    else:
        print(f"   ✗ FireStation konnte nicht zurückgelesen werden!")
        
except Exception as e:
    print(f"   ✗ Fehler: {e}")
    import traceback
    traceback.print_exc()
    db.rollback()
finally:
    db.close()

print()

# 8. Zusammenfassung
print("8. Zusammenfassung:")
db = SessionLocal()
try:
    counts = {
        "Admin-Users": db.query(AdminUser).count(),
        "Personnel": db.query(Personnel).count(),
        "FireStation": db.query(FireStation).count(),
        "SystemSettings": db.query(SystemSettings).count(),
    }
    
    for model, count in counts.items():
        print(f"   {model}: {count}")
        
except Exception as e:
    print(f"   ✗ Fehler: {e}")
finally:
    db.close()

print()
print("=" * 60)
print("Test abgeschlossen!")
print("=" * 60)
