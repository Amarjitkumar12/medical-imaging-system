const { Sequelize, DataTypes } = require('sequelize');
const path = require('path');

// Database configuration
const isDevelopment = process.env.NODE_ENV !== 'production';
const databaseUrl = process.env.DATABASE_URL;

let sequelize;

if (databaseUrl) {
    // Production: Use PostgreSQL from Railway/Render
    sequelize = new Sequelize(databaseUrl, {
        dialect: 'postgres',
        dialectOptions: {
            ssl: {
                require: true,
                rejectUnauthorized: false
            }
        },
        logging: false
    });
} else {
    // Development: Use SQLite
    sequelize = new Sequelize({
        dialect: 'sqlite',
        storage: path.join(__dirname, 'database.sqlite'),
        logging: false
    });
}

// Define Models
const Patient = sequelize.define('Patient', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    name: {
        type: DataTypes.STRING,
        allowNull: false
    },
    uhid: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true
    },
    age: {
        type: DataTypes.INTEGER,
        allowNull: false
    },
    sex: {
        type: DataTypes.ENUM('Male', 'Female', 'Other'),
        allowNull: false
    },
    referredBy: {
        type: DataTypes.STRING,
        allowNull: true
    }
}, {
    tableName: 'patients',
    timestamps: true
});

const Report = sequelize.define('Report', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    patientId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
            model: Patient,
            key: 'id'
        }
    },
    reportType: {
        type: DataTypes.ENUM('xray', 'ultrasound'),
        allowNull: false
    },
    filename: {
        type: DataTypes.STRING,
        allowNull: true
    },
    status: {
        type: DataTypes.ENUM('saved', 'generated'),
        defaultValue: 'saved'
    },
    imagesCount: {
        type: DataTypes.INTEGER,
        defaultValue: 0
    },
    reportData: {
        type: DataTypes.TEXT,
        allowNull: true // Store JSON data for saved reports
    },
    generatedAt: {
        type: DataTypes.DATE,
        allowNull: true
    }
}, {
    tableName: 'reports',
    timestamps: true
});

const Image = sequelize.define('Image', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    reportId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
            model: Report,
            key: 'id'
        }
    },
    filename: {
        type: DataTypes.STRING,
        allowNull: false
    },
    originalName: {
        type: DataTypes.STRING,
        allowNull: false
    },
    imageData: {
        type: DataTypes.TEXT('long'), // Store base64 image data
        allowNull: false
    },
    size: {
        type: DataTypes.INTEGER,
        allowNull: true
    }
}, {
    tableName: 'images',
    timestamps: true
});

const ClinicSettings = sequelize.define('ClinicSettings', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    name: {
        type: DataTypes.STRING,
        allowNull: false,
        defaultValue: 'BREATHE CLINIC'
    },
    address: {
        type: DataTypes.TEXT,
        allowNull: true
    },
    logo: {
        type: DataTypes.TEXT('long'), // Store base64 logo data
        allowNull: true
    }
}, {
    tableName: 'clinic_settings',
    timestamps: true
});

// Define Associations
Patient.hasMany(Report, { foreignKey: 'patientId', as: 'reports' });
Report.belongsTo(Patient, { foreignKey: 'patientId', as: 'patient' });

Report.hasMany(Image, { foreignKey: 'reportId', as: 'images' });
Image.belongsTo(Report, { foreignKey: 'reportId', as: 'report' });

// Database initialization
async function initializeDatabase() {
    try {
        await sequelize.authenticate();
        console.log('✅ Database connection established successfully.');
        
        // Sync all models
        await sequelize.sync({ alter: true });
        console.log('✅ Database models synchronized.');
        
        // Create default clinic settings if not exists
        const settingsCount = await ClinicSettings.count();
        if (settingsCount === 0) {
            await ClinicSettings.create({
                name: 'BREATHE CLINIC',
                address: 'Medical Center\nCity, State - 123456\nPhone: +91-XXXXXXXXXX'
            });
            console.log('✅ Default clinic settings created.');
        }
        
        return true;
    } catch (error) {
        console.error('❌ Unable to connect to the database:', error);
        return false;
    }
}

module.exports = {
    sequelize,
    Patient,
    Report,
    Image,
    ClinicSettings,
    initializeDatabase
};