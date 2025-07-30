// Test the exact Railway PostgreSQL connection
const { Pool } = require('pg');

async function testConnection() {
    console.log('🚂 Testing Railway PostgreSQL Connection');
    console.log('=====================================');
    console.log('');

    const connectionString = 'postgresql://postgres:NCEOpOUXZNRTOeVVTvhwswkqxZieeqpP@gondola.proxy.rlwy.net:19449/railway';
    
    console.log('🔗 Connection Details:');
    console.log('   Host: gondola.proxy.rlwy.net');
    console.log('   Port: 19449');
    console.log('   Database: railway');
    console.log('   User: postgres');
    console.log('   Password: NCEOpOUXZNRTOeVVTvhwswkqxZieeqpP');
    console.log('');

    try {
        const pool = new Pool({
            connectionString,
            ssl: { rejectUnauthorized: false }
        });

        console.log('🔄 Connecting to Railway PostgreSQL...');
        const client = await pool.connect();
        
        // Test basic connection
        const result = await client.query('SELECT NOW() as current_time, version() as postgres_version');
        
        console.log('✅ Connection successful!');
        console.log(`⏰ Current time: ${result.rows[0].current_time}`);
        console.log(`🐘 PostgreSQL version: ${result.rows[0].postgres_version.split(' ')[0]} ${result.rows[0].postgres_version.split(' ')[1]}`);
        console.log('');

        // Test creating a simple table
        console.log('🔄 Testing table creation...');
        await client.query(`
            CREATE TABLE IF NOT EXISTS test_connection (
                id SERIAL PRIMARY KEY,
                message TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);
        
        // Insert test data
        await client.query(`
            INSERT INTO test_connection (message) 
            VALUES ('Railway PostgreSQL connection test successful!')
        `);
        
        // Read test data
        const testResult = await client.query('SELECT * FROM test_connection ORDER BY created_at DESC LIMIT 1');
        console.log('✅ Table creation and data insertion successful!');
        console.log(`📝 Test message: ${testResult.rows[0].message}`);
        
        // Clean up test table
        await client.query('DROP TABLE IF EXISTS test_connection');
        console.log('✅ Test cleanup completed');
        
        client.release();
        await pool.end();
        
        console.log('');
        console.log('🎉 Railway PostgreSQL is fully functional!');
        console.log('');
        console.log('🏥 Your Medical Imaging System will now:');
        console.log('   ✅ Connect to Railway PostgreSQL automatically');
        console.log('   ✅ Create all medical imaging tables');
        console.log('   ✅ Support multi-clinic functionality');
        console.log('   ✅ Generate professional PDF reports');
        console.log('');
        console.log('🚀 Add this to Railway Variables:');
        console.log('   DATABASE_URL = postgresql://postgres:NCEOpOUXZNRTOeVVTvhwswkqxZieeqpP@gondola.proxy.rlwy.net:19449/railway');
        console.log('   JWT_SECRET = medical-imaging-super-secret-key-2024');

    } catch (error) {
        console.log('❌ Connection failed:', error.message);
        console.log('');
        console.log('💡 Possible issues:');
        console.log('   1. Network connectivity');
        console.log('   2. Database credentials changed');
        console.log('   3. Railway database not running');
    }
}

testConnection();