#!/bin/bash

#############################################
# Feuerwehr Anwesenheitssystem - Raspberry Pi 5 Installation
# Optimiert für Raspberry Pi 5 mit 64-bit OS
#############################################

set -e

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
    print_error "Bitte als root ausführen: sudo bash install-rpi5.sh"
    exit 1
fi

clear
echo "=========================================================="
echo "🚒 Feuerwehr Anwesenheitssystem - Raspberry Pi 5 Setup"
echo "=========================================================="
echo ""
echo "Optimiert für Raspberry Pi 5 mit 64-bit Raspberry Pi OS"
echo ""

# Konfiguration
INSTALL_DIR="/opt/feuerwehr-app"
USER_NAME="pi"
IP_ADDRESS=$(hostname -I | awk '{print $1}')
FRONTEND_PORT=5173
BACKEND_PORT=8000

print_info "IP-Adresse: $IP_ADDRESS"
print_info "Installationsverzeichnis: $INSTALL_DIR"
print_info "Frontend-Port: $FRONTEND_PORT"
print_info "Backend-Port: $BACKEND_PORT"
echo ""

read -p "Möchten Sie fortfahren? (j/n): " -n 1 -r
echo ""
if [[ ! $REPLY =~ ^[Jj]$ ]]; then
    print_error "Installation abgebrochen"
    exit 1
fi

# 1. System aktualisieren
print_header "System wird aktualisiert..."
apt-get update -qq
apt-get upgrade -y -qq
apt-get dist-upgrade -y -qq
print_success "System aktualisiert"
echo ""

# 2. Dependencies installieren
print_header "Installiere System-Pakete..."
apt-get install -y \
    python3 python3-pip python3-venv python3-dev \
    build-essential \
    nodejs npm \
    git curl wget \
    sqlite3 \
    unclutter xdotool \
    chromium-browser \
    x11-xserver-utils \
    libjpeg-dev zlib1g-dev libfreetype6-dev \
    fonts-noto fonts-noto-color-emoji \
    > /dev/null 2>&1

print_success "System-Pakete installiert"
echo ""

# 3. Node.js auf Version 18+ aktualisieren
print_header "Prüfe Node.js Version..."
NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 18 ]; then
    print_info "Node.js wird auf Version 18 aktualisiert..."
    curl -fsSL https://deb.nodesource.com/setup_18.x | bash -
    apt-get install -y nodejs > /dev/null 2>&1
    print_success "Node.js aktualisiert auf $(node -v)"
else
    print_success "Node.js $(node -v) ist aktuell"
fi
echo ""

# 4. Repository klonen oder aktualisieren
print_header "Lade Anwendung herunter..."
if [ -d "$INSTALL_DIR" ]; then
    print_info "Verzeichnis existiert bereits, aktualisiere..."
    cd $INSTALL_DIR
    git pull
else
    git clone https://github.com/Elemirus1996/fire-station-app.git $INSTALL_DIR
    cd $INSTALL_DIR
fi
print_success "Anwendung heruntergeladen"
echo ""

# 5. Backend einrichten
print_header "Richte Backend ein..."
cd $INSTALL_DIR/backend

# Virtual Environment
if [ ! -d "venv" ]; then
    python3 -m venv venv
fi
source venv/bin/activate

# Upgrade pip
pip install --upgrade pip > /dev/null 2>&1

# Python Packages installieren
print_info "Installiere Python-Pakete..."
pip install -r requirements.txt > /dev/null 2>&1

# .env Datei erstellen
if [ ! -f ".env" ]; then
    cat > .env << EOF
# Backend Environment Configuration
DATABASE_URL=sqlite:///./fire_station.db
SECRET_KEY=$(openssl rand -hex 32)
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=43200
CORS_ORIGINS=http://localhost:${FRONTEND_PORT},http://${IP_ADDRESS}:${FRONTEND_PORT},http://127.0.0.1:${FRONTEND_PORT}
HOST=0.0.0.0
PORT=${BACKEND_PORT}
EOF
    print_success ".env Datei erstellt"
fi

# Verzeichnisse erstellen
mkdir -p uploads/logo backups

# Datenbank initialisieren
print_info "Initialisiere Datenbank..."
python3 << EOF
from app.database import init_db
from app.seed import seed_initial_data
init_db()
seed_initial_data()
print("Datenbank initialisiert")
EOF

deactivate
print_success "Backend eingerichtet"
echo ""

# 6. Frontend einrichten
print_header "Richte Frontend ein..."
cd $INSTALL_DIR/frontend

# node_modules installieren
print_info "Installiere Node-Pakete..."
npm install > /dev/null 2>&1

# .env für Production erstellen
cat > .env.production << EOF
VITE_API_URL=http://${IP_ADDRESS}:${BACKEND_PORT}/api
VITE_API_BASE_URL=http://${IP_ADDRESS}:${BACKEND_PORT}
EOF

# Frontend bauen
print_info "Baue Frontend..."
npm run build > /dev/null 2>&1
print_success "Frontend gebaut"
echo ""

# 7. Systemd Services erstellen
print_header "Erstelle Systemd Services..."

# Backend Service
cat > /etc/systemd/system/feuerwehr-backend.service << EOF
[Unit]
Description=Feuerwehr Anwesenheitssystem Backend
After=network.target

[Service]
Type=simple
User=$USER_NAME
WorkingDirectory=$INSTALL_DIR/backend
Environment="PATH=$INSTALL_DIR/backend/venv/bin"
ExecStart=$INSTALL_DIR/backend/venv/bin/python main.py
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
EOF

