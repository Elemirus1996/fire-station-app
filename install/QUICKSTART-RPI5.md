# 🥧 Raspberry Pi 5 - Quick Setup Guide

## Hardware-Checkliste

✅ **Raspberry Pi 5** (4GB oder 8GB RAM)  
✅ **32GB+ microSD** (Class 10, A2) oder besser: **USB-SSD**  
✅ **27W USB-C Netzteil** (offiziell empfohlen)  
✅ **Touchscreen/Monitor** (7" oder 10")  
✅ **Aktive Kühlung** (für 24/7 Betrieb)  
✅ **Ethernet-Kabel** (stabiler als WLAN)  

## 5-Minuten Installation

### 1. OS installieren
```bash
# Mit Raspberry Pi Imager:
# - OS: Raspberry Pi OS (64-bit) Desktop
# - Hostname: feuerwehr-kiosk
# - SSH aktivieren
# - Benutzer: pi
```

### 2. Erste Updates
```bash
sudo apt update && sudo apt upgrade -y
```

### 3. Installation starten
```bash
wget https://raw.githubusercontent.com/Elemirus1996/fire-station-app/main/install/install-rpi5.sh
sudo bash install-rpi5.sh
```

### 4. Neustart
```bash
sudo reboot
```

**Fertig!** Kiosk startet automatisch.

## Zugriff

**Vom Raspberry Pi:**  
http://localhost:5173

**Vom Netzwerk:**  
http://[PI-IP]:5173

**Admin-Login:**  
Benutzer: `admin`  
Passwort: `feuerwehr2025`  
⚠️ Sofort ändern!

## Wichtige Befehle

```bash
# Services prüfen
sudo systemctl status feuerwehr-backend
sudo systemctl status feuerwehr-frontend

# Logs anzeigen
sudo journalctl -u feuerwehr-backend -f
sudo journalctl -u feuerwehr-frontend -f

# Services neu starten
sudo systemctl restart feuerwehr-backend
sudo systemctl restart feuerwehr-frontend

# Kiosk manuell starten
/home/pi/start-kiosk.sh
```

## Performance-Tipps

1. **SSD statt microSD** → 5-10x schneller
2. **Aktive Kühlung** → CPU < 60°C
3. **Ethernet** → Stabile Verbindung
4. **Feste IP** → Im Router vergeben
5. **USV** → Unterbrechungsfreie Stromversorgung

## Troubleshooting

**Backend läuft nicht:**
```bash
sudo journalctl -u feuerwehr-backend -n 50
```

**Frontend zeigt Fehler:**
```bash
curl http://localhost:8000/api/health
```

**Datenbank zurücksetzen:**
```bash
cd /opt/feuerwehr-app/backend
source venv/bin/activate
python recreate_db.py
```

## Wartung

**Wöchentlich:**
- Logs prüfen
- Backups kontrollieren

**Monatlich:**
- Updates: `sudo apt update && sudo apt upgrade`
- Dienste neu starten

**Jährlich:**
- Datenbank optimieren
- Alte Daten archivieren

---

📖 **Ausführliche Anleitung:** `README-RPI5.md`
