# Test-Script für Raspberry Pi nach Installation

$PI_IP = "192.168.178.250"

Write-Host "==================================================" -ForegroundColor Cyan
Write-Host "🍓 Raspberry Pi 5 - System Test" -ForegroundColor Cyan
Write-Host "==================================================" -ForegroundColor Cyan
Write-Host ""

Write-Host "Teste Verbindung zu Pi: $PI_IP" -ForegroundColor Yellow
Write-Host ""

Write-Host "Führe folgende Befehle auf dem Pi aus:" -ForegroundColor Green
Write-Host ""

Write-Host "1️⃣  Backend Status prüfen:" -ForegroundColor White
Write-Host "   sudo systemctl status fire-station-backend" -ForegroundColor Gray
Write-Host ""

Write-Host "2️⃣  Frontend Status prüfen:" -ForegroundColor White
Write-Host "   sudo systemctl status fire-station-frontend" -ForegroundColor Gray
Write-Host ""

Write-Host "3️⃣  API testen:" -ForegroundColor White
Write-Host "   curl http://localhost:8000/api/health" -ForegroundColor Gray
Write-Host ""

Write-Host "4️⃣  Logs ansehen:" -ForegroundColor White
Write-Host "   sudo journalctl -u fire-station-backend -n 20" -ForegroundColor Gray
Write-Host "   sudo journalctl -u fire-station-frontend -n 20" -ForegroundColor Gray
Write-Host ""

Write-Host "5️⃣  Datenbank prüfen:" -ForegroundColor White
Write-Host "   cd ~/fire-station-app/backend" -ForegroundColor Gray
Write-Host "   source venv/bin/activate" -ForegroundColor Gray
Write-Host "   python check_db.py" -ForegroundColor Gray
Write-Host ""

Write-Host "==================================================" -ForegroundColor Cyan
Write-Host "🌐 Von Windows aus testen:" -ForegroundColor Cyan
Write-Host "==================================================" -ForegroundColor Cyan
Write-Host ""

Write-Host "Backend API Test:" -ForegroundColor Yellow
try {
    $response = Invoke-RestMethod -Uri "http://${PI_IP}:8000/api/health" -TimeoutSec 5
    Write-Host "✅ Backend erreichbar!" -ForegroundColor Green
    Write-Host "   Response: $($response | ConvertTo-Json)" -ForegroundColor Gray
} catch {
    Write-Host "❌ Backend nicht erreichbar" -ForegroundColor Red
    Write-Host "   Fehler: $($_.Exception.Message)" -ForegroundColor Gray
}
Write-Host ""

Write-Host "Frontend Test:" -ForegroundColor Yellow
try {
    $response = Invoke-WebRequest -Uri "http://${PI_IP}:5173" -TimeoutSec 5 -UseBasicParsing
    Write-Host "✅ Frontend erreichbar!" -ForegroundColor Green
    Write-Host "   Status Code: $($response.StatusCode)" -ForegroundColor Gray
} catch {
    Write-Host "❌ Frontend nicht erreichbar" -ForegroundColor Red
    Write-Host "   Fehler: $($_.Exception.Message)" -ForegroundColor Gray
}
Write-Host ""

Write-Host "==================================================" -ForegroundColor Cyan
Write-Host "🔗 Öffne im Browser:" -ForegroundColor Cyan
Write-Host "==================================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "   Frontend: http://${PI_IP}:5173" -ForegroundColor White
Write-Host "   Backend API Docs: http://${PI_IP}:8000/docs" -ForegroundColor White
Write-Host ""

Write-Host "==================================================" -ForegroundColor Cyan
Write-Host "📋 Admin Login:" -ForegroundColor Cyan
Write-Host "==================================================" -ForegroundColor Cyan
Write-Host "   Username: admin" -ForegroundColor White
Write-Host "   Password: admin123" -ForegroundColor White
Write-Host ""

Write-Host "Drücke eine Taste um Browser zu öffnen..." -ForegroundColor Yellow
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")

Start-Process "http://${PI_IP}:5173"
