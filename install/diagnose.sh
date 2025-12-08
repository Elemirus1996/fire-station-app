#!/bin/bash

#############################################
# Feuerwehr App - Diagnose Script
# Zeigt alle wichtigen Infos an
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

clear
echo "=========================================================="
echo "🔍 Feuerwehr App - System-Diagnose"
echo "=========================================================="
echo ""

IP_ADDRESS=$(hostname -I | awk '{print $1}')
print_info "IP-Adresse: $IP_ADDRESS"
echo ""

# 1. Installationsverzeichnis
print_header "Installationsverzeichnis:"
if [ -d "/opt/feuerwehr-app" ]; then
    print_success "/opt/feuerwehr-app existiert"
    ls -la /opt/feuerwehr-app/
else
    print_error "/opt/feuerwehr-app existiert NICHT"
fi
echo ""

# 2. Services
print_header "Service-Status:"
for service in feuerwehr-backend feuerwehr-frontend feuerwehr-kiosk; do
    if systemctl is-active --quiet $service; then
        print_success "$service läuft"
    else
        print_error "$service läuft NICHT"
    fi
    
    if systemctl is-enabled --quiet $service; then
        echo "  ↳ Autostart: aktiviert"
    else
        echo "  ↳ Autostart: deaktiviert"
    fi
done
echo ""

# 3. Ports prüfen
print_header "Ports:"
if netstat -tuln | grep -q ":8000 "; then
    print_success "Backend Port 8000 offen"
else
    print_error "Backend Port 8000 NICHT offen"
fi

if netstat -tuln | grep -q ":5173 "; then
    print_success "Frontend Port 5173 offen"
else
    print_error "Frontend Port 5173 NICHT offen"
fi
echo ""

# 4. PostgreSQL
print_header "PostgreSQL:"
if systemctl is-active --quiet postgresql; then
    print_success "PostgreSQL läuft"
    
    # Datenbank prüfen
    if sudo -u postgres psql -lqt | cut -d \| -f 1 | grep -qw firestation; then
        print_success "Datenbank 'firestation' existiert"
    else
        print_error "Datenbank 'firestation' existiert NICHT"
    fi
else
    print_error "PostgreSQL läuft NICHT"
fi
echo ""

# 5. Python Virtual Environment
print_header "Backend Environment:"
if [ -d "/opt/feuerwehr-app/backend/venv" ]; then
    print_success "Virtual Environment existiert"
else
    print_error "Virtual Environment existiert NICHT"
fi
echo ""

# 6. Frontend Build
print_header "Frontend Build:"
if [ -d "/opt/feuerwehr-app/frontend/dist" ]; then
    print_success "Frontend Build existiert"
else
    print_error "Frontend Build existiert NICHT"
fi
echo ""

# 7. Letzte Log-Einträge
print_header "Backend Logs (letzte 10 Zeilen):"
sudo journalctl -u feuerwehr-backend -n 10 --no-pager
echo ""

print_header "Frontend Logs (letzte 10 Zeilen):"
sudo journalctl -u feuerwehr-frontend -n 10 --no-pager
echo ""

# 8. Zugriffs-URLs
echo "=========================================================="
print_header "Zugriffs-URLs:"
echo "   Kiosk:  http://$IP_ADDRESS:5173/kiosk"
echo "   Admin:  http://$IP_ADDRESS:5173/admin/login"
echo "   API:    http://$IP_ADDRESS:8000/docs"
echo ""
print_info "Admin-Login: username=admin, password=admin"
echo "=========================================================="
