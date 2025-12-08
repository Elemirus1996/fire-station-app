# 🥧 Raspberry Pi Installation

Automatische Installation und Konfiguration der Feuerwehr Anwesenheitssystem auf einem Raspberry Pi mit Kiosk-Modus.

## 📋 Voraussetzungen

- **Raspberry Pi 3B+ oder neuer** (empfohlen: Pi 4 mit 4GB RAM)
- **Raspberry Pi OS** (32-bit oder 64-bit, Desktop-Version)
- **SD-Karte** mit mindestens 16GB
- **Netzwerkverbindung** (Ethernet oder WLAN)
- **Monitor/Touchscreen** für Kiosk-Anzeige
- Optional: **Tastatur und Maus** für Setup

## 🚀 Schnellinstallation

### 1. Raspberry Pi OS installieren

1. Download [Raspberry Pi Imager](https://www.raspberrypi.com/software/)
2. SD-Karte mit **Raspberry Pi OS (Desktop)** flashen
3. Hostname, SSH, WLAN konfigurieren (empfohlen)
4. Ersten Boot durchführen und Updates installieren

### 2. Installations-Script herunterladen und ausführen

```bash
# Script herunterladen
wget https://raw.githubusercontent.com/Elemirus1996/fire-station-app/main/install/install-rpi.sh

# Als root ausführen (chmod nicht nötig, wird automatisch gemacht)
sudo bash install-rpi.sh
```

Das Script führt automatisch folgende Schritte aus:
1. ✅ System-Updates
2. ✅ Installation aller Dependencies (Python, Node.js, Chromium)
3. ✅ Repository klonen
4. ✅ Backend einrichten (Virtual Environment, Dependencies, Datenbank)
5. ✅ Frontend bauen (mit korrekter IP-Adresse)
6. ✅ Systemd Services erstellen (Auto-Start)
7. ✅ Kiosk-Modus einrichten (Chromium Vollbild)
8. ✅ Firewall konfigurieren
9. ✅ Raspberry Pi Optimierungen
10. ✅ QR-Code für Smartphone-Zugriff generieren

### 3. Nach Installation neu starten

```bash
sudo reboot
```

Nach dem Neustart:
- ✅ Chromium startet automatisch im Kiosk-Modus
- ✅ Backend läuft als Systemdienst
- ✅ Frontend ist auf Port 5173 verfügbar
- ✅ Zugriff von Smartphone möglich

## 🌐 Zugriff

Nach erfolgreicher Installation:

### Lokal (am Raspberry Pi)
- **Kiosk**: Startet automatisch
- **Browser**: http://localhost:5173

### Netzwerk (von anderen Geräten)
- **Kiosk**: http://[PI-IP-ADRESSE]:5173/kiosk
- **Admin**: http://[PI-IP-ADRESSE]:5173/admin/login
- **API**: http://[PI-IP-ADRESSE]:8000/docs

Die IP-Adresse wird am Ende der Installation angezeigt.

### Smartphone
Scanne den QR-Code (wird bei Installation angezeigt) oder gib die URL manuell ein.

## 🔧 Manuelle Konfiguration

Falls das automatische Script Probleme macht, hier die manuellen Schritte:

### Backend einrichten

```bash
cd /opt/feuerwehr-app/backend
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
python main.py
```

### Frontend einrichten

```bash
cd /opt/feuerwehr-app/frontend

# IP-Adresse ermitteln
IP=$(hostname -I | awk '{print $1}')

# .env erstellen
echo "VITE_API_BASE_URL=http://${IP}:8000" > .env

# Build
npm install
npm run build

# Serve installieren und starten
npm install -g serve
serve -s dist -l 5173
```

### Chromium im Kiosk-Modus

```bash
# Autostart-Verzeichnis
mkdir -p ~/.config/autostart

# Start-Script erstellen
sudo nano /usr/local/bin/start-kiosk.sh
```

Inhalt:
```bash
#!/bin/bash
IP=$(hostname -I | awk '{print $1}')
unclutter -idle 0.1 &
xset s off
xset -dpms
xset s noblank
sleep 10
chromium-browser --kiosk --noerrdialogs --disable-infobars --app=http://${IP}:5173/kiosk
```

Ausführbar machen:
```bash
sudo chmod +x /usr/local/bin/start-kiosk.sh
```

Autostart Desktop Entry:
```bash
nano ~/.config/autostart/feuerwehr-kiosk.desktop
```

Inhalt:
```ini
[Desktop Entry]
Type=Application
Name=Feuerwehr Kiosk
Exec=/usr/local/bin/start-kiosk.sh
X-GNOME-Autostart-enabled=true
```

## 🛠️ Verwaltung

### Services steuern

```bash
# Status prüfen
sudo systemctl status feuerwehr-backend
sudo systemctl status feuerwehr-frontend

# Neu starten
sudo systemctl restart feuerwehr-backend
sudo systemctl restart feuerwehr-frontend

# Stoppen
sudo systemctl stop feuerwehr-backend
sudo systemctl stop feuerwehr-frontend

# Logs anzeigen
sudo journalctl -u feuerwehr-backend -f
sudo journalctl -u feuerwehr-frontend -f
```

### Kiosk-Modus neu starten

```bash
# Chromium beenden
pkill chromium

# Automatischer Neustart durch Script (wenn aktiviert)
# Oder manuell:
/usr/local/bin/start-kiosk.sh
```

### Anwendung aktualisieren

```bash
cd /opt/feuerwehr-app

# Backend stoppen
sudo systemctl stop feuerwehr-backend

# Updates holen
git pull
git checkout v1.0.0  # oder neuere Version

# Backend aktualisieren
cd backend
source venv/bin/activate
pip install -r requirements.txt
deactivate

# Frontend neu bauen
cd ../frontend
npm install
npm run build

# Services neu starten
sudo systemctl start feuerwehr-backend
sudo systemctl restart feuerwehr-frontend
```

## 📱 Touchscreen-Konfiguration

### Offizielle Raspberry Pi Touchscreens

Werden automatisch erkannt und funktionieren out-of-the-box.

### HDMI-Touchscreens

1. Treiber installieren (herstellerspezifisch)
2. Kalibrierung durchführen:

```bash
sudo apt-get install xinput-calibrator
xinput_calibrator
```

3. Bildschirmausrichtung anpassen:

```bash
sudo nano /boot/config.txt

# Rotation hinzufügen (0, 90, 180, 270 Grad)
display_rotate=0
```

### Touch-Optimierungen in Chromium

Das Installations-Script setzt bereits optimale Flags:
- `--disable-pinch` - Pinch-Zoom deaktiviert
- `--overscroll-history-navigation=0` - Wischgesten aus
- `--kiosk` - Vollbildmodus ohne UI

## 🔒 Sicherheit

### Firewall

```bash
# UFW installieren
sudo apt-get install ufw

# Standard-Regeln
sudo ufw default deny incoming
sudo ufw default allow outgoing

# Ports freigeben
sudo ufw allow ssh
sudo ufw allow 8000/tcp comment "Feuerwehr Backend"
sudo ufw allow 5173/tcp comment "Feuerwehr Frontend"

# Aktivieren
sudo ufw enable
```

### SSH absichern

```bash
sudo nano /etc/ssh/sshd_config

# Änderungen:
PermitRootLogin no
PasswordAuthentication no  # Nur mit SSH-Key
Port 2222  # Standard-Port ändern

sudo systemctl restart ssh
```

### Standard-Passwort ändern

```bash
passwd
```

## ⚡ Performance-Optimierungen

### GPU Memory erhöhen

```bash
sudo nano /boot/config.txt

# Hinzufügen:
gpu_mem=256
```

### Swap vergrößern (für Pi mit wenig RAM)

```bash
sudo nano /etc/dphys-swapfile

# Ändern:
CONF_SWAPSIZE=2048

sudo systemctl restart dphys-swapfile
```

### Unnötige Services deaktivieren

```bash
# Bluetooth deaktivieren (wenn nicht benötigt)
sudo systemctl disable bluetooth

# Automatische Updates ausschalten
sudo systemctl disable apt-daily.service
sudo systemctl disable apt-daily.timer
```

## 🐛 Troubleshooting

### Backend startet nicht

```bash
# Logs prüfen
sudo journalctl -u feuerwehr-backend -n 50

# Manuell starten für mehr Details
cd /opt/feuerwehr-app/backend
source venv/bin/activate
python main.py
```

### Frontend zeigt "Cannot connect to Backend"

```bash
# Backend-Status prüfen
sudo systemctl status feuerwehr-backend

# IP-Adresse in .env prüfen
cat /opt/feuerwehr-app/frontend/.env

# Firewall prüfen
sudo ufw status
```

### Chromium startet nicht im Kiosk-Modus

```bash
# X-Server läuft?
echo $DISPLAY

# Script manuell testen
/usr/local/bin/start-kiosk.sh

# Autostart-Entry prüfen
cat ~/.config/autostart/feuerwehr-kiosk.desktop
```

### Touchscreen reagiert nicht

```bash
# Input-Devices anzeigen
xinput list

# Kalibrierung
xinput_calibrator
```

### Netzwerk-Probleme

```bash
# IP-Adresse prüfen
hostname -I

# Netzwerk neu starten
sudo systemctl restart networking

# WLAN-Verbindung prüfen
iwconfig
```

## 📊 Monitoring

### System-Ressourcen überwachen

```bash
# CPU/RAM
htop

# Temperatur
vcgencmd measure_temp

# Disk Space
df -h
```

### Log-Monitoring

```bash
# Alle Logs
sudo journalctl -f

# Nur Backend
sudo journalctl -u feuerwehr-backend -f

# Nur Frontend
sudo journalctl -u feuerwehr-frontend -f
```

## 🔄 Backup

### Automatisches Backup einrichten

```bash
# Backup-Script erstellen
sudo nano /usr/local/bin/backup-feuerwehr.sh
```

Inhalt:
```bash
#!/bin/bash
BACKUP_DIR="/home/pi/backups"
DATE=$(date +%Y%m%d_%H%M%S)
mkdir -p $BACKUP_DIR
cp /opt/feuerwehr-app/backend/fire_station.db $BACKUP_DIR/backup_$DATE.db
# Alte Backups löschen (älter als 30 Tage)
find $BACKUP_DIR -name "backup_*.db" -mtime +30 -delete
```

Cron-Job:
```bash
sudo crontab -e

# Täglich um 2 Uhr
0 2 * * * /usr/local/bin/backup-feuerwehr.sh
```

## 📦 Empfohlene Hardware

### Raspberry Pi Setup

- **Pi 4 (4GB RAM)** - Beste Performance
- **Pi 4 (2GB RAM)** - Gut für Kiosk
- **Pi 3B+** - Minimal, aber funktioniert

### Touchscreen

- **Raspberry Pi 7" Touchscreen** - Plug & Play
- **HDMI Touchscreens** - 10-15" für bessere Lesbarkeit
- **Tablets** als Alternative (über Browser)

### Zubehör

- Offizielles Raspberry Pi Netzteil (5V 3A für Pi 4)
- Gehäuse mit Belüftung
- SD-Karte Class 10 (mindestens 16GB)
- Ethernet-Kabel für stabile Verbindung

## 💡 Tipps

1. **Ethernet statt WLAN**: Stabilere Verbindung
2. **Statische IP**: Erleichtert Zugriff von anderen Geräten
3. **USV verwenden**: Schützt vor Datenverlust bei Stromausfall
4. **Regelmäßige Backups**: Siehe Backup-Sektion
5. **Updates planen**: Nicht während aktivem Dienst

## 🆘 Support

Bei Problemen:
1. Logs prüfen: `sudo journalctl -u feuerwehr-backend -n 100`
2. GitHub Issues: https://github.com/Elemirus1996/fire-station-app/issues
3. README.md für allgemeine Hilfe

---

**Version:** 1.0.0  
**Getestet mit:** Raspberry Pi 4 (4GB), Raspberry Pi OS (64-bit), Bullseye
