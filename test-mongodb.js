const mongoose = require('mongoose');

// Test MongoDB connection
async function testConnection() {
    try {
        console.log('🔄 Testing MongoDB connection...');
        
        // Replace with your actual connection string
        const mongoURI = process.env.MONGODB_URI || 'mongodb+srv://medicaladmin:YOUR_PASSWORD@medical-imaging-cluster.z3uwcto.mongodb.net/medical_imaging?retryWrites=true&w=majority&appName=medical-imaging-cluster';
        
        await mongoose.connect(mongoURI);
        console.log('✅ MongoDB connected successfully!');
        console.log('📊 Database:', mongoose.connection.name);
        console.log('🌐 Host:', mongoose.connection.host);
        
        // Test creating a simple document
        const testSchema = new mongoose.Schema({ test: String });
        const TestModel = mongoose.model('Test', testSchema);
        
        const testDoc = new TestModel({ test: 'Connection successful!' });
        await testDoc.save();
        console.log('✅ Test document created successfully!');
        
        // Clean up test document
        await TestModel.deleteOne({ test: 'Connection successful!' });
        console.log('✅ Test document cleaned up!');
        
        console.log('🎉 Your MongoDB Atlas database is ready for deployment!');
        
    } catch (error) {
        console.error('❌ MongoDB connection failed:', error.message);
        console.log('\n💡 Solutions:');
        console.log('1. Check your password in the connection string');
        console.log('2. Ensure IP address is whitelisted (0.0.0.0/0 for all)');
        console.log('3. Verify the database user has read/write permissions');
    } finally {
        await mongoose.disconnect();
        process.exit(0);
    }
}

testConnection();