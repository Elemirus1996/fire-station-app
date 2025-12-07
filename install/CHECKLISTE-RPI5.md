# 🚒 Raspberry Pi 5 Kiosk - Inbetriebnahme Checkliste

## Phase 1: Hardware-Vorbereitung

- [ ] **Raspberry Pi 5** ausgepackt (4GB oder 8GB)
- [ ] **Gehäuse** mit aktiver Kühlung montiert
- [ ] **microSD-Karte** (32GB+) oder **SSD** vorbereitet
- [ ] **Touchscreen/Monitor** angeschlossen
- [ ] **Netzteil** (27W USB-C) angeschlossen
- [ ] **Ethernet-Kabel** angeschlossen (oder WLAN konfiguriert)
- [ ] **Tastatur & Maus** für Setup angeschlossen

## Phase 2: Software-Installation

- [ ] **Raspberry Pi OS (64-bit)** mit Imager geflasht
  - [ ] Hostname: `feuerwehr-kiosk`
  - [ ] SSH aktiviert
  - [ ] Benutzer: `pi` / Passwort gesetzt
  - [ ] WLAN konfiguriert (falls nötig)
- [ ] Erster Boot erfolgreich
- [ ] System-Updates installiert: `sudo apt update && sudo apt upgrade -y`
- [ ] IP-Adresse notiert: `hostname -I`

## Phase 3: Anwendungs-Installation

- [ ] Installation-Script heruntergeladen:
  ```bash
  wget https://raw.githubusercontent.com/Elemirus1996/fire-station-app/main/install/install-rpi5.sh
  ```
- [ ] Script ausführbar gemacht: `chmod +x install-rpi5.sh`
- [ ] Installation gestartet: `sudo bash install-rpi5.sh`
- [ ] Installation ohne Fehler abgeschlossen (ca. 5-10 Min.)
- [ ] Neustart durchgeführt: `sudo reboot`

## Phase 4: Funktions-Test

- [ ] Kiosk startet automatisch nach Neustart
- [ ] Frontend lädt: http://localhost:5173
- [ ] Backend erreichbar: http://localhost:8000
- [ ] Services laufen:
  - [ ] `sudo systemctl status feuerwehr-backend` → Active (running)
  - [ ] `sudo systemctl status feuerwehr-frontend` → Active (running)

## Phase 5: Basis-Konfiguration

### Admin-Zugang
- [ ] Admin-Bereich geöffnet: http://[PI-IP]:5173/admin/login
- [ ] Login: `admin` / `feuerwehr2025`
- [ ] **Admin-Passwort geändert!** (Einstellungen → Benutzer)

### Feuerwehr-Daten
- [ ] Feuerwehr-Name eingetragen (Einstellungen → Feuerwache)
- [ ] Logo hochgeladen (PNG, transparent empfohlen)
- [ ] Adresse eingetragen (Straße, PLZ, Stadt)

### Gruppen erstellen/anpassen
- [ ] Gruppen geprüft (Jugend, Aktive, Altersabteilung, etc.)
- [ ] Farben angepasst
- [ ] Beschreibungen ergänzt

### Personal importieren
- [ ] Erste Test-Person angelegt
- [ ] Stammrollennummer korrekt
- [ ] Dienstgrad zugewiesen
- [ ] Gruppe zugewiesen

## Phase 6: System-Einstellungen

### Kiosk-Einstellungen
- [ ] Kiosk-Base-URL gesetzt: `http://[PI-IP]:5173`
- [ ] Anwesenheitsliste am Kiosk: Aktiviert/Deaktiviert (nach Wunsch)

### Screensaver
- [ ] Screensaver aktiviert
- [ ] Timeout eingestellt (z.B. 300 Sekunden = 5 Min.)
- [ ] Logo anzeigen: Ja
- [ ] Uhr anzeigen: Ja

### Backup
- [ ] Automatisches Backup aktiviert
- [ ] Backup-Pfad: `/opt/feuerwehr-app/backend/backups`
- [ ] Zeitplan: z.B. täglich 02:00 Uhr
- [ ] Aufbewahrung: 30 Tage

## Phase 7: Funktions-Tests

### Check-In/Out Test
- [ ] Neue Session erstellt (z.B. "Übungsdienst")
- [ ] Test-Person eingecheckt (Stammrollennummer)
- [ ] Person erscheint in Anwesenheitsliste
- [ ] Person ausgecheckt
- [ ] Checkout-Zeit korrekt angezeigt

### QR-Code Test
- [ ] QR-Code wird am Kiosk angezeigt
- [ ] QR-Code mit Smartphone gescannt
- [ ] Mobile Ansicht lädt korrekt
- [ ] Check-In über Smartphone funktioniert

### Einsatz-Beendigung Test
- [ ] Einsatz erstellt
- [ ] Test mit niedrigem Dienstgrad (z.B. FM) → Fehlermeldung
- [ ] Test mit UBM oder höher → Erfolgreich

