@echo off
REM Chill Cast - Development Server Starter for Windows

echo.
echo ╔═══════════════════════════════════════╗
echo ║    Chill Cast - Watch Party Platform   ║
echo ║         Starting Servers...            ║
echo ╚═══════════════════════════════════════╝
echo.

REM Check if Node.js is installed
where node >nul 2>nul
if %errorlevel% neq 0 (
    echo ❌ Node.js is not installed or not in PATH
    echo Please download from https://nodejs.org/
    pause
    exit /b 1
)

echo ✓ Node.js found
echo.

REM Install dependencies if needed
if not exist "server\node_modules" (
    echo Installing backend dependencies...
    cd server
    call npm install
    cd ..
)

if not exist "client\node_modules" (
    echo Installing frontend dependencies...
    cd client
    call npm install
    cd ..
)

echo.
echo ╔═════════════════════════════════════════╗
echo ║  Starting Backend Server (port 5000)    ║
echo ╚═════════════════════════════════════════╝
echo.

REM Start backend in a new window
start "Chill Cast Backend" cmd /k "cd server && npm run dev"

REM Wait a bit for backend to start
timeout /t 5 /nobreak

echo.
echo ╔═════════════════════════════════════════╗
echo ║  Starting Frontend Server (port 5173)   ║
echo ╚═════════════════════════════════════════╝
echo.

REM Start frontend in a new window
start "Chill Cast Frontend" cmd /k "cd client && npm run dev"

echo.
echo ✓ Servers are starting!
echo.
echo 📱 Frontend:  http://localhost:5173 (or 5174 if 5173 is taken)
echo 🔌 Backend:   http://localhost:5000
echo 🔥 Database:  Firebase Firestore
echo.
echo Press any key to open frontend in browser...
pause

REM Open in default browser
start http://localhost:5173

echo.
echo ✓ Opening browser...
echo Tip: Keep these windows open. Close them to stop the servers.
echo.
