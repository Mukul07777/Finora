@echo off
cd /d "%~dp0"

if not exist "node_modules" (
    echo Installing dependencies...
    call npm install
    if errorlevel 1 (
        echo Install failed - see output above.
        pause
        exit /b 1
    )
)

echo Starting Finora dev server...
start "Finora Dev Server" cmd /k npm run dev

timeout /t 5 /nobreak >nul
start http://localhost:3000
