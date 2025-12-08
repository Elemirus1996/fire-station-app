#!/bin/bash

################################################################################
# Feuerwehr Anwesenheitssystem - Raspberry Pi Installer
# 
# Automatische Installation für Raspberry Pi 4/5 mit Raspberry Pi OS
# Erstellt: Dezember 2025
################################################################################

set -e

# Farben
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m'

# Funktionen
print_header() { echo -e "\n${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"; echo -e "${CYAN}▶ $1${NC}"; echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}\n"; }
print_success() { echo -e "${GREEN}✓${NC} $1"; }
print_error() { echo -e "${RED}✗${NC} $1"; }
print_info() { echo -e "${YELLOW}ℹ${NC} $1"; }

# Fehlerbehandlung
error_exit() {
    print_error "$1"
    echo ""
    print_info "Installation fehlgeschlagen. Log: $LOG_FILE"
    exit 1
}

# Root-Check
if [ "$EUID" -ne 0 ]; then 
    print_error "Dieses Script muss als root ausgeführt werden"
    echo "Verwenden Sie: sudo bash install-rpi.sh"
    exit 1
fi

# Ermittle den echten Benutzer (nicht root)
if [ -n "$SUDO_USER" ]; then
    USER="$SUDO_USER"
else
    USER="pi"
fi

# Konfiguration
INSTALL_DIR="/opt/feuerwehr-app"
REPO_URL="https://github.com/Elemirus1996/fire-station-app.git"
IP_ADDRESS=$(hostname -I | awk '{print $1}')
LOG_FILE="/tmp/feuerwehr-install-$(date +%Y%m%d-%H%M%S).log"

# Logging einrichten
exec > >(tee -a "$LOG_FILE")
exec 2>&1

# Banner
clear
echo ""
echo -e "${RED}╔══════════════════════════════════════════════════════╗${NC}"
echo -e "${RED}║                                                      ║${NC}"
echo -e "${RED}║       🚒  FEUERWEHR ANWESENHEITSSYSTEM  🚒          ║${NC}"
echo -e "${RED}║                                                      ║${NC}"
echo -e "${RED}║            Raspberry Pi Installation                ║${NC}"
echo -e "${RED}║                                                      ║${NC}"
echo -e "${RED}╚══════════════════════════════════════════════════════╝${NC}"
echo ""
print_info "IP-Adresse: $IP_ADDRESS"
print_info "Installation: $INSTALL_DIR"
print_info "Log-Datei: $LOG_FILE"
echo ""
read -p "Installation starten? (j/n): " -n 1 -r
echo ""
if [[ ! $REPLY =~ ^[Jj]$ ]]; then
    print_info "Installation abgebrochen"
    exit 0
fi

################################################################################
# 1. SYSTEM AKTUALISIEREN
################################################################################
print_header "System-Update"
print_info "System-Pakete aktualisieren..."
apt-get update || error_exit "apt-get update fehlgeschlagen"
apt-get upgrade -y || error_exit "apt-get upgrade fehlgeschlagen"
print_success "System aktualisiert"

################################################################################
# 2. SYSTEM-PAKETE INSTALLIEREN
################################################################################
print_header "System-Pakete installieren"
PACKAGES=(
    "python3"
    "python3-pip"
    "python3-venv"
    "python3-dev"
    "build-essential"
    "git"
    "curl"
    "wget"
    "postgresql"
    "postgresql-contrib"
    "libpq-dev"
    "chromium"
    "unclutter"
    "x11-xserver-utils"
)

for pkg in "${PACKAGES[@]}"; do
    print_info "Installiere $pkg..."
    apt-get install -y "$pkg" || print_error "Fehler bei $pkg (wird übersprungen)"
done
print_success "System-Pakete installiert"

################################################################################
# 3. NODE.JS INSTALLIEREN
################################################################################
print_header "Node.js installieren"
print_info "Füge NodeSource Repository hinzu..."
curl -fsSL https://deb.nodesource.com/setup_20.x | bash - || error_exit "NodeSource Setup fehlgeschlagen"
print_info "Installiere Node.js..."
apt-get install -y nodejs || error_exit "Node.js Installation fehlgeschlagen"
print_success "Node.js $(node -v) installiert"
print_success "npm $(npm -v) installiert"

################################################################################
# 4. POSTGRESQL EINRICHTEN
################################################################################
print_header "PostgreSQL Datenbank einrichten"
print_info "Starte PostgreSQL..."
systemctl start postgresql
systemctl enable postgresql

print_info "Erstelle Datenbank und Benutzer..."
sudo -u postgres psql << 'EOSQL' || error_exit "Datenbank-Setup fehlgeschlagen"
-- Alte Datenbank löschen falls vorhanden
DROP DATABASE IF EXISTS firestation;
DROP USER IF EXISTS firestation;

-- Neuen User erstellen
CREATE USER firestation WITH PASSWORD 'firestation';

-- Datenbank erstellen
CREATE DATABASE firestation OWNER firestation;

