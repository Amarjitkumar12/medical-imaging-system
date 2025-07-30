const { User, initializeDatabase } = require('./database');

async function createAdminUser(customEmail = null, customPassword = null) {
    console.log('🔧 Creating admin user...');

    try {
        // Initialize database
        const dbInitialized = await initializeDatabase();
        if (!dbInitialized) {
            throw new Error('Failed to initialize database connection');
        }

        // Use custom credentials or defaults
        const adminEmail = customEmail || 'admin@clinic.com';
        const adminPassword = customPassword || 'admin123';

        // Check if admin already exists
        const existingAdmin = await User.findOne({ email: adminEmail });
        if (existingAdmin) {
            console.log('ℹ️  Admin user already exists');
            console.log(`📧 Email: ${adminEmail}`);
            console.log(`🔑 Password: ${adminPassword}`);
            console.log('');
            console.log('💡 To reset password, delete the user and run this script again');
            return { success: true, existed: true, email: adminEmail };
        }

        // Create admin user
        await User.create({
            email: adminEmail,
            password: adminPassword,
            clinicName: 'Demo Medical Center',
            doctorName: 'Dr. Admin',
            clinicAddress: 'Demo Address\nCity, State - 123456\nPhone: +1-234-567-8900',
            clinicPhone: '+1-234-567-8900',
            role: 'admin'
        });

        console.log('✅ Admin user created successfully!');
        console.log('');
        console.log('🔐 LOGIN CREDENTIALS:');
        console.log(`📧 Email: ${adminEmail}`);
        console.log(`🔑 Password: ${adminPassword}`);
        console.log('');
        console.log('⚠️  Please change the password after first login!');
        console.log('');
        console.log('🌐 Access your system at: http://localhost:3000');

        return { success: true, existed: false, email: adminEmail };

    } catch (error) {
        console.error('❌ Error creating admin user:', error);
        return { success: false, error: error.message };
    }
}

// Additional utility function to reset admin password
async function resetAdminPassword(newPassword = 'admin123') {
    console.log('🔄 Resetting admin password...');

    try {
        await initializeDatabase();

        const admin = await User.findOne({ email: 'admin@clinic.com' });
        if (!admin) {
            console.log('❌ Admin user not found. Run createAdminUser first.');
            return { success: false, error: 'Admin user not found' };
        }

        admin.password = newPassword;
        await admin.save();

        console.log('✅ Admin password reset successfully!');
        console.log(`🔑 New password: ${newPassword}`);

        return { success: true };

    } catch (error) {
        console.error('❌ Error resetting password:', error);
        return { success: false, error: error.message };
    }
}

// Function to list all admin users
async function listAdminUsers() {
    console.log('👥 Listing admin users...');

    try {
        await initializeDatabase();

        const admins = await User.find({ role: 'admin' }).select('email clinicName doctorName createdAt');

        if (admins.length === 0) {
            console.log('ℹ️  No admin users found');
            return { success: true, admins: [] };
        }

        console.log(`📋 Found ${admins.length} admin user(s):`);
        admins.forEach((admin, index) => {
            console.log(`${index + 1}. 📧 ${admin.email} - 🏥 ${admin.clinicName} - 👨‍⚕️ ${admin.doctorName}`);
            console.log(`   📅 Created: ${admin.createdAt.toLocaleDateString()}`);
        });

        return { success: true, admins };

    } catch (error) {
        console.error('❌ Error listing admin users:', error);
        return { success: false, error: error.message };
    }
}

// Command line interface
async function handleCommandLine() {
    const args = process.argv.slice(2);
    const command = args[0];

    switch (command) {
        case 'reset':
            const newPassword = args[1] || 'admin123';
            await resetAdminPassword(newPassword);
            break;
        case 'list':
            await listAdminUsers();
            break;
        case 'create':
            const email = args[1];
            const password = args[2];
            await createAdminUser(email, password);
            break;
        default:
            await createAdminUser();
            break;
    }

    process.exit(0);
}

// Run if this file is executed directly
if (require.main === module) {
    handleCommandLine();
}

module.exports = {
    createAdminUser,
    resetAdminPassword,
    listAdminUsers
};