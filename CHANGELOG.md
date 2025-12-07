# Changelog

Alle wichtigen Änderungen an diesem Projekt werden in dieser Datei dokumentiert.

## [1.0.0] - 2025-12-07

### ✨ Neue Features

#### Statistik-System
- **Einzelperson-Jahresbericht**: Umfassende Statistiken für jedes Mitglied
  - Gesamtteilnahmen und Arbeitsstunden
  - Anwesenheitsquote gesamt und pro Session-Typ
  - Detaillierte Aufschlüsselung: "X von Y Sessions besucht"
  - Monatliche Übersicht mit visuellen Balkendiagrammen
  - Professional PDF-Export
- **Gesamtbericht Einheit**: Jahresübersicht für die komplette Wache
  - Gesamt-Sessions und Teilnahmen
  - Durchschnittliche Teilnahme pro Session
  - Top 10 aktivste Mitglieder mit Ranking
  - Teilnahme-Statistiken nach Dienstgrad
  - Monatliche Session-Übersicht
  - PDF-Export des kompletten Berichts
- Jahresauswahl (aktuelles Jahr + 10 Jahre zurück)
- Automatische Berechnung aller Metriken

#### Screensaver-System
- Automatische Aktivierung nach konfigurierbarer Inaktivität
- Standard-Timeout: 30 Sekunden (einstellbar: 30-3600 Sekunden)
- Anzeige von Feuerwehr-Logo
- Große Uhrzeit-Anzeige mit Datum
- Prominent platzierter News-Ticker (wichtige Mitteilungen)
- Animierte Hintergrund-Icons (🚒🧯👨‍🚒)
- Funktioniert auf allen Kiosk-Screens (Session-Auswahl, Check-In, etc.)
- Deaktivierung durch beliebige Interaktion
- Optimiertes Layout: Alle Inhalte vollständig sichtbar

#### News & Updates System
- Verwaltung wichtiger Mitteilungen im Admin-Bereich
- Felder: Titel, Inhalt, Priorität, Aktiv/Inaktiv
- Prioritätsstufen mit visueller Kennzeichnung:
  - 🔴 Dringend (Rot)
  - 🟠 Hoch (Orange)
  - 🔵 Normal (Blau)
  - ⚪ Niedrig (Grau)
- Automatische Rotation alle 10 Sekunden
- Anzeige im Screensaver (groß und prominent)
- Anzeige im Kiosk-Modus als Banner
- CRUD-Funktionen (Erstellen, Bearbeiten, Löschen)

#### Live-Dashboard
- Echtzeit-Übersicht aller aktiven Sessions
- Automatisches Refresh alle 5 Sekunden
- Anzeige für jede Session:
  - Event-Typ und Startzeit
  - Anzahl Teilnehmer
  - Session-Dauer in Echtzeit
  - Farbliche Kennzeichnung nach Event-Typ
- Direkter Zugriff auf Session-Details
- Responsive Design

#### Benutzerfreundlichkeit
- **Touch-Nummernpad für "Einsatz beenden"**
  - Keine physische Tastatur mehr erforderlich
  - 3x3 Nummernpad mit großen Touch-Buttons
  - Löschen-Funktion (alle Ziffern)
  - Zurück-Funktion (letzte Ziffer)
  - Große Ziffernanzeige
- **Session-Dauer-Anzeige**
  - Anzeige in Session-Management und Details
  - Format: "X Stunden Y Minuten"
  - Echtzeit-Berechnung für aktive Sessions

### 🔧 Verbesserungen

#### Backend
- Neue API-Endpunkte:
  - `GET /api/statistics/personnel/{id}/yearly` - Einzelperson-Statistik
  - `GET /api/statistics/unit/yearly` - Einheit-Statistik
  - `GET /api/statistics/personnel/{id}/yearly/pdf` - PDF-Download Person
  - `GET /api/statistics/unit/yearly/pdf` - PDF-Download Einheit
  - `GET /api/news` - News-Verwaltung (CRUD)
  - `GET /api/settings/system` - Screensaver-Einstellungen