# Frontend Service (mit Vite im Production Mode)
cat > /etc/systemd/system/feuerwehr-frontend.service << EOF
[Unit]
Description=Feuerwehr Anwesenheitssystem Frontend
After=network.target feuerwehr-backend.service

[Service]
Type=simple
User=$USER_NAME
WorkingDirectory=$INSTALL_DIR/frontend
ExecStart=/usr/bin/npm run preview -- --host 0.0.0.0 --port ${FRONTEND_PORT}
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
EOF

# Services aktivieren
systemctl daemon-reload
systemctl enable feuerwehr-backend.service
systemctl enable feuerwehr-frontend.service
print_success "Systemd Services erstellt"
echo ""

# 8. Kiosk-Modus einrichten
print_header "Richte Kiosk-Modus ein..."

# Autostart Verzeichnis
mkdir -p /home/$USER_NAME/.config/autostart

# Kiosk Script erstellen
cat > /home/$USER_NAME/start-kiosk.sh << 'EOF'
#!/bin/bash
# Warte bis System bereit ist
sleep 10

# Bildschirmschoner deaktivieren
xset s off
xset -dpms
xset s noblank

# Cursor verstecken
unclutter -idle 0.1 &

# Chromium im Kiosk-Modus starten
chromium-browser \
    --kiosk \
    --noerrdialogs \
    --disable-infobars \
    --no-first-run \
    --disable-session-crashed-bubble \
    --disable-features=TranslateUI \
    --check-for-update-interval=31536000 \
    --start-fullscreen \
    http://localhost:5173
EOF

chmod +x /home/$USER_NAME/start-kiosk.sh

# Autostart Desktop Entry
cat > /home/$USER_NAME/.config/autostart/kiosk.desktop << EOF
[Desktop Entry]
Type=Application
Name=Feuerwehr Kiosk
Exec=/home/$USER_NAME/start-kiosk.sh
Hidden=false
NoDisplay=false
X-GNOME-Autostart-enabled=true
EOF

chown -R $USER_NAME:$USER_NAME /home/$USER_NAME/.config
chown $USER_NAME:$USER_NAME /home/$USER_NAME/start-kiosk.sh

print_success "Kiosk-Modus eingerichtet"
echo ""

# 9. Raspberry Pi 5 Optimierungen
print_header "Raspberry Pi 5 Optimierungen..."

# GPU Memory (Pi 5 hat genug RAM)
if ! grep -q "gpu_mem=256" /boot/firmware/config.txt 2>/dev/null; then
    echo "gpu_mem=256" >> /boot/firmware/config.txt
fi

# Swap erhöhen für bessere Performance
dphys-swapfile swapoff
sed -i 's/CONF_SWAPSIZE=.*/CONF_SWAPSIZE=2048/' /etc/dphys-swapfile
dphys-swapfile setup
dphys-swapfile swapon

print_success "Optimierungen angewendet"
echo ""

# 10. Services starten
print_header "Starte Services..."
systemctl start feuerwehr-backend.service
sleep 3
systemctl start feuerwehr-frontend.service
sleep 2

# Status prüfen
if systemctl is-active --quiet feuerwehr-backend.service; then
    print_success "Backend läuft"
else
    print_error "Backend konnte nicht gestartet werden"
    systemctl status feuerwehr-backend.service
fi

if systemctl is-active --quiet feuerwehr-frontend.service; then
    print_success "Frontend läuft"
else
    print_error "Frontend konnte nicht gestartet werden"
    systemctl status feuerwehr-frontend.service
fi
echo ""

# 11. QR-Code für Smartphone-Zugriff generieren
print_header "Generiere QR-Code für Smartphone-Zugriff..."
python3 << EOF
import qrcode
url = "http://${IP_ADDRESS}:${FRONTEND_PORT}"
qr = qrcode.QRCode(version=1, box_size=10, border=4)
qr.add_data(url)
qr.make(fit=True)
qr.print_ascii(invert=True)
print(f"\nURL: {url}")
EOF
echo ""

# Abschluss
echo "=========================================================="
print_success "Installation abgeschlossen!"
echo "=========================================================="
echo ""
echo "📱 Zugriff auf die Anwendung:"
echo "   - Lokal:      http://localhost:${FRONTEND_PORT}"
echo "   - Netzwerk:   http://${IP_ADDRESS}:${FRONTEND_PORT}"
echo "   - Admin:      http://${IP_ADDRESS}:${FRONTEND_PORT}/admin/login"
echo ""
echo "🔐 Standard-Login:"
echo "   Benutzer:     admin"
echo "   Passwort:     feuerwehr2025"
echo ""
echo "⚠️  WICHTIG: Ändere das Admin-Passwort nach dem ersten Login!"
echo ""
echo "📋 Services verwalten:"
echo "   sudo systemctl status feuerwehr-backend"
echo "   sudo systemctl status feuerwehr-frontend"
echo "   sudo systemctl restart feuerwehr-backend"
echo "   sudo systemctl restart feuerwehr-frontend"
echo ""
echo "📂 Logs anzeigen:"
echo "   sudo journalctl -u feuerwehr-backend -f"
echo "   sudo journalctl -u feuerwehr-frontend -f"
echo ""
echo "🖥️  Kiosk-Modus:"
echo "   Wird automatisch beim nächsten Neustart aktiviert"
echo "   Oder manuell: /home/$USER_NAME/start-kiosk.sh"
echo ""
print_info "Neustart wird empfohlen: sudo reboot"
echo ""
