// Railway PostgreSQL Setup for Medical Imaging System
const { Pool } = require('pg');

// PostgreSQL connection using Railway's built-in database
const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

// Create tables for medical imaging system
const createTables = async () => {
    try {
        console.log('🔄 Creating PostgreSQL tables...');
        
        // Users table (clinics)
        await pool.query(`
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
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);
        
        // Patients table
        await pool.query(`
            CREATE TABLE IF NOT EXISTS patients (
                id SERIAL PRIMARY KEY,
                clinic_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
                name VARCHAR(255) NOT NULL,
                uhid VARCHAR(100) NOT NULL,
                age INTEGER NOT NULL,
                sex VARCHAR(10) NOT NULL,
                referred_by VARCHAR(255) DEFAULT '',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                UNIQUE(clinic_id, uhid)
            )
        `);
        
        // Reports table
        await pool.query(`
            CREATE TABLE IF NOT EXISTS reports (
                id SERIAL PRIMARY KEY,
                clinic_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
                patient_id INTEGER REFERENCES patients(id) ON DELETE CASCADE,
                report_type VARCHAR(50) NOT NULL,
                filename VARCHAR(255) DEFAULT '',
                status VARCHAR(20) DEFAULT 'saved',
                images_count INTEGER DEFAULT 0,
                report_data TEXT DEFAULT '',
                generated_at TIMESTAMP,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);
        
        // Images table
        await pool.query(`
            CREATE TABLE IF NOT EXISTS images (
                id SERIAL PRIMARY KEY,
                clinic_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
                report_id INTEGER REFERENCES reports(id) ON DELETE CASCADE,
                filename VARCHAR(255) NOT NULL,
                original_name VARCHAR(255) NOT NULL,
                image_data TEXT NOT NULL,
                size INTEGER DEFAULT 0,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);
        
        // Clinic settings table
        await pool.query(`
            CREATE TABLE IF NOT EXISTS clinic_settings (
                id SERIAL PRIMARY KEY,
                name VARCHAR(255) DEFAULT 'BREATHE CLINIC',
                address TEXT DEFAULT 'Medical Center\\nCity, State - 123456\\nPhone: +91-XXXXXXXXXX',
                logo TEXT DEFAULT '',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);
        
        console.log('✅ PostgreSQL tables created successfully!');
        return true;
        
    } catch (error) {
        console.error('❌ Error creating tables:', error);
        return false;
    }
};

// Initialize database
const initializePostgreSQL = async () => {
    try {
        await pool.query('SELECT NOW()');
        console.log('✅ PostgreSQL connected successfully');
        
        await createTables();
        
        // Create default clinic settings if not exists
        const settingsResult = await pool.query('SELECT * FROM clinic_settings LIMIT 1');
        if (settingsResult.rows.length === 0) {
            await pool.query(`
                INSERT INTO clinic_settings (name, address) 
                VALUES ('BREATHE CLINIC', 'Medical Center\\nCity, State - 123456\\nPhone: +91-XXXXXXXXXX')
            `);
            console.log('✅ Default clinic settings created');
        }
        
        return true;
    } catch (error) {
        console.error('❌ PostgreSQL initialization failed:', error);
        return false;
    }
};

module.exports = {
    pool,
    initializePostgreSQL
};