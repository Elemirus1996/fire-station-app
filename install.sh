#!/bin/bash

#############################################
# Feuerwehr Anwesenheitssystem - Installation
# Intelligenter Installer mit automatischer Bereinigung
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
print_warning() { echo -e "${YELLOW}⚠ $1${NC}"; }

# Logging
LOG_FILE="/tmp/fire-station-install-$(date +%Y%m%d-%H%M%S).log"
exec > >(tee -a "$LOG_FILE")
exec 2>&1

# Root-Check
if [ "$EUID" -ne 0 ]; then 
    print_error "Bitte als root ausführen: sudo bash install.sh"
    exit 1
fi

clear
echo "=========================================================="
echo "🚒 Feuerwehr Anwesenheitssystem - Installation"
echo "=========================================================="
echo ""
echo "Log-Datei: $LOG_FILE"
echo ""

# Konfiguration
INSTALL_DIR="/opt/feuerwehr-app"
USER_NAME="pi"
IP_ADDRESS=$(hostname -I | awk '{print $1}')
FRONTEND_PORT=5173
BACKEND_PORT=8000

print_info "IP-Adresse: $IP_ADDRESS"
print_info "Installationsverzeichnis: $INSTALL_DIR"
echo ""

# Prüfe auf existierende Installation
CLEAN_INSTALL=false
if [ -d "$INSTALL_DIR" ] || systemctl is-active --quiet fire-station-backend || systemctl is-active --quiet fire-station-frontend; then
    print_warning "Existierende Installation gefunden!"
    echo ""
    echo "Gefunden:"
    [ -d "$INSTALL_DIR" ] && echo "  - Anwendungs-Verzeichnis: $INSTALL_DIR"
    systemctl is-active --quiet fire-station-backend && echo "  - Backend Service läuft"
    systemctl is-active --quiet fire-station-frontend && echo "  - Frontend Service läuft"
    echo ""
    
    read -p "Möchten Sie die alte Installation löschen und neu installieren? (j/n): " -n 1 -r
    echo ""
    if [[ $REPLY =~ ^[Jj]$ ]]; then
        CLEAN_INSTALL=true
        print_info "Führe Neuinstallation durch..."
    else
        print_error "Installation abgebrochen"
        exit 1
    fi
else
    print_info "Keine existierende Installation gefunden - starte Erstinstallation"
fi

echo ""
read -p "Fortfahren? (j/n): " -n 1 -r
echo ""
if [[ ! $REPLY =~ ^[Jj]$ ]]; then
    print_error "Installation abgebrochen"
    exit 1
fi

# Bereinigung falls nötig
if [ "$CLEAN_INSTALL" = true ]; then
    print_header "Bereinige alte Installation..."
    
    # Services stoppen
    print_info "Stoppe Services..."
    systemctl stop fire-station-backend 2>/dev/null || true
    systemctl stop fire-station-frontend 2>/dev/null || true
    systemctl disable fire-station-backend 2>/dev/null || true
    systemctl disable fire-station-frontend 2>/dev/null || true
    print_success "Services gestoppt"
    
    # Service-Dateien löschen
    print_info "Lösche Service-Dateien..."
    rm -f /etc/systemd/system/fire-station-backend.service
    rm -f /etc/systemd/system/fire-station-frontend.service
    systemctl daemon-reload
    print_success "Service-Dateien gelöscht"
    
    # Anwendungs-Verzeichnis löschen
    if [ -d "$INSTALL_DIR" ]; then
        print_info "Lösche Anwendungs-Verzeichnis..."
        rm -rf $INSTALL_DIR
        print_success "Verzeichnis gelöscht"
    fi
    
    # Datenbank löschen
    print_info "Lösche alte Datenbank..."
    sudo -u postgres psql -c "DROP DATABASE IF EXISTS firestation;" 2>/dev/null || true
    sudo -u postgres psql -c "DROP USER IF EXISTS firestation;" 2>/dev/null || true
    print_success "Datenbank gelöscht"
    
    echo ""
fi

# 1. System aktualisieren
print_header "System wird aktualisiert..."
apt-get update -qq
apt-get upgrade -y -qq
print_success "System aktualisiert"
echo ""

# 2. Dependencies installieren
print_header "Installiere System-Pakete..."
apt-get install -y -qq \
    python3 python3-pip python3-venv python3-dev \
    build-essential \
    git curl wget \
    postgresql postgresql-contrib libpq-dev \
    > /dev/null 2>&1
