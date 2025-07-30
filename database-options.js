// Multiple Database Support for Medical Imaging System
const mongoose = require('mongoose');

// Database configuration based on environment
const getDatabaseConfig = () => {
    const dbType = process.env.DATABASE_TYPE || 'mongodb';
    
    switch (dbType.toLowerCase()) {
        case 'mongodb':
            return {
                type: 'mongodb',
                uri: process.env.MONGODB_URI || 'mongodb://localhost:27017/medical_imaging',
                options: {
                    useNewUrlParser: true,
                    useUnifiedTopology: true
                }
            };
        
        case 'postgresql':
        case 'postgres':
            return {
                type: 'postgresql',
                uri: process.env.DATABASE_URL || process.env.POSTGRES_URL,
                options: {
                    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
                }
            };
        
        case 'mysql':
            return {
                type: 'mysql',
                uri: process.env.DATABASE_URL || process.env.MYSQL_URL,
                options: {
                    ssl: process.env.NODE_ENV === 'production'
                }
            };
        
        default:
            return {
                type: 'mongodb',
                uri: process.env.MONGODB_URI || 'mongodb://localhost:27017/medical_imaging',
                options: {}
            };
    }
};

// Universal database connection
async function connectDatabase() {
    const config = getDatabaseConfig();
    
    try {
        switch (config.type) {
            case 'mongodb':
                await mongoose.connect(config.uri, config.options);
                console.log(`✅ MongoDB connected: ${mongoose.connection.name}`);
                break;
                
            case 'postgresql':
                // For PostgreSQL, we'll use Prisma or Sequelize
                console.log('✅ PostgreSQL connection configured');
                break;
                
            case 'mysql':
                console.log('✅ MySQL connection configured');
                break;
        }
        
        return true;
    } catch (error) {
        console.error(`❌ Database connection failed:`, error.message);
        return false;
    }
}

module.exports = {
    connectDatabase,
    getDatabaseConfig
};