-- Rechte vergeben
GRANT ALL PRIVILEGES ON DATABASE firestation TO firestation;
\c firestation
GRANT ALL ON SCHEMA public TO firestation;
EOSQL

print_success "PostgreSQL eingerichtet"

################################################################################
# 5. ANWENDUNG INSTALLIEREN
################################################################################
print_header "Anwendung herunterladen"

# Altes Verzeichnis löschen falls vorhanden
if [ -d "$INSTALL_DIR" ]; then
    print_info "Lösche altes Verzeichnis..."
    rm -rf "$INSTALL_DIR"
fi

print_info "Klone Repository..."
git clone "$REPO_URL" "$INSTALL_DIR" || error_exit "Git Clone fehlgeschlagen"
cd "$INSTALL_DIR"
print_success "Repository geklont"

################################################################################
# 6. BACKEND EINRICHTEN
################################################################################
print_header "Backend einrichten"
cd "$INSTALL_DIR/backend"

print_info "Erstelle Python Virtual Environment..."
python3 -m venv venv || error_exit "Virtual Environment erstellen fehlgeschlagen"

print_info "Aktiviere Virtual Environment und installiere Dependencies..."
source venv/bin/activate
pip install --upgrade pip
pip install -r requirements.txt || error_exit "Python-Pakete Installation fehlgeschlagen"

print_info "Erstelle .env Konfiguration..."
cat > .env << EOF
DATABASE_URL=postgresql+psycopg://firestation:firestation@localhost/firestation
SECRET_KEY=$(openssl rand -hex 32)
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=43200
CORS_ORIGINS=http://localhost:5173,http://${IP_ADDRESS}:5173
HOST=0.0.0.0
PORT=8000
EOF

print_info "Initialisiere Datenbank..."
python3 << 'EOPY' || error_exit "Datenbank-Initialisierung fehlgeschlagen"
import sys
sys.path.insert(0, '/opt/feuerwehr-app/backend')
from app.database import init_db
init_db()
print("Datenbank-Tabellen erstellt")
EOPY

print_info "Erstelle Admin-User..."
python3 << 'EOPY' || error_exit "Admin-Erstellung fehlgeschlagen"
import sys
sys.path.insert(0, '/opt/feuerwehr-app/backend')
from app.database import SessionLocal
from app.models import AdminUser
from app.utils.auth import get_password_hash

db = SessionLocal()
try:
    admin = db.query(AdminUser).filter(AdminUser.username == "admin").first()
    if not admin:
        admin = AdminUser(
            username="admin",
            hashed_password=get_password_hash("admin"),
            role="admin"
        )
        db.add(admin)
        db.commit()
        print("Admin-User erstellt")
    else:
        print("Admin-User existiert bereits")
finally:
    db.close()
EOPY

deactivate
print_success "Backend eingerichtet"

################################################################################
# 7. FRONTEND EINRICHTEN
################################################################################
print_header "Frontend einrichten"
cd "$INSTALL_DIR/frontend"

print_info "Installiere npm Dependencies..."
npm install || error_exit "npm install fehlgeschlagen"

print_info "Baue Frontend..."
npm run build || error_exit "Frontend Build fehlgeschlagen"

print_success "Frontend gebaut"

################################################################################
# 8. SYSTEMD SERVICES ERSTELLEN
################################################################################
print_header "Systemd Services einrichten"

# Backend Service
print_info "Erstelle Backend Service..."
cat > /etc/systemd/system/feuerwehr-backend.service << EOSRV
[Unit]
Description=Feuerwehr Anwesenheitssystem Backend
After=network.target postgresql.service
Wants=postgresql.service

[Service]
Type=simple
User=$USER
WorkingDirectory=/opt/feuerwehr-app/backend
Environment="PATH=/opt/feuerwehr-app/backend/venv/bin:/usr/local/bin:/usr/bin:/bin"
ExecStart=/opt/feuerwehr-app/backend/venv/bin/python main.py
Restart=always
RestartSec=10
StandardOutput=journal
StandardError=journal

[Install]
WantedBy=multi-user.target
EOSRV

# Frontend Service
print_info "Erstelle Frontend Service..."
cat > /etc/systemd/system/feuerwehr-frontend.service << EOSRV
[Unit]
Description=Feuerwehr Anwesenheitssystem Frontend
After=network.target feuerwehr-backend.service
Wants=feuerwehr-backend.service

[Service]
Type=simple
User=$USER
WorkingDirectory=/opt/feuerwehr-app/frontend
Environment="PATH=/usr/local/bin:/usr/bin:/bin"
ExecStartPre=/bin/sh -c 'fuser -k 5173/tcp || true'
ExecStart=/usr/bin/npm run dev -- --host 0.0.0.0 --port 5173 --strictPort
Restart=always
RestartSec=10
StandardOutput=journal
StandardError=journal

[Install]
WantedBy=multi-user.target
EOSRV

