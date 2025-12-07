# 🚒 Feuerwehr Anwesenheitssystem

Produktionsreife digitale Anwesenheitserfassungs-Anwendung für Feuerwachen mit Touchscreen-Interface, QR-Code Check-in, automatischem Session-Management, Statistiken und umfassenden Verwaltungsfunktionen.

## ✨ Neue Features in V1.0

### 📊 Umfassende Statistiken
- **Einzelperson-Jahresbericht**: Detaillierte Statistiken für jedes Mitglied
  - Gesamtteilnahmen und Stunden
  - Anwesenheitsquote nach Session-Typ (z.B. 8/12 Einsätze = 66.7%)
  - Monatliche Aufschlüsselung mit Balkendiagrammen
  - PDF-Export mit einem Klick
- **Gesamtbericht Einheit**: Jahresübersicht für die komplette Wache
  - Top 10 aktivste Mitglieder mit Ranking
  - Teilnahme nach Dienstgrad
  - Monatliche Session-Übersicht
  - PDF-Export

### 🖥️ Screensaver mit News-Ticker
- Automatische Aktivierung nach konfigurierbarer Inaktivität (Standard: 30 Sek)
- Anzeige von Feuerwehr-Logo, Uhrzeit und Datum
- Prominent platzierter News-Ticker für wichtige Mitteilungen
- Animierte Hintergrund-Icons

### 📰 News & Updates System
- Verwaltung wichtiger Mitteilungen im Admin-Bereich
- Prioritätsstufen: Dringend, Hoch, Normal, Niedrig
- Automatische Rotation im Screensaver und Kiosk
- Aktiv/Inaktiv-Steuerung

### 📊 Live-Dashboard
- Echtzeit-Übersicht aller aktiven Sessions
- Auto-Refresh alle 5 Sekunden
- Schneller Zugriff auf Session-Details

### 🔢 Touch-Nummernpad
- Kein Tastatur mehr nötig für "Einsatz beenden"
- Große, gut bedienbare Touch-Buttons
- Perfekt für Tablet/Touchscreen-Kiosk

## 🎯 Hauptfunktionen

### Touchscreen Check-in/Check-out Interface
- Numerisches Keypad für Stammrollennummer-Eingabe
- Touch-optimierte Buttons (60x60px minimum)
- Anzeige aktuell anwesender Personen in Echtzeit
- Check-out durch erneute Eingabe der Stammrollennummer
- Event-Typ Auswahl: Einsatz, Übungsdienst, Arbeitsdienst (A/B/C)
- QR-Code für mobilen Zugriff

### Automatisches Session-Management
- Übungsdienst/Arbeitsdienst: Automatisches Ende nach 3 Stunden
- Einsatz: Nur manuell durch berechtiges Personal beendbar
- Background-Scheduler prüft alle 60 Sekunden
- Session-Dauer wird automatisch berechnet

### Dienstgrade-Hierarchie
Korrekte deutsche Feuerwehr-Dienstgrade:
- FM (Feuerwehrmann) - Level 1
- OFM (Oberfeuerwehrmann) - Level 2
- HFM (Hauptfeuerwehrmann) - Level 3
- UBM (Unterbrandmeister) - Level 4 ⭐ *Mindestrang für Einsatz-Beendigung*
- BM (Brandmeister) - Level 5
- OBM (Oberbrandmeister) - Level 6
- HBM (Hauptbrandmeister) - Level 7
- BI (Brandinspektor) - Level 8

## 🔐 Standard-Zugangsdaten

**Admin-Login:**
- Benutzername: `admin`
- Passwort: `feuerwehr2025`

**WICHTIG:** Ändern Sie das Passwort nach der ersten Anmeldung!

## 🚀 Schnellstart

### Voraussetzungen
- Python 3.11+
- Node.js 18+
- Git

### Option 1: Raspberry Pi (Empfohlen für Kiosk)

Automatische Installation mit einem Befehl:

```bash
wget https://raw.githubusercontent.com/Elemirus1996/fire-station-app/main/install/install-rpi.sh
chmod +x install-rpi.sh
sudo ./install-rpi.sh
```

Das Script installiert automatisch:
- ✅ Alle Dependencies (Python, Node.js, Chromium)
- ✅ Backend als Systemdienst mit Auto-Start
- ✅ Frontend mit korrekter IP-Adresse
- ✅ Kiosk-Modus mit Chromium Vollbild
- ✅ Smartphone-Zugriff über Netzwerk

**Siehe:** [Raspberry Pi Installation Guide](./install/README-RASPBERRY-PI.md)

### Option 2: Manuelle Installation

### Backend starten
```bash
cd backend
python -m venv venv
# Windows:
venv\Scripts\activate
# Linux/Mac:
source venv/bin/activate

pip install -r requirements.txt
python main.py
```

Backend läuft auf: http://localhost:8000

### Frontend starten
```bash
cd frontend
npm install
npm run dev
```

Frontend läuft auf: http://localhost:5173

## 🐳 Docker-Installation (Empfohlen)

