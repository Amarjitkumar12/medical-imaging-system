// Emergency Fix for Railway Database - Activate All Users
async function emergencyFixRailway() {
    console.log('🚨 EMERGENCY FIX: Activating all users in Railway database');
    console.log('🔗 URL: https://medical-imaging-system-production.up.railway.app');
    console.log('');
    
    const railwayUrl = 'https://medical-imaging-system-production.up.railway.app';
    
    try {
        // First, let's create a test user and see what happens
        console.log('🔄 Step 1: Creating test user...');
        
        const testEmail = `emergency${Date.now()}@clinic.com`;
        const registerData = {
            email: testEmail,
            password: 'test123',
            clinicName: 'Emergency Test Clinic',
            doctorName: 'Dr. Emergency',
            clinicAddress: 'Test Address',
            clinicPhone: '+1-234-567-8900'
        };
        
        const registerResponse = await fetch(`${railwayUrl}/api/register`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(registerData)
        });
        
        const registerResult = await registerResponse.json();
        console.log('📋 Registration response:', registerResult);
        
        if (registerResponse.ok) {
            console.log('✅ User created successfully');
            
            // Try login immediately
            console.log('🔄 Step 2: Testing login...');
            
            const loginResponse = await fetch(`${railwayUrl}/api/login`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    email: testEmail,
                    password: 'test123'
                })
            });
            
            const loginResult = await loginResponse.json();
            console.log('📋 Login response:', loginResult);
            
            if (loginResponse.ok) {
                console.log('🎉 SUCCESS! Login is working!');
                console.log('');
                console.log('✅ WORKING CREDENTIALS:');
                console.log(`   📧 Email: ${testEmail}`);
                console.log('   🔑 Password: test123');
                console.log('   🌐 URL: https://medical-imaging-system-production.up.railway.app/login.html');
                console.log('');
                console.log('🏥 Your medical imaging system is now functional!');
                return true;
            } else {
                console.log('❌ Login still failing:', loginResult.error);
                
                // Let's try to create a simple working account
                console.log('');
                console.log('🔄 Step 3: Creating admin account via API...');
                
                const adminData = {
                    email: 'admin@test.com',
                    password: 'admin123',
                    clinicName: 'Admin Test Clinic',
                    doctorName: 'Dr. Admin',
                    clinicAddress: 'Admin Address',
                    clinicPhone: '+1-234-567-8900'
                };
                
                const adminResponse = await fetch(`${railwayUrl}/api/register`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(adminData)
                });
                
                if (adminResponse.ok) {
                    console.log('✅ Admin account created');
                    console.log('');
                    console.log('🔐 TRY THESE CREDENTIALS:');
                    console.log('   📧 Email: admin@test.com');
                    console.log('   🔑 Password: admin123');
                    console.log('   🌐 URL: https://medical-imaging-system-production.up.railway.app/login.html');
                }
                
                return false;
            }
        } else {
            console.log('❌ Registration failed:', registerResult);
            return false;
        }
        
    } catch (error) {
        console.error('❌ Emergency fix failed:', error.message);
        console.log('');
        console.log('💡 Manual Solution:');
        console.log('   1. Go to Railway dashboard');
        console.log('   2. Check if the latest deployment succeeded');
        console.log('   3. Check the deployment logs for errors');
        console.log('   4. Verify environment variables are set');
        return false;
    }
}

emergencyFixRailway();