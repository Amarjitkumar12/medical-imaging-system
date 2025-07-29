@echo off
title Direct Railway Deployment
echo.
echo ========================================
echo   DIRECT RAILWAY DEPLOYMENT
echo ========================================
echo.

echo 🚂 EASIEST METHOD - Railway CLI:
echo.
echo 1. Go to: https://railway.app/
echo 2. Sign up with GitHub
echo 3. Install Railway CLI:
echo    npm install -g @railway/cli
echo.
echo 4. Login to Railway:
echo    railway login
echo.
echo 5. Deploy directly:
echo    cd Medical-Imaging-Deploy
echo    railway deploy
echo.
echo ✅ This skips GitHub entirely!
echo.
pause

echo.
echo 🌐 Alternative - Use Railway's GitHub Integration:
echo.
echo 1. Create a ZIP file of Medical-Imaging-Deploy folder
echo 2. Extract it to a new folder
echo 3. Use GitHub Desktop to upload
echo 4. Connect Railway to GitHub
echo.
echo 📁 Your deployment files are ready in:
echo    %CD%\Medical-Imaging-Deploy\
echo.
pause