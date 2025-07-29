@echo off
title Medical Imaging Report System
echo.
echo ========================================
echo   MEDICAL IMAGING REPORT SYSTEM
echo ========================================
echo.
echo Starting the application...
echo.

REM Check if Node.js is installed
node --version >nul 2>&1
if errorlevel 1 (
    echo ERROR: Node.js is not installed!
    echo Please install Node.js from https://nodejs.org/
    pause
    exit /b 1
)

REM Check if dependencies are installed
if not exist "node_modules" (
    echo Installing dependencies...
    npm install
    if errorlevel 1 (
        echo ERROR: Failed to install dependencies!
        pause
        exit /b 1
    )
)

REM Start the application
echo.
echo Starting Medical Imaging Report System...
echo.
node server.js

pause