// Test MongoDB Atlas connection
const mongoose = require('mongoose');

// Replace this with your actual MongoDB Atlas connection string
// EXAMPLE: mongodb+srv://medicaladmin:Abc123XyZ789@medical-imaging-cluster.xxxxx.mongodb.net/medical_imaging?retryWrites=true&w=majority
// Your actual MongoDB Atlas connection string
const MONGODB_URI = 'mongodb+srv://medicaladmin:amarjit%40respirit@medical-imaging-cluster.z3uwcto.mongodb.net/medical_imaging?retryWrites=true&w=majority&appName=medical-imaging-cluster';

async function testConnection() {
    try {
        console.log('🔌 Testing MongoDB Atlas connection...');
        console.log('Connection string:', MONGODB_URI.replace(/:[^:@]*@/, ':****@'));
        
        await mongoose.connect(MONGODB_URI);
        console.log('✅ SUCCESS: Connected to MongoDB Atlas!');
        console.log('✅ Your database is ready for deployment!');
        
        // Test creating a simple document
        const testSchema = new mongoose.Schema({ test: String });
        const TestModel = mongoose.model('Test', testSchema);
        
        const testDoc = new TestModel({ test: 'Connection successful!' });
        await testDoc.save();
        console.log('✅ SUCCESS: Can write to database!');
        
        await TestModel.deleteOne({ test: 'Connection successful!' });
        console.log('✅ SUCCESS: Can delete from database!');
        
        console.log('\n🎉 Your MongoDB Atlas setup is perfect!');
        console.log('🚀 Ready to deploy to Vercel!');
        
    } catch (error) {
        console.error('❌ CONNECTION FAILED:', error.message);
        console.log('\n🔧 Troubleshooting:');
        console.log('1. Check your connection string');
        console.log('2. Verify password is correct');
        console.log('3. Ensure network access allows 0.0.0.0/0');
        console.log('4. Confirm database user has read/write permissions');
    } finally {
        await mongoose.disconnect();
        process.exit(0);
    }
}

testConnection();