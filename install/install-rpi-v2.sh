#!/bin/bash

#############################################
# Feuerwehr Anwesenheitssystem - Installation V2
# Komplett überarbeitet - Fokus auf Stabilität
#############################################

set -e

# Farben
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

print_success() { echo -e "${GREEN}✓ $1${NC}"; }
print_error() { echo -e "${RED}✗ $1${NC}"; }
print_info() { echo -e "${YELLOW}ℹ $1${NC}"; }

# Root-Check
if [ "$EUID" -ne 0 ]; then 
    print_error "Bitte als root ausführen: sudo bash install-rpi-v2.sh"
    exit 1
fi

echo "=================================================="
echo "🚒 Feuerwehr Anwesenheitssystem - Installation V2"
echo "=================================================="
echo ""

INSTALL_DIR="/opt/feuerwehr-app"
IP_ADDRESS=$(hostname -I | awk '{print $1}')

print_info "IP-Adresse: $IP_ADDRESS"
print_info "Installationsverzeichnis: $INSTALL_DIR"
echo ""

# 1. System aktualisieren
print_info "System wird aktualisiert..."
apt-get update -qq
apt-get upgrade -y -qq
print_success "System aktualisiert"
echo ""

# 2. Dependencies installieren
print_info "Installiere System-Pakete..."
apt-get install -y \
    python3 python3-pip python3-venv \
    nodejs npm \
    git curl wget \
    sqlite3 \
    unclutter xdotool \
    chromium-browser \
    python3-pillow \
    libjpeg-dev zlib1g-dev libfreetype6-dev \
    > /dev/null 2>&1

print_success "System-Pakete installiert"
echo ""

# 3. Node.js aktualisieren (falls zu alt)
NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 16 ]; then
    print_info "Node.js wird aktualisiert..."
    curl -fsSL https://deb.nodesource.com/setup_18.x | bash -
    apt-get install -y nodejs > /dev/null 2>&1
    print_success "Node.js aktualisiert auf $(node -v)"
fi

# 4. Serve für Frontend installieren
print_info "Installiere Frontend-Server..."
npm install -g serve > /dev/null 2>&1
print_success "Frontend-Server installiert"
echo ""

# 5. Python Backend einrichten
print_info "Richte Python Backend ein..."
cd $INSTALL_DIR/backend

# Virtual Environment
python3 -m venv venv
source venv/bin/activate

# Upgrade pip
pip install --upgrade pip > /dev/null 2>&1

# Python Packages mit festen Versionen für Stabilität
print_info "Installiere Python-Pakete..."
pip install \
    fastapi==0.104.1 \
    uvicorn[standard]==0.24.0 \
    sqlalchemy==2.0.36 \
    python-multipart==0.0.6 \
    python-jose[cryptography]==3.3.0 \
    passlib[bcrypt]==1.7.4 \
    bcrypt==4.1.2 \
    qrcode==7.4.2 \
    pillow==10.1.0 \
    reportlab==4.0.7 \
    pydantic==2.5.0 \
    > /dev/null 2>&1

print_success "Python-Pakete installiert"

# 6. Datenbank mit VOLLEN Rechten erstellen
print_info "Erstelle Datenbank..."

# Alte DB löschen
rm -f fire_station.db fire_station.db-*

# Als Root mit vollem Zugriff erstellen
python3 << 'PYTHON_EOF'
import sys
import os

os.chdir('/opt/feuerwehr-app/backend')
sys.path.insert(0, '/opt/feuerwehr-app/backend')

from app.database import engine
from app.models import Base
from app.seed import seed_initial_data

print('  Erstelle Tabellen...')
Base.metadata.create_all(bind=engine)

print('  Füge Daten ein...')
seed_initial_data()

print('  ✓ Datenbank erstellt')
print('  ✓ Admin: admin / feuerwehr2025')
print('  ✓ 10 Test-Personen eingefügt')
PYTHON_EOF

# KRITISCH: Maximale Berechtigungen setzen
chmod 666 fire_station.db
chmod 777 .

print_success "Datenbank erstellt mit vollen Rechten"
ls -lh fire_station.db
echo ""

deactivate

# 7. Frontend bauen
print_info "Baue Frontend..."
cd $INSTALL_DIR/frontend

# Environment mit korrekter API-URL
cat > .env.production << EOF
VITE_API_URL=http://${IP_ADDRESS}:8000/api
VITE_API_BASE_URL=http://${IP_ADDRESS}:8000
EOF

cp .env.production .env

# Dependencies und Build
print_info "Installiere Node-Pakete (kann 5-10 Minuten dauern)..."
npm install > /dev/null 2>&1
npm run build > /dev/null 2>&1

print_success "Frontend gebaut"
echo ""

