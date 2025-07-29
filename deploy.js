#!/usr/bin/env node

const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🚀 Medical Imaging System - Deployment Helper');
console.log('='.repeat(50));

// Check if required files exist
const requiredFiles = [
    'server.js',
    'database.js',
    'package.json',
    'vercel.json'
];

console.log('📋 Checking required files...');
let allFilesExist = true;

requiredFiles.forEach(file => {
    if (fs.existsSync(path.join(__dirname, file))) {
        console.log(`✅ ${file} - Found`);
    } else {
        console.log(`❌ ${file} - Missing`);
        allFilesExist = false;
    }
});

if (!allFilesExist) {
    console.log('\n❌ Some required files are missing. Please ensure all files are present.');
    process.exit(1);
}

console.log('\n🔧 Deployment Options:');
console.log('1. Vercel (Recommended)');
console.log('2. Railway');
console.log('3. Render');

console.log('\n📖 For detailed deployment instructions, see:');
console.log('📄 FREE-DEPLOYMENT-GUIDE.md');

console.log('\n🗄️ Database Setup Required:');
console.log('1. Create MongoDB Atlas account (free)');
console.log('2. Create database cluster');
console.log('3. Get connection string');
console.log('4. Set MONGODB_URI environment variable');

console.log('\n🌐 Quick Vercel Deployment:');
console.log('1. Install Vercel CLI: npm install -g vercel');
console.log('2. Run: vercel');
console.log('3. Follow the prompts');
console.log('4. Set environment variables in Vercel dashboard');

console.log('\n✅ Your app will be accessible worldwide!');
console.log('✅ All data will be stored in your MongoDB database!');

// Check if Vercel CLI is installed
exec('vercel --version', (error, stdout, stderr) => {
    if (error) {
        console.log('\n💡 Tip: Install Vercel CLI for easy deployment:');
        console.log('   npm install -g vercel');
    } else {
        console.log(`\n✅ Vercel CLI installed: ${stdout.trim()}`);
        console.log('💡 Ready to deploy! Run: vercel');
    }
});

console.log('\n🆘 Need help? Check the troubleshooting section in FREE-DEPLOYMENT-GUIDE.md');