# start-app.ps1
# Startet Backend und Frontend in neuen PowerShell-Fenstern.
# Vorher: versucht Prozesse auf den konfigurierten Ports zu beenden.
# Editiere die Variablen unten falls nötig.

# --- Konfiguration ---
$RepoRoot      = "$HOME\Desktop\fire-station-app"
$BackendDir    = Join-Path $RepoRoot "backend"
$FrontendDir   = Join-Path $RepoRoot "frontend"
$BackendPort   = 8000
$FrontendPort  = 5173
$BackendStartCommand  = "python main.py"
$FrontendStartCommand = "npm run dev -- --host"

# --- Helper-Funktion: Prozesse an Port beenden ---
function Stop-PortProcess {
    param($Port)

    Write-Host "Prüfe Port $Port ..." -ForegroundColor Cyan

    if (Get-Command Get-NetTCPConnection -ErrorAction SilentlyContinue) {
        $conns = Get-NetTCPConnection -LocalPort $Port -State Listen -ErrorAction SilentlyContinue
        if ($conns) {
            $pids = $conns | Select-Object -ExpandProperty OwningProcess -Unique
            foreach ($pid in $pids) {
                try {
                    $proc = Get-Process -Id $pid -ErrorAction Stop
                    Write-Host "Beende Prozess $($proc.ProcessName) (PID $pid) auf Port $Port ..." -ForegroundColor Yellow
                    Stop-Process -Id $pid -Force -ErrorAction Stop
                    Write-Host "Erfolgreich beendet: PID $pid" -ForegroundColor Green
                } catch {
                    Write-Warning "Konnte PID $pid nicht beenden: $_"
                }
            }
        } else {
            Write-Host "Kein Prozess auf Port $Port gefunden." -ForegroundColor DarkYellow
        }
    } else {
        # Fallback für ältere PowerShell: netstat parsen
        $out = netstat -ano | Select-String ":$Port\s"
        if ($out) {
            $pids = ($out -replace '^\s*TCP\s+\S+\s+\S+\s+\S+\s+(\d+)$','$1') | Sort-Object -Unique
            foreach ($pid in $pids) {
                if ($pid -and $pid -ne '') {
                    try {
                        $proc = Get-Process -Id $pid -ErrorAction Stop
                        Write-Host "Beende Prozess $($proc.ProcessName) (PID $pid) auf Port $Port ..." -ForegroundColor Yellow
                        Stop-Process -Id $pid -Force -ErrorAction Stop
                        Write-Host "Erfolgreich beendet: PID $pid" -ForegroundColor Green
                    } catch {
                        Write-Warning "Konnte PID $pid nicht beenden: $_"
                    }
                }
            }
        } else {
            Write-Host "Kein Prozess auf Port $Port gefunden (netstat fallback)." -ForegroundColor DarkYellow
        }
    }
}

# --- Hauptablauf ---
Write-Host "Stoppe vorhandene Backend/Frontend-Prozesse (falls vorhanden) ..." -ForegroundColor Cyan
Stop-PortProcess -Port $BackendPort
Stop-PortProcess -Port $FrontendPort

# Kurze Pause, damit Ports freigegeben werden
Start-Sleep -Seconds 1

# Optional: prüfe, ob Verzeichnisse existieren
if (-not (Test-Path $BackendDir)) {
    Write-Error "Backend-Verzeichnis nicht gefunden: $BackendDir"
    exit 1
}
if (-not (Test-Path $FrontendDir)) {
    Write-Error "Frontend-Verzeichnis nicht gefunden: $FrontendDir"
    exit 1
}

# --- Backend starten ---
Write-Host "Starte Backend in neuem PowerShell-Fenster..." -ForegroundColor Cyan
$backendCmd = "Set-Location -Path '$BackendDir'; if (Test-Path '.\venv\Scripts\Activate.ps1') { . '.\venv\Scripts\Activate.ps1' } else { Write-Host 'Warning: venv activation script nicht gefunden.' }; $BackendStartCommand"
Start-Process -FilePath powershell -ArgumentList '-NoExit', '-Command', $backendCmd

# Kurze Pause bevor Frontend gestartet wird
Start-Sleep -Seconds 2

# --- Frontend starten ---
Write-Host "Starte Frontend in neuem PowerShell-Fenster..." -ForegroundColor Cyan
$frontendCmd = "Set-Location -Path '$FrontendDir'; $FrontendStartCommand"
Start-Process -FilePath powershell -ArgumentList '-NoExit', '-Command', $frontendCmd

Write-Host "Startbefehle wurden gestartet. Warte kurz und prüfe die Fenster." -ForegroundColor Green
Write-Host "Backend-Port: $BackendPort, Frontend-Port: $FrontendPort" -ForegroundColor Green