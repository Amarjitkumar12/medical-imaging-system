const sqlite3 = require('sqlite3').verbose();
const { Patient, Report, Image, ClinicSettings, connectDB } = require('./database');
const path = require('path');

async function migrateSQLiteToMongoDB() {
    console.log('🔄 Starting migration from SQLite to MongoDB...');
    
    try {
        // Connect to MongoDB
        const mongoConnected = await connectDB();
        if (!mongoConnected) {
            throw new Error('Failed to connect to MongoDB');
        }
        console.log('✅ Connected to MongoDB');

        // Check if SQLite database exists
        const sqliteDbPath = path.join(__dirname, 'database.sqlite');
        if (!require('fs').existsSync(sqliteDbPath)) {
            console.log('ℹ️  No SQLite database found. Starting fresh with MongoDB.');
            return;
        }

        // Connect to SQLite
        const db = new sqlite3.Database(sqliteDbPath);
        console.log('✅ Connected to SQLite database');

        // Migrate Clinic Settings
        await new Promise((resolve, reject) => {
            db.all("SELECT * FROM clinic_settings", async (err, rows) => {
                if (err) {
                    console.log('ℹ️  No clinic settings table found in SQLite');
                    resolve();
                    return;
                }
                
                try {
                    for (const row of rows) {
                        const existingSettings = await ClinicSettings.findOne();
                        if (!existingSettings) {
                            await ClinicSettings.create({
                                name: row.name || 'BREATHE CLINIC',
                                address: row.address || 'Medical Center\nCity, State - 123456',
                                logo: row.logo || ''
                            });
                            console.log('✅ Migrated clinic settings');
                        }
                    }
                    resolve();
                } catch (error) {
                    reject(error);
                }
            });
        });

        // Migrate Patients
        const patientMap = new Map(); // SQLite ID -> MongoDB ID mapping
        await new Promise((resolve, reject) => {
            db.all("SELECT * FROM patients", async (err, rows) => {
                if (err) {
                    console.log('ℹ️  No patients table found in SQLite');
                    resolve();
                    return;
                }
                
                try {
                    for (const row of rows) {
                        const existingPatient = await Patient.findOne({ uhid: row.uhid });
                        if (!existingPatient) {
                            const newPatient = await Patient.create({
                                name: row.name,
                                uhid: row.uhid,
                                age: row.age,
                                sex: row.sex,
                                referredBy: row.referredBy || ''
                            });
                            patientMap.set(row.id, newPatient._id);
                            console.log(`✅ Migrated patient: ${row.name}`);
                        } else {
                            patientMap.set(row.id, existingPatient._id);
                            console.log(`ℹ️  Patient already exists: ${row.name}`);
                        }
                    }
                    resolve();
                } catch (error) {
                    reject(error);
                }
            });
        });

        // Migrate Reports
        const reportMap = new Map(); // SQLite ID -> MongoDB ID mapping
        await new Promise((resolve, reject) => {
            db.all("SELECT * FROM reports", async (err, rows) => {
                if (err) {
                    console.log('ℹ️  No reports table found in SQLite');
                    resolve();
                    return;
                }
                
                try {
                    for (const row of rows) {
                        const mongoPatientId = patientMap.get(row.patientId);
                        if (mongoPatientId) {
                            const newReport = await Report.create({
                                patientId: mongoPatientId,
                                reportType: row.reportType,
                                filename: row.filename || '',
                                status: row.status || 'saved',
                                imagesCount: row.imagesCount || 0,
                                reportData: row.reportData || '',
                                generatedAt: row.generatedAt ? new Date(row.generatedAt) : null
                            });
                            reportMap.set(row.id, newReport._id);
                            console.log(`✅ Migrated report: ID ${row.id}`);
                        }
                    }
                    resolve();
                } catch (error) {
                    reject(error);
                }
            });
        });

        // Migrate Images
        await new Promise((resolve, reject) => {
            db.all("SELECT * FROM images", async (err, rows) => {
                if (err) {
                    console.log('ℹ️  No images table found in SQLite');
                    resolve();
                    return;
                }
                
                try {
                    for (const row of rows) {
                        const mongoReportId = reportMap.get(row.reportId);
                        if (mongoReportId) {
                            await Image.create({
                                reportId: mongoReportId,
                                filename: row.filename,
                                originalName: row.originalName,
                                imageData: row.imageData,
                                size: row.size || 0
                            });
                            console.log(`✅ Migrated image: ${row.filename}`);
                        }
                    }
                    resolve();
                } catch (error) {
                    reject(error);
                }
            });
        });

        // Close SQLite connection
        db.close();
        console.log('✅ Migration completed successfully!');
        
        // Display summary
        const patientCount = await Patient.countDocuments();
        const reportCount = await Report.countDocuments();
        const imageCount = await Image.countDocuments();
        
        console.log('\n📊 Migration Summary:');
        console.log(`   Patients: ${patientCount}`);
        console.log(`   Reports: ${reportCount}`);
        console.log(`   Images: ${imageCount}`);
        console.log('\n🎉 Your data has been successfully migrated to MongoDB!');
        
    } catch (error) {
        console.error('❌ Migration failed:', error);
    } finally {
        process.exit(0);
    }
}

// Run migration if this file is executed directly
if (require.main === module) {
    migrateSQLiteToMongoDB();
}

module.exports = { migrateSQLiteToMongoDB };