# Feuerwehr Anwesenheitssystem - Start Skript
# Startet Backend und Frontend gleichzeitig

Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "Starte Feuerwehr Anwesenheitssystem" -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host ""

# Starte Backend
Write-Host "Starte Backend..." -ForegroundColor Yellow
$backendJob = Start-Job -ScriptBlock {
    Set-Location $using:PWD\backend
    & .\venv\Scripts\Activate.ps1
    python main.py
}

# Warte kurz damit Backend startet
Start-Sleep -Seconds 3

# Starte Frontend
Write-Host "Starte Frontend..." -ForegroundColor Yellow
$frontendJob = Start-Job -ScriptBlock {
    Set-Location $using:PWD\frontend
    npm run dev
}

Write-Host ""
Write-Host "✓ Anwendung gestartet!" -ForegroundColor Green
Write-Host ""
Write-Host "Backend:  http://localhost:8000" -ForegroundColor White
Write-Host "Frontend: http://localhost:5173" -ForegroundColor White
Write-Host "API Docs: http://localhost:8000/docs" -ForegroundColor White
Write-Host ""
Write-Host "Drücke Strg+C zum Beenden" -ForegroundColor Yellow
Write-Host ""

# Zeige Logs
try {
    while ($true) {
        # Backend Logs
        $backendOutput = Receive-Job -Job $backendJob
        if ($backendOutput) {
            Write-Host "[BACKEND] " -ForegroundColor Blue -NoNewline
            Write-Host $backendOutput
        }
        
        # Frontend Logs
        $frontendOutput = Receive-Job -Job $frontendJob
        if ($frontendOutput) {
            Write-Host "[FRONTEND] " -ForegroundColor Green -NoNewline
            Write-Host $frontendOutput
        }
        
        Start-Sleep -Milliseconds 500
    }
} finally {
    Write-Host ""
    Write-Host "Beende Anwendung..." -ForegroundColor Yellow
    Stop-Job -Job $backendJob, $frontendJob
    Remove-Job -Job $backendJob, $frontendJob
    Write-Host "✓ Anwendung beendet" -ForegroundColor Green
}