print_success "System-Pakete installiert"
echo ""

# 3. Node.js installieren
print_header "Node.js Installation..."
if ! command -v node &> /dev/null || [ $(node -v | cut -d'v' -f2 | cut -d'.' -f1) -lt 18 ]; then
    print_info "Installiere Node.js 20 LTS..."
    curl -fsSL https://deb.nodesource.com/setup_20.x | bash - > /dev/null 2>&1
    apt-get install -y nodejs > /dev/null 2>&1
    print_success "Node.js $(node -v) installiert"
else
    print_success "Node.js $(node -v) bereits vorhanden"
fi
echo ""

# 4. PostgreSQL einrichten
print_header "PostgreSQL Setup..."
systemctl start postgresql
systemctl enable postgresql
print_success "PostgreSQL gestartet"

print_info "Erstelle Datenbank..."
sudo -u postgres psql << EOF
CREATE USER firestation WITH PASSWORD 'firestation';
CREATE DATABASE firestation OWNER firestation;
GRANT ALL PRIVILEGES ON DATABASE firestation TO firestation;
\c firestation
GRANT ALL ON SCHEMA public TO firestation;
EOF
print_success "Datenbank erstellt"
echo ""

# 5. Repository klonen
print_header "Lade Anwendung herunter..."
mkdir -p $INSTALL_DIR
cd $INSTALL_DIR
git clone https://github.com/Elemirus1996/fire-station-app.git . > /dev/null 2>&1
print_success "Repository geklont"
echo ""

# 6. Backend Setup
print_header "Backend-Setup..."
cd $INSTALL_DIR/backend

print_info "Erstelle Python Virtual Environment..."
python3 -m venv venv
print_success "Virtual Environment erstellt"

print_info "Installiere Python-Pakete..."
source venv/bin/activate
pip install --upgrade pip --quiet
pip install -r requirements.txt --quiet
print_success "Python-Pakete installiert"

print_info "Erstelle .env Datei..."
cat > .env <<EOF
DATABASE_URL=postgresql://firestation:firestation@localhost/firestation
SECRET_KEY=$(openssl rand -hex 32)
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=30
CORS_ORIGINS=http://localhost:5173,http://localhost:5174,http://${IP_ADDRESS}:5173,http://${IP_ADDRESS}:5174
HOST=0.0.0.0
PORT=8000
EOF
print_success ".env Datei erstellt"

print_info "Initialisiere Datenbank..."
python -c "from app.database import init_db; init_db()" > /dev/null 2>&1
print_success "Datenbank initialisiert"

print_info "Erstelle Admin-User..."
python << 'EOFPYTHON'
from app.database import SessionLocal
from app.models import AdminUser
from passlib.context import CryptContext

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
db = SessionLocal()

try:
    admin = db.query(AdminUser).filter(AdminUser.username == "admin").first()
    if not admin:
        admin = AdminUser(
            username="admin",
            hashed_password=pwd_context.hash("admin123"),
            role="admin"
        )
        db.add(admin)
        db.commit()
        print("Admin-User erstellt")
    else:
        print("Admin-User bereits vorhanden")
except Exception as e:
    print(f"Fehler: {e}")
finally:
    db.close()
EOFPYTHON
print_success "Admin-User bereit"
echo ""

# 7. Frontend Setup
print_header "Frontend-Setup..."
cd $INSTALL_DIR/frontend

print_info "Installiere npm-Pakete..."
npm install --silent > /dev/null 2>&1
print_success "npm-Pakete installiert"

print_info "Erstelle .env Datei..."
cat > .env <<EOF
VITE_API_BASE_URL=http://${IP_ADDRESS}:8000/api
EOF
print_success ".env Datei erstellt"

print_info "Baue Frontend..."
npm run build --silent > /dev/null 2>&1
print_success "Frontend gebaut"
echo ""

# 8. Systemd Services erstellen
print_header "Erstelle Systemd Services..."

cat > /etc/systemd/system/fire-station-backend.service <<EOF
[Unit]
Description=Fire Station Backend API
After=network.target postgresql.service
Wants=postgresql.service

[Service]
Type=simple
User=root
WorkingDirectory=$INSTALL_DIR/backend
Environment="PATH=$INSTALL_DIR/backend/venv/bin"
ExecStart=$INSTALL_DIR/backend/venv/bin/uvicorn main:app --host 0.0.0.0 --port 8000
Restart=always
RestartSec=5

[Install]
WantedBy=multi-user.target
EOF

