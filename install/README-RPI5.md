# 🥧 Raspberry Pi 5 - Installation & Optimierung

## Speziell optimiert für Raspberry Pi 5

Der Raspberry Pi 5 bietet deutlich mehr Leistung als seine Vorgänger. Diese Anleitung nutzt diese Vorteile optimal aus.

## 📋 Hardware-Voraussetzungen

### Empfohlene Konfiguration:
- **Raspberry Pi 5** (4GB oder 8GB RAM empfohlen)
- **64-bit Raspberry Pi OS** (Bookworm oder neuer)
- **32GB+ microSD-Karte** (Class 10, A2 empfohlen) oder SSD via USB 3.0
- **Offizielles 27W USB-C Netzteil** (wichtig für Stabilität!)
- **Touchscreen** (7" oder 10" offizieller Pi-Touchscreen oder HDMI-Monitor)
- **Aktive Kühlung** (empfohlen für Dauerbetrieb)

### Optional aber empfohlen:
- **USB-SSD** statt microSD für bessere Performance
- **PoE+ HAT** für Netzwerk-Stromversorgung
- **Gehäuse mit Lüfter** für optimale Kühlung

## 🚀 Schnellinstallation (5 Minuten)

### 1. Raspberry Pi OS installieren

**Mit Raspberry Pi Imager:**
```bash
# Download: https://www.raspberrypi.com/software/
# Wähle: Raspberry Pi OS (64-bit) - Desktop Version
# Konfiguriere vor dem Schreiben:
# - Hostname: feuerwehr-kiosk
# - SSH aktivieren
# - WLAN konfigurieren (falls gewünscht)
# - Benutzer: pi / dein-passwort
```

### 2. Ersten Boot und Update

```bash
# Nach erstem Boot: System aktualisieren
sudo apt update
sudo apt upgrade -y
```

### 3. Installation ausführen

```bash
# Installer herunterladen
wget https://raw.githubusercontent.com/Elemirus1996/fire-station-app/main/install/install-rpi5.sh

# Ausführbar machen
chmod +x install-rpi5.sh

# Als root ausführen
sudo bash install-rpi5.sh
```

**Das war's! Die Installation dauert ca. 5-10 Minuten.**

### 4. Neustart

```bash
sudo reboot
```

Nach dem Neustart startet der Kiosk-Modus automatisch!

## ✨ Was macht das Installations-Script?

1. ✅ **System-Update** - Alle Pakete auf neuesten Stand
2. ✅ **Dependencies** - Python 3.11+, Node.js 18+, Chromium
3. ✅ **Backend-Setup** - FastAPI, SQLite, Virtual Environment
4. ✅ **Frontend-Build** - React App mit korrekter IP-Adresse
5. ✅ **Systemd Services** - Auto-Start beim Booten
6. ✅ **Kiosk-Modus** - Chromium Vollbild ohne Menüs
7. ✅ **Pi 5 Optimierungen** - GPU Memory, Swap, Performance-Tweaks
8. ✅ **Sicherheit** - Generierter Secret Key, CORS-Config

## 🎯 Raspberry Pi 5 Optimierungen

### Automatisch angewendet:

**GPU Memory:**
```bash
gpu_mem=256  # Pi 5 hat genug RAM für mehr GPU-Speicher
```

**Swap:**
```bash
CONF_SWAPSIZE=2048  # Erhöht von 100MB auf 2GB
```

**Services:**
- Backend läuft auf Port 8000
- Frontend läuft auf Port 5173
- Beide starten automatisch beim Boot

### Manuelle Performance-Optimierungen (Optional):

#### USB 3.0 Boot (SSD statt microSD):
```bash
# Falls noch nicht gemacht - DEUTLICH schneller!
# 1. SSD an USB 3.0 anschließen
# 2. Raspberry Pi OS mit Imager direkt auf SSD schreiben
# 3. Von SSD booten (Pi 5 unterstützt das nativ)
```

#### Übertakten (nur mit guter Kühlung!):
```bash
sudo nano /boot/firmware/config.txt

# Hinzufügen:
over_voltage=6
arm_freq=2600
gpu_freq=900
```

## 📱 Zugriff auf die Anwendung

Nach erfolgreicher Installation:

### Vom Raspberry Pi selbst:
```
http://localhost:5173
```

### Vom Netzwerk (Smartphone, Tablet, PC):
```
http://[PI-IP-ADRESSE]:5173
```

### Admin-Bereich:
```
http://[PI-IP-ADRESSE]:5173/admin/login
Benutzer: admin
Passwort: feuerwehr2025
```

**⚠️ WICHTIG:** Ändere das Passwort sofort nach dem ersten Login!

## 🔧 Verwaltung

### Services starten/stoppen:

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

# Deaktivieren (kein Auto-Start)
sudo systemctl disable feuerwehr-backend
sudo systemctl disable feuerwehr-frontend
```

### Logs anzeigen:

```bash
# Backend-Logs (live)
sudo journalctl -u feuerwehr-backend -f

# Frontend-Logs (live)
sudo journalctl -u feuerwehr-frontend -f

# Letzte 100 Zeilen
sudo journalctl -u feuerwehr-backend -n 100
```

### Kiosk-Modus steuern:

```bash
# Manuell starten (zum Testen)
/home/pi/start-kiosk.sh

# Autostart deaktivieren
rm /home/pi/.config/autostart/kiosk.desktop

# Autostart aktivieren
# Führe install-rpi5.sh erneut aus
```

### Anwendung aktualisieren:

```bash
cd /opt/feuerwehr-app
git pull

