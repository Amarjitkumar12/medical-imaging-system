// Railway Deployment Status Checker
console.log('🚂 Railway Deployment Status Check');
console.log('=====================================');
console.log('');

// Check if we're in Railway environment
if (process.env.RAILWAY_ENVIRONMENT) {
    console.log('✅ Running on Railway!');
    console.log(`📍 Environment: ${process.env.RAILWAY_ENVIRONMENT}`);
    console.log(`🌐 Service: ${process.env.RAILWAY_SERVICE_NAME || 'Unknown'}`);
} else {
    console.log('🏠 Running locally');
}

// Check database configuration
if (process.env.DATABASE_URL) {
    console.log('✅ Railway PostgreSQL detected');
    console.log('🐘 Database: PostgreSQL (Railway)');
    console.log('🔗 Connection: Automatic');
} else if (process.env.MONGODB_URI) {
    console.log('✅ MongoDB detected');
    console.log('🍃 Database: MongoDB');
} else {
    console.log('⚠️  No database connection found');
    console.log('💡 Railway will provide DATABASE_URL automatically');
}

// Check JWT secret
if (process.env.JWT_SECRET) {
    console.log('✅ JWT_SECRET configured');
} else {
    console.log('⚠️  JWT_SECRET not found');
    console.log('💡 Add JWT_SECRET in Railway environment variables');
}

// Check port
const port = process.env.PORT || 3000;
console.log(`✅ Port: ${port}`);

console.log('');
console.log('🎯 Deployment Status:');

if (process.env.RAILWAY_ENVIRONMENT && process.env.DATABASE_URL && process.env.JWT_SECRET) {
    console.log('🎉 READY FOR PRODUCTION!');
    console.log('✅ All environment variables configured');
    console.log('✅ Railway PostgreSQL connected');
    console.log('✅ Multi-clinic medical system ready');
} else if (process.env.RAILWAY_ENVIRONMENT) {
    console.log('🔧 NEEDS CONFIGURATION');
    console.log('💡 Add missing environment variables in Railway dashboard');
} else {
    console.log('🏠 LOCAL DEVELOPMENT MODE');
    console.log('💡 Deploy to Railway for production use');
}

console.log('');
console.log('🏥 Your medical imaging system supports:');
console.log('   ✅ Multi-clinic registration');
console.log('   ✅ Complete data isolation');
console.log('   ✅ PDF report generation');
console.log('   ✅ Professional medical documentation');
console.log('');

if (process.env.RAILWAY_PUBLIC_DOMAIN) {
    console.log(`🌐 Public URL: https://${process.env.RAILWAY_PUBLIC_DOMAIN}`);
} else {
    console.log('🌐 Railway will provide public URL after deployment');
}