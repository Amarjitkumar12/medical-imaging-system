// Create Admin User for Railway Deployment
require('dotenv').config();
const { User, initializeDatabase } = require('./database');

async function createRailwayAdmin() {
    console.log('🚂 Creating admin user for Railway deployment...');
    console.log('🔗 URL: https://medical-imaging-system-production.up.railway.app');
    console.log('');
    
    try {
        // Use Railway environment variables
        if (!process.env.DATABASE_URL) {
            console.log('❌ DATABASE_URL not found');
            console.log('💡 Make sure you added the environment variables to Railway:');
            console.log('   DATABASE_URL = postgresql://postgres:NCEOpOUXZNRTOeVVTvhwswkqxZieeqpP@gondola.proxy.rlwy.net:19449/railway');
            console.log('   JWT_SECRET = medical-imaging-super-secret-key-2024');
            return;
        }
        
        // Initialize database
        const dbInitialized = await initializeDatabase();
        if (!dbInitialized) {
            throw new Error('Failed to initialize database');
        }
        
        console.log('✅ Database connected successfully');
        
        // Check if admin already exists
        const existingAdmin = await User.findOne({ email: 'admin@clinic.com' });
        if (existingAdmin) {
            console.log('ℹ️  Admin user already exists');
            
            // Check if account is active
            if (!existingAdmin.is_active) {
                console.log('🔧 Activating admin account...');
                const { pool } = require('./database');
                await pool.query('UPDATE users SET is_active = true WHERE email = $1', ['admin@clinic.com']);
                console.log('✅ Admin account activated');
            } else {
                console.log('✅ Admin account is already active');
            }
            
            console.log('');
            console.log('🔐 LOGIN CREDENTIALS:');
            console.log('📧 Email: admin@clinic.com');
            console.log('🔑 Password: admin123');
            console.log('🌐 URL: https://medical-imaging-system-production.up.railway.app');
            return;
        }
        
        // Create new admin user
        const adminUser = await User.create({
            email: 'admin@clinic.com',
            password: 'admin123',
            clinicName: 'Demo Medical Center',
            doctorName: 'Dr. Admin',
            clinicAddress: 'Demo Address\nCity, State - 123456\nPhone: +1-234-567-8900',
            clinicPhone: '+1-234-567-8900',
            role: 'admin',
            isActive: true
        });
        
        console.log('✅ Admin user created successfully!');
        console.log('');
        console.log('🔐 LOGIN CREDENTIALS:');
        console.log('📧 Email: admin@clinic.com');
        console.log('🔑 Password: admin123');
        console.log('🌐 URL: https://medical-imaging-system-production.up.railway.app');
        console.log('');
        console.log('🎉 Your Railway medical imaging system is ready!');
        console.log('');
        console.log('🏥 Features available:');
        console.log('   ✅ Multi-clinic registration');
        console.log('   ✅ Professional PDF reports');
        console.log('   ✅ Auto-crop X-ray images');
        console.log('   ✅ Complete data isolation');
        
    } catch (error) {
        console.error('❌ Error creating admin user:', error.message);
        console.log('');
        console.log('💡 Troubleshooting:');
        console.log('   1. Check Railway environment variables are set');
        console.log('   2. Verify DATABASE_URL is correct');
        console.log('   3. Ensure PostgreSQL database is running');
    } finally {
        process.exit(0);
    }
}

createRailwayAdmin();