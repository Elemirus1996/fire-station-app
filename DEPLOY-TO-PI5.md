# 🍓 Raspberry Pi 5 Installation & Test

## Voraussetzungen

✅ **Raspberry Pi 5** mit mindestens 4GB RAM  
✅ **64-bit Raspberry Pi OS** (empfohlen: Raspberry Pi OS Lite oder Desktop)  
✅ **Netzwerkverbindung** (Ethernet oder WLAN)  
✅ **SSH-Zugriff** aktiviert  
✅ **Mindestens 16GB SD-Karte** (32GB empfohlen)

---

## 🚀 Schnellinstallation (Empfohlen)

### Schritt 1: Verbindung zum Pi herstellen

```bash
# Von deinem Windows-PC aus:
ssh pi@<PI-IP-ADRESSE>
# Standard-Passwort: raspberry (bitte danach ändern!)
```

### Schritt 2: Repository klonen

```bash
cd ~
git clone https://github.com/Elemirus1996/fire-station-app.git
cd fire-station-app
```

### Schritt 3: Installer ausführbar machen

```bash
chmod +x install/install-rpi5.sh
```

### Schritt 4: Installation starten

```bash
sudo ./install/install-rpi5.sh
```

**Der Installer macht automatisch:**
- ✅ System-Updates installieren
- ✅ Python 3.11 installieren
- ✅ Node.js 20 LTS installieren
- ✅ PostgreSQL 15 einrichten
- ✅ Backend-Dependencies installieren
- ✅ Frontend bauen
- ✅ Systemd-Services erstellen
- ✅ Kiosk-Modus konfigurieren (bei Pi OS Desktop)
- ✅ Raspberry Pi 5 Optimierungen (GPU Memory, Swap)

**⏱️ Installationsdauer:** Ca. 20-30 Minuten (je nach Internetverbindung)

### Schritt 5: Nach der Installation

```bash
# Services starten
sudo systemctl start fire-station-backend
sudo systemctl start fire-station-frontend

# Status prüfen
sudo systemctl status fire-station-backend
sudo systemctl status fire-station-frontend

# Logs ansehen
sudo journalctl -u fire-station-backend -f
sudo journalctl -u fire-station-frontend -f
```

---

## 🧪 Testing

### Test 1: Backend API testen

```bash
# Auf dem Pi:
curl http://localhost:8000/api/health
# Erwartete Antwort: {"status":"healthy"}

curl http://localhost:8000/docs
# Sollte die FastAPI Swagger-Dokumentation anzeigen
```

### Test 2: Frontend testen

```bash
# Auf dem Pi:
curl http://localhost:5173
# Sollte HTML zurückgeben

# Von deinem Windows-PC:
# Öffne Browser: http://<PI-IP-ADRESSE>:5173
```

### Test 3: Admin-Login testen

1. Öffne im Browser: `http://<PI-IP-ADRESSE>:5173`
2. Navigiere zu Admin-Login
3. Standard-Credentials:
   - **Username:** `admin`
   - **Password:** `admin123`
4. Nach Login solltest du das Admin-Dashboard sehen

### Test 4: Check-In Kiosk testen

1. Öffne im Browser: `http://<PI-IP-ADRESSE>:5173`
2. Hauptseite sollte Check-In Kiosk anzeigen
3. Teste QR-Code Scan oder PIN-Eingabe

### Test 5: Datenbank-Verbindung prüfen

```bash
# Auf dem Pi:
cd ~/fire-station-app/backend
source venv/bin/activate
python check_db.py

# Sollte alle Tabellen und deren Einträge anzeigen
```

---

## 🔧 Manuelle Konfiguration

### Backend .env anpassen

```bash
nano ~/fire-station-app/backend/.env
```

Wichtige Einstellungen:
```env
# Datenbank
DATABASE_URL=postgresql://firestation:firestation@localhost/firestation

# Sicherheit (ÄNDERN IN PRODUKTION!)
SECRET_KEY=dein-super-sicherer-secret-key-hier

# CORS (Pi IP-Adresse eintragen)
CORS_ORIGINS=http://localhost:5173,http://192.168.1.100:5173

# Server
HOST=0.0.0.0
PORT=8000
```

### Frontend .env anpassen

```bash
nano ~/fire-station-app/frontend/.env
```

```env
# API URL (Pi IP-Adresse eintragen)
VITE_API_BASE_URL=http://192.168.1.100:8000/api
```

