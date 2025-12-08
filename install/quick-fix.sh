#!/bin/bash

#############################################
# Schneller Fix für Admin und Services
#############################################

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

print_success() { echo -e "${GREEN}✓ $1${NC}"; }
print_error() { echo -e "${RED}✗ $1${NC}"; }
print_info() { echo -e "${YELLOW}ℹ $1${NC}"; }

clear
echo "=========================================="
echo "🔧 Schnell-Fix"
echo "=========================================="
echo ""

# 1. Admin erstellen
print_info "Erstelle Admin-User..."
cd /opt/feuerwehr-app/backend
source venv/bin/activate

python3 << 'EOF'
import sys
sys.path.insert(0, '/opt/feuerwehr-app/backend')

from app.database import SessionLocal
from app.models import AdminUser
from app.utils.auth import get_password_hash

db = SessionLocal()

try:
    # Lösche alten Admin falls vorhanden
    db.query(AdminUser).filter(AdminUser.username == "admin").delete()
    db.commit()
    
    # Erstelle neuen Admin
    admin = AdminUser(
        username="admin",
        hashed_password=get_password_hash("admin"),
        role="admin"
    )
    db.add(admin)
    db.commit()
    print("✓ Admin erstellt: username=admin, password=admin")
except Exception as e:
    print(f"✗ Fehler: {e}")
    import traceback
    traceback.print_exc()
finally:
    db.close()
EOF

deactivate

# 2. Backend testen
print_info "Teste Backend..."
cd /opt/feuerwehr-app/backend
source venv/bin/activate

timeout 5 python main.py &
BACKEND_PID=$!
sleep 3

if ps -p $BACKEND_PID > /dev/null; then
    print_success "Backend startet erfolgreich"
    kill $BACKEND_PID 2>/dev/null
else
    print_error "Backend startet NICHT"
    print_info "Zeige Fehler:"
    python main.py
fi

deactivate

# 3. Services neu starten
print_info "Starte Services neu..."
sudo systemctl restart feuerwehr-backend
sleep 2
sudo systemctl restart feuerwehr-frontend
sleep 2

# 4. Status
echo ""
echo "=========================================="
print_info "Status:"
if sudo systemctl is-active --quiet feuerwehr-backend; then
    print_success "Backend läuft"
else
    print_error "Backend läuft NICHT"
    echo "Logs:"
    sudo journalctl -u feuerwehr-backend -n 20 --no-pager
fi

if sudo systemctl is-active --quiet feuerwehr-frontend; then
    print_success "Frontend läuft"
else
    print_error "Frontend läuft NICHT"
    echo "Logs:"
    sudo journalctl -u feuerwehr-frontend -n 20 --no-pager
fi

IP_ADDRESS=$(hostname -I | awk '{print $1}')
echo ""
echo "🌐 Login: http://$IP_ADDRESS:5173/admin/login"
echo "👤 Username: admin"
echo "🔑 Password: admin"
echo "=========================================="
