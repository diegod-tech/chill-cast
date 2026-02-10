#!/bin/bash

# Chill Cast - Development Server Starter for macOS/Linux

echo ""
echo "╔═══════════════════════════════════════╗"
echo "║    Chill Cast - Watch Party Platform   ║"
echo "║         Starting Servers...            ║"
echo "╚═══════════════════════════════════════╝"
echo ""

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed"
    echo "Please download from https://nodejs.org/"
    exit 1
fi

echo "✓ Node.js found: $(node -v)"
echo ""

# Check if MongoDB is running
if ! nc -z localhost 27017 2>/dev/null; then
    echo "⚠️  MongoDB is not running on localhost:27017"
    echo "Start MongoDB with: mongod"
    echo ""
fi

# Install dependencies if needed
if [ ! -d "server/node_modules" ]; then
    echo "Installing backend dependencies..."
    cd server
    npm install
    cd ..
fi

if [ ! -d "client/node_modules" ]; then
    echo "Installing frontend dependencies..."
    cd client
    npm install
    cd ..
fi

echo ""
echo "╔═════════════════════════════════════════╗"
echo "║  Starting Backend Server (port 5000)    ║"
echo "╚═════════════════════════════════════════╝"
echo ""

# Start backend
cd server
npm run dev &
BACKEND_PID=$!
cd ..

# Wait for backend to start
sleep 2

echo ""
echo "╔═════════════════════════════════════════╗"
echo "║  Starting Frontend Server (port 5173)   ║"
echo "╚═════════════════════════════════════════╝"
echo ""

# Start frontend
cd client
npm run dev &
FRONTEND_PID=$!
cd ..

echo ""
echo "✓ Servers are starting!"
echo ""
echo "📱 Frontend:  http://localhost:5173"
echo "🔌 Backend:   http://localhost:5000"
echo "💾 Database:  mongodb://localhost:27017"
echo ""

# Open in default browser
if command -v xdg-open &> /dev/null; then
    xdg-open http://localhost:5173
elif command -v open &> /dev/null; then
    open http://localhost:5173
fi

echo "✓ Opening browser..."
echo ""
echo "Press Ctrl+C to stop all servers"
echo ""

# Keep script running
wait
