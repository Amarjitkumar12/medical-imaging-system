// Create admin account for deployed website
const { User, initializeDatabase } = require('./database');
const bcrypt = require('bcryptjs');

async function createAdminAccount() {
    try {
        console.log('🔌 Connecting to MongoDB Atlas...');
        
        // Use the same connection string as your deployed app
        const connected = await initializeDatabase();
        
        if (!connected) {
            console.error('❌ Failed to connect to database');
            return;
        }

        console.log('✅ Connected to MongoDB Atlas');

        // Check if admin already exists
        const existingAdmin = await User.findOne({ email: 'admin@clinic.com' });
        
        if (existingAdmin) {
            console.log('✅ Admin account already exists!');
            console.log('📧 Email: admin@clinic.com');
            console.log('🔑 Password: admin123');
            console.log('🌐 You can login to your deployed website now!');
            return;
        }

        // Create admin account
        const hashedPassword = await bcrypt.hash('admin123', 10);
        
        const adminUser = new User({
            email: 'admin@clinic.com',
            password: hashedPassword,
            createdAt: new Date()
        });

        await adminUser.save();
        
        console.log('🎉 Admin account created successfully!');
        console.log('📧 Email: admin@clinic.com');
        console.log('🔑 Password: admin123');
        console.log('🌐 You can now login to your deployed website!');
        
    } catch (error) {
        console.error('❌ Error creating admin account:', error.message);
    } finally {
        process.exit(0);
    }
}

createAdminAccount();