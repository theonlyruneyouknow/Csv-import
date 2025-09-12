// create-test-user.js
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
require('dotenv').config();

console.log('Starting test user creation script...');
console.log('MongoDB URI:', process.env.MONGODB_URI ? 'Found' : 'Missing');

// Import the User model
const User = require('./models/User');

// Connect to MongoDB
async function createTestUser() {
    try {
        console.log('🔄 Connecting to MongoDB...');
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('✅ Connected to MongoDB');

        // Check if test user already exists
        const existingUser = await User.findOne({ username: 'tuser' });
        if (existingUser) {
            console.log('⚠️ Test user already exists');
            console.log('User details:', {
                username: existingUser.username,
                email: existingUser.email,
                role: existingUser.role,
                status: existingUser.status
            });
            
            // Update the user to ensure it's approved
            existingUser.status = 'approved';
            existingUser.role = 'admin';
            await existingUser.save();
            console.log('✅ Updated test user status to approved and role to admin');
        } else {
            // Hash the password
            const saltRounds = 10;
            const hashedPassword = await bcrypt.hash('tpass123', saltRounds);

            // Create the test user
            const testUser = new User({
                username: 'tuser',
                email: 'tuser@test.com',
                password: hashedPassword,
                role: 'admin',
                status: 'approved',
                firstName: 'Test',
                lastName: 'User',
                permissions: ['all'] // Give all permissions for testing
            });

            await testUser.save();
            console.log('✅ Test user created successfully!');
            console.log('Login credentials:');
            console.log('  Username: tuser');
            console.log('  Password: tpass123');
            console.log('  Role: admin');
            console.log('  Status: approved');
        }

        // List all users for verification
        const allUsers = await User.find({}, 'username email role status');
        console.log('\n📋 All users in database:');
        allUsers.forEach(user => {
            console.log(`  - ${user.username} (${user.email}) - Role: ${user.role}, Status: ${user.status}`);
        });

    } catch (error) {
        console.error('❌ Error creating test user:', error);
    } finally {
        await mongoose.disconnect();
        console.log('🔌 Disconnected from MongoDB');
        process.exit(0);
    }
}

createTestUser();
