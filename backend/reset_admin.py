#!/usr/bin/env python3
"""
Reset Admin Password
Setzt das Admin-Passwort zurück
"""

import sys
import os

# Add parent directory to path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from app.database import SessionLocal
from app.models import AdminUser
from app.utils.auth import get_password_hash

print("=" * 60)
print("Admin Password Reset")
print("=" * 60)

db = SessionLocal()

try:
    # Find admin user
    admin = db.query(AdminUser).filter(AdminUser.username == "admin").first()
    
    if not admin:
        print("\n⚠ Kein Admin-User 'admin' gefunden!")
        print("\nErstelle neuen Admin-User...")
        admin = AdminUser(
            username="admin",
            hashed_password=get_password_hash("feuerwehr2025"),
            role="admin"
        )
        db.add(admin)
        db.commit()
        print("✓ Admin-User erstellt")
    else:
        print(f"\n✓ Admin-User gefunden: {admin.username}")
        print(f"  ID: {admin.id}")
        print(f"  Role: {admin.role}")
        print(f"  Erstellt: {admin.created_at}")
    
    # Reset password
    print("\nSetze Passwort zurück auf: feuerwehr2025")
    admin.hashed_password = get_password_hash("feuerwehr2025")
    db.commit()
    
    print("\n" + "=" * 60)
    print("✓ Passwort erfolgreich zurückgesetzt!")
    print("\nLogin-Daten:")
    print("  Username: admin")
    print("  Passwort: feuerwehr2025")
    print("=" * 60)
    
except Exception as e:
    print(f"\n✗ Fehler: {e}")
    import traceback
    traceback.print_exc()
    db.rollback()
finally:
    db.close()
