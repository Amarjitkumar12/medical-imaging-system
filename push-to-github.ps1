# Push Medical Imaging System to GitHub
Write-Host "Pushing Medical Imaging System to GitHub..." -ForegroundColor Green

# Set Git path
$gitPath = "C:\Program Files\Git\bin\git.exe"

# Change to project directory
Set-Location "c:\Users\kumar\Desktop\RADIOLOGY"

Write-Host "Current directory: $(Get-Location)" -ForegroundColor Yellow

# Initialize git repository
Write-Host "Initializing Git repository..." -ForegroundColor Cyan
& $gitPath init

# Add all files
Write-Host "Adding all files..." -ForegroundColor Cyan
& $gitPath add .

# Create initial commit
Write-Host "Creating initial commit..." -ForegroundColor Cyan
& $gitPath commit -m "Initial commit: Medical Imaging Report System"

# Add remote origin
Write-Host "Adding remote repository..." -ForegroundColor Cyan
& $gitPath remote add origin https://github.com/Amarjitkumar12/medical-imaging-system.git

# Push to GitHub
Write-Host "Pushing to GitHub..." -ForegroundColor Cyan
& $gitPath push -u origin main

Write-Host "Successfully pushed to GitHub!" -ForegroundColor Green
Write-Host "Your repository: https://github.com/Amarjitkumar12/medical-imaging-system" -ForegroundColor Yellow