### Services neu starten nach Änderungen

```bash
sudo systemctl restart fire-station-backend
sudo systemctl restart fire-station-frontend
```

---

## 🖥️ Kiosk-Modus (Vollbild Check-In)

### Automatischer Start bei Boot

Der Installer konfiguriert automatisch:
- Chromium startet im Kiosk-Modus
- Bildschirmschoner deaktiviert
- Mauszeiger ausgeblendet
- Vollbild ohne Menüleiste

### Kiosk-Modus manuell testen

```bash
# Auf Pi mit Desktop-Umgebung:
chromium-browser --kiosk --app=http://localhost:5173
```

### Kiosk-Modus Konfiguration

```bash
# Autostart-Datei bearbeiten:
nano ~/.config/lxsession/LXDE-pi/autostart

# Sollte enthalten:
@chromium-browser --kiosk --app=http://localhost:5173 --noerrdialogs --disable-infobars --disable-session-crashed-bubble
```

---

## 📊 Performance-Optimierungen (Pi 5)

### GPU Memory erhöhen

```bash
sudo nano /boot/firmware/config.txt

# Ändern oder hinzufügen:
gpu_mem=256
```

### Swap erhöhen

```bash
sudo nano /etc/dphys-swapfile

# Ändern:
CONF_SWAPSIZE=2048
```

```bash
sudo systemctl restart dphys-swapfile
```

### Overclock (optional, auf eigene Gefahr!)

```bash
sudo nano /boot/firmware/config.txt

# Hinzufügen:
arm_freq=2400
over_voltage=2
```

---

## 🔍 Troubleshooting

### Problem: Backend startet nicht

```bash
# Logs prüfen:
sudo journalctl -u fire-station-backend -n 50

# Häufige Ursachen:
# 1. Datenbank nicht erreichbar
sudo systemctl status postgresql
sudo -u postgres psql -c "\l"

# 2. Port 8000 bereits belegt
sudo netstat -tlnp | grep 8000

# 3. Fehlende Dependencies
cd ~/fire-station-app/backend
source venv/bin/activate
pip install -r requirements.txt
```

### Problem: Frontend startet nicht

```bash
# Logs prüfen:
sudo journalctl -u fire-station-frontend -n 50

# Häufige Ursachen:
# 1. Build nicht vollständig
cd ~/fire-station-app/frontend
npm install
npm run build

# 2. Port 5173 bereits belegt
sudo netstat -tlnp | grep 5173

# 3. Node.js Version falsch
node --version  # Sollte v20.x sein
```

### Problem: Datenbank-Verbindungsfehler

```bash
# PostgreSQL Status
sudo systemctl status postgresql

# Datenbank neu erstellen
cd ~/fire-station-app/backend
source venv/bin/activate
python recreate_db.py

# Admin zurücksetzen
python reset_admin.py
```

### Problem: CORS-Fehler im Browser

```bash
# Backend .env prüfen:
nano ~/fire-station-app/backend/.env

# CORS_ORIGINS muss die Frontend-URL enthalten:
CORS_ORIGINS=http://localhost:5173,http://192.168.1.100:5173

# Backend neu starten:
sudo systemctl restart fire-station-backend
```

### Problem: Kiosk-Modus startet nicht

```bash
# Chromium installiert?
which chromium-browser

# Autostart-Datei prüfen:
cat ~/.config/lxsession/LXDE-pi/autostart

# X-Server läuft?
echo $DISPLAY  # Sollte :0 oder ähnlich sein

# Manuell testen:
DISPLAY=:0 chromium-browser --kiosk http://localhost:5173
```

---

## 📱 Remote-Zugriff einrichten

### Von Windows-PC zugreifen

1. **Pi IP-Adresse finden:**
   ```bash
   # Auf dem Pi:
   hostname -I
   # Oder im Router nachsehen
   ```

2. **Frontend .env anpassen:**
   ```bash
   nano ~/fire-station-app/frontend/.env
   
   # Pi IP eintragen:
   VITE_API_BASE_URL=http://192.168.1.100:8000/api
   ```

3. **Backend CORS anpassen:**
   ```bash
   nano ~/fire-station-app/backend/.env
   
   # Alle erlaubten Origins:
   CORS_ORIGINS=http://localhost:5173,http://192.168.1.100:5173,http://192.168.1.50:5173
   ```

4. **Services neu starten:**
   ```bash
   sudo systemctl restart fire-station-backend
   sudo systemctl restart fire-station-frontend
   ```

