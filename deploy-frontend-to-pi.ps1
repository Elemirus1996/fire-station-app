# Deploy Frontend to Raspberry Pi
# Usage: .\deploy-frontend-to-pi.ps1 <pi-ip-address>

param(
    [Parameter(Mandatory=$true)]
    [string]$PiHost
)

Write-Host "🚀 Deploying Frontend to Raspberry Pi at $PiHost" -ForegroundColor Cyan

# Build frontend
Write-Host "`n📦 Building frontend..." -ForegroundColor Yellow
Set-Location "c:\Users\pauls\Desktop\fire-station-app\frontend"
npm run build

if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Build failed!" -ForegroundColor Red
    exit 1
}

# Copy dist folder to Pi
Write-Host "`n📤 Copying files to Raspberry Pi..." -ForegroundColor Yellow
scp -r dist/* "pi@${PiHost}:/home/pi/fire-station-app/frontend/dist/"

if ($LASTEXITCODE -eq 0) {
    Write-Host "`n✅ Deployment successful!" -ForegroundColor Green
    Write-Host "The frontend has been updated on the Raspberry Pi." -ForegroundColor Green
    Write-Host "The changes should be visible immediately (no restart needed)." -ForegroundColor Green
} else {
    Write-Host "`n❌ Deployment failed!" -ForegroundColor Red
    Write-Host "Please check your SSH connection to the Raspberry Pi." -ForegroundColor Red
}

Set-Location "c:\Users\pauls\Desktop\fire-station-app"
