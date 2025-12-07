#!/bin/bash

#############################################
# Feuerwehr Anwesenheitssystem - Raspberry Pi Installation
# Version: 1.0.0
# Automatische Installation und Konfiguration
#############################################

# Exit on error, but allow error handling
set -e
set -o pipefail

# Log-Datei erstellen
LOGFILE="/tmp/feuerwehr-install.log"
exec 1> >(tee -a "$LOGFILE")
exec 2>&1

echo "=================================================="
echo "🚒 Feuerwehr Anwesenheitssystem - Installation"
echo "=================================================="
echo ""
echo "Log wird gespeichert in: $LOGFILE"
echo ""

# Farben für Output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Funktion für farbige Ausgaben
print_success() {
    echo -e "${GREEN}✓ $1${NC}"
}

print_error() {
    echo -e "${RED}✗ $1${NC}"
}

print_info() {
    echo -e "${YELLOW}ℹ $1${NC}"
}

# Prüfen ob als root ausgeführt
if [ "$EUID" -ne 0 ]; then 
    print_error "Bitte als root ausführen: sudo ./install-rpi.sh"
    exit 1
fi

print_info "Installation wird gestartet..."
echo ""

# 1. System aktualisieren
print_info "Schritt 1/10: System wird aktualisiert..."
apt-get update -y
apt-get upgrade -y
print_success "System aktualisiert"
echo ""

# 2. Notwendige Pakete installieren
print_info "Schritt 2/10: Notwendige Pakete werden installiert..."

# Pakete einzeln prüfen und installieren
install_package() {
    local package=$1
    if dpkg -l | grep -q "^ii  $package"; then
        print_info "$package bereits installiert - überspringe"
        return 0
    fi
    
    print_info "Installiere $package..."
    if apt-get install -y "$package" 2>&1 | tee -a "$LOGFILE"; then
        print_success "$package installiert"
        return 0
    else
        print_error "Warnung: $package konnte nicht installiert werden"
        return 1
    fi
}

# Basis-Pakete
install_package python3
install_package python3-pip
install_package python3-venv
install_package git
install_package sqlite3
install_package unclutter
install_package xdotool
install_package x11-xserver-utils

# Node.js und npm
if ! command -v node &> /dev/null; then
    print_info "Installiere Node.js..."
    if curl -fsSL https://deb.nodesource.com/setup_18.x | bash - 2>&1 | tee -a "$LOGFILE"; then
        apt-get install -y nodejs
        print_success "Node.js installiert"
    else
        print_error "Node.js Installation fehlgeschlagen"
        exit 1
    fi
else
    NODE_VERSION=$(node --version)
    print_info "Node.js bereits installiert: $NODE_VERSION"
fi

# Chromium Browser - flexible Installation
CHROMIUM_INSTALLED=false

if command -v chromium-browser &> /dev/null; then
    print_info "chromium-browser bereits installiert"
    CHROMIUM_INSTALLED=true
    CHROMIUM_CMD="chromium-browser"
elif command -v chromium &> /dev/null; then
    print_info "chromium bereits installiert"
    CHROMIUM_INSTALLED=true
    CHROMIUM_CMD="chromium"
fi

if [ "$CHROMIUM_INSTALLED" = false ]; then
    print_info "Installiere Chromium Browser..."
    if apt-get install -y chromium-browser 2>/dev/null; then
        CHROMIUM_CMD="chromium-browser"
        print_success "chromium-browser installiert"
    elif apt-get install -y chromium 2>/dev/null; then
        CHROMIUM_CMD="chromium"
        print_success "chromium installiert"
    else
        print_error "Chromium konnte nicht automatisch installiert werden"
        print_info "Bitte manuell installieren: sudo apt-get install chromium-browser"
        exit 1
    fi
fi

print_success "Alle Pakete installiert oder bereits vorhanden"
echo ""

# 3. IP-Adresse ermitteln
print_info "Schritt 3/10: Netzwerk-Konfiguration..."
IP_ADDRESS=$(hostname -I | awk '{print $1}')
if [ -z "$IP_ADDRESS" ]; then
    print_error "Keine IP-Adresse gefunden! Bitte Netzwerkverbindung prüfen."
    exit 1
fi
print_success "IP-Adresse: $IP_ADDRESS"
echo ""

