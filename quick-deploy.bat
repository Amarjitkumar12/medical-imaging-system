@echo off
echo ========================================
echo   Quick MongoDB Atlas + Railway Deploy
echo ========================================
echo.

echo 1. Testing MongoDB connection...
echo.
echo Please set your MongoDB password first:
set /p MONGO_PASSWORD="Enter your MongoDB Atlas password: "

echo.
echo Setting up environment...
set MONGODB_URI=mongodb+srv://medicaladmin:%MONGO_PASSWORD%@medical-imaging-cluster.z3uwcto.mongodb.net/medical_imaging?retryWrites=true^&w=majority^&appName=medical-imaging-cluster

echo.
echo Testing connection...
node test-mongodb.js

echo.
echo ========================================
echo   Ready for Railway Deployment!
echo ========================================
echo.
echo Your MongoDB URI:
echo %MONGODB_URI%
echo.
echo Next steps:
echo 1. Go to https://railway.app/
echo 2. Deploy from GitHub
echo 3. Add environment variable:
echo    MONGODB_URI=%MONGODB_URI%
echo    JWT_SECRET=medical-imaging-super-secret-key-2024
echo.
pause