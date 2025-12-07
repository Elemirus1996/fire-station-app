#!/bin/bash

# Quick Check Script - Prüfe warum Installation nicht lief

echo "=================================================="
echo "🔍 Installations-Diagnose"
echo "=================================================="
echo ""

echo "1️⃣  Prüfe aktuelles Verzeichnis:"
pwd
echo ""

echo "2️⃣  Prüfe ob install-rpi5.sh existiert:"
ls -la install/install-rpi5.sh
echo ""

echo "3️⃣  Prüfe Berechtigungen:"
if [ -x "install/install-rpi5.sh" ]; then
    echo "✅ Datei ist ausführbar"
else
    echo "❌ Datei ist NICHT ausführbar"
    echo "   Führe aus: chmod +x install/install-rpi5.sh"
fi
echo ""

echo "4️⃣  Zeige erste Zeilen der Datei:"
head -n 5 install/install-rpi5.sh
echo ""

echo "5️⃣  Prüfe System-Info:"
echo "   OS: $(uname -a)"
echo "   User: $(whoami)"
echo "   Shell: $SHELL"
echo ""

echo "=================================================="
echo "🚀 Installations-Optionen:"
echo "=================================================="
echo ""
echo "Option 1 - Automatische Installation:"
echo "   sudo ./install/install-rpi5.sh"
echo ""
echo "Option 2 - Mit Bash explizit:"
echo "   sudo bash install/install-rpi5.sh"
echo ""
echo "Option 3 - Schritt für Schritt (falls Probleme):"
echo "   cd install"
echo "   sudo bash install-rpi5.sh"
echo ""
echo "Option 4 - Logs während Installation:"
echo "   sudo ./install/install-rpi5.sh 2>&1 | tee install.log"
echo ""

echo "=================================================="
echo "⚠️  Häufige Probleme:"
echo "=================================================="
echo ""
echo "Problem 1: 'Permission denied'"
echo "   Lösung: chmod +x install/install-rpi5.sh"
echo ""
echo "Problem 2: 'Command not found'"
echo "   Lösung: sudo bash install/install-rpi5.sh"
echo ""
echo "Problem 3: 'No such file or directory'"
echo "   Lösung: cd ~/fire-station-app"
echo ""
