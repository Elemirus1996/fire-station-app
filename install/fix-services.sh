#!/bin/bash

#############################################
# Feuerwehr App - Service & Admin Fix
# Behebt Service-Probleme und Admin-Login
#############################################

# Farben
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

print_success() { echo -e "${GREEN}✓ $1${NC}"; }
print_error() { echo -e "${RED}✗ $1${NC}"; }
print_info() { echo -e "${YELLOW}ℹ $1${NC}"; }
print_header() { echo -e "${BLUE}▶ $1${NC}"; }

# Root-Check
if [ "$EUID" -ne 0 ]; then 
    print_error "Bitte als root ausführen: sudo bash fix-services.sh"
    exit 1
fi

clear
echo "=========================================================="
echo "🔧 Service & Admin Login Fix"
echo "=========================================================="
echo ""

INSTALL_DIR="/opt/feuerwehr-app"
IP_ADDRESS=$(hostname -I | awk '{print $1}')

# 1. Services stoppen (alle möglichen Namen)
print_header "Stoppe alle Services..."
systemctl stop feuerwehr-backend 2>/dev/null || true
systemctl stop feuerwehr-frontend 2>/dev/null || true
systemctl stop feuerwehr-kiosk 2>/dev/null || true
systemctl stop fire-station-backend 2>/dev/null || true
systemctl stop fire-station-frontend 2>/dev/null || true
print_success "Services gestoppt"

# 2. Alte Service-Dateien löschen
print_header "Räume alte Service-Dateien auf..."
rm -f /etc/systemd/system/fire-station-*.service
rm -f /etc/systemd/system/feuerwehr-*.service
systemctl daemon-reload
print_success "Alte Services entfernt"

# 3. Backend Service erstellen
print_header "Erstelle Backend Service..."
cat > /etc/systemd/system/feuerwehr-backend.service << 'EOF'
[Unit]
Description=Feuerwehr Anwesenheitssystem Backend
After=network.target postgresql.service

[Service]
Type=simple
User=pi
WorkingDirectory=/opt/feuerwehr-app/backend
Environment="PATH=/opt/feuerwehr-app/backend/venv/bin:/usr/local/bin:/usr/bin:/bin"
ExecStart=/opt/feuerwehr-app/backend/venv/bin/python main.py
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
EOF
print_success "Backend Service erstellt"

# 4. Frontend Service erstellen
print_header "Erstelle Frontend Service..."
cat > /etc/systemd/system/feuerwehr-frontend.service << 'EOF'
[Unit]
Description=Feuerwehr Anwesenheitssystem Frontend
After=network.target feuerwehr-backend.service

[Service]
Type=simple
User=pi
WorkingDirectory=/opt/feuerwehr-app/frontend
Environment="PATH=/usr/local/bin:/usr/bin:/bin"
ExecStart=/usr/bin/npm run dev -- --host 0.0.0.0 --port 5173
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
EOF
print_success "Frontend Service erstellt"

# 5. Kiosk Service erstellen
print_header "Erstelle Kiosk Service..."
cat > /etc/systemd/system/feuerwehr-kiosk.service << EOF
[Unit]
Description=Feuerwehr Kiosk Mode
After=graphical.target feuerwehr-frontend.service

[Service]
Type=simple
User=pi
Environment=DISPLAY=:0
Environment=XAUTHORITY=/home/pi/.Xauthority
ExecStartPre=/bin/sleep 10
ExecStart=/usr/bin/chromium --kiosk --noerrdialogs --disable-infobars --no-first-run --check-for-update-interval=31536000 --disable-session-crashed-bubble --disable-translate --disable-features=TranslateUI http://$IP_ADDRESS:5173/kiosk
Restart=always
RestartSec=10

[Install]
WantedBy=graphical.target
EOF
print_success "Kiosk Service erstellt"

# 6. Services aktivieren und starten
print_header "Aktiviere und starte Services..."
systemctl daemon-reload
systemctl enable feuerwehr-backend
systemctl enable feuerwehr-frontend
systemctl enable feuerwehr-kiosk
systemctl start feuerwehr-backend
sleep 3
systemctl start feuerwehr-frontend
print_success "Services aktiviert und gestartet"

# 7. Admin-User in Datenbank erstellen
print_header "Erstelle Admin-User..."
cd $INSTALL_DIR/backend
source venv/bin/activate

python3 << 'PYEOF'
import sys
sys.path.insert(0, '/opt/feuerwehr-app/backend')

from app.database import get_db, engine
from app.models import Base, AdminUser
from app.utils.auth import get_password_hash
from sqlalchemy.orm import Session

# Datenbank-Verbindung prüfen
try:
    Base.metadata.create_all(bind=engine)
    print("✓ Datenbank-Tabellen erstellt/geprüft")
except Exception as e:
    print(f"✗ Fehler bei Datenbank: {e}")
    sys.exit(1)

# Admin erstellen
db = next(get_db())
try:
    # Prüfe ob Admin existiert
    admin = db.query(AdminUser).filter(AdminUser.username == "admin").first()
    
    if admin:
        # Admin existiert - Passwort aktualisieren
        admin.hashed_password = get_password_hash("admin")
        db.commit()
        print("✓ Admin-Passwort zurückgesetzt")
    else:
        # Neuen Admin erstellen
        admin = AdminUser(
            username="admin",
            hashed_password=get_password_hash("admin"),
            role="admin"
        )
        db.add(admin)
        db.commit()
        print("✓ Neuer Admin erstellt")
    
    print(f"✓ Admin-Login: username=admin, password=admin")
    
except Exception as e:
    print(f"✗ Fehler beim Admin erstellen: {e}")
    db.rollback()
    sys.exit(1)
finally:
    db.close()
PYEOF

deactivate
print_success "Admin-User erstellt/aktualisiert"

# 8. Service-Status prüfen
echo ""
print_header "Service-Status:"
systemctl is-active feuerwehr-backend && print_success "Backend läuft" || print_error "Backend läuft NICHT"
systemctl is-active feuerwehr-frontend && print_success "Frontend läuft" || print_error "Frontend läuft NICHT"

# 9. Zusammenfassung
echo ""
echo "=========================================================="
print_success "Fix abgeschlossen!"
echo "=========================================================="
echo ""
echo "🌐 Zugriff:"
echo "   Kiosk:  http://$IP_ADDRESS:5173/kiosk"
echo "   Admin:  http://$IP_ADDRESS:5173/admin/login"
echo "   API:    http://$IP_ADDRESS:8000/docs"
echo ""
echo "👤 Admin-Login:"
echo "   Username: admin"
echo "   Password: admin"
echo ""
echo "🔄 Nach Neustart wird der Kiosk automatisch gestartet"
echo ""
print_info "Logs ansehen:"
echo "   Backend:  sudo journalctl -u feuerwehr-backend -f"
echo "   Frontend: sudo journalctl -u feuerwehr-frontend -f"
echo "   Kiosk:    sudo journalctl -u feuerwehr-kiosk -f"
echo ""
