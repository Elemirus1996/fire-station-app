#!/bin/bash

# Feuerwehr App - Update Script
# Dieses Script aktualisiert die Anwendung auf die neueste Version

set -e

echo "=================================="
echo "  Feuerwehr App - System Update"
echo "=================================="
echo ""

# Farben für Output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

print_success() {
    echo -e "${GREEN}✓${NC} $1"
}

print_error() {
    echo -e "${RED}✗${NC} $1"
}

print_info() {
    echo -e "${YELLOW}➜${NC} $1"
}

# Prüfen ob als root ausgeführt wird
if [ "$EUID" -eq 0 ]; then 
    print_error "Bitte nicht als root ausführen"
    exit 1
fi

# Prüfe ob in richtigem Verzeichnis
if [ ! -f "docker-compose.yml" ] || [ ! -d "backend" ] || [ ! -d "frontend" ]; then
    print_error "Script muss im Hauptverzeichnis der Anwendung ausgeführt werden"
    exit 1
fi

PROJECT_DIR=$(pwd)

# 1. Git Status prüfen
print_info "Prüfe Git-Repository..."
git fetch origin

CURRENT=$(git rev-parse HEAD)
REMOTE=$(git rev-parse origin/main)

if [ "$CURRENT" = "$REMOTE" ]; then
    print_success "Bereits auf dem neuesten Stand"
    echo "Aktuelle Version: $(git rev-parse --short HEAD)"
    exit 0
fi

echo ""
print_info "Update verfügbar!"
echo "Aktuell: $(git rev-parse --short HEAD)"
echo "Neu:     $(git rev-parse --short origin/main)"
echo ""

read -p "Möchten Sie das Update installieren? (j/N) " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Jj]$ ]]; then
    print_info "Update abgebrochen"
    exit 0
fi

echo ""
print_info "Starte Update-Vorgang..."
echo ""

# 2. Services stoppen
print_info "Stoppe Services..."
if systemctl is-active --quiet feuerwehr-backend; then
    sudo systemctl stop feuerwehr-backend || true
    print_success "Backend gestoppt"
fi

if systemctl is-active --quiet feuerwehr-frontend; then
    sudo systemctl stop feuerwehr-frontend || true
    print_success "Frontend gestoppt"
fi

# 3. Git Pull
print_info "Lade neue Version herunter..."
git pull origin main
print_success "Repository aktualisiert"

# 4. Backend aktualisieren
print_info "Aktualisiere Backend..."
cd backend

if [ -d "venv" ]; then
    source venv/bin/activate
    pip install --upgrade pip
    pip install -r requirements.txt
    deactivate
    print_success "Backend Dependencies aktualisiert"
else
    print_error "Virtual Environment nicht gefunden"
fi

cd "$PROJECT_DIR"

# 5. Frontend aktualisieren
print_info "Aktualisiere Frontend..."
cd frontend

# Dependencies installieren
npm install

# Frontend neu bauen
npm run build

if [ ! -d "dist" ]; then
    print_error "Frontend Build fehlgeschlagen"
    exit 1
fi

print_success "Frontend neu gebaut"
cd "$PROJECT_DIR"

# 6. Services neu starten
print_info "Starte Services neu..."

if systemctl is-enabled --quiet feuerwehr-backend; then
    sudo systemctl start feuerwehr-backend
    sleep 2
    if systemctl is-active --quiet feuerwehr-backend; then
        print_success "Backend gestartet"
    else
        print_error "Backend konnte nicht gestartet werden"
        sudo systemctl status feuerwehr-backend --no-pager
    fi
fi

if systemctl is-enabled --quiet feuerwehr-frontend; then
    sudo systemctl start feuerwehr-frontend
    sleep 2
    if systemctl is-active --quiet feuerwehr-frontend; then
        print_success "Frontend gestartet"
    else
        print_error "Frontend konnte nicht gestartet werden"
        sudo systemctl status feuerwehr-frontend --no-pager
    fi
fi

echo ""
print_success "Update erfolgreich abgeschlossen!"
echo ""
echo "Neue Version: $(git describe --tags --always)"
echo "Commit: $(git log -1 --pretty=format:'%h - %s')"
echo ""
print_info "Die Anwendung ist jetzt unter http://$(hostname -I | awk '{print $1}'):5173 erreichbar"