# 4. Installationsverzeichnis erstellen
print_info "Schritt 4/10: Installationsverzeichnis wird erstellt..."
INSTALL_DIR="/opt/feuerwehr-app"
mkdir -p $INSTALL_DIR
cd $INSTALL_DIR
print_success "Verzeichnis erstellt: $INSTALL_DIR"
echo ""

# 5. Repository klonen
print_info "Schritt 5/10: Anwendung wird heruntergeladen..."
if [ -d "$INSTALL_DIR/.git" ]; then
    print_info "Repository existiert bereits, wird aktualisiert..."
    cd $INSTALL_DIR
    git fetch --all
    git reset --hard origin/main
    git pull origin main
else
    print_info "Klone Repository..."
    git clone https://github.com/Elemirus1996/fire-station-app.git $INSTALL_DIR
    cd $INSTALL_DIR
fi

# Auf Version 1.0.0 wechseln
git checkout tags/v1.0.0 -b v1.0.0-install 2>/dev/null || git checkout v1.0.0-install 2>/dev/null || git checkout main

print_success "Anwendung heruntergeladen"
echo ""

# 6. Backend einrichten
print_info "Schritt 6/10: Backend wird eingerichtet..."
cd $INSTALL_DIR/backend

# Zusätzliche Build-Dependencies für Python-Pakete
print_info "Installiere Build-Dependencies..."
apt-get install -y \
    build-essential \
    python3-dev \
    libffi-dev \
    libssl-dev \
    libjpeg-dev \
    zlib1g-dev \
    libfreetype6-dev \
    liblcms2-dev \
    libopenjp2-7-dev \
    libtiff5-dev \
    libwebp-dev \
    tcl8.6-dev \
    tk8.6-dev \
    python3-tk \
    libharfbuzz-dev \
    libfribidi-dev \
    libxcb1-dev \
    cargo \
    rustc 2>&1 | tee -a "$LOGFILE" || print_info "Einige Build-Tools konnten nicht installiert werden"

# Fallback: Versuche python3-pillow aus System-Paketen
print_info "Installiere Pillow aus System-Paketen als Fallback..."
apt-get install -y python3-pillow 2>&1 | tee -a "$LOGFILE" || true

# Virtual Environment erstellen
if [ -d "venv" ]; then
    print_info "Virtual Environment existiert bereits"
else
    print_info "Erstelle Virtual Environment..."
    python3 -m venv venv
fi

source venv/bin/activate

# Pip und setuptools aktualisieren
print_info "Aktualisiere pip, setuptools und wheel..."
pip install --upgrade pip setuptools wheel

# Dependencies installieren mit erhöhter Toleranz
print_info "Installiere Python-Dependencies (das kann einige Minuten dauern)..."

# Erst Pillow einzeln versuchen (mit System-Site-Packages falls installiert)
print_info "Installiere Pillow..."
if ! pip install pillow 2>&1 | tee -a "$LOGFILE"; then
    print_info "Pillow pip-Installation fehlgeschlagen, versuche ohne Binary..."
    pip install --no-binary pillow pillow 2>&1 | tee -a "$LOGFILE" || {
        print_info "Verwende System-Pillow (python3-pillow)"
        # Create symlink from system pillow to venv
        SYSTEM_PILLOW=$(python3 -c "import sys; sys.path.insert(0, '/usr/lib/python3/dist-packages'); import PIL; print(PIL.__path__[0])" 2>/dev/null || echo "")
        if [ -n "$SYSTEM_PILLOW" ]; then
            ln -sf "$SYSTEM_PILLOW" "$(pwd)/venv/lib/python*/site-packages/" 2>/dev/null || true
            print_info "System-Pillow verlinkt"
        fi
    }
fi

# Dann Rest der Dependencies
if pip install -r requirements.txt 2>&1 | tee -a "$LOGFILE"; then
    print_success "Dependencies installiert"
else
    print_error "Einige Dependencies konnten nicht installiert werden"
    print_info "Versuche kritische Pakete einzeln zu installieren..."
    
    # Kritische Pakete einzeln installieren (ohne Pillow, das haben wir schon)
    pip install fastapi || true
    pip install uvicorn || true
    pip install sqlalchemy || true
    pip install pydantic || true
    pip install python-jose || true
    pip install passlib || true
    pip install python-multipart || true
    pip install reportlab || true
    pip install qrcode || true
    pip install apscheduler || true
fi

