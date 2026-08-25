@echo off
REM Adaptive Learning Platform - Backend Startup Script

echo.
echo ========================================
echo Adaptive Learning Platform - Backend
echo ========================================
echo.

REM Check if Python is installed
python --version >nul 2>&1
if errorlevel 1 (
    echo [ERROR] Python is not installed or not in PATH
    echo Please install Python 3.8+ from https://www.python.org
    pause
    exit /b 1
)

echo [✓] Python found

REM Check if requirements are installed
echo.
echo Installing/verifying dependencies...
pip install -r requirements.txt

echo.
echo [✓] Dependencies installed

echo.
echo Starting backend server on http://localhost:5000
echo.
echo Press Ctrl+C to stop the server
echo.

REM Start the server
python -m uvicorn app.main:app --host 0.0.0.0 --port 5000 --reload

pause
