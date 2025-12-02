#!/bin/bash

# Quick start script for development

echo "🚒 Starte Feuerwehr Anwesenheitssystem..."

# Start backend in background
echo "Starting Backend..."
cd backend
source venv/bin/activate
python main.py > /tmp/fire-station-backend.log 2>&1 &
BACKEND_PID=$!
echo "Backend PID: $BACKEND_PID"

cd ..

# Wait for backend to start
sleep 3

# Start frontend in background
echo "Starting Frontend..."
cd frontend
npm run dev > /tmp/fire-station-frontend.log 2>&1 &
FRONTEND_PID=$!
echo "Frontend PID: $FRONTEND_PID"

cd ..

echo ""
echo "✅ System gestartet!"
echo ""
echo "🌐 URLs:"
echo "   Frontend: http://localhost:5173"
echo "   Backend API: http://localhost:8000"
echo "   API Docs: http://localhost:8000/docs"
echo ""
echo "📝 Logs:"
echo "   Backend: tail -f /tmp/fire-station-backend.log"
echo "   Frontend: tail -f /tmp/fire-station-frontend.log"
echo ""
echo "🛑 Zum Stoppen:"
echo "   kill $BACKEND_PID $FRONTEND_PID"
echo ""
echo "   oder"
echo "   pkill -f 'python main.py'"
echo "   pkill -f 'vite'"
echo ""
