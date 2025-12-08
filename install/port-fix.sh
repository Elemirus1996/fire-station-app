#!/bin/bash

################################################################################
# Port-Fix: Räumt Port 5173 auf und startet Services neu
################################################################################

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

print_success() { echo -e "${GREEN}✓${NC} $1"; }
print_error() { echo -e "${RED}✗${NC} $1"; }
print_info() { echo -e "${YELLOW}ℹ${NC} $1"; }

if [ "$EUID" -ne 0 ]; then 
    print_error "Als root ausführen: sudo bash port-fix.sh"
    exit 1
fi

clear
echo "=========================================="
echo "🔧 Port 5173 Fix"
echo "=========================================="
echo ""

# 1. Zeige Prozesse auf Port 5173
print_info "Prozesse auf Port 5173:"
lsof -i :5173 || print_info "Port 5173 ist frei"
echo ""

# 2. Stoppe Services
print_info "Stoppe Services..."
systemctl stop feuerwehr-backend
systemctl stop feuerwehr-frontend
systemctl stop feuerwehr-kiosk
print_success "Services gestoppt"

# 3. Töte alle Prozesse auf Port 5173
print_info "Räume Port 5173 auf..."
fuser -k 5173/tcp 2>/dev/null || print_info "Keine Prozesse gefunden"
sleep 2

# 4. Töte alte npm/node Prozesse
print_info "Räume npm/node Prozesse auf..."
pkill -f "npm run dev" 2>/dev/null || true
pkill -f "vite" 2>/dev/null || true
pkill -f "node.*vite" 2>/dev/null || true
sleep 2

# 5. Prüfe Port nochmal
print_info "Prüfe Port 5173..."
if lsof -i :5173 > /dev/null 2>&1; then
    print_error "Port 5173 ist noch belegt!"
    lsof -i :5173
else
    print_success "Port 5173 ist frei"
fi
echo ""

# 6. Starte Services neu
print_info "Starte Backend..."
systemctl start feuerwehr-backend
sleep 3

print_info "Starte Frontend..."
systemctl start feuerwehr-frontend
sleep 3

# 7. Status prüfen
echo ""
echo "=========================================="
print_info "Service-Status:"
echo "=========================================="

if systemctl is-active --quiet feuerwehr-backend; then
    print_success "Backend läuft"
else
    print_error "Backend läuft NICHT"
    journalctl -u feuerwehr-backend -n 10 --no-pager
fi

if systemctl is-active --quiet feuerwehr-frontend; then
    print_success "Frontend läuft"
    
    # Zeige auf welchem Port
    sleep 2
    PORT=$(journalctl -u feuerwehr-frontend -n 50 --no-pager | grep -oP "http://localhost:\K[0-9]+" | tail -1)
    if [ -n "$PORT" ]; then
        print_info "Frontend läuft auf Port: $PORT"
        if [ "$PORT" != "5173" ]; then
            print_error "WARNUNG: Frontend läuft auf Port $PORT statt 5173!"
        fi
    fi
else
    print_error "Frontend läuft NICHT"
    journalctl -u feuerwehr-frontend -n 10 --no-pager
fi

IP_ADDRESS=$(hostname -I | awk '{print $1}')
echo ""
echo "🌐 Zugriff:"
echo "   http://${IP_ADDRESS}:5173"
echo ""
