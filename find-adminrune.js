const mongoose = require('mongoose');
require('dotenv').config();

const User = require('./models/User');

async function findUser() {
    try {
        await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost/purchase-orders');
        console.log('Connected to MongoDB\n');
        
        // Search for adminrune specifically
        const user = await User.findOne({
            $or: [
                { username: 'adminrune' },
                { username: /adminrune/i },
                { email: /adminrune/i }
            ]
        });
        
        if (user) {
            console.log('✅ Found user:');
            console.log(`   Username: ${user.username}`);
            console.log(`   Email: ${user.email}`);
            console.log(`   Name: ${user.firstName} ${user.lastName}`);
            console.log(`   Role: ${user.role}`);
            console.log(`   Status: ${user.status}`);
            console.log(`   Household: ${user.household || 'None'}`);
        } else {
            console.log('❌ User "adminrune" not found\n');
            
            // List all users
            const allUsers = await User.find({});
            if (allUsers.length === 0) {
                console.log('No users exist in the database yet.\n');
                console.log('You need to either:');
                console.log('  1. Register at http://localhost:3000/register');
                console.log('  2. Run: node setup-admin.js adminrune (after registering)');
            } else {
                console.log('Available users:');
                allUsers.forEach(u => {
                    console.log(`  - ${u.username} (${u.email}) - Role: ${u.role}`);
                });
            }
        }
        
        await mongoose.disconnect();
        process.exit(0);
    } catch (error) {
        console.error('Error:', error.message);
        process.exit(1);
    }
}

findUser();
