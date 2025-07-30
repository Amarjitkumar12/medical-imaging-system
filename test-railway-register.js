// Test Railway Registration System
async function testRailwayRegister() {
    console.log('🚂 Testing Railway Registration System');
    console.log('🔗 URL: https://medical-imaging-system-production.up.railway.app');
    console.log('');
    
    const railwayUrl = 'https://medical-imaging-system-production.up.railway.app';
    
    try {
        // Test registration endpoint
        console.log('🔄 Testing registration endpoint...');
        
        const registerData = {
            email: 'test@clinic.com',
            password: 'test123',
            clinicName: 'Test Medical Center',
            doctorName: 'Dr. Test',
            clinicAddress: 'Test Address',
            clinicPhone: '+1-234-567-8900'
        };
        
        const response = await fetch(`${railwayUrl}/api/register`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(registerData)
        });
        
        const result = await response.json();
        
        if (response.ok) {
            console.log('✅ Registration successful!');
            console.log('👤 User created:', result.user);
            console.log('');
            
            // Now test login with new account
            console.log('🔄 Testing login with new account...');
            
            const loginResponse = await fetch(`${railwayUrl}/api/login`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    email: 'test@clinic.com',
                    password: 'test123'
                })
            });
            
            const loginResult = await loginResponse.json();
            
            if (loginResponse.ok) {
                console.log('✅ Login successful!');
                console.log('🔑 Token received');
                console.log('');
                console.log('🎉 Railway deployment is working perfectly!');
                console.log('');
                console.log('🔐 NEW LOGIN CREDENTIALS:');
                console.log('   📧 Email: test@clinic.com');
                console.log('   🔑 Password: test123');
                console.log('   🌐 URL: https://medical-imaging-system-production.up.railway.app');
            } else {
                console.log('❌ Login failed:', loginResult.error);
            }
            
        } else {
            console.log('❌ Registration failed:', result.error);
        }
        
    } catch (error) {
        console.error('❌ Connection error:', error.message);
    }
}

testRailwayRegister();