@echo off
REM Adaptive Learning Platform - Seed Content Script

echo.
echo ================================================
echo Seeding MongoDB with Learning Content
echo ================================================
echo.

REM Check if Python is installed
python --version >nul 2>&1
if errorlevel 1 (
    echo [ERROR] Python is not installed
    pause
    exit /b 1
)

REM Change to LLM generation directory
cd /d "D:\AdaptiveLearning\poc\LLM generation"

echo [1/2] Installing dependencies...
pip install -r requirements.txt >nul 2>&1

echo [2/2] Generating content (mock mode - no Ollama required)...
echo.
python generate_content.py --mock

echo.
echo ================================================
if errorlevel 0 (
    echo [✓] Content seeded successfully!
) else (
    echo [!] Content seeding completed with warnings
)
echo ================================================
echo.
pause