5. **Von Windows aus testen:**
   - Browser öffnen: `http://192.168.1.100:5173`

### Statische IP einrichten (empfohlen)

```bash
# Netzwerk-Konfiguration:
sudo nano /etc/dhcpcd.conf

# Am Ende hinzufügen (IP anpassen!):
interface eth0
static ip_address=192.168.1.100/24
static routers=192.168.1.1
static domain_name_servers=192.168.1.1 8.8.8.8

# Neu starten:
sudo systemctl restart dhcpcd
```

---

## 🔒 Sicherheit

### Standard-Passwort ändern

```bash
# Pi Benutzer-Passwort ändern:
passwd

# Root-Passwort setzen:
sudo passwd root
```

### Admin-Account ändern

```bash
cd ~/fire-station-app/backend
source venv/bin/activate
python reset_admin.py

# Neues Passwort eingeben!
```

### SSH absichern

```bash
sudo nano /etc/ssh/sshd_config

# Ändern:
PermitRootLogin no
PasswordAuthentication yes  # Oder 'no' wenn SSH-Keys verwendet werden

sudo systemctl restart ssh
```

### Firewall einrichten

```bash
sudo apt install ufw -y

# Ports erlauben:
sudo ufw allow 22/tcp     # SSH
sudo ufw allow 8000/tcp   # Backend
sudo ufw allow 5173/tcp   # Frontend

# Firewall aktivieren:
sudo ufw enable
```

---

## 📋 Checkliste nach Installation

- [ ] Backend läuft: `sudo systemctl status fire-station-backend`
- [ ] Frontend läuft: `sudo systemctl status fire-station-frontend`
- [ ] Datenbank erreichbar: `python check_db.py`
- [ ] API antwortet: `curl http://localhost:8000/api/health`
- [ ] Frontend im Browser: `http://<PI-IP>:5173`
- [ ] Admin-Login funktioniert
- [ ] Check-In Kiosk funktioniert
- [ ] Services starten bei Boot: `sudo systemctl is-enabled fire-station-backend fire-station-frontend`
- [ ] Admin-Passwort geändert
- [ ] Pi Benutzer-Passwort geändert
- [ ] CORS konfiguriert für Remote-Zugriff
- [ ] Statische IP eingerichtet (optional)
- [ ] Backup-Strategie geplant

---

## 🎯 Nächste Schritte

### 1. Produktion vorbereiten

- SECRET_KEY in `.env` durch zufälligen Wert ersetzen
- Admin-Passwort ändern
- Statische IP einrichten
- Backup-System konfigurieren

### 2. QR-Code Hardware

- USB-Barcode-Scanner anschließen
- Als Tastatur-Eingabe konfigurieren
- QR-Codes für Personal generieren

### 3. Display einrichten

- Touchscreen anschließen
- Kiosk-Modus auf Vollbild optimieren
- Bildschirmschoner deaktivieren

### 4. Testing mit echtem Personal

- Test-Accounts anlegen
- QR-Codes drucken und verteilen
- Check-In/Check-Out Tests durchführen
- Statistiken prüfen

---

## 📞 Support

**Probleme bei der Installation?**

1. **Logs prüfen:**
   ```bash
   sudo journalctl -u fire-station-backend -n 100
   sudo journalctl -u fire-station-frontend -n 100
   ```

2. **System-Check:**
   ```bash
   cd ~/fire-station-app
   python backend/check_db.py
   python backend/test_db.py
   ```

3. **Neuinstallation:**
   ```bash
   cd ~/fire-station-app
   sudo ./install/install-rpi5.sh --force
   ```

**Weitere Dokumentation:**
- `install/README-RPI5.md` - Detaillierte Pi 5 Optimierungen
- `install/QUICKSTART-RPI5.md` - Schnellstart-Anleitung
- `install/CHECKLISTE-RPI5.md` - Deployment-Checkliste
- `INSTALLATION.md` - Master Installation Guide

---

## 🎉 Viel Erfolg!

Nach erfolgreicher Installation hast du:
- ✅ Vollständiges Check-In/Check-Out System
- ✅ Admin-Dashboard für Verwaltung
- ✅ Kiosk-Modus für Terminal
- ✅ QR-Code Integration
- ✅ Statistiken und Berichte
- ✅ Backup-System
- ✅ Optimiert für Raspberry Pi 5

**Happy Coding! 🚒**
