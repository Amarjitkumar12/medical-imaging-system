// Simple Railway Test - Check if deployment is working
async function simpleRailwayTest() {
    console.log('🚂 Simple Railway Test');
    console.log('🔗 URL: https://medical-imaging-system-production.up.railway.app');
    console.log('');
    
    const railwayUrl = 'https://medical-imaging-system-production.up.railway.app';
    
    try {
        // Test if the app is responding
        console.log('🔄 Testing if Railway app is responding...');
        
        const healthResponse = await fetch(`${railwayUrl}/login.html`);
        
        if (healthResponse.ok) {
            console.log('✅ Railway app is responding');
            console.log('📄 Login page is accessible');
            
            // Wait a moment to avoid rate limiting
            console.log('⏳ Waiting to avoid rate limiting...');
            await new Promise(resolve => setTimeout(resolve, 3000));
            
            // Try a simple registration
            console.log('🔄 Testing registration...');
            
            const uniqueEmail = `test${Math.random().toString(36).substring(7)}@clinic.com`;
            
            const registerData = {
                email: uniqueEmail,
                password: 'test123',
                clinicName: 'Test Clinic',
                doctorName: 'Dr. Test'
            };
            
            const registerResponse = await fetch(`${railwayUrl}/api/register`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(registerData)
            });
            
            const registerText = await registerResponse.text();
            console.log('📋 Registration response:', registerText);
            
            if (registerResponse.ok) {
                console.log('✅ Registration successful');
                
                // Wait before login attempt
                await new Promise(resolve => setTimeout(resolve, 2000));
                
                console.log('🔄 Testing login...');
                
                const loginResponse = await fetch(`${railwayUrl}/api/login`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        email: uniqueEmail,
                        password: 'test123'
                    })
                });
                
                const loginText = await loginResponse.text();
                console.log('📋 Login response:', loginText);
                
                if (loginResponse.ok) {
                    console.log('🎉 SUCCESS! Login is working!');
                    console.log('');
                    console.log('✅ WORKING CREDENTIALS:');
                    console.log(`   📧 Email: ${uniqueEmail}`);
                    console.log('   🔑 Password: test123');
                    console.log('   🌐 URL: https://medical-imaging-system-production.up.railway.app/login.html');
                } else {
                    console.log('❌ Login failed');
                    console.log('💡 The issue might be in the authentication logic');
                }
            } else {
                console.log('❌ Registration failed');
            }
            
        } else {
            console.log('❌ Railway app is not responding properly');
            console.log(`Status: ${healthResponse.status}`);
        }
        
    } catch (error) {
        console.error('❌ Test failed:', error.message);
    }
}

simpleRailwayTest();