const { User, Patient, Report, Image, ClinicSettings, initializeDatabase } = require('./database');

async function viewDatabase() {
    try {
        // Initialize database connection
        console.log('🔌 Connecting to database...');
        const connected = await initializeDatabase();
        
        if (!connected) {
            console.error('❌ Failed to connect to database');
            return;
        }

        console.log('\n📊 DATABASE OVERVIEW');
        console.log('='.repeat(50));

        // Count documents in each collection
        const userCount = await User.countDocuments();
        const patientCount = await Patient.countDocuments();
        const reportCount = await Report.countDocuments();
        const imageCount = await Image.countDocuments();
        const clinicCount = await ClinicSettings.countDocuments();

        console.log(`👥 Users: ${userCount}`);
        console.log(`🏥 Patients: ${patientCount}`);
        console.log(`📋 Reports: ${reportCount}`);
        console.log(`🖼️  Images: ${imageCount}`);
        console.log(`⚙️  Clinic Settings: ${clinicCount}`);

        // Show recent patients
        console.log('\n👥 RECENT PATIENTS:');
        console.log('-'.repeat(30));
        const recentPatients = await Patient.find().sort({ createdAt: -1 }).limit(5);
        
        if (recentPatients.length === 0) {
            console.log('No patients found');
        } else {
            recentPatients.forEach((patient, index) => {
                console.log(`${index + 1}. ${patient.name} (Age: ${patient.age}) - ${patient.createdAt?.toLocaleDateString() || 'No date'}`);
            });
        }

        // Show recent reports
        console.log('\n📋 RECENT REPORTS:');
        console.log('-'.repeat(30));
        const recentReports = await Report.find().sort({ createdAt: -1 }).limit(5);
        
        if (recentReports.length === 0) {
            console.log('No reports found');
        } else {
            recentReports.forEach((report, index) => {
                console.log(`${index + 1}. ${report.patientName} - ${report.reportType?.toUpperCase()} - ${report.createdAt?.toLocaleDateString() || 'No date'}`);
            });
        }

        // Show clinic settings
        console.log('\n⚙️  CLINIC SETTINGS:');
        console.log('-'.repeat(30));
        const clinicSettings = await ClinicSettings.findOne();
        
        if (!clinicSettings) {
            console.log('No clinic settings found');
        } else {
            console.log(`Clinic Name: ${clinicSettings.name || 'Not set'}`);
            console.log(`Address: ${clinicSettings.address || 'Not set'}`);
            console.log(`Logo: ${clinicSettings.logo ? 'Set' : 'Not set'}`);
        }

        // Show users
        console.log('\n👤 USERS:');
        console.log('-'.repeat(30));
        const users = await User.find().select('email createdAt');
        
        if (users.length === 0) {
            console.log('No users found');
        } else {
            users.forEach((user, index) => {
                console.log(`${index + 1}. ${user.email} - ${user.createdAt?.toLocaleDateString() || 'No date'}`);
            });
        }

        console.log('\n✅ Database view complete!');
        
    } catch (error) {
        console.error('❌ Error viewing database:', error);
    } finally {
        process.exit(0);
    }
}

// Run the viewer
viewDatabase();