cat > /etc/systemd/system/fire-station-frontend.service <<EOF
[Unit]
Description=Fire Station Frontend
After=network.target fire-station-backend.service
Wants=fire-station-backend.service

[Service]
Type=simple
User=root
WorkingDirectory=$INSTALL_DIR/frontend
ExecStart=/usr/bin/npm run preview -- --host 0.0.0.0 --port 5173
Restart=always
RestartSec=5

[Install]
WantedBy=multi-user.target
EOF

print_success "Service-Dateien erstellt"

systemctl daemon-reload
print_success "Systemd neu geladen"

systemctl enable fire-station-backend
systemctl enable fire-station-frontend
print_success "Services aktiviert (starten nach Reboot)"

systemctl start fire-station-backend
sleep 3
systemctl start fire-station-frontend
sleep 3
print_success "Services gestartet"
echo ""

# 8a. Sudo-Rechte für Service-Restart (für Auto-Update)
print_header "Konfiguriere sudo-Rechte für Auto-Update..."
SUDOERS_FILE="/etc/sudoers.d/fire-station-update"
cat > $SUDOERS_FILE <<EOF
# Allow root to restart fire station services without password
root ALL=(ALL) NOPASSWD: /bin/systemctl restart fire-station-backend
root ALL=(ALL) NOPASSWD: /bin/systemctl restart fire-station-frontend
root ALL=(ALL) NOPASSWD: /bin/systemctl status fire-station-backend
root ALL=(ALL) NOPASSWD: /bin/systemctl status fire-station-frontend
root ALL=(ALL) NOPASSWD: /usr/sbin/shutdown -r now
root ALL=(ALL) NOPASSWD: /sbin/shutdown -r now
EOF
chmod 440 $SUDOERS_FILE
print_success "Sudo-Rechte konfiguriert"
echo ""

# 9. Raspberry Pi Optimierungen
print_header "Raspberry Pi Optimierungen..."

if ! grep -q "gpu_mem=256" /boot/firmware/config.txt 2>/dev/null; then
    echo "gpu_mem=256" >> /boot/firmware/config.txt 2>/dev/null || true
    print_success "GPU Memory auf 256MB erhöht"
else
    print_info "GPU Memory bereits konfiguriert"
fi

if [ -f /etc/dphys-swapfile ]; then
    sed -i 's/CONF_SWAPSIZE=.*/CONF_SWAPSIZE=2048/' /etc/dphys-swapfile
    systemctl restart dphys-swapfile 2>/dev/null || true
    print_success "Swap auf 2GB erhöht"
fi
echo ""

# 10. Status prüfen
print_header "Prüfe Installation..."
sleep 2
echo ""

BACKEND_STATUS=$(systemctl is-active fire-station-backend)
FRONTEND_STATUS=$(systemctl is-active fire-station-frontend)

if [ "$BACKEND_STATUS" == "active" ]; then
    print_success "Backend läuft"
else
    print_error "Backend läuft nicht!"
    systemctl status fire-station-backend --no-pager -l | tail -n 20
fi

if [ "$FRONTEND_STATUS" == "active" ]; then
    print_success "Frontend läuft"
else
    print_error "Frontend läuft nicht!"
    systemctl status fire-station-frontend --no-pager -l | tail -n 20
fi

echo ""
echo "=========================================================="
echo "✅ Installation abgeschlossen!"
echo "=========================================================="
echo ""
print_success "Backend: http://${IP_ADDRESS}:${BACKEND_PORT}"
print_success "Frontend: http://${IP_ADDRESS}:${FRONTEND_PORT} (oder 5174)"
print_success "API Docs: http://${IP_ADDRESS}:${BACKEND_PORT}/docs"
echo ""
print_info "📋 Admin-Login:"
print_info "   Username: admin"
print_info "   Password: admin123"
echo ""
print_info "🔧 Services verwalten:"
print_info "   sudo systemctl status fire-station-backend"
print_info "   sudo systemctl restart fire-station-backend"
print_info "   sudo journalctl -u fire-station-backend -f"
echo ""
print_info "🔄 Nach Stromausfall:"
print_info "   Services starten automatisch neu"
print_info "   Prüfen mit: systemctl is-enabled fire-station-backend"
echo ""
print_info "📝 Log-Datei: $LOG_FILE"
echo ""
print_success "Viel Erfolg mit dem Feuerwehr Anwesenheitssystem! 🚒"
echo "=========================================================="
