#!/bin/bash

# Feuerwehr Anwesenheitssystem - Setup Script
# Dieses Script installiert alle Abhängigkeiten und startet das System

set -e

echo "🚒 Feuerwehr Anwesenheitssystem - Installation"
echo "=============================================="
echo ""

# Check Python version
echo "Prüfe Python-Version..."
if ! command -v python3 &> /dev/null; then
    echo "❌ Python 3 ist nicht installiert. Bitte installieren Sie Python 3.11 oder höher."
    exit 1
fi

PYTHON_VERSION=$(python3 -c 'import sys; print(f"{sys.version_info.major}.{sys.version_info.minor}")')
echo "✅ Python $PYTHON_VERSION gefunden"

# Check Node.js version
echo "Prüfe Node.js-Version..."
if ! command -v node &> /dev/null; then
    echo "❌ Node.js ist nicht installiert. Bitte installieren Sie Node.js 18 oder höher."
    exit 1
fi

NODE_VERSION=$(node -v)
echo "✅ Node.js $NODE_VERSION gefunden"

# Setup Backend
echo ""
echo "📦 Backend-Setup..."
cd backend

if [ ! -d "venv" ]; then
    echo "Erstelle virtuelle Umgebung..."
    python3 -m venv venv
fi

echo "Aktiviere virtuelle Umgebung..."
source venv/bin/activate

echo "Installiere Backend-Abhängigkeiten..."
pip install -q -r requirements.txt

echo "✅ Backend-Setup abgeschlossen"

cd ..

# Setup Frontend
echo ""
echo "📦 Frontend-Setup..."
cd frontend

if [ ! -d "node_modules" ]; then
    echo "Installiere Frontend-Abhängigkeiten..."
    npm install
else
    echo "Frontend-Abhängigkeiten bereits installiert"
fi

echo "✅ Frontend-Setup abgeschlossen"

cd ..

# Create directories
echo ""
echo "📁 Erstelle Verzeichnisse..."
mkdir -p backend/uploads/logo
mkdir -p backend/backups

echo ""
echo "=============================================="
echo "✅ Installation erfolgreich abgeschlossen!"
echo ""
echo "🚀 Um das System zu starten:"
echo ""
echo "   Terminal 1 (Backend):"
echo "   $ cd backend"
echo "   $ source venv/bin/activate"
echo "   $ python main.py"
echo ""
echo "   Terminal 2 (Frontend):"
echo "   $ cd frontend"
echo "   $ npm run dev"
echo ""
echo "🔐 Standard-Login:"
echo "   Benutzername: admin"
echo "   Passwort: feuerwehr2025"
echo ""
echo "🌐 URLs:"
echo "   Backend API: http://localhost:8000"
echo "   Frontend: http://localhost:5173"
echo "   API Docs: http://localhost:8000/docs"
echo ""
