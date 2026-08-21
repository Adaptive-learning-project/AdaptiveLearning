@echo off
REM Adaptive Learning Platform - Master Startup Script
REM This script starts all required services in new windows

echo.
echo ================================================
echo ADAPTIVE LEARNING PLATFORM - STARTUP
echo ================================================
echo.

REM Check prerequisites
echo [1/4] Checking MongoDB...
tasklist | find /i "mongod" >nul
if errorlevel 1 (
    echo [!] MongoDB does not appear to be running
    echo    Please start MongoDB before proceeding:
    echo    Option 1: net start MongoDB (if installed as service)
    echo    Option 2: mongod --dbpath "C:\data\db" (manual)
    echo.
    set /p mongodb="Start MongoDB now? (y/n): "
    if /i "%mongodb%"=="y" (
        start mongod --dbpath "C:\data\db"
        echo [✓] MongoDB starting in new window...
        timeout /t 3 /nobreak
    )
) else (
    echo [✓] MongoDB is running
)

REM Start Backend
echo [2/4] Starting Backend Server...
cd /d "D:\AdaptiveLearning\person2-backend"
start "Backend - Person2" cmd /k "python -m uvicorn app.main:app --host localhost --port 5000 --reload"
timeout /t 3 /nobreak

REM Start Frontend
echo [3/4] Starting Frontend Dev Server...
cd /d "D:\AdaptiveLearning\frontend"
start "Frontend - React" cmd /k "npm run dev"
timeout /t 3 /nobreak

REM Generate Content (if needed)
echo [4/4] Checking MongoDB content...
cd /d "D:\AdaptiveLearning\poc\LLM generation"
python -c "from db import count_documents; count = count_documents(); print(f'[✓] Found {count} content documents' if count > 0 else '[!] No content found - generating...')" >nul 2>&1

REM Open browser
echo.
echo ================================================
echo [✓] All services started!
echo ================================================
echo.
echo Opening application in browser...
timeout /t 2 /nobreak
start http://localhost:5173
echo.
echo Services running:
echo   - Backend:   http://localhost:5000
echo   - Frontend:  http://localhost:5173
echo   - MongoDB:   localhost:27017
echo.
echo Note: Check browser console (F12) for any errors
echo      Ctrl+C in each window to stop services
echo.
