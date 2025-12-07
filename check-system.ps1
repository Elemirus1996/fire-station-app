# Feuerwehr Anwesenheitssystem - Schnellcheck
# Prueft ob alle Komponenten funktionieren

Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "System-Check" -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host ""

$allOk = $true

# 1. Python Check
Write-Host "1. Python Installation:" -ForegroundColor Yellow
try {
    $pythonVersion = python --version 2>&1
    Write-Host "   OK $pythonVersion" -ForegroundColor Green
} catch {
    Write-Host "   FEHLER Nicht installiert" -ForegroundColor Red
    $allOk = $false
}

# 2. Node.js Check
Write-Host "2. Node.js Installation:" -ForegroundColor Yellow
try {
    $nodeVersion = node --version 2>&1
    Write-Host "   OK $nodeVersion" -ForegroundColor Green
} catch {
    Write-Host "   FEHLER Nicht installiert" -ForegroundColor Red
    $allOk = $false
}

# 3. Backend Check
Write-Host "3. Backend:" -ForegroundColor Yellow
if (Test-Path "backend/venv") {
    Write-Host "   OK Virtuelle Umgebung vorhanden" -ForegroundColor Green
} else {
    Write-Host "   FEHLER Virtuelle Umgebung fehlt - Fuehre setup-clean.ps1 aus" -ForegroundColor Red
    $allOk = $false
}

if (Test-Path "backend/.env") {
    Write-Host "   OK .env Datei vorhanden" -ForegroundColor Green
} else {
    Write-Host "   WARNUNG .env Datei fehlt - Wird bei Setup erstellt" -ForegroundColor Yellow
}

if (Test-Path "backend/fire_station.db") {
    Write-Host "   OK Datenbank vorhanden" -ForegroundColor Green
} else {
    Write-Host "   INFO Datenbank wird beim ersten Start erstellt" -ForegroundColor Cyan
}

# 4. Frontend Check
Write-Host "4. Frontend:" -ForegroundColor Yellow
if (Test-Path "frontend/node_modules") {
    Write-Host "   OK Node-Pakete installiert" -ForegroundColor Green
} else {
    Write-Host "   FEHLER Node-Pakete fehlen - Fuehre setup-clean.ps1 aus" -ForegroundColor Red
    $allOk = $false
}

if (Test-Path "frontend/.env") {
    Write-Host "   OK .env Datei vorhanden" -ForegroundColor Green
} else {
    Write-Host "   WARNUNG .env Datei fehlt - Wird bei Setup erstellt" -ForegroundColor Yellow
}

# 5. Verzeichnisse Check
Write-Host "5. Verzeichnisse:" -ForegroundColor Yellow
$dirs = @("backend/uploads", "backend/backups", "backend/uploads/logo")
foreach ($dir in $dirs) {
    if (Test-Path $dir) {
        Write-Host "   OK $dir" -ForegroundColor Green
    } else {
        Write-Host "   WARNUNG $dir fehlt - Wird bei Setup erstellt" -ForegroundColor Yellow
    }
}

# 6. Port Check
Write-Host "6. Ports:" -ForegroundColor Yellow
$portsInUse = @()

$port8000 = Get-NetTCPConnection -LocalPort 8000 -ErrorAction SilentlyContinue
if ($port8000) {
    Write-Host "   WARNUNG Port 8000 bereits in Benutzung" -ForegroundColor Yellow
    $portsInUse += 8000
} else {
    Write-Host "   OK Port 8000 verfuegbar" -ForegroundColor Green
}

$port5173 = Get-NetTCPConnection -LocalPort 5173 -ErrorAction SilentlyContinue
if ($port5173) {
    Write-Host "   WARNUNG Port 5173 bereits in Benutzung" -ForegroundColor Yellow
    $portsInUse += 5173
} else {
    Write-Host "   OK Port 5173 verfuegbar" -ForegroundColor Green
}

Write-Host ""
Write-Host "==========================================" -ForegroundColor Cyan

if ($allOk -and $portsInUse.Count -eq 0) {
    Write-Host "OK Alle Checks bestanden!" -ForegroundColor Green
    Write-Host ""
    Write-Host "Naechste Schritte:" -ForegroundColor Yellow
    Write-Host "1. Fuehre .\setup-clean.ps1 aus (falls noch nicht gemacht)" -ForegroundColor White
    Write-Host "2. Starte mit .\start-clean.ps1" -ForegroundColor White
} elseif ($portsInUse.Count -gt 0) {
    Write-Host "WARNUNG Ports in Benutzung!" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "Die Anwendung laeuft moeglicherweise bereits." -ForegroundColor White
    $portsString = $portsInUse -join ', '
    Write-Host "Falls nicht, beende die Programme auf den Ports: $portsString" -ForegroundColor White
} else {
    Write-Host "FEHLER Setup erforderlich" -ForegroundColor Red
    Write-Host ""
    Write-Host "Fuehre .\setup-clean.ps1 aus" -ForegroundColor White
}

Write-Host "==========================================" -ForegroundColor Cyan
Write-Host ""
