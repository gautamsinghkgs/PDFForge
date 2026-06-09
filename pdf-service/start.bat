@echo off
echo Starting Python PDF Conversion Microservice...
echo.

REM Check if Python is installed
python --version >nul 2>&1
if %errorlevel% neq 0 (
    echo Python is not installed. Please install Python 3.11 or higher.
    pause
    exit /b 1
)

REM Check if we're in the correct directory
if not exist "requirements.txt" (
    echo requirements.txt not found. Please run this script from the pdf-service directory.
    pause
    exit /b 1
)

REM Install Python dependencies
echo Installing Python dependencies...
pip install -r requirements.txt

if %errorlevel% neq 0 (
    echo Failed to install Python dependencies.
    pause
    exit /b 1
)

echo.
echo Starting Python microservice on http://localhost:8000
echo Press Ctrl+C to stop the service
echo.

REM Start the FastAPI server
python app.py