```bash
# Projekt klonen
git clone https://github.com/Elemirus1996/fire-station-app.git
cd fire-station-app

# Mit Docker Compose starten
docker-compose up -d

# Logs anzeigen
docker-compose logs -f
```

Die Anwendung ist verfügbar auf:
- Frontend: http://localhost:5173
- Backend API: http://localhost:8000
- API-Dokumentation: http://localhost:8000/docs

## 📱 Zugriff

### Kiosk-Modus (Check-In/Out)
- Direkt: http://localhost:5173/kiosk
- Ideal für Tablets/Touchscreens

### Admin-Bereich
- Login: http://localhost:5173/admin/login
- Dashboard mit allen Verwaltungsfunktionen

## 📊 Admin-Funktionen

### Session-Verwaltung
- Übersicht aller Sessions (aktiv & beendet)
- Detailansicht mit allen Teilnehmern
- Manuelle Check-ins/Check-outs
- Session-Historie mit Filterung

### Personal-Verwaltung
- Mitglieder hinzufügen/bearbeiten/deaktivieren
- Stammrollennummer, Name, Dienstgrad
- Import/Export-Funktionen
- Gruppenverwaltung

### Statistiken
- Personenauswahl für Einzelberichte
- Jahresberichte für gesamte Einheit
- PDF-Export mit professionellem Layout
- Visuelle Charts und Diagramme

### News & Updates
- Wichtige Mitteilungen erstellen
- Prioritäten festlegen (Dringend bis Niedrig)
- Anzeige im Screensaver und Kiosk

### Schwarzes Brett
- Ankündigungen mit Überschrift und Inhalt
- Anzeige im Check-In Kiosk

### Einstellungen
- **Feuerwache**: Name, Adresse, Logo-Upload
- **System**: Screensaver-Konfiguration, Kiosk-URL
- **Backup**: Automatische Backups mit Zeitplan

## 🔄 Backup & Restore

### Automatisches Backup
1. Admin → Einstellungen → Backup
2. Backup aktivieren
3. Zeitplan festlegen (z.B. täglich um 02:00 Uhr)
4. Aufbewahrungsdauer einstellen

Backups werden in `./backups/` gespeichert.

### Manuelles Backup
```bash
# Datei fire_station.db kopieren
cp backend/fire_station.db backup_$(date +%Y%m%d).db
```

### Restore
```bash
# Backend stoppen
# Backup-Datei zurückkopieren
cp backup_YYYYMMDD.db backend/fire_station.db
# Backend neu starten
```

## 🛠️ Technologie-Stack

**Backend:**
- FastAPI (Python 3.11)
- SQLAlchemy ORM
- SQLite Datenbank
- APScheduler für automatische Tasks
- ReportLab für PDF-Generierung

**Frontend:**
- React 18
- Vite
- Tailwind CSS
- React Router
- Axios

## 📖 API-Dokumenten

Interaktive API-Dokumentation verfügbar unter:
- Swagger UI: http://localhost:8000/docs
- ReDoc: http://localhost:8000/redoc

## 🔧 Konfiguration

### Umgebungsvariablen

Backend `.env`:
```env
DATABASE_URL=sqlite:///./fire_station.db
SECRET_KEY=your-secret-key-here
```

### Firewall-Freigabe (Windows)

Für Zugriff im lokalen Netzwerk:
```powershell
# Backend
netsh advfirewall firewall add rule name="Feuerwehr Backend" dir=in action=allow protocol=TCP localport=8000

# Frontend
netsh advfirewall firewall add rule name="Feuerwehr Frontend" dir=in action=allow protocol=TCP localport=5173
```

## 📱 Tablet/Kiosk-Setup

### Windows Tablet
1. Browser im Kiosk-Modus starten:
```powershell
start chrome --kiosk --app=http://localhost:5173/kiosk
```

2. Auto-Start einrichten:
   - `Win+R` → `shell:startup`
   - Verknüpfung zur Batch-Datei erstellen

### Android Tablet
1. Chrome installieren
2. URL aufrufen: `http://[SERVER-IP]:5173/kiosk`
3. Menü → "Zum Startbildschirm hinzufügen"
4. Kiosk-App verwenden (z.B. "Fully Kiosk Browser")

## 🐛 Troubleshooting

### Backend startet nicht
```bash
# Abhängigkeiten neu installieren
pip install -r requirements.txt --force-reinstall

# Datenbank neu initialisieren
rm fire_station.db
python main.py
```

### Frontend Fehler
```bash
# Node modules neu installieren
rm -rf node_modules package-lock.json
npm install

# Cache leeren
npm run dev -- --force
```

### Port bereits belegt
```bash
# Windows: Port freigeben
netstat -ano | findstr :8000
taskkill /PID <PID> /F
```

## 📄 Lizenz

Dieses Projekt ist für den internen Gebrauch von Feuerwehren entwickelt.

## 🤝 Support

Bei Fragen oder Problemen:
1. Issue auf GitHub erstellen
2. Dokumentation prüfen
3. Logs überprüfen

## 📌 Version

**Version:** 1.0.0  
**Release-Datum:** Dezember 2025  
**Status:** Produktionsreif ✅

---

Entwickelt mit ❤️ für die Feuerwehr