# Prüfe ob Pillow funktioniert
print_info "Prüfe Pillow-Installation..."
if python3 -c "from PIL import Image; print('Pillow OK')" 2>&1 | grep -q "Pillow OK"; then
    print_success "Pillow funktioniert"
else
    print_info "Warnung: Pillow konnte nicht geladen werden. QR-Code und PDF-Funktionen könnten eingeschränkt sein."
fi

# Datenbank initialisieren und mit Seed-Daten füllen
print_info "Initialisiere Datenbank..."

# Stelle sicher dass venv aktiviert ist
if [ -z "$VIRTUAL_ENV" ]; then
    source venv/bin/activate
fi

# Verwende Python aus dem venv
VENV_PYTHON="$(pwd)/venv/bin/python3"

# Führe Initialisierung aus
$VENV_PYTHON << 'PYTHON_INIT'
import sys
import os

# Sicherstellen dass wir im richtigen Verzeichnis sind
backend_dir = os.getcwd()
sys.path.insert(0, backend_dir)

print(f"Python: {sys.version}")
print(f"Working Dir: {backend_dir}")
print(f"Sys Path: {sys.path[:3]}")

try:
    print("\nImportiere Module...")
    from app.database import init_db
    from app.seed import seed_initial_data
    print("✓ Module erfolgreich importiert")
    
    # Tabellen erstellen
    print("\nErstelle Datenbank-Tabellen...")
    init_db()
    print("✓ Datenbank-Tabellen erstellt")
    
    # Seed-Daten einfügen
    print("\nFüge Dummy-Daten ein...")
    seed_initial_data()
    print("✓ Dummy-Daten eingefügt")
    print("   - Admin: admin / feuerwehr2025")
    print("   - 10 Test-Personen")
    print("   - 4 Gruppen (Jugend, Aktive, Altersabteilung, Ehrenabteilung)")
    print("   - Standard-Trainings")
    
except ImportError as e:
    print(f"\n❌ Import-Fehler: {e}")
    print("Module konnten nicht geladen werden")
    print("Bitte prüfen Sie die Installation der Python-Pakete")
    sys.exit(1)
except Exception as e:
    print(f"\n❌ Fehler bei Datenbank-Initialisierung: {e}")
    import traceback
    traceback.print_exc()
    print("")
    print("⚠️  WICHTIG: Datenbank wird beim ersten Start automatisch erstellt")
    print("")
    print("Falls Fehler auftreten, bitte manuell ausführen:")
    print("  cd /opt/feuerwehr-app/backend")
    print("  source venv/bin/activate")
    print("  python3 << EOF")
    print("from app.database import init_db")
    print("from app.seed import seed_initial_data")
    print("init_db()")
    print("seed_initial_data()")
    print("EOF")
    # Nicht abbrechen, da beim Startup nochmal versucht wird
PYTHON_INIT

# Prüfe ob Datenbank erstellt wurde
if [ -f "fire_station.db" ]; then
    print_success "Datenbank-Datei erstellt: fire_station.db"
    # Zeige Größe
    DB_SIZE=$(du -h fire_station.db | cut -f1)
    print_info "Datenbank-Größe: $DB_SIZE"
else
    print_info "Warnung: Datenbank-Datei nicht gefunden"
    print_info "Sie wird beim ersten Start automatisch erstellt"
fi

deactivate
print_success "Backend eingerichtet"
echo ""

# 7. Frontend einrichten
print_info "Schritt 7/10: Frontend wird eingerichtet..."
cd $INSTALL_DIR/frontend

# Umgebungsvariable für Backend-URL setzen
print_info "Konfiguriere Backend-URL: http://${IP_ADDRESS}:8000"
cat > .env << EOF
VITE_API_BASE_URL=http://${IP_ADDRESS}:8000
EOF

# Auch in .env.production
cat > .env.production << EOF
VITE_API_BASE_URL=http://${IP_ADDRESS}:8000
EOF

# Node modules installieren
print_info "Installiere Node.js Dependencies (das kann einige Minuten dauern)..."
npm install 2>&1 | tee -a "$LOGFILE"

# Alte Build-Dateien löschen
rm -rf dist

# Frontend bauen mit Produktion-Modus
print_info "Baue Frontend im Produktions-Modus..."
NODE_ENV=production npm run build 2>&1 | tee -a "$LOGFILE"

# Prüfen ob dist Ordner existiert
if [ ! -d "dist" ]; then
    print_error "Frontend-Build fehlgeschlagen - dist Ordner nicht gefunden"
    exit 1
