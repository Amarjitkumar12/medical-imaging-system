// Fix User Activation in Railway Database
require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

async function fixUserActivation() {
    console.log('🔧 Fixing user activation in Railway database...');
    
    try {
        // Connect to database
        const client = await pool.connect();
        
        // Check current user status
        console.log('🔄 Checking current user status...');
        const userResult = await client.query('SELECT email, is_active, role FROM users WHERE email = $1', ['admin@clinic.com']);
        
        if (userResult.rows.length === 0) {
            console.log('❌ Admin user not found');
            console.log('💡 Creating admin user...');
            
            const bcrypt = require('bcryptjs');
            const hashedPassword = await bcrypt.hash('admin123', 12);
            
            await client.query(`
                INSERT INTO users (email, password, clinic_name, doctor_name, clinic_address, clinic_phone, role, is_active)
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
            `, [
                'admin@clinic.com',
                hashedPassword,
                'Demo Medical Center',
                'Dr. Admin',
                'Demo Address\nCity, State - 123456\nPhone: +1-234-567-8900',
                '+1-234-567-8900',
                'admin',
                true
            ]);
            
            console.log('✅ Admin user created and activated');
        } else {
            const user = userResult.rows[0];
            console.log('📋 Current user status:');
            console.log(`   Email: ${user.email}`);
            console.log(`   Active: ${user.is_active}`);
            console.log(`   Role: ${user.role}`);
            
            if (!user.is_active) {
                console.log('🔧 Activating user account...');
                await client.query('UPDATE users SET is_active = true WHERE email = $1', ['admin@clinic.com']);
                console.log('✅ User account activated');
            } else {
                console.log('✅ User account is already active');
            }
        }
        
        // Verify the fix
        console.log('🔄 Verifying user status...');
        const verifyResult = await client.query('SELECT email, is_active, role FROM users WHERE email = $1', ['admin@clinic.com']);
        const verifiedUser = verifyResult.rows[0];
        
        console.log('');
        console.log('✅ Final user status:');
        console.log(`   📧 Email: ${verifiedUser.email}`);
        console.log(`   ✅ Active: ${verifiedUser.is_active}`);
        console.log(`   👤 Role: ${verifiedUser.role}`);
        console.log('');
        console.log('🔐 LOGIN CREDENTIALS:');
        console.log('   📧 Email: admin@clinic.com');
        console.log('   🔑 Password: admin123');
        console.log('   🌐 URL: https://medical-imaging-system-production.up.railway.app');
        
        client.release();
        await pool.end();
        
    } catch (error) {
        console.error('❌ Error fixing user activation:', error.message);
    }
}

fixUserActivation();