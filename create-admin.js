const { User, initializeDatabase } = require('./database');

async function createAdminUser() {
    console.log('🔧 Creating admin user...');
    
    try {
        // Initialize database
        await initializeDatabase();
        
        // Check if admin already exists
        const existingAdmin = await User.findOne({ email: 'admin@clinic.com' });
        if (existingAdmin) {
            console.log('ℹ️  Admin user already exists');
            console.log('📧 Email: admin@clinic.com');
            console.log('🔑 Password: admin123');
            return;
        }
        
        // Create admin user
        const adminUser = await User.create({
            email: 'admin@clinic.com',
            password: 'admin123',
            clinicName: 'Demo Medical Center',
            doctorName: 'Dr. Admin',
            clinicAddress: 'Demo Address\nCity, State - 123456\nPhone: +1-234-567-8900',
            clinicPhone: '+1-234-567-8900',
            role: 'admin'
        });
        
        console.log('✅ Admin user created successfully!');
        console.log('');
        console.log('🔐 LOGIN CREDENTIALS:');
        console.log('📧 Email: admin@clinic.com');
        console.log('🔑 Password: admin123');
        console.log('');
        console.log('⚠️  Please change the password after first login!');
        
    } catch (error) {
        console.error('❌ Error creating admin user:', error);
    } finally {
        process.exit(0);
    }
}

// Run if this file is executed directly
if (require.main === module) {
    createAdminUser();
}

module.exports = { createAdminUser };