fi

print_success "Frontend erfolgreich gebaut"

# Serve global installieren (mit korrektem Pfad)
print_info "Installiere serve für Frontend-Hosting..."
npm install -g serve 2>&1 | tee -a "$LOGFILE"

# Serve-Pfad ermitteln
SERVE_PATH=$(which serve 2>/dev/null || find /usr -name serve 2>/dev/null | head -1)
if [ -z "$SERVE_PATH" ] || [ ! -f "$SERVE_PATH" ]; then
    # Versuche npm global bin
    NPM_BIN=$(npm bin -g 2>/dev/null)
    if [ -n "$NPM_BIN" ] && [ -f "$NPM_BIN/serve" ]; then
        SERVE_PATH="$NPM_BIN/serve"
        # Symlink erstellen
        ln -sf "$SERVE_PATH" /usr/local/bin/serve 2>/dev/null || true
        SERVE_PATH="/usr/local/bin/serve"
    else
        # Letzter Ausweg: node direkt verwenden
        SERVE_PATH="$(which node) $(npm root -g)/serve/bin/serve.js"
    fi
fi

print_success "Serve installiert unter: $SERVE_PATH"
echo ""

# 8. Systemd Services erstellen
print_info "Schritt 8/10: Systemdienste werden erstellt..."

# Backend Service
cat > /etc/systemd/system/feuerwehr-backend.service << EOF
[Unit]
Description=Feuerwehr Anwesenheitssystem Backend
After=network.target

[Service]
Type=simple
User=root
WorkingDirectory=$INSTALL_DIR/backend
Environment="PATH=$INSTALL_DIR/backend/venv/bin:/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin"
ExecStart=$INSTALL_DIR/backend/venv/bin/python main.py
Restart=always
RestartSec=10
StandardOutput=journal
StandardError=journal

[Install]
WantedBy=multi-user.target
EOF

# Frontend Service (mit ermitteltem serve-Pfad)
cat > /etc/systemd/system/feuerwehr-frontend.service << EOF
[Unit]
Description=Feuerwehr Anwesenheitssystem Frontend
After=network.target feuerwehr-backend.service

[Service]
Type=simple
User=root
WorkingDirectory=$INSTALL_DIR/frontend
Environment="PATH=/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin"
ExecStart=${SERVE_PATH} -s dist -l 5173
Restart=always
RestartSec=10
StandardOutput=journal
StandardError=journal

[Install]
WantedBy=multi-user.target
EOF

# Services aktivieren und starten
systemctl daemon-reload
systemctl enable feuerwehr-backend.service
systemctl enable feuerwehr-frontend.service

print_info "Starte Backend-Service..."
systemctl restart feuerwehr-backend.service
sleep 3

print_info "Starte Frontend-Service..."
systemctl restart feuerwehr-frontend.service
sleep 3

# Status prüfen
if systemctl is-active --quiet feuerwehr-backend.service; then
    print_success "Backend-Service läuft"
else
    print_error "Backend-Service konnte nicht gestartet werden"
    print_info "Prüfe Logs mit: sudo journalctl -u feuerwehr-backend -n 50"
fi

if systemctl is-active --quiet feuerwehr-frontend.service; then
    print_success "Frontend-Service läuft"
else
    print_error "Frontend-Service konnte nicht gestartet werden"
    print_info "Prüfe Logs mit: sudo journalctl -u feuerwehr-frontend -n 50"
fi

print_success "Systemdienste konfiguriert"
echo ""

# 9. Kiosk-Modus einrichten
print_info "Schritt 9/10: Kiosk-Modus wird eingerichtet..."

# Autostart-Verzeichnis für aktuellen Benutzer
ACTUAL_USER=$(who | awk 'NR==1{print $1}')
AUTOSTART_DIR="/home/$ACTUAL_USER/.config/autostart"
mkdir -p $AUTOSTART_DIR

# Kiosk-Start-Script erstellen
cat > /usr/local/bin/start-kiosk.sh << EOF
#!/bin/bash

# Warten bis X-Server läuft
while ! xset q &>/dev/null; do
    sleep 1
done

# Cursor verstecken
unclutter -idle 0.1 &

# Bildschirmschoner deaktivieren
xset s off
xset -dpms
xset s noblank

# Warten bis Services laufen
sleep 10

