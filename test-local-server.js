// Test Local Server with Database Connection
require('dotenv').config();
const { Pool } = require('pg');

async function testLocalSetup() {
    console.log('🔄 Testing Local Server Setup...');
    console.log('');
    
    // Check environment variables
    console.log('📋 Environment Variables:');
    console.log(`   DATABASE_URL: ${process.env.DATABASE_URL ? '✅ Set' : '❌ Not set'}`);
    console.log(`   JWT_SECRET: ${process.env.JWT_SECRET ? '✅ Set' : '❌ Not set'}`);
    console.log(`   NODE_ENV: ${process.env.NODE_ENV || 'development'}`);
    console.log('');
    
    // Test database connection if URL is available
    if (process.env.DATABASE_URL) {
        try {
            console.log('🔄 Testing database connection...');
            const pool = new Pool({
                connectionString: process.env.DATABASE_URL,
                ssl: { rejectUnauthorized: false }
            });
            
            const client = await pool.connect();
            await client.query('SELECT NOW()');
            client.release();
            await pool.end();
            
            console.log('✅ Database connection successful');
        } catch (error) {
            console.log('❌ Database connection failed:', error.message);
        }
    } else {
        console.log('💡 To test with database, set DATABASE_URL:');
        console.log('   $env:DATABASE_URL="postgresql://postgres:NCEOpOUXZNRTOeVVTvhwswkqxZieeqpP@gondola.proxy.rlwy.net:19449/railway"');
        console.log('   $env:JWT_SECRET="medical-imaging-super-secret-key-2024"');
    }
    
    console.log('');
    console.log('🏥 For PDF generation to work, you need:');
    console.log('   1. ✅ Puppeteer working (already tested)');
    console.log('   2. 🔐 User authentication (login required)');
    console.log('   3. 📊 Patient data (name, UHID, age, sex)');
    console.log('   4. 🖼️ Medical images uploaded');
    console.log('   5. 🗄️ Database connection (for saving reports)');
    console.log('');
    
    console.log('🎯 Steps to generate PDF:');
    console.log('   1. Start server: npm start');
    console.log('   2. Open: http://localhost:3000');
    console.log('   3. Login or register a clinic account');
    console.log('   4. Fill patient information');
    console.log('   5. Upload medical images');
    console.log('   6. Click "Generate PDF Report"');
}

testLocalSetup();