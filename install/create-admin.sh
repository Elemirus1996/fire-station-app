#!/bin/bash

# Admin-User auf dem Pi erstellen/zurücksetzen

echo "=========================================="
echo "🔧 Admin-User erstellen"
echo "=========================================="
echo ""

cd /opt/feuerwehr-app/backend

echo "Aktiviere Virtual Environment..."
source venv/bin/activate

echo ""
echo "Erstelle Admin-User..."
python3 << 'EOF'
from app.database import SessionLocal, engine
from app.models import AdminUser, Base
from passlib.context import CryptContext

# Password Hashing
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# Datenbank Session
db = SessionLocal()

try:
    # Prüfe ob Admin existiert
    admin = db.query(AdminUser).filter(AdminUser.username == "admin").first()
    
    if admin:
        print("✓ Admin-User existiert bereits")
        print(f"  ID: {admin.id}")
        print(f"  Username: {admin.username}")
        print(f"  Rolle: {admin.role}")
        print("")
        print("Setze Passwort auf 'admin123'...")
        admin.hashed_password = pwd_context.hash("admin123")
        db.commit()
        print("✓ Passwort aktualisiert")
    else:
        print("✗ Admin-User existiert nicht, erstelle neu...")
        admin = AdminUser(
            username="admin",
            hashed_password=pwd_context.hash("admin123"),
            role="admin"
        )
        db.add(admin)
        db.commit()
        db.refresh(admin)
        print("✓ Admin-User erstellt")
        print(f"  ID: {admin.id}")
        print(f"  Username: {admin.username}")
        print(f"  Rolle: {admin.role}")
    
    print("")
    print("========================================")
    print("✅ Admin-Login Daten:")
    print("========================================")
    print("  Username: admin")
    print("  Password: admin123")
    print("========================================")
    
except Exception as e:
    print(f"✗ Fehler: {e}")
    import traceback
    traceback.print_exc()
finally:
    db.close()
EOF

echo ""
echo "Fertig! Backend neu starten..."
sudo systemctl restart fire-station-backend

echo ""
echo "Warte 3 Sekunden..."
sleep 3

echo ""
echo "Backend Status:"
sudo systemctl status fire-station-backend --no-pager -l | head -n 10