# Chromium im Kiosk-Modus starten (verwende ermittelte Chromium-Command)
${CHROMIUM_CMD} \
    --kiosk \
    --noerrdialogs \
    --disable-infobars \
    --disable-session-crashed-bubble \
    --disable-features=TranslateUI \
    --no-first-run \
    --fast \
    --fast-start \
    --disable-pinch \
    --overscroll-history-navigation=0 \
    --app=http://${IP_ADDRESS}:5173/kiosk &

# Bei Chromium-Absturz neu starten
while true; do
    if ! pgrep -x "${CHROMIUM_CMD}" > /dev/null; then
        ${CHROMIUM_CMD} --kiosk --app=http://${IP_ADDRESS}:5173/kiosk &
    fi
    sleep 10
done
EOF

chmod +x /usr/local/bin/start-kiosk.sh

# Autostart Desktop Entry
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

# 10. Firewall-Regeln
print_info "Schritt 10/10: Firewall wird konfiguriert..."
if command -v ufw &> /dev/null; then
    ufw allow 8000/tcp comment "Feuerwehr Backend"
    ufw allow 5173/tcp comment "Feuerwehr Frontend"
    print_success "Firewall-Regeln hinzugefügt"
else
    print_info "UFW nicht installiert, überspringe Firewall-Konfiguration"
fi
echo ""

# 11. Raspberry Pi spezifische Optimierungen
print_info "Raspberry Pi Optimierungen..."

# Automatische Updates deaktivieren (verhindert unerwartete Neustarts)
systemctl disable apt-daily.service apt-daily.timer
systemctl disable apt-daily-upgrade.timer apt-daily-upgrade.service

# GPU Memory erhöhen für bessere Browser-Performance
if ! grep -q "gpu_mem=256" /boot/config.txt; then
    echo "gpu_mem=256" >> /boot/config.txt
    print_success "GPU Memory erhöht"
fi

print_success "Optimierungen angewendet"
echo ""

# QR-Code für mobile Verbindung generieren
print_info "QR-Code für Smartphone-Zugriff wird generiert..."

# QR-Code im Backend-venv installieren
cd $INSTALL_DIR/backend
source venv/bin/activate
pip install qrcode[pil] 2>&1 | tee -a "$LOGFILE" || print_info "QR-Code Paket bereits installiert"

python3 << PYTHON_SCRIPT
import qrcode
url = "http://${IP_ADDRESS}:5173/kiosk"
qr = qrcode.QRCode(version=1, box_size=10, border=5)
qr.add_data(url)
qr.make(fit=True)
print("\n" + "="*50)
print("📱 QR-CODE FÜR SMARTPHONE-ZUGRIFF")
print("="*50)
qr.print_ascii(invert=True)
print("\nScanne diesen QR-Code mit deinem Smartphone!")
print(f"Oder gib manuell ein: {url}")
print("="*50 + "\n")
PYTHON_SCRIPT

deactivate
cd $INSTALL_DIR

echo ""

# Installation abgeschlossen
echo "=================================================="
print_success "Installation erfolgreich abgeschlossen!"
echo "=================================================="
echo ""
echo "📱 Zugriff:"
echo "   - Lokal (Pi):        http://localhost:5173/kiosk"
echo "   - Netzwerk (Browser): http://${IP_ADDRESS}:5173"
echo "   - Admin-Login:       http://${IP_ADDRESS}:5173/admin/login"
echo "   - API-Dokumentation: http://${IP_ADDRESS}:8000/docs"
echo ""
echo "🔐 Standard-Login:"
echo "   Benutzername: admin"
echo "   Passwort:     feuerwehr2025"
echo ""
echo "📊 Service-Status prüfen:"
echo "   sudo systemctl status feuerwehr-backend"
echo "   sudo systemctl status feuerwehr-frontend"
echo ""
echo "🔄 Services neu starten:"
echo "   sudo systemctl restart feuerwehr-backend"
echo "   sudo systemctl restart feuerwehr-frontend"
echo ""
echo "📝 Logs anzeigen:"
echo "   sudo journalctl -u feuerwehr-backend -f"
echo "   sudo journalctl -u feuerwehr-frontend -f"
echo ""
echo "🖥️  Kiosk-Modus:"
echo "   Startet automatisch nach Neustart"
echo "   Chromium öffnet sich im Vollbildmodus"
echo ""
print_info "Neustart empfohlen für Kiosk-Modus:"
echo "   sudo reboot"
echo ""