# Kiosk Service
print_info "Erstelle Kiosk Service..."
cat > /etc/systemd/system/feuerwehr-kiosk.service << EOSRV
[Unit]
Description=Feuerwehr Kiosk Mode
After=graphical.target feuerwehr-frontend.service
Wants=feuerwehr-frontend.service

[Service]
Type=simple
User=$USER
Environment=DISPLAY=:0
Environment=XAUTHORITY=/home/$USER/.Xauthority
ExecStartPre=/bin/sleep 15
ExecStart=/usr/bin/chromium \\
    --kiosk \\
    --noerrdialogs \\
    --disable-infobars \\
    --no-first-run \\
    --check-for-update-interval=31536000 \\
    --disable-session-crashed-bubble \\
    --disable-translate \\
    --disable-features=TranslateUI \\
    --disable-save-password-bubble \\
    http://${IP_ADDRESS}:5173/kiosk
Restart=always
RestartSec=10

[Install]
WantedBy=graphical.target
EOSRV

print_success "Services erstellt"

################################################################################
# 9. SERVICES AKTIVIEREN UND STARTEN
################################################################################
print_header "Services starten"
systemctl daemon-reload

print_info "Aktiviere Services..."
systemctl enable feuerwehr-backend
systemctl enable feuerwehr-frontend
systemctl enable feuerwehr-kiosk
print_success "Services aktiviert"

print_info "Starte Backend..."
systemctl start feuerwehr-backend
sleep 3
if systemctl is-active --quiet feuerwehr-backend; then
    print_success "Backend läuft"
else
    print_error "Backend startet nicht - prüfe Logs: sudo journalctl -u feuerwehr-backend -n 50"
fi

print_info "Starte Frontend..."
systemctl start feuerwehr-frontend
sleep 3
if systemctl is-active --quiet feuerwehr-frontend; then
    print_success "Frontend läuft"
else
    print_error "Frontend startet nicht - prüfe Logs: sudo journalctl -u feuerwehr-frontend -n 50"
fi

################################################################################
# 10. BERECHTIGUNGEN SETZEN
################################################################################
print_header "Berechtigungen anpassen"
chown -R $USER:$USER "$INSTALL_DIR"
print_success "Berechtigungen gesetzt"

################################################################################
# 11. RASPBERRY PI OPTIMIERUNGEN
################################################################################
print_header "Raspberry Pi Optimierungen"

print_info "GPU Memory auf 256MB erhöhen..."
if ! grep -q "gpu_mem=256" /boot/firmware/config.txt 2>/dev/null; then
    echo "gpu_mem=256" >> /boot/firmware/config.txt
    print_success "GPU Memory erhöht"
else
    print_info "GPU Memory bereits konfiguriert"
fi

print_info "Bildschirmschoner deaktivieren..."
USER_HOME=$(eval echo ~$USER)
if [ ! -f $USER_HOME/.xsessionrc ]; then
    cat > $USER_HOME/.xsessionrc << 'EOXS'
xset s off
xset -dpms
xset s noblank
unclutter -idle 0.1 -root &
EOXS
    chown $USER:$USER $USER_HOME/.xsessionrc
    print_success "Bildschirmschoner deaktiviert"
fi

################################################################################
# INSTALLATION ABGESCHLOSSEN
################################################################################
echo ""
echo -e "${GREEN}╔══════════════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║                                                      ║${NC}"
echo -e "${GREEN}║          ✓  INSTALLATION ERFOLGREICH  ✓             ║${NC}"
echo -e "${GREEN}║                                                      ║${NC}"
echo -e "${GREEN}╚══════════════════════════════════════════════════════╝${NC}"
echo ""
echo -e "${CYAN}🌐 ZUGRIFF:${NC}"
echo "   Admin-Panel:  http://${IP_ADDRESS}:5173/admin/login"
echo "   Kiosk-Modus:  http://${IP_ADDRESS}:5173/kiosk"
echo "   API-Docs:     http://${IP_ADDRESS}:8000/docs"
echo ""
echo -e "${CYAN}👤 ADMIN-LOGIN:${NC}"
echo "   Username: admin"
echo "   Password: admin"
echo ""
echo -e "${CYAN}🔧 SERVICES VERWALTEN:${NC}"
echo "   Status:   sudo systemctl status feuerwehr-backend"
echo "   Status:   sudo systemctl status feuerwehr-frontend"
echo "   Status:   sudo systemctl status feuerwehr-kiosk"
echo "   Restart:  sudo systemctl restart feuerwehr-backend"
echo "   Logs:     sudo journalctl -u feuerwehr-backend -f"
echo ""
echo -e "${CYAN}📋 INSTALLATION:${NC}"
echo "   Verzeichnis: $INSTALL_DIR"
echo "   Log-Datei:   $LOG_FILE"
echo ""
echo -e "${YELLOW}⚠️  WICHTIG:${NC}"
echo "   Für Kiosk-Autostart beim Booten: ${GREEN}sudo reboot${NC}"
echo ""
print_success "Viel Erfolg mit dem Feuerwehr Anwesenheitssystem! 🚒"
echo ""