# 8. Systemd Services
print_info "Erstelle Services..."

# Backend Service
cat > /etc/systemd/system/feuerwehr-backend.service << EOF
[Unit]
Description=Feuerwehr Backend API
After=network.target

[Service]
Type=simple
User=root
WorkingDirectory=$INSTALL_DIR/backend
Environment="PATH=/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin"
Environment="DATABASE_URL=sqlite:///$INSTALL_DIR/backend/fire_station.db"
Environment="PYTHONUNBUFFERED=1"
ExecStartPre=/bin/mkdir -p $INSTALL_DIR/backend
ExecStartPre=/bin/chmod 777 $INSTALL_DIR/backend
ExecStartPre=/bin/touch $INSTALL_DIR/backend/fire_station.db
ExecStartPre=/bin/chmod 666 $INSTALL_DIR/backend/fire_station.db
ExecStart=$INSTALL_DIR/backend/venv/bin/python -m uvicorn app.main:app --host 0.0.0.0 --port 8000
Restart=always
RestartSec=10
StandardOutput=journal
StandardError=journal

[Install]
WantedBy=multi-user.target
EOF

# Frontend Service
cat > /etc/systemd/system/feuerwehr-frontend.service << EOF
[Unit]
Description=Feuerwehr Frontend
After=network.target feuerwehr-backend.service

[Service]
Type=simple
User=root
WorkingDirectory=$INSTALL_DIR/frontend
Environment="PATH=/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin"
ExecStart=/usr/local/bin/serve -s dist -l 5173
Restart=always
RestartSec=10
StandardOutput=journal
StandardError=journal

[Install]
WantedBy=multi-user.target
EOF

# Services aktivieren und starten
systemctl daemon-reload
systemctl enable feuerwehr-backend feuerwehr-frontend
systemctl start feuerwehr-backend
sleep 3
systemctl start feuerwehr-frontend
sleep 2

print_success "Services gestartet"
echo ""

# 9. Kiosk-Modus
print_info "Richte Kiosk-Modus ein..."

ACTUAL_USER=$(who | awk 'NR==1{print $1}')
AUTOSTART_DIR="/home/$ACTUAL_USER/.config/autostart"
mkdir -p $AUTOSTART_DIR

# Kiosk-Script
cat > /usr/local/bin/start-kiosk.sh << EOF
#!/bin/bash
while ! xset q &>/dev/null; do sleep 1; done
unclutter -idle 0.1 &
xset s off
xset -dpms
xset s noblank
sleep 10
chromium-browser --kiosk --password-store=basic --noerrdialogs --disable-infobars --app=http://${IP_ADDRESS}:5173/kiosk &
EOF

chmod +x /usr/local/bin/start-kiosk.sh

# Autostart
cat > $AUTOSTART_DIR/feuerwehr-kiosk.desktop << EOF
[Desktop Entry]
Type=Application
Name=Feuerwehr Kiosk
Exec=/usr/local/bin/start-kiosk.sh
X-GNOME-Autostart-enabled=true
EOF

chown -R $ACTUAL_USER:$ACTUAL_USER $AUTOSTART_DIR
print_success "Kiosk-Modus eingerichtet"
echo ""

# 10. Status prüfen
print_info "Prüfe Services..."
sleep 2

if systemctl is-active --quiet feuerwehr-backend; then
    print_success "Backend läuft"
else
    print_error "Backend läuft NICHT!"
fi

if systemctl is-active --quiet feuerwehr-frontend; then
    print_success "Frontend läuft"
else
    print_error "Frontend läuft NICHT!"
fi

# Login testen
print_info "Teste Login..."
RESPONSE=$(curl -s -X POST http://localhost:8000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"feuerwehr2025"}' || echo "ERROR")

if [[ $RESPONSE == *"access_token"* ]]; then
    print_success "Login funktioniert!"
else
    print_error "Login fehlgeschlagen!"
    echo "Response: $RESPONSE"
fi

echo ""
echo "=================================================="
print_success "Installation abgeschlossen!"
echo "=================================================="
echo ""
echo "📱 Zugriff:"
echo "   Browser:  http://${IP_ADDRESS}:5173"
echo "   Admin:    http://${IP_ADDRESS}:5173/admin/login"
echo "   API:      http://${IP_ADDRESS}:8000/docs"
echo ""
echo "🔐 Login:"
echo "   Username: admin"
echo "   Passwort: feuerwehr2025"
echo ""
echo "🔧 Befehle:"
echo "   Status:   sudo systemctl status feuerwehr-backend"
echo "   Logs:     sudo journalctl -u feuerwehr-backend -f"
echo "   Neustart: sudo systemctl restart feuerwehr-backend"
echo ""
echo "🖥️  Kiosk startet nach: sudo reboot"
echo ""
