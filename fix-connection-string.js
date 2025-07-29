#!/usr/bin/env node

const readline = require('readline');

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

console.log('🔧 MongoDB Connection String Fixer');
console.log('='.repeat(40));

console.log('\n📋 This tool will help you create the correct connection string.');

rl.question('\n1️⃣ Paste your connection string (with <password>): ', (connectionString) => {
    if (!connectionString.includes('<password>')) {
        console.log('❌ Error: Connection string should contain <password>');
        console.log('💡 Make sure you copied the connection string from MongoDB Atlas');
        rl.close();
        return;
    }

    rl.question('\n2️⃣ Enter your actual password: ', (password) => {
        if (!password.trim()) {
            console.log('❌ Error: Password cannot be empty');
            rl.close();
            return;
        }

        // URL encode special characters
        const encodedPassword = encodeURIComponent(password);
        
        // Replace <password> with actual password
        const finalConnectionString = connectionString.replace('<password>', encodedPassword);

        console.log('\n✅ SUCCESS! Here is your complete connection string:');
        console.log('='.repeat(60));
        console.log(finalConnectionString);
        console.log('='.repeat(60));

        console.log('\n📋 Next steps:');
        console.log('1. Copy the connection string above');
        console.log('2. Use it in your Vercel environment variables');
        console.log('3. Set MONGODB_URI = [the string above]');

        if (password !== encodedPassword) {
            console.log('\n⚠️  Note: Your password contained special characters.');
            console.log('   They have been automatically URL-encoded for you.');
            console.log(`   Original: ${password}`);
            console.log(`   Encoded:  ${encodedPassword}`);
        }

        console.log('\n🧪 Want to test this connection? Run:');
        console.log('   node test-connection.js');
        console.log('   (Remember to update the MONGODB_URI in that file first)');

        rl.close();
    });
});

rl.on('close', () => {
    console.log('\n👋 Done! Your connection string is ready to use.');
    process.exit(0);
});