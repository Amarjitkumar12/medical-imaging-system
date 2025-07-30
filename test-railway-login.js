// Test Railway Login System
require('dotenv').config();

async function testRailwayLogin() {
    console.log('🚂 Testing Railway Login System');
    console.log('🔗 URL: https://medical-imaging-system-production.up.railway.app');
    console.log('');
    
    const railwayUrl = 'https://medical-imaging-system-production.up.railway.app';
    
    try {
        // Test login endpoint
        console.log('🔄 Testing login endpoint...');
        
        const loginData = {
            email: 'admin@clinic.com',
            password: 'admin123'
        };
        
        const response = await fetch(`${railwayUrl}/api/login`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(loginData)
        });
        
        const result = await response.json();
        
        if (response.ok) {
            console.log('✅ Login successful!');
            console.log('🔑 Token received');
            console.log('👤 User:', result.user);
            console.log('');
            console.log('🎉 Your Railway deployment is working perfectly!');
            console.log('');
            console.log('🏥 Ready for use:');
            console.log('   📧 Email: admin@clinic.com');
            console.log('   🔑 Password: admin123');
            console.log('   🌐 URL: https://medical-imaging-system-production.up.railway.app');
        } else {
            console.log('❌ Login failed:', result.error);
            console.log('');
            console.log('💡 Possible issues:');
            console.log('   1. Environment variables not set in Railway');
            console.log('   2. Database connection issue');
            console.log('   3. User account not active');
        }
        
    } catch (error) {
        console.error('❌ Connection error:', error.message);
        console.log('');
        console.log('💡 Check:');
        console.log('   1. Railway app is deployed and running');
        console.log('   2. DATABASE_URL and JWT_SECRET are set');
        console.log('   3. PostgreSQL database is connected');
    }
}

testRailwayLogin();