- Erweiterte SystemSettings mit Screensaver-Feldern
- News-Model mit Prioritäten
- Statistik-PDF-Generator mit professionellem Layout
- Session-Dauer-Berechnung in API

#### Frontend
- Neue Admin-Komponenten:
  - `Statistics.jsx` - Statistik-Übersicht
  - `NewsManager.jsx` - News-Verwaltung
  - `LiveDashboard.jsx` - Echtzeit-Dashboard
- Neue Check-In-Komponenten:
  - `Screensaver.jsx` - Screensaver mit News
  - `NewsBanner.jsx` - News-Anzeige im Kiosk
- Erweiterte `SystemSettings.jsx` mit Screensaver-Konfiguration
- Touch-Nummernpad in `CheckInKiosk.jsx`
- Optimierte Screensaver-Integration auf allen Screens
- CSS-Animationen (fadeIn, float-slow/medium/fast)

#### Datenbank
- News-Tabelle mit Prioritäten
- SystemSettings erweitert:
  - screensaver_enabled
  - screensaver_timeout
  - screensaver_show_logo
  - screensaver_show_clock
- Session-Modell unverändert (kompatibel)

### 🐛 Bugfixes

- **Screensaver**: Timer funktioniert, aber Komponente wurde nicht auf allen Screens gerendert
  - **Fix**: Screensaver-Komponente zu allen conditional returns hinzugefügt
  - **Ursache**: CheckInKiosk hatte 4 verschiedene return-Statements, Screensaver war nur im letzten
- **Screensaver**: mousemove-Event resettet Timer zu häufig auf Desktop
  - **Fix**: mousemove und scroll aus Event-Listenern entfernt, nur echte Interaktionen zählen
- **Screensaver Layout**: News-Ticker schnitt andere Inhalte ab
  - **Fix**: Flexbox-Layout mit drei Bereichen (News oben, Content mittig, Hinweis unten)
- **Einsatz beenden**: Textfeld benötigte physische Tastatur
  - **Fix**: Touch-Nummernpad mit großen Buttons implementiert

### 📚 Dokumentation

- README.md vollständig überarbeitet
  - Neue Features dokumentiert
  - Docker-Installation hinzugefügt
  - Kiosk-Setup für Tablets
  - Troubleshooting erweitert
  - API-Dokumentation verlinkt
- CHANGELOG.md erstellt
- Inline-Kommentare für komplexe Funktionen

### 🔒 Sicherheit

- Keine Änderungen (bestehende JWT-Authentifizierung)

### ⚡ Performance

- Optimierte Event-Listener mit passive: true
- Debounced API-Calls im Live-Dashboard
- Effiziente Datenbank-Queries mit JOINs

### 🎨 UI/UX

- Konsistentes Design mit Tailwind CSS
- Farbschema: Fire-Red (#DC2626) als Hauptfarbe
- Responsive Layout für Desktop und Tablet
- Große, touch-optimierte Buttons
- Visuelle Feedback-Animationen
- Barrierefreie Farbkontraste

## Migrationshinweise

### Von Beta zu 1.0.0

1. **Datenbank**: Automatische Migration beim ersten Start
   - News-Tabelle wird erstellt
   - SystemSettings-Felder werden hinzugefügt
   - Bestehende Daten bleiben erhalten

2. **Konfiguration**: Neue Einstellungen verfügbar
   - Admin → Einstellungen → System → Screensaver konfigurieren
   - Admin → News & Updates → Erste News erstellen

3. **Keine Breaking Changes**: Alle bestehenden Features funktionieren weiterhin

## Bekannte Probleme

- Keine kritischen Probleme bekannt
- PDF-Export bei sehr großen Datenmengen (>1000 Sessions) kann mehrere Sekunden dauern

## Geplante Features (nächste Version)

- Export-Funktionen für Statistiken (CSV, Excel)
- Push-Benachrichtigungen für neue Einsätze
- Mehrsprachigkeit (DE/EN)
- Mobile App (iOS/Android)
- Biometrische Authentifizierung
- Erweiterte Gruppen-Verwaltung

---

Format basiert auf [Keep a Changelog](https://keepachangelog.com/de/1.0.0/)
