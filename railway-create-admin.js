// Create Admin User Directly on Railway
const { Pool } = require('pg');
const bcrypt = require('bcryptjs');

async function createAdminOnRailway() {
    console.log('🚂 Creating admin user directly on Railway...');
    
    try {
        // Use Railway's DATABASE_URL environment variable
        const connectionString = process.env.DATABASE_URL;
        
        if (!connectionString) {
            console.log('❌ DATABASE_URL not found in Railway environment');
            return;
        }
        
        const pool = new Pool({
            connectionString,
            ssl: { rejectUnauthorized: false }
        });
        
        const client = await pool.connect();
        console.log('✅ Connected to Railway PostgreSQL');
        
        // Create tables if they don't exist
        await client.query(`
            CREATE TABLE IF NOT EXISTS users (
                id SERIAL PRIMARY KEY,
                email VARCHAR(255) UNIQUE NOT NULL,
                password VARCHAR(255) NOT NULL,
                clinic_name VARCHAR(255) NOT NULL,
                doctor_name VARCHAR(255) NOT NULL,
                clinic_address TEXT DEFAULT '',
                clinic_phone VARCHAR(50) DEFAULT '',
                role VARCHAR(20) DEFAULT 'doctor',
                is_active BOOLEAN DEFAULT true,
                last_login TIMESTAMP,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);
        
        // Delete existing admin if exists
        await client.query('DELETE FROM users WHERE email = $1', ['admin@clinic.com']);
        console.log('🗑️ Removed any existing admin user');
        
        // Create new admin user
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
        
        console.log('✅ Admin user created successfully on Railway!');
        
        // Verify the user
        const result = await client.query('SELECT email, is_active, role FROM users WHERE email = $1', ['admin@clinic.com']);
        const user = result.rows[0];
        
        console.log('');
        console.log('✅ User verification:');
        console.log(`   📧 Email: ${user.email}`);
        console.log(`   ✅ Active: ${user.is_active}`);
        console.log(`   👤 Role: ${user.role}`);
        console.log('');
        console.log('🔐 LOGIN CREDENTIALS FOR RAILWAY:');
        console.log('   📧 Email: admin@clinic.com');
        console.log('   🔑 Password: admin123');
        console.log('   🌐 URL: https://medical-imaging-system-production.up.railway.app');
        console.log('');
        console.log('🎉 Railway deployment is ready!');
        
        client.release();
        await pool.end();
        
    } catch (error) {
        console.error('❌ Error:', error.message);
    }
}

createAdminOnRailway();