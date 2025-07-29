@echo off
title Prepare for Deployment
echo.
echo ========================================
echo   PREPARING FOR DEPLOYMENT
echo ========================================
echo.

echo 📦 Creating deployment-ready package...
echo.

REM Create deployment folder
set DEPLOY_FOLDER=Medical-Imaging-Deploy
if exist "%DEPLOY_FOLDER%" rmdir /s /q "%DEPLOY_FOLDER%"
mkdir "%DEPLOY_FOLDER%"

echo ✅ Copying essential files...

REM Copy all necessary files
copy "server.js" "%DEPLOY_FOLDER%\"
copy "package.json" "%DEPLOY_FOLDER%\"
copy "database.js" "%DEPLOY_FOLDER%\"
copy "migrate-to-mongodb.js" "%DEPLOY_FOLDER%\"
copy "railway.json" "%DEPLOY_FOLDER%\"
copy "README.md" "%DEPLOY_FOLDER%\"
copy "DEPLOYMENT-GUIDE.md" "%DEPLOY_FOLDER%\"
copy "DEPLOYMENT-MONGODB.md" "%DEPLOY_FOLDER%\"
copy "MONGODB-SETUP.md" "%DEPLOY_FOLDER%\"

REM Copy public folder
xcopy "public" "%DEPLOY_FOLDER%\public\" /E /I /H

echo.
echo ✅ Deployment package ready in: %DEPLOY_FOLDER%
echo.
echo 🚀 NEXT STEPS:
echo ==========================================
echo.
echo 🗄️ STEP 1 - Setup MongoDB Atlas (Required):
echo    1. Go to https://www.mongodb.com/atlas
echo    2. Create free account and cluster
echo    3. Create database user with read/write access
echo    4. Whitelist all IPs (0.0.0.0/0)
echo    5. Get connection string
echo.
echo 📤 STEP 2 - Deploy to Platform:
echo.
echo 📤 OPTION A - Railway (Recommended):
echo    1. Go to https://railway.app/
echo    2. Sign up with GitHub
echo    3. Upload '%DEPLOY_FOLDER%' to GitHub
echo    4. Deploy from GitHub on Railway
echo    5. Add MONGODB_URI environment variable
echo    6. Get your public URL!
echo.
echo 📤 OPTION B - Render (Free):
echo    1. Go to https://render.com/
echo    2. Connect GitHub account
echo    3. Upload '%DEPLOY_FOLDER%' to GitHub
echo    4. Create Web Service on Render
echo    5. Add MONGODB_URI environment variable
echo    6. Deploy automatically!
echo.
echo 📤 OPTION 3 - Heroku:
echo    1. Install Heroku CLI
echo    2. Run: heroku create your-app-name
echo    3. Deploy with Git commands
echo.
echo 🌐 After deployment, you'll get a URL like:
echo    https://your-app.railway.app
echo    https://your-app.onrender.com
echo    https://your-app.herokuapp.com
echo.
echo 🔧 ENVIRONMENT VARIABLE REQUIRED:
echo    MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/medical_imaging
echo.
echo 💡 Read DEPLOYMENT-MONGODB.md for detailed steps!
echo.
pause