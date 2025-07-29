@echo off
echo ========================================
echo   Medical Imaging System - MongoDB Setup
echo ========================================
echo.

echo 1. Installing MongoDB dependencies...
call npm install

echo.
echo 2. Checking if MongoDB is running...
tasklist /fi "imagename eq mongod.exe" | find "mongod.exe" >nul
if %errorlevel% == 0 (
    echo ✅ MongoDB is running
) else (
    echo ⚠️  MongoDB is not running. Starting MongoDB service...
    net start MongoDB
    if %errorlevel% == 0 (
        echo ✅ MongoDB service started
    ) else (
        echo ❌ Failed to start MongoDB service
        echo Please install MongoDB or start it manually
        echo Visit: https://www.mongodb.com/try/download/community
        pause
        exit /b 1
    )
)

echo.
echo 3. Initializing MongoDB database...
node -e "const {initializeDatabase} = require('./database'); initializeDatabase().then(success => { console.log(success ? '✅ Database initialized' : '❌ Database initialization failed'); process.exit(success ? 0 : 1); });"

if %errorlevel% == 0 (
    echo.
    echo 4. Creating admin user...
    call npm run create-admin
    
    echo.
    echo 5. Checking for existing SQLite data...
    if exist "database.sqlite" (
        echo ℹ️  Found existing SQLite database
        set /p migrate="Do you want to migrate existing data to MongoDB? (y/n): "
        if /i "%migrate%"=="y" (
            echo Migrating data...
            call npm run migrate
        )
    ) else (
        echo ℹ️  No existing SQLite database found - starting fresh
    )
    
    echo.
    echo ========================================
    echo   🎉 MongoDB Setup Complete!
    echo ========================================
    echo.
    echo To start the application:
    echo   npm start
    echo.
    echo Database: MongoDB
    echo Connection: mongodb://localhost:27017/medical_imaging
    echo.
    pause
) else (
    echo ❌ Database initialization failed
    pause
    exit /b 1
)