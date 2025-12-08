#!/bin/bash

#############################################
# Feuerwehr Anwesenheitssystem - Raspberry Pi 5 Installation
# DEBUG VERSION - Zeigt alle Fehler an
#############################################

# KEIN set -e - Script läuft weiter bei Fehlern
# set -e

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

# Logging
LOG_FILE="/tmp/fire-station-install-$(date +%Y%m%d-%H%M%S).log"
exec > >(tee -a "$LOG_FILE")
exec 2>&1

# Root-Check
if [ "$EUID" -ne 0 ]; then 
    print_error "Bitte als root ausführen: sudo bash install-rpi5-debug.sh"
    exit 1
fi

clear
echo "=========================================================="
echo "🚒 Feuerwehr Anwesenheitssystem - Raspberry Pi 5 Setup"
echo "=========================================================="
echo ""
echo "DEBUG VERSION - Zeigt alle Schritte und Fehler an"
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
print_info "Frontend-Port: $FRONTEND_PORT"
print_info "Backend-Port: $BACKEND_PORT"
echo ""

read -p "Möchten Sie fortfahren? (j/n): " -n 1 -r
echo ""
if [[ ! $REPLY =~ ^[Jj]$ ]]; then
    print_error "Installation abgebrochen"
    exit 1
fi

# Funktion zum Prüfen des letzten Befehls
check_status() {
    if [ $? -eq 0 ]; then
        print_success "$1"
        return 0
    else
        print_error "$1 - FEHLER!"
        print_error "Siehe Details oben oder in: $LOG_FILE"
        read -p "Trotzdem fortfahren? (j/n): " -n 1 -r
        echo ""
        if [[ ! $REPLY =~ ^[Jj]$ ]]; then
            exit 1
        fi
        return 1
    fi
}

# 1. System aktualisieren
print_header "System wird aktualisiert..."
print_info "apt-get update..."
apt-get update
check_status "apt-get update"

print_info "apt-get upgrade..."
apt-get upgrade -y
check_status "apt-get upgrade"
echo ""

# 2. Dependencies installieren - EINZELN
print_header "Installiere System-Pakete (einzeln für besseres Debugging)..."

PACKAGES=(
    "python3"
    "python3-pip"
    "python3-venv"
    "python3-dev"
    "build-essential"
    "git"
    "curl"
    "wget"
    "sqlite3"
)

for package in "${PACKAGES[@]}"; do
    print_info "Installiere $package..."
    apt-get install -y "$package"
    check_status "$package installiert"
done
echo ""

# 3. Node.js installieren
print_header "Node.js Installation..."
print_info "Prüfe aktuelle Node.js Version..."
if command -v node &> /dev/null; then
    NODE_VERSION=$(node -v)
    print_info "Aktuelle Version: $NODE_VERSION"
else
    print_info "Node.js nicht installiert"
fi

print_info "Installiere Node.js 20 LTS..."
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
check_status "NodeSource Repository hinzugefügt"

apt-get install -y nodejs
check_status "Node.js installiert"

print_success "Node.js Version: $(node -v)"
print_success "npm Version: $(npm -v)"
echo ""

# 4. PostgreSQL installieren
print_header "PostgreSQL Installation..."
apt-get install -y postgresql postgresql-contrib libpq-dev
check_status "PostgreSQL installiert"

systemctl start postgresql
check_status "PostgreSQL gestartet"

systemctl enable postgresql
check_status "PostgreSQL Autostart aktiviert"
echo ""

# 5. Datenbank erstellen
print_header "Datenbank-Setup..."
print_info "Erstelle Datenbank und Benutzer..."

sudo -u postgres psql <<EOF
-- Lösche existierende Datenbank falls vorhanden
DROP DATABASE IF EXISTS firestation;
DROP USER IF EXISTS firestation;

-- Erstelle neuen Benutzer
CREATE USER firestation WITH PASSWORD 'firestation';

-- Erstelle Datenbank
CREATE DATABASE firestation OWNER firestation;

-- Gebe Rechte
GRANT ALL PRIVILEGES ON DATABASE firestation TO firestation;

-- Verbinde zur Datenbank und gebe Schema-Rechte
\c firestation
GRANT ALL ON SCHEMA public TO firestation;
EOF

check_status "Datenbank erstellt"
echo ""

# 6. Repository klonen
print_header "Lade Anwendung herunter..."
if [ -d "$INSTALL_DIR" ]; then
    print_info "Verzeichnis existiert bereits, lösche und klone neu..."
    rm -rf $INSTALL_DIR
fi

mkdir -p $INSTALL_DIR
cd $INSTALL_DIR

print_info "Clone von GitHub..."
git clone https://github.com/Elemirus1996/fire-station-app.git .
check_status "Repository geklont"
echo ""

# 7. Backend Setup
print_header "Backend-Setup..."
cd $INSTALL_DIR/backend

print_info "Erstelle Python Virtual Environment..."
python3 -m venv venv
check_status "Virtual Environment erstellt"

print_info "Aktiviere Virtual Environment..."
source venv/bin/activate
check_status "Virtual Environment aktiviert"

