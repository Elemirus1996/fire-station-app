# Kalender & Dienste System - Dokumentation

## Übersicht

Erweiterte Funktionen für Kalenderverwaltung, Dienstplanung und Personal-basierte Authentifizierung.

## Neue Features

### 1. Kalender-System

**Funktionen:**
- Erstellen, Bearbeiten und Löschen von Veranstaltungen
- Verschiedene Event-Typen: training, exercise, meeting, event, inspection
- Teilnehmerverwaltung mit Registrierung
- Maximale Teilnehmerzahl festlegbar
- Wiederholende Events (daily, weekly, monthly)
- Ganztagesevents
- Standort-Angabe
- Datum/Zeit-Filter

**API-Endpunkte:**
```
GET    /api/calendar              - Liste alle Events
GET    /api/calendar/{id}         - Event-Details mit Teilnehmern
POST   /api/calendar              - Event erstellen (Admin)
PUT    /api/calendar/{id}         - Event aktualisieren (Admin)
DELETE /api/calendar/{id}         - Event löschen (Admin)
POST   /api/calendar/{id}/register - Teilnehmer registrieren
DELETE /api/calendar/{id}/unregister/{personnel_id} - Abmeldung
```

**Query-Parameter:**
- `start_date`: Filter ab Datum
- `end_date`: Filter bis Datum
- `event_type`: Filter nach Event-Typ

**Datenmodell:**
```python
CalendarEvent:
  - title: str (max 200)
  - description: text
  - event_type: str (training, exercise, meeting, etc.)
  - start_time: datetime
  - end_time: datetime
  - location: str (optional)
  - all_day: bool
  - recurrence: str (daily, weekly, monthly, none)
  - max_participants: int (optional)
  - registration_required: bool
  
EventParticipant:
  - event_id: int
  - personnel_id: int
  - status: str (registered, confirmed, cancelled)
  - registered_at: datetime
  - notes: text
```

### 2. Dienst-Management

**Funktionen:**
- Dienstplanung mit Personal-Zuordnung
- Verschiedene Dienstarten: standby, on-call, shift
- Zeitbasierte Filter
- CRUD-Operationen

**API-Endpunkte:**
```
GET    /api/duty        - Liste alle Dienste
POST   /api/duty        - Dienst erstellen (Admin)
PUT    /api/duty/{id}   - Dienst aktualisieren (Admin)
DELETE /api/duty/{id}   - Dienst löschen (Admin)
```

**Query-Parameter:**
- `start_date`: Filter ab Datum
- `end_date`: Filter bis Datum
- `personnel_id`: Filter nach Personal
- `duty_type`: Filter nach Diensttyp

**Datenmodell:**
```python
DutySchedule:
  - personnel_id: int
  - duty_type: str (standby, on-call, shift)
  - start_time: datetime
  - end_time: datetime
  - notes: text
  - created_by: int (admin_user_id)
```

### 3. Personal-Admin-Authentifizierung

**Funktionen:**
- Personal kann Admin-Zugriff erhalten
- Login mit Stammrollennummer + Passwort
- Separate Login-Seite für Personal
- Rollen-System (admin, super_admin)
- Aktivieren/Deaktivieren von Admin-Zugriff
- Passwort-Reset durch Super-Admin

**API-Endpunkte:**
```
POST   /api/personnel-admin/login    - Personnel Login
POST   /api/personnel-admin/create   - Admin-Zugriff erstellen
GET    /api/personnel-admin          - Liste Personnel-Admins
PUT    /api/personnel-admin/{id}     - Admin-Zugriff aktualisieren
DELETE /api/personnel-admin/{id}     - Admin-Zugriff entfernen
```

**Login-Request:**
```json
{
  "stammrollennummer": "12345",
  "password": "geheim"
}
```

