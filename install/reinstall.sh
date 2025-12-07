#!/bin/bash

#############################################
# Feuerwehr Anwesenheitssystem - Neuinstallation
# Löscht alte Installation und installiert sauber neu
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
    print_error "Bitte als root ausführen: sudo bash reinstall.sh"
    exit 1
fi

clear
echo "=========================================================="
echo "🔄 Feuerwehr Anwesenheitssystem - Neuinstallation"
echo "=========================================================="
echo ""
echo "⚠️  ACHTUNG: Dies wird folgendes tun:"
echo "  - Alle Services stoppen"
echo "  - Anwendungs-Verzeichnis löschen"
echo "  - Datenbank löschen (alle Daten gehen verloren!)"
echo "  - Systemd Services entfernen"
echo "  - Komplette Neuinstallation durchführen"
echo ""
print_error "ALLE DATEN WERDEN GELÖSCHT!"
echo ""

read -p "Wirklich fortfahren? (ja/nein): " -r
echo ""
if [[ ! $REPLY == "ja" ]]; then
    print_error "Neuinstallation abgebrochen"
    exit 1
fi

INSTALL_DIR="/opt/feuerwehr-app"
IP_ADDRESS=$(hostname -I | awk '{print $1}')

# 1. Services stoppen und entfernen
print_header "Stoppe Services..."
systemctl stop fire-station-backend 2>/dev/null || true
systemctl stop fire-station-frontend 2>/dev/null || true
print_success "Services gestoppt"

print_header "Deaktiviere Services..."
systemctl disable fire-station-backend 2>/dev/null || true
systemctl disable fire-station-frontend 2>/dev/null || true
print_success "Services deaktiviert"

print_header "Lösche Systemd Service-Dateien..."
rm -f /etc/systemd/system/fire-station-backend.service
rm -f /etc/systemd/system/fire-station-frontend.service
systemctl daemon-reload
print_success "Service-Dateien gelöscht"
echo ""

# 2. Anwendungs-Verzeichnis löschen
print_header "Lösche Anwendungs-Verzeichnis..."
if [ -d "$INSTALL_DIR" ]; then
    rm -rf $INSTALL_DIR
    print_success "Verzeichnis gelöscht: $INSTALL_DIR"
else
    print_info "Verzeichnis existiert nicht: $INSTALL_DIR"
fi
echo ""

# 3. Datenbank löschen
print_header "Lösche Datenbank..."
sudo -u postgres psql << EOF
DROP DATABASE IF EXISTS firestation;
DROP USER IF EXISTS firestation;
EOF
print_success "Datenbank gelöscht"
echo ""

# 4. Datenbank neu erstellen
print_header "Erstelle neue Datenbank..."
sudo -u postgres psql << EOF
CREATE USER firestation WITH PASSWORD 'firestation';
CREATE DATABASE firestation OWNER firestation;
GRANT ALL PRIVILEGES ON DATABASE firestation TO firestation;
\c firestation
GRANT ALL ON SCHEMA public TO firestation;
EOF
print_success "Datenbank erstellt"
echo ""

# 5. Repository neu klonen
print_header "Lade Anwendung neu..."
mkdir -p $INSTALL_DIR
cd $INSTALL_DIR
git clone https://github.com/Elemirus1996/fire-station-app.git .
print_success "Repository geklont"
echo ""

# 6. Backend Setup
print_header "Backend-Setup..."
cd $INSTALL_DIR/backend

print_info "Erstelle Python Virtual Environment..."
python3 -m venv venv
print_success "Virtual Environment erstellt"

print_info "Aktiviere Virtual Environment..."
source venv/bin/activate

print_info "Installiere Python-Pakete..."
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
python -c "from app.database import init_db; init_db()"
print_success "Datenbank initialisiert"

print_info "Erstelle Admin-User..."
python << 'EOFPYTHON'
from app.database import SessionLocal
from app.models import AdminUser
from passlib.context import CryptContext

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
db = SessionLocal()

try:
    admin = AdminUser(
        username="admin",
        hashed_password=pwd_context.hash("admin123"),
        role="admin"
    )
    db.add(admin)
    db.commit()
    print("✓ Admin-User erstellt")
except Exception as e:
    print(f"✗ Fehler: {e}")
finally:
    db.close()
EOFPYTHON
print_success "Admin-User erstellt"
echo ""

# 7. Frontend Setup
print_header "Frontend-Setup..."
cd $INSTALL_DIR/frontend

print_info "Installiere npm-Pakete..."
npm install --quiet
print_success "npm-Pakete installiert"

print_info "Erstelle .env Datei..."
cat > .env <<EOF
VITE_API_BASE_URL=http://${IP_ADDRESS}:8000/api
EOF
print_success ".env Datei erstellt"

print_info "Baue Frontend..."
npm run build --quiet
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

[Service]
Type=simple
User=root
WorkingDirectory=$INSTALL_DIR/frontend
ExecStart=/usr/bin/npm run preview -- --host 0.0.0.0 --port 5173
Restart=always
RestartSec=3

[Install]
WantedBy=multi-user.target
EOF

print_success "Service-Dateien erstellt"

systemctl daemon-reload
print_success "Systemd neu geladen"

systemctl enable fire-station-backend
systemctl enable fire-station-frontend
print_success "Services aktiviert"

systemctl start fire-station-backend
sleep 3
systemctl start fire-station-frontend
sleep 3
print_success "Services gestartet"
echo ""

# 9. Status prüfen
print_header "Prüfe Installation..."
echo ""

BACKEND_STATUS=$(systemctl is-active fire-station-backend)
FRONTEND_STATUS=$(systemctl is-active fire-station-frontend)

if [ "$BACKEND_STATUS" == "active" ]; then
    print_success "Backend läuft"
else
    print_error "Backend läuft nicht!"
    echo "Logs: sudo journalctl -u fire-station-backend -n 20"
fi

if [ "$FRONTEND_STATUS" == "active" ]; then
    print_success "Frontend läuft"
else
    print_error "Frontend läuft nicht!"
    echo "Logs: sudo journalctl -u fire-station-frontend -n 20"
fi

echo ""
echo "=========================================================="
echo "✅ Neuinstallation abgeschlossen!"
echo "=========================================================="
echo ""
print_success "Backend: http://${IP_ADDRESS}:8000"
print_success "Frontend: http://${IP_ADDRESS}:5173 (oder 5174)"
print_success "API Docs: http://${IP_ADDRESS}:8000/docs"
echo ""
print_info "Admin-Login:"
print_info "  Username: admin"
print_info "  Password: admin123"
echo ""
print_info "Services verwalten:"
print_info "  sudo systemctl status fire-station-backend"
print_info "  sudo systemctl status fire-station-frontend"
print_info "  sudo journalctl -u fire-station-backend -f"
print_info "  sudo journalctl -u fire-station-frontend -f"
echo ""
print_success "Viel Erfolg! 🚒"
echo "=========================================================="
