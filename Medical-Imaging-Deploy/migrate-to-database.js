const fs = require('fs');
const path = require('path');
const { Patient, Report, Image, ClinicSettings, initializeDatabase } = require('./database');

async function migrateExistingData() {
    console.log('🔄 Starting data migration to database...');
    
    try {
        // Initialize database
        await initializeDatabase();
        
        // Migrate clinic settings
        const clinicSettingsFile = 'settings/clinic.json';
        if (fs.existsSync(clinicSettingsFile)) {
            const clinicData = JSON.parse(fs.readFileSync(clinicSettingsFile, 'utf8'));
            
            let settings = await ClinicSettings.findOne();
            if (settings) {
                await settings.update(clinicData);
            } else {
                await ClinicSettings.create(clinicData);
            }
            console.log('✅ Clinic settings migrated');
        }
        
        // Migrate reports
        const reportsFile = 'settings/reports.json';
        if (fs.existsSync(reportsFile)) {
            const reports = JSON.parse(fs.readFileSync(reportsFile, 'utf8'));
            
            for (const reportData of reports) {
                try {
                    // Find or create patient
                    let patient = await Patient.findOne({ where: { uhid: reportData.uhid } });
                    if (!patient) {
                        patient = await Patient.create({
                            name: reportData.patientName,
                            uhid: reportData.uhid,
                            age: reportData.age,
                            sex: reportData.sex,
                            referredBy: reportData.referredBy || null
                        });
                    }
                    
                    // Create report
                    const report = await Report.create({
                        patientId: patient.id,
                        reportType: reportData.reportType,
                        filename: reportData.filename,
                        status: reportData.status || 'generated',
                        imagesCount: reportData.imagesCount || 0,
                        reportData: reportData.reportData ? JSON.stringify(reportData.reportData) : null,
                        generatedAt: reportData.status === 'generated' ? new Date(reportData.date) : null,
                        createdAt: new Date(reportData.date),
                        updatedAt: new Date(reportData.date)
                    });
                    
                    // If report has image data, migrate images
                    if (reportData.reportData && reportData.reportData.images) {
                        for (let i = 0; i < reportData.reportData.images.length; i++) {
                            const imageData = reportData.reportData.images[i];
                            await Image.create({
                                reportId: report.id,
                                filename: imageData.name,
                                originalName: imageData.name,
                                imageData: imageData.data,
                                size: imageData.data.length
                            });
                        }
                    }
                    
                    console.log(`✅ Migrated report: ${reportData.patientName} - ${reportData.uhid}`);
                    
                } catch (error) {
                    console.error(`❌ Error migrating report for ${reportData.patientName}:`, error.message);
                }
            }
            
            console.log(`✅ Migrated ${reports.length} reports to database`);
        }
        
        console.log('🎉 Data migration completed successfully!');
        console.log('💡 You can now delete the old settings/ folder if everything works correctly.');
        
    } catch (error) {
        console.error('❌ Migration failed:', error);
    }
}

// Run migration if this file is executed directly
if (require.main === module) {
    migrateExistingData().then(() => {
        process.exit(0);
    }).catch((error) => {
        console.error('Migration failed:', error);
        process.exit(1);
    });
}

module.exports = { migrateExistingData };