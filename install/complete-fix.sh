#!/bin/bash

#############################################
# Kompletter Fix - Alles reparieren
#############################################

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

print_success() { echo -e "${GREEN}✓ $1${NC}"; }
print_error() { echo -e "${RED}✗ $1${NC}"; }
print_info() { echo -e "${YELLOW}ℹ $1${NC}"; }

clear
echo "=========================================="
echo "🔧 Kompletter System-Fix"
echo "=========================================="
echo ""

IP_ADDRESS=$(hostname -I | awk '{print $1}')

# 1. Backend Dependencies reparieren
print_info "Repariere Backend Dependencies..."
cd /opt/feuerwehr-app/backend
source venv/bin/activate

print_info "Installiere fehlende Pakete..."
pip install --upgrade pip
pip install psycopg[binary] sqlalchemy fastapi uvicorn python-jose passlib bcrypt
print_success "Dependencies installiert"

# 2. .env Datei korrigieren
print_info "Korrigiere .env Datei..."
cat > .env << EOF
DATABASE_URL=postgresql+psycopg://firestation:firestation@localhost/firestation
SECRET_KEY=$(openssl rand -hex 32)
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=43200
CORS_ORIGINS=http://localhost:5173,http://${IP_ADDRESS}:5173
HOST=0.0.0.0
PORT=8000
EOF
print_success ".env Datei erstellt"

# 3. Datenbank initialisieren
print_info "Initialisiere Datenbank..."
python3 << 'EOF'
import sys
sys.path.insert(0, '/opt/feuerwehr-app/backend')

try:
    from app.database import init_db
    init_db()
    print("✓ Datenbank initialisiert")
except Exception as e:
    print(f"✗ Fehler: {e}")
    import traceback
    traceback.print_exc()
EOF

# 4. Admin erstellen
print_info "Erstelle Admin-User..."
python3 << 'EOF'
import sys
sys.path.insert(0, '/opt/feuerwehr-app/backend')

from app.database import SessionLocal
from app.models import AdminUser
from app.utils.auth import get_password_hash

db = SessionLocal()

try:
    # Lösche alten Admin
    db.query(AdminUser).filter(AdminUser.username == "admin").delete()
    db.commit()
    
    # Erstelle neuen Admin
    admin = AdminUser(
        username="admin",
        hashed_password=get_password_hash("admin"),
        role="admin"
    )
    db.add(admin)
    db.commit()
    print("✓ Admin erstellt: username=admin, password=admin")
except Exception as e:
    print(f"✗ Fehler: {e}")
    import traceback
    traceback.print_exc()
finally:
    db.close()
EOF

deactivate

# 5. Services erstellen
print_info "Erstelle Systemd Services..."

# Backend Service
sudo tee /etc/systemd/system/feuerwehr-backend.service > /dev/null << 'EOF'
[Unit]
Description=Feuerwehr Backend
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

# Frontend Service
sudo tee /etc/systemd/system/feuerwehr-frontend.service > /dev/null << 'EOF'
[Unit]
Description=Feuerwehr Frontend
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

# Kiosk Service
sudo tee /etc/systemd/system/feuerwehr-kiosk.service > /dev/null << EOF
[Unit]
Description=Feuerwehr Kiosk
After=graphical.target feuerwehr-frontend.service

[Service]
Type=simple
User=pi
Environment=DISPLAY=:0
Environment=XAUTHORITY=/home/pi/.Xauthority
ExecStartPre=/bin/sleep 10
ExecStart=/usr/bin/chromium-browser --kiosk --noerrdialogs --disable-infobars --no-first-run --disable-session-crashed-bubble http://${IP_ADDRESS}:5173/kiosk
Restart=always
RestartSec=10

[Install]
WantedBy=graphical.target
EOF

print_success "Services erstellt"

# 6. Services aktivieren und starten
print_info "Aktiviere Services..."
sudo systemctl daemon-reload
sudo systemctl enable feuerwehr-backend
sudo systemctl enable feuerwehr-frontend
sudo systemctl enable feuerwehr-kiosk
print_success "Services aktiviert"

print_info "Starte Services..."
sudo systemctl start feuerwehr-backend
sleep 3
sudo systemctl start feuerwehr-frontend
sleep 2
print_success "Services gestartet"

# 7. Status prüfen
echo ""
echo "=========================================="
print_info "System-Status:"
echo "=========================================="

if sudo systemctl is-active --quiet feuerwehr-backend; then
    print_success "Backend läuft"
else
    print_error "Backend läuft NICHT"
    echo ""
    print_info "Backend Logs:"
    sudo journalctl -u feuerwehr-backend -n 20 --no-pager
fi

if sudo systemctl is-active --quiet feuerwehr-frontend; then
    print_success "Frontend läuft"
else
    print_error "Frontend läuft NICHT"
    echo ""
    print_info "Frontend Logs:"
    sudo journalctl -u feuerwehr-frontend -n 20 --no-pager
fi

echo ""
echo "=========================================="
print_success "Fix abgeschlossen!"
echo "=========================================="
echo ""
echo "🌐 Zugriff:"
echo "   Admin:  http://${IP_ADDRESS}:5173/admin/login"
echo "   Kiosk:  http://${IP_ADDRESS}:5173/kiosk"
echo "   API:    http://${IP_ADDRESS}:8000/docs"
echo ""
echo "👤 Admin-Login:"
echo "   Username: admin"
echo "   Password: admin"
echo ""
echo "🔄 Für Kiosk-Autostart: sudo reboot"
echo ""