### PDF-Export Test
- [ ] Session-PDF exportiert
- [ ] PDF öffnet sich korrekt
- [ ] Alle Daten vorhanden (Logo, Teilnehmer, Zeiten)

### Statistik-Test
- [ ] Statistik-Seite öffnet
- [ ] Jahres-Statistik generiert
- [ ] Personen-Statistik abrufbar
- [ ] PDF-Export funktioniert

## Phase 8: Netzwerk-Konfiguration

### Feste IP-Adresse
- [ ] Im Router: DHCP-Reservierung für Pi eingerichtet
- [ ] Oder: Statische IP am Pi konfiguriert
- [ ] Neue IP getestet: `ping [PI-IP]`
- [ ] Frontend erreichbar: http://[PI-IP]:5173

### Hostname
- [ ] Hostname im Netzwerk: `feuerwehr-kiosk.local`
- [ ] Hostname-Zugriff getestet: http://feuerwehr-kiosk.local:5173

### Firewall (optional)
- [ ] UFW installiert: `sudo apt install ufw`
- [ ] Ports freigegeben: SSH, 8000, 5173
- [ ] UFW aktiviert: `sudo ufw enable`

## Phase 9: Performance-Optimierung

### Temperatur-Check
- [ ] CPU-Temperatur im Idle: `vcgencmd measure_temp` → < 60°C
- [ ] CPU-Temperatur unter Last: < 80°C
- [ ] Ggf. bessere Kühlung installieren

### Speicher-Check
- [ ] Freier Speicher: `df -h` → > 5GB frei
- [ ] RAM-Nutzung: `free -h` → < 2GB genutzt

### SSD-Migration (empfohlen)
- [ ] Falls noch auf microSD: SSD vorbereitet
- [ ] OS auf SSD installiert
- [ ] Von SSD gebootet
- [ ] Performance-Verbesserung spürbar

## Phase 10: Produktiv-Betrieb

### Kiosk-Aufstellung
- [ ] Raspberry Pi an finaler Position montiert
- [ ] Touchscreen/Monitor auf optimaler Höhe
- [ ] Alle Kabel sauber verlegt
- [ ] Gehäuse verschlossen

### Stromversorgung
- [ ] Offizielles Netzteil verwendet
- [ ] USV angeschlossen (empfohlen für 24/7)
- [ ] Stromausfalltest durchgeführt

### Personal-Einweisung
- [ ] Bedienung demonstriert:
  - [ ] Session auswählen
  - [ ] Stammrollennummer eingeben
  - [ ] Check-In/Out durchführen
  - [ ] Einsatz beenden (nur UBM+)
- [ ] QR-Code-Nutzung erklärt
- [ ] Admin-Zugriff für Berechtigte erklärt

### Dokumentation
- [ ] IP-Adresse dokumentiert und an sichtbarer Stelle angebracht
- [ ] Admin-Passwort sicher verwahrt
- [ ] Kurzanleitung ausgedruckt und am Gerät angebracht
- [ ] Kontakt für Support festgelegt

## Phase 11: Wartungsplan

### Wöchentlich
- [ ] Logs prüfen: `sudo journalctl -u feuerwehr-backend -n 50`
- [ ] Backup-Erfolg prüfen
- [ ] Funktionstest durchführen

### Monatlich
- [ ] System-Updates: `sudo apt update && sudo apt upgrade -y`
- [ ] Services neu starten
- [ ] Datenbank-Größe prüfen
- [ ] Temperatur-Check

### Quartalsweise
- [ ] Vollständiger Funktionstest
- [ ] Alte Sessions archivieren/löschen
- [ ] SD-Karte/SSD Health-Check
- [ ] Backup-Restore testen

### Jährlich
- [ ] Datenbank optimieren
- [ ] Alte Daten archivieren
- [ ] System neu aufsetzen (falls nötig)
- [ ] Hardware-Check (Lüfter, Netzteil, etc.)

## ✅ Abnahme

- [ ] Alle Checkpunkte durchgeführt
- [ ] System läuft stabil seit mindestens 24h
- [ ] Keine Fehler in Logs
- [ ] Personal geschult
- [ ] Dokumentation vollständig

**Datum der Inbetriebnahme:** _______________

**Abgenommen von:** _______________

**Unterschrift:** _______________

---

## 🚨 Notfall-Kontakte

**Bei Problemen:**
1. Logs prüfen: `sudo journalctl -u feuerwehr-backend -f`
2. Services neu starten: `sudo systemctl restart feuerwehr-*`
3. System neu starten: `sudo reboot`
4. Support kontaktieren

**Backup-Wiederherstellung:**
```bash
cd /opt/feuerwehr-app/backend
cp ~/backup.db fire_station.db
sudo systemctl restart feuerwehr-backend
```

**Vollständiger Reset:**
```bash
cd /opt/feuerwehr-app/backend
source venv/bin/activate
python recreate_db.py
sudo systemctl restart feuerwehr-backend
```
