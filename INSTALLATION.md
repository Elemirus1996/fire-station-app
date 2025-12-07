# Feuerwehr Anwesenheitssystem - Komplette Installationsanleitung

## 🚒 Übersicht

Dieses System ist eine vollständige Lösung zur digitalen Erfassung der Anwesenheit bei Feuerwehreinsätzen, Übungsdiensten und Arbeitsdiensten.

## ✨ Features

- ✅ **Check-In Kiosk** - Einfache Anwesenheitserfassung per Stammrollennummer
- ✅ **QR-Code Check-In** - Mobiles Ein- und Auschecken per QR-Code
- ✅ **Session-Management** - Verschiedene Event-Typen (Einsatz, Übungsdienst, Arbeitsdienst A/B/C)
- ✅ **Personalverwaltung** - Verwaltung von Personal, Gruppen und Dienstgraden
- ✅ **Ankündigungen & News** - Banner-System für wichtige Mitteilungen
- ✅ **Statistiken** - Detaillierte Auswertungen und PDF-Export
- ✅ **Backup-System** - Automatische Datensicherung
- ✅ **Screensaver** - Automatischer Bildschirmschoner am Kiosk
- ✅ **Responsive Design** - Funktioniert auf Desktop, Tablet und Smartphone
- ✅ **Dienstgrad-Berechtigungen** - Einsatz nur durch UBM+ beendbar

## 📋 Systemanforderungen

- **Python 3.11+** - Backend
- **Node.js 18+** - Frontend
- **Windows/Linux/macOS** - Betriebssystem
- Optional: **Docker & Docker Compose** - für Container-Deployment

## 🚀 Installation (Windows)

### Schritt 1: Repository klonen

```powershell
git clone https://github.com/Elemirus1996/fire-station-app.git
cd fire-station-app
```

### Schritt 2: System prüfen

```powershell
.\check-system.ps1
```

Dieses Skript prüft:
- Python Installation
- Node.js Installation
- Verfügbarkeit der Ports 8000 und 5173
- Vorhandene Verzeichnisse

### Schritt 3: Komplette Neu-Installation

```powershell
.\setup-clean.ps1
```

Dieses Skript:
- Erstellt Python Virtual Environment
- Installiert alle Backend-Dependencies
- Installiert alle Frontend-Dependencies
- Erstellt .env Dateien
- Erstellt notwendige Verzeichnisse (uploads, backups)
- Löscht alte Datenbank (Neuanfang)

### Schritt 4: Anwendung starten

```powershell
.\start-clean.ps1
```

Oder manuell:

**Backend:**
```powershell
cd backend
.\venv\Scripts\Activate.ps1
python main.py
```

**Frontend (neues Terminal):**
```powershell
cd frontend
npm run dev
```

### Schritt 5: Anwendung öffnen

- **Frontend:** http://localhost:5173
- **Backend API:** http://localhost:8000
- **API Dokumentation:** http://localhost:8000/docs

## 🔐 Standard-Login

- **Benutzername:** `admin`
- **Passwort:** `feuerwehr2025`

**⚠️ WICHTIG:** Ändere das Passwort nach dem ersten Login!

## ⚙️ Konfiguration

### Backend (.env)

Datei: `backend/.env`

```env
# Datenbank
DATABASE_URL=sqlite:///./fire_station.db

# Sicherheit - UNBEDINGT ÄNDERN für Produktion!
SECRET_KEY=feuerwehr-geheim-schluessel-2025-aendern
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=43200

# CORS - Füge Frontend-URLs hinzu
CORS_ORIGINS=http://localhost:5173,http://192.168.1.100:5173

# Server
HOST=0.0.0.0
PORT=8000
```

### Frontend (.env)

**Development:** `frontend/.env.development`
```env
VITE_API_URL=/api
VITE_API_BASE_URL=http://localhost:8000
```

**Production:** `frontend/.env.production`
```env
VITE_API_URL=http://192.168.1.100:8000/api
VITE_API_BASE_URL=http://192.168.1.100:8000
```

## 🐳 Docker Installation (Alternative)

### Mit Docker Compose starten:

```bash
docker-compose up -d
```

Das startet:
- Backend auf Port 8000
- Frontend auf Port 5173
- Automatisches Netzwerk zwischen den Services

### Stoppen:

```bash
docker-compose down
```

## 🥧 Raspberry Pi Installation (Produktiv-Betrieb)

### Raspberry Pi 5 (Empfohlen):

```bash
# Installer herunterladen
wget https://raw.githubusercontent.com/Elemirus1996/fire-station-app/main/install/install-rpi5.sh

# Ausführen
sudo bash install-rpi5.sh
```

**Optimiert für:**
- Raspberry Pi 5 mit 64-bit OS
- Bessere Performance und Stabilität
- SSD-Boot Unterstützung
- Kiosk-Modus mit Auto-Start

Siehe: `install/README-RPI5.md`

### Raspberry Pi 3/4:

```bash
sudo bash install/install-rpi-v2.sh
```

Siehe: `install/README-RASPBERRY-PI.md`

**Nach Installation:**
- Kiosk startet automatisch beim Booten
- Zugriff: http://[PI-IP]:5173
- Services: `sudo systemctl status feuerwehr-backend`

## 🖥️ Raspberry Pi Installation

Für den produktiven Einsatz auf einem Raspberry Pi:

```bash
cd install
sudo ./install-rpi-v2.sh
```

Dies installiert:
- Alle Dependencies
- Systemd Services
- Auto-Start beim Booten
- Nginx Reverse Proxy (optional)

Siehe auch: `install/README-RASPBERRY-PI.md`

## 📱 Verwendung

### Kiosk-Modus

1. Öffne http://localhost:5173
2. Wähle oder erstelle eine Session
3. Personal checkt ein mit Stammrollennummer
4. QR-Code wird angezeigt für mobiles Check-In
5. Bei Einsätzen: Nur Personal ab UBM kann Session beenden

### Admin-Bereich

1. Öffne http://localhost:5173/admin/login
2. Login mit Admin-Credentials
3. Verwalte:
   - Sessions (erstellen, beenden, anzeigen)
   - Personal (hinzufügen, bearbeiten, Gruppen)
   - Ankündigungen (für Kiosk-Banner)
   - News (für Kiosk-Laufband)
   - Statistiken & Exporte
   - System-Einstellungen
   - Backups

## 🔧 Wartung

### Datenbank zurücksetzen

```powershell
cd backend
.\venv\Scripts\Activate.ps1
python recreate_db.py
```

### Admin-Passwort zurücksetzen

```powershell
cd backend
.\venv\Scripts\Activate.ps1
python reset_admin.py
```

### Backup erstellen

Im Admin-Bereich unter "Einstellungen" → "Backup" oder:

```powershell
# Backups werden automatisch in backend/backups/ erstellt
```

## 📊 Datenbank-Struktur

- **Personnel** - Personal mit Stammrollennummer, Dienstgrad, Gruppe
- **Sessions** - Einsätze, Übungsdienste, Arbeitsdienste
- **Attendance** - Check-In/Out Einträge
- **AdminUsers** - Admin-Benutzer mit Rollen
- **Groups** - Gruppen (Jugend, Aktive, Altersabteilung, etc.)
- **Announcements** - Ankündigungen für Kiosk
- **News** - News-Ticker für Kiosk
- **SystemSettings** - Globale Einstellungen

## 🛠️ Entwicklung

### Backend entwickeln:

```powershell
cd backend
.\venv\Scripts\Activate.ps1
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

### Frontend entwickeln:

```powershell
cd frontend
npm run dev
```

### Build für Production:

```powershell
cd frontend
npm run build
```

## 📝 Dienstgrade

Hierarchie (aufsteigend):
1. FM - Feuerwehrmann
2. OFM - Oberfeuerwehrmann
3. HFM - Hauptfeuerwehrmann
4. UBM - Unterbrandmeister ⚠️ Mindestrang zum Beenden von Einsätzen
5. BM - Brandmeister
6. OBM - Oberbrandmeister
7. HBM - Hauptbrandmeister
8. BI - Brandinspektor

## 🔒 Sicherheit

- JWT-basierte Authentifizierung
- Passwort-Hashing mit bcrypt
- CORS-Protection
- Session-basierte Zugriffskontrolle
- Dienstgrad-basierte Berechtigungen

## 🐛 Troubleshooting

### Backend startet nicht:
- Prüfe ob Port 8000 frei ist
- Prüfe Python Version: `python --version`
- Aktiviere venv: `.\venv\Scripts\Activate.ps1`
- Installiere Dependencies neu: `pip install -r requirements.txt`

### Frontend startet nicht:
- Prüfe ob Port 5173 frei ist
- Prüfe Node.js Version: `node --version`
- Lösche node_modules und neu installieren: `rm -r node_modules; npm install`

### API-Fehler im Frontend:
- Prüfe CORS-Einstellungen in `backend/.env`
- Prüfe API-URL in `frontend/.env`
- Prüfe ob Backend läuft: http://localhost:8000/api/health

### Datenbank-Fehler:
- Lösche Datenbank: `rm backend/fire_station.db`
- Starte Backend neu (erstellt DB automatisch)

## 📞 Support

Bei Problemen oder Fragen:
- Siehe TESTING.md für Testanleitungen
- Siehe CHANGELOG.md für Änderungshistorie

## 📄 Lizenz

Dieses Projekt ist für den internen Gebrauch in Feuerwehren vorgesehen.

## 🎯 Roadmap

- [ ] Mobile App (React Native)
- [ ] Multi-Tenant Support
- [ ] LDAP/Active Directory Integration
- [ ] Schnittstelle zu Alarmierung
- [ ] Fahrzeug-Management
- [ ] Geräte-Verwaltung
- [ ] Erweiterte Statistiken
