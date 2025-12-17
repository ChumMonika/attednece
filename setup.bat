@echo off
REM University Attendance System - Quick Setup for Windows

echo.
echo ====================================
echo  University Attendance System Setup
echo ====================================
echo.

REM Check if node is installed
node -v >nul 2>&1
if errorlevel 1 (
    echo ERROR: Node.js is not installed!
    echo Please download from: https://nodejs.org/
    pause
    exit /b 1
)

echo [1/5] Checking Node.js installation... OK
echo.

REM Check if .env file exists
if not exist .env (
    echo [2/5] Creating .env file...
    (
        echo DB_HOST=localhost
        echo DB_PORT=3306
        echo DB_USER=root
        echo DB_PASSWORD=your_mysql_password
        echo DB_NAME=university_staff_tracker
        echo NODE_ENV=development
        echo PORT=5000
        echo SESSION_SECRET=your_session_secret
    ) > .env
    echo IMPORTANT: Edit .env file with your MySQL credentials!
    echo.
    pause
) else (
    echo [2/5] .env file already exists... OK
)
echo.

REM Install dependencies
echo [3/5] Installing npm dependencies...
call npm install
if errorlevel 1 (
    echo ERROR: Failed to install dependencies!
    exit /b 1
)
echo OK
echo.

REM Start application
echo [4/5] Starting development server...
echo.
echo Server will run at: http://localhost:5000
echo.
echo Press Ctrl+C to stop the server
echo.

call npm run dev