**Response:**
```json
{
  "access_token": "eyJ...",
  "token_type": "bearer",
  "user": {
    "id": 1,
    "stammrollennummer": "12345",
    "vorname": "Max",
    "nachname": "Mustermann",
    "dienstgrad": "Hauptfeuerwehrmann",
    "role": "admin"
  }
}
```

**Datenmodell:**
```python
PersonnelAdmin:
  - personnel_id: int (unique)
  - hashed_password: str
  - role: str (admin, super_admin)
  - is_active: bool
  - last_login: datetime
  - created_by: int (admin_user_id)
```

### 4. Audit-Log

**Funktionen:**
- Vollständiges Logging aller Admin-Aktionen
- Filter nach Aktion, Entitätstyp, Benutzer, Zeitraum
- Änderungen werden als JSON gespeichert
- Statistiken über Admin-Aktivitäten
- IP-Adresse und User-Agent Tracking

**API-Endpunkte:**
```
GET /api/audit              - Audit-Logs mit Filter
GET /api/audit/actions      - Liste aller Actions
GET /api/audit/entity-types - Liste aller Entity-Types
GET /api/audit/recent       - Kürzliche Logs (default 24h)
GET /api/audit/statistics   - Statistiken (default 30 Tage)
```

**Query-Parameter:**
- `action`: Filter nach Action
- `entity_type`: Filter nach Entity
- `entity_id`: Filter nach Entity-ID
- `user_id`: Filter nach User
- `start_date`: Filter ab Datum
- `end_date`: Filter bis Datum
- `limit`: Max. Anzahl (default 100)
- `offset`: Offset für Pagination

**Datenmodell:**
```python
AuditLog:
  - user_id: int
  - action: str (CREATE_*, UPDATE_*, DELETE_*)
  - entity_type: str (Personnel, Session, CalendarEvent, etc.)
  - entity_id: int
  - changes: jsonb ({"field": {"old": "value", "new": "value"}})
  - ip_address: str
  - user_agent: str
  - timestamp: datetime
```

## Frontend-Komponenten

### 1. PersonnelAdminLogin.jsx
- Login-Formular für Personal mit Stammrollennummer
- Fehlerbehandlung
- Link zurück zum Standard-Login

### 2. PersonnelAdminManagement.jsx
- Liste aller Personnel mit Admin-Zugriff
- Admin-Zugriff erstellen
- Aktivieren/Deaktivieren
- Passwort-Reset
- Admin-Zugriff entfernen

### 3. AuditLog.jsx
- Tabellarische Ansicht aller Logs
- Filter nach Action, Entity-Type, Zeitraum
- Statistiken (Gesamt, nach Action, nach User)
- Farbcodierte Action-Badges (CREATE=grün, UPDATE=blau, DELETE=rot)
- Änderungen als aufklappbare Details

## Routes

### Frontend-Routes (hinzugefügt):
```
/admin/personnel-login       - Personal Admin Login
/admin/personnel-admins      - Personnel Admin Verwaltung
/admin/audit                 - Audit Log Ansicht
```

### Backend-Routes (hinzugefügt):
```
/api/calendar/*              - Kalender-Management
/api/duty/*                  - Dienst-Management
/api/personnel-admin/*       - Personnel Admin Auth
/api/audit/*                 - Audit Log Zugriff
```

## Datenbank-Migration

**Ausführen:**
```bash
cd backend
python migrate_calendar_duty.py
```

**Neue Tabellen:**
- `calendar_events` - Veranstaltungen
- `event_participants` - Event-Teilnehmer
- `duty_schedules` - Dienstpläne
- `personnel_admin` - Personal mit Admin-Zugriff

**Indizes:**
- `calendar_events`: start_time, event_type
- `event_participants`: event_id, personnel_id
- `duty_schedules`: start_time, personnel_id
- `personnel_admin`: personnel_id

## Authentifizierung

Das System unterstützt nun zwei Auth-Methoden:

### 1. Standard Admin
```
POST /api/auth/login
{
  "username": "admin",
  "password": "geheim"
}
```

