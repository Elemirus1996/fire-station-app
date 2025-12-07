#!/bin/bash

#############################################
# Feuerwehr Anwesenheitssystem - Raspberry Pi Installation
# Version: 1.0.0
# Automatische Installation und Konfiguration
#############################################

set -e  # Exit on error

echo "=================================================="
echo "🚒 Feuerwehr Anwesenheitssystem - Installation"
echo "=================================================="
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
apt-get install -y \
    python3 \
    python3-pip \
    python3-venv \
    nodejs \
    npm \
    git \
    chromium-browser \
    unclutter \
    xdotool \
    x11-xserver-utils \
    sqlite3
print_success "Pakete installiert"
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
    git pull
else
    git clone https://github.com/Elemirus1996/fire-station-app.git .
fi
git checkout v1.0.0
print_success "Anwendung heruntergeladen"
echo ""

# 6. Backend einrichten
print_info "Schritt 6/10: Backend wird eingerichtet..."
cd $INSTALL_DIR/backend

# Virtual Environment erstellen
python3 -m venv venv
source venv/bin/activate

# Dependencies installieren
pip install --upgrade pip
pip install -r requirements.txt

# Datenbank initialisieren
python3 -c "from app.database import init_db; init_db()"

deactivate
print_success "Backend eingerichtet"
echo ""

# 7. Frontend einrichten
print_info "Schritt 7/10: Frontend wird eingerichtet..."
cd $INSTALL_DIR/frontend

# Umgebungsvariable für Backend-URL setzen
cat > .env << EOF
VITE_API_BASE_URL=http://${IP_ADDRESS}:8000
EOF

npm install
npm run build
print_success "Frontend gebaut"
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
Environment="PATH=$INSTALL_DIR/backend/venv/bin"
ExecStart=$INSTALL_DIR/backend/venv/bin/python main.py
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
EOF

# Frontend Service (mit serve)
npm install -g serve

cat > /etc/systemd/system/feuerwehr-frontend.service << EOF
[Unit]
Description=Feuerwehr Anwesenheitssystem Frontend
After=network.target feuerwehr-backend.service

[Service]
Type=simple
User=root
WorkingDirectory=$INSTALL_DIR/frontend
ExecStart=/usr/local/bin/serve -s dist -l 5173
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
EOF

# Services aktivieren und starten
systemctl daemon-reload
systemctl enable feuerwehr-backend.service
systemctl enable feuerwehr-frontend.service
systemctl start feuerwehr-backend.service
systemctl start feuerwehr-frontend.service

print_success "Systemdienste erstellt und gestartet"
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

# Chromium im Kiosk-Modus starten
chromium-browser \
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
    if ! pgrep -x "chromium-browser" > /dev/null; then
        chromium-browser --kiosk --app=http://${IP_ADDRESS}:5173/kiosk &
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
pip3 install qrcode[pil]

python3 << PYTHON_SCRIPT
import qrcode
url = "http://${IP_ADDRESS}:5173/kiosk"
qr = qrcode.QRCode(version=1, box_size=10, border=5)
qr.add_data(url)
qr.make(fit=True)
qr.print_ascii(invert=True)
print("\nScanne diesen QR-Code mit deinem Smartphone für mobilen Zugriff!")
PYTHON_SCRIPT

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