# Backend aktualisieren
cd backend
source venv/bin/activate
pip install -r requirements.txt
sudo systemctl restart feuerwehr-backend

# Frontend neu bauen
cd ../frontend
npm install
npm run build
sudo systemctl restart feuerwehr-frontend
```

## 🖥️ Kiosk-Modus konfigurieren

### Chromium-Optionen anpassen:

```bash
sudo nano /home/pi/start-kiosk.sh
```

**Nützliche Optionen:**
```bash
--kiosk                          # Vollbild ohne UI
--no-first-run                   # Keine Willkommens-Seite
--disable-infobars              # Keine Info-Leisten
--disable-session-crashed-bubble # Keine Crash-Meldungen
--incognito                      # Privater Modus (optional)
--disable-pinch                  # Zoom deaktivieren (Touchscreen)
```

### Bildschirmschoner in der App nutzen:

Die App hat einen eingebauten Screensaver. Konfiguriere ihn im Admin-Bereich:
- **Einstellungen** → **System** → **Screensaver**
- Timeout einstellen (z.B. 300 Sekunden = 5 Minuten)
- Logo und Uhr aktivieren/deaktivieren

## 🔒 Sicherheit

### Firewall einrichten (Optional):

```bash
sudo apt install ufw

# Nur benötigte Ports öffnen
sudo ufw allow ssh
sudo ufw allow 8000/tcp
sudo ufw allow 5173/tcp
sudo ufw enable
```

### HTTPS mit Let's Encrypt (Fortgeschritten):

```bash
# Nginx als Reverse Proxy
sudo apt install nginx certbot python3-certbot-nginx

# Nginx konfigurieren
sudo nano /etc/nginx/sites-available/feuerwehr

# SSL-Zertifikat holen
sudo certbot --nginx -d deine-domain.de
```

### Admin-Passwort ändern:

```bash
cd /opt/feuerwehr-app/backend
source venv/bin/activate
python reset_admin.py
```

## 📊 Performance-Monitoring

### Ressourcen überwachen:

```bash
# CPU-Temperatur
vcgencmd measure_temp

# Speicher
free -h

# Disk
df -h

# System-Auslastung (live)
htop

# Netzwerk-Traffic
sudo iftop
```

### Performance-Tipps:

1. **SSD verwenden** statt microSD (5-10x schneller!)
2. **Aktive Kühlung** - hält CPU bei < 60°C
3. **Ethernet** statt WLAN für Kiosk-Betrieb
4. **Regelmäßige Updates** - `sudo apt update && sudo apt upgrade`
5. **Logs rotieren** - automatisch nach 7 Tagen

## 🐛 Troubleshooting

### Backend startet nicht:

```bash
# Logs prüfen
sudo journalctl -u feuerwehr-backend -n 50

# Manuell starten zum Debuggen
cd /opt/feuerwehr-app/backend
source venv/bin/activate
python main.py
```

### Frontend zeigt Fehler:

```bash
# API-Verbindung prüfen
curl http://localhost:8000/api/health

# Frontend neu bauen
cd /opt/feuerwehr-app/frontend
npm run build
sudo systemctl restart feuerwehr-frontend
```

### Touchscreen funktioniert nicht:

```bash
# Touchscreen kalibrieren
xinput-calibrator

# Rotation einstellen (falls nötig)
xrandr --output HDMI-1 --rotate left
```

### Chromium startet nicht:

```bash
# Kiosk-Script manuell testen
/home/pi/start-kiosk.sh

# X11-Display prüfen
echo $DISPLAY  # Sollte :0 oder :0.0 sein
```

### Datenbank zurücksetzen:

```bash
cd /opt/feuerwehr-app/backend
source venv/bin/activate
python recreate_db.py
sudo systemctl restart feuerwehr-backend
```

## 🔄 Backup & Restore

### Automatisches Backup aktivieren:

Im Admin-Bereich:
1. **Einstellungen** → **Backup**
2. Automatische Backups aktivieren
3. Zeitplan festlegen (z.B. täglich um 2:00 Uhr)
4. Aufbewahrungsdauer: 30 Tage

### Manuelles Backup:

```bash
# Komplettes System-Backup auf USB-Stick
sudo dd if=/dev/mmcblk0 of=/mnt/usb/backup.img bs=4M status=progress

# Nur Datenbank
cp /opt/feuerwehr-app/backend/fire_station.db ~/backup_$(date +%Y%m%d).db
```

### Restore:

```bash
# Datenbank wiederherstellen
cp ~/backup_20241207.db /opt/feuerwehr-app/backend/fire_station.db
sudo systemctl restart feuerwehr-backend
```

## 📈 Produktiv-Betrieb

### Empfohlene Einstellungen:

1. **Feste IP-Adresse** im Router vergeben
2. **Hostname** im Netzwerk: `feuerwehr-kiosk.local`
3. **Automatische Updates** deaktivieren (außer Sicherheitsupdates)
4. **Bildschirm** auf "niemals ausschalten" stellen
5. **USV** (Unterbrechungsfreie Stromversorgung) verwenden

### Wartungsplan:

- **Wöchentlich:** Logs prüfen, Backups kontrollieren
- **Monatlich:** Updates einspielen (außerhalb der Dienstzeiten)
- **Quartalsweise:** SD-Karte/SSD Health Check
- **Jährlich:** Datenbank optimieren, alte Daten archivieren

## 🎉 Fertig!

Dein Raspberry Pi 5 ist jetzt ein vollwertiger Feuerwehr-Kiosk!

**Viel Erfolg beim Einsatz! 🚒**

---

Bei Fragen: Siehe Hauptdokumentation in `INSTALLATION.md` oder `README.md`