### 2. Personnel Admin
```
POST /api/personnel-admin/login
{
  "stammrollennummer": "12345",
  "password": "geheim"
}
```

Beide erzeugen JWT-Tokens mit unterschiedlichen Claims:

**Standard Admin Token:**
```json
{
  "sub": "admin",
  "type": "admin"
}
```

**Personnel Admin Token:**
```json
{
  "sub": "12345",
  "type": "personnel_admin",
  "personnel_id": 5,
  "role": "admin"
}
```

Die `get_current_user()` Funktion erkennt beide Token-Typen automatisch.

## Berechtigungen

Alle neuen Endpunkte erfordern Admin-Berechtigung via JWT-Token.

**Personnel-Admins** haben die gleichen Rechte wie Standard-Admins, aber:
- Login mit Stammrollennummer statt Username
- Verknüpft mit Personal-Datensatz
- Kann über Personnel-Admin-Management verwaltet werden
- Separate Last-Login-Tracking

## Verwendungsbeispiele

### Kalender-Event erstellen
```javascript
const event = await api.post('/calendar', {
  title: 'Atemschutz-Training',
  description: 'Monatliches Training',
  event_type: 'training',
  start_time: '2025-02-01T10:00:00',
  end_time: '2025-02-01T12:00:00',
  location: 'Übungshalle',
  max_participants: 20,
  registration_required: true
});
```

### Teilnehmer registrieren
```javascript
await api.post(`/calendar/${eventId}/register`, {
  personnel_id: 5,
  notes: 'Bestätigt'
});
```

### Dienst erstellen
```javascript
await api.post('/duty', {
  personnel_id: 3,
  duty_type: 'on-call',
  start_time: '2025-02-01T18:00:00',
  end_time: '2025-02-02T06:00:00',
  notes: 'Rufbereitschaft Woche 5'
});
```

### Personnel Admin-Zugriff erstellen
```javascript
await api.post('/personnel-admin/create', {
  personnel_id: 7,
  password: 'sicheres_passwort',
  role: 'admin'
});
```

### Audit-Logs abrufen
```javascript
const logs = await api.get('/audit/recent', {
  params: { hours: 48 }
});
```

## Sicherheit

- Alle Passwörter werden mit bcrypt gehasht
- JWT-Tokens mit konfigurierbarer Ablaufzeit
- Audit-Logging für alle Write-Operationen
- IP-Adresse und User-Agent werden protokolliert
- Personnel-Admin-Zugriff kann jederzeit deaktiviert werden

## Testing

**Backend Migration testen:**
```bash
cd backend
python migrate_calendar_duty.py
```

**API testen:**
```bash
# Event erstellen
curl -X POST http://localhost:8000/api/calendar \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"title":"Test Event","event_type":"meeting","start_time":"2025-02-01T10:00:00","end_time":"2025-02-01T11:00:00"}'

# Audit Logs abrufen
curl http://localhost:8000/api/audit/recent?hours=24 \
  -H "Authorization: Bearer YOUR_TOKEN"
```

## Nächste Schritte

Für vollständige Kalender/Duty-Funktionalität fehlen noch:

1. **Frontend-Komponenten:**
   - CalendarView.jsx - Kalenderansicht (Monat/Woche/Tag)
   - EventForm.jsx - Event erstellen/bearbeiten
   - DutySchedule.jsx - Dienstplan-Ansicht
   - ParticipantManagement.jsx - Teilnehmerverwaltung

2. **Features:**
   - Drag & Drop für Dienstplanung
   - Kalender-Export (iCal)
   - Benachrichtigungen für Events
   - Konflikt-Erkennung bei Diensten
   - Recurring Events automatisch generieren

3. **Optimierungen:**
   - Caching für häufige Abfragen
   - WebSocket für Echtzeit-Updates
   - PDF-Export für Dienstpläne
   - Mobile-optimierte Kalenderansicht