print_info "Installiere Python-Pakete..."
pip install --upgrade pip
pip install -r requirements.txt
check_status "Python-Pakete installiert"

print_info "Erstelle .env Datei..."
cat > .env <<EOF
DATABASE_URL=postgresql://firestation:firestation@localhost/firestation
SECRET_KEY=$(openssl rand -hex 32)
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=30
CORS_ORIGINS=http://localhost:5173,http://${IP_ADDRESS}:5173
HOST=0.0.0.0
PORT=8000
EOF
check_status ".env Datei erstellt"

print_info "Initialisiere Datenbank..."
python -c "from app.database import init_db; init_db()"
check_status "Datenbank initialisiert"

print_info "Erstelle Admin-User..."
python << 'EOFPYTHON'
from app.database import SessionLocal
from app.models import AdminUser
from passlib.context import CryptContext

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
db = SessionLocal()

try:
    # Prüfe ob Admin existiert
    admin = db.query(AdminUser).filter(AdminUser.username == "admin").first()
    
    if not admin:
        print("  Erstelle Admin-User...")
        admin = AdminUser(
            username="admin",
            hashed_password=pwd_context.hash("admin123"),
            role="admin"
        )
        db.add(admin)
        db.commit()
        print("  ✓ Admin-User erstellt (Username: admin, Password: admin123)")
    else:
        print("  ✓ Admin-User existiert bereits")
except Exception as e:
    print(f"  ✗ Fehler: {e}")
    import traceback
    traceback.print_exc()
finally:
    db.close()
EOFPYTHON
check_status "Admin-User erstellt"
echo ""

# 8. Frontend Setup
print_header "Frontend-Setup..."
cd $INSTALL_DIR/frontend

print_info "Installiere npm-Pakete (kann einige Minuten dauern)..."
npm install
check_status "npm-Pakete installiert"

print_info "Erstelle .env Datei..."
cat > .env <<EOF
VITE_API_BASE_URL=http://${IP_ADDRESS}:8000/api
EOF
check_status ".env Datei erstellt"

print_info "Baue Frontend (kann einige Minuten dauern)..."
npm run build
check_status "Frontend gebaut"
echo ""

# 9. Systemd Services erstellen
print_header "Erstelle Systemd Services..."

# Backend Service
print_info "Erstelle Backend Service..."
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
check_status "Backend Service erstellt"

# Frontend Service
print_info "Erstelle Frontend Service..."
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
check_status "Frontend Service erstellt"

# Services aktivieren und starten
print_info "Lade Systemd Konfiguration neu..."
systemctl daemon-reload
check_status "Systemd neu geladen"

print_info "Aktiviere Services..."
systemctl enable fire-station-backend
systemctl enable fire-station-frontend
check_status "Services aktiviert"

print_info "Starte Backend..."
systemctl start fire-station-backend
sleep 3
check_status "Backend gestartet"

print_info "Starte Frontend..."
systemctl start fire-station-frontend
sleep 3
check_status "Frontend gestartet"
echo ""

# 10. Status prüfen
print_header "Prüfe Service-Status..."
echo ""
systemctl status fire-station-backend --no-pager -l
echo ""
systemctl status fire-station-frontend --no-pager -l
echo ""

# 11. Raspberry Pi Optimierungen
print_header "Raspberry Pi 5 Optimierungen..."

print_info "Erhöhe GPU Memory auf 256MB..."
if ! grep -q "gpu_mem=256" /boot/firmware/config.txt; then
    echo "gpu_mem=256" >> /boot/firmware/config.txt
    print_success "GPU Memory erhöht"
else
    print_info "GPU Memory bereits konfiguriert"
fi

print_info "Erhöhe Swap auf 2GB..."
sed -i 's/CONF_SWAPSIZE=.*/CONF_SWAPSIZE=2048/' /etc/dphys-swapfile
systemctl restart dphys-swapfile
check_status "Swap erhöht"
echo ""

# Zusammenfassung
echo ""
echo "=========================================================="
echo "✅ Installation abgeschlossen!"
echo "=========================================================="
echo ""
print_success "Backend läuft auf: http://${IP_ADDRESS}:${BACKEND_PORT}"
print_success "Frontend läuft auf: http://${IP_ADDRESS}:${FRONTEND_PORT}"
print_success "API Dokumentation: http://${IP_ADDRESS}:${BACKEND_PORT}/docs"
echo ""
print_info "Standard Admin-Login:"
print_info "  Username: admin"
print_info "  Password: admin123"
echo ""
print_info "Services verwalten:"
print_info "  sudo systemctl status fire-station-backend"
print_info "  sudo systemctl status fire-station-frontend"
print_info "  sudo systemctl restart fire-station-backend"
print_info "  sudo systemctl restart fire-station-frontend"
echo ""
print_info "Logs ansehen:"
print_info "  sudo journalctl -u fire-station-backend -f"
print_info "  sudo journalctl -u fire-station-frontend -f"
echo ""
print_info "Installations-Log gespeichert in: $LOG_FILE"
echo ""
print_success "Viel Erfolg mit dem Feuerwehr Anwesenheitssystem! 🚒"
echo "=========================================================="
