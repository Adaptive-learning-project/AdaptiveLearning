@echo off
REM Adaptive Learning Platform - Frontend Startup Script

echo.
echo ========================================
echo Adaptive Learning Platform - Frontend
echo ========================================
echo.

REM Check if Node is installed
node --version >nul 2>&1
if errorlevel 1 (
    echo [ERROR] Node.js is not installed or not in PATH
    echo Please install Node.js from https://nodejs.org
    pause
    exit /b 1
)

echo [✓] Node.js found: 
node --version

REM Check if npm is installed
npm --version >nul 2>&1
if errorlevel 1 (
    echo [ERROR] npm is not installed or not in PATH
    pause
    exit /b 1
)

echo [✓] npm found: 
npm --version

echo.
echo Installing dependencies...
call npm install

echo.
echo [✓] Dependencies installed

echo.
echo Starting frontend server on http://localhost:5173
echo.
echo Press Ctrl+C to stop the server
echo.

REM Start the dev server
call npm run dev

pause
