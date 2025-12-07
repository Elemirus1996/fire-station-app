# Feuerwehr Anwesenheitssystem - Komplette Neuinstallation
# Dieses Skript richtet die Anwendung komplett neu ein

Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "Feuerwehr Anwesenheitssystem - Setup" -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host ""

# Prüfe ob Python installiert ist
Write-Host "1. Prüfe Python Installation..." -ForegroundColor Yellow
try {
    $pythonVersion = python --version 2>&1
    Write-Host "   ✓ Python gefunden: $pythonVersion" -ForegroundColor Green
} catch {
    Write-Host "   ✗ Python nicht gefunden!" -ForegroundColor Red
    Write-Host "   Bitte Python 3.11 oder höher installieren: https://www.python.org/downloads/" -ForegroundColor Red
    exit 1
}

# Prüfe ob Node.js installiert ist
Write-Host ""
Write-Host "2. Prüfe Node.js Installation..." -ForegroundColor Yellow
try {
    $nodeVersion = node --version 2>&1
    Write-Host "   ✓ Node.js gefunden: $nodeVersion" -ForegroundColor Green
} catch {
    Write-Host "   ✗ Node.js nicht gefunden!" -ForegroundColor Red
    Write-Host "   Bitte Node.js 18 oder höher installieren: https://nodejs.org/" -ForegroundColor Red
    exit 1
}

# Backend Setup
Write-Host ""
Write-Host "3. Backend einrichten..." -ForegroundColor Yellow
Set-Location backend

# Erstelle virtuelle Umgebung
if (Test-Path "venv") {
    Write-Host "   Lösche alte virtuelle Umgebung..." -ForegroundColor Gray
    Remove-Item -Recurse -Force venv
}
Write-Host "   Erstelle virtuelle Umgebung..." -ForegroundColor Gray
python -m venv venv

# Aktiviere virtuelle Umgebung
Write-Host "   Aktiviere virtuelle Umgebung..." -ForegroundColor Gray
& .\venv\Scripts\Activate.ps1

# Installiere Dependencies
Write-Host "   Installiere Python-Pakete..." -ForegroundColor Gray
pip install --upgrade pip
pip install -r requirements.txt

# Erstelle .env wenn nicht vorhanden
if (-not (Test-Path ".env")) {
    Write-Host "   Erstelle .env Datei..." -ForegroundColor Gray
    Copy-Item ".env.example" ".env"
}

# Lösche alte Datenbank
if (Test-Path "fire_station.db") {
    Write-Host "   Lösche alte Datenbank..." -ForegroundColor Gray
    Remove-Item fire_station.db
}

# Erstelle Verzeichnisse
Write-Host "   Erstelle Upload- und Backup-Verzeichnisse..." -ForegroundColor Gray
New-Item -ItemType Directory -Force -Path "uploads/logo" | Out-Null
New-Item -ItemType Directory -Force -Path "backups" | Out-Null

Write-Host "   ✓ Backend eingerichtet" -ForegroundColor Green

# Frontend Setup
Write-Host ""
Write-Host "4. Frontend einrichten..." -ForegroundColor Yellow
Set-Location ..\frontend

# Installiere Dependencies
Write-Host "   Installiere Node-Pakete..." -ForegroundColor Gray
npm install

# Erstelle .env wenn nicht vorhanden
if (-not (Test-Path ".env")) {
    Write-Host "   Erstelle .env Datei..." -ForegroundColor Gray
    Copy-Item ".env.development" ".env"
}

Write-Host "   ✓ Frontend eingerichtet" -ForegroundColor Green

# Zurück zum Hauptverzeichnis
Set-Location ..

Write-Host ""
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "✓ Setup abgeschlossen!" -ForegroundColor Green
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Nächste Schritte:" -ForegroundColor Yellow
Write-Host "1. Starte die Anwendung mit: .\start-app.ps1" -ForegroundColor White
Write-Host "2. Öffne im Browser: http://localhost:5173" -ForegroundColor White
Write-Host "3. Admin-Login: Benutzer 'admin', Passwort 'feuerwehr2025'" -ForegroundColor White
Write-Host ""
Write-Host "Hinweis: Passe die IP-Adresse in backend\.env (CORS_ORIGINS)" -ForegroundColor Yellow
Write-Host "         und frontend\.env.production (VITE_API_URL) für den" -ForegroundColor Yellow
Write-Host "         Produktiv-Betrieb an!" -ForegroundColor Yellow
Write-Host ""
