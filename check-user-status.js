const mongoose = require('mongoose');
require('dotenv').config();

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/Csv-import')
    .then(() => console.log('✅ Connected to MongoDB'))
    .catch(err => console.error('❌ MongoDB connection error:', err));

const User = require('./models/User');

async function checkUserStatuses() {
    try {
        console.log('\n📊 Checking all user statuses...\n');
        
        const users = await User.find({});
        
        if (users.length === 0) {
            console.log('❌ No users found in database');
            return;
        }
        
        console.log(`Found ${users.length} users:\n`);
        
        users.forEach(user => {
            console.log(`👤 ${user.username || user.email}`);
            console.log(`   Status: ${user.status || 'UNDEFINED'}`);
            console.log(`   Story Access: ${user.permissions?.accessStoryManagement || false}`);
            console.log(`   Email: ${user.email}`);
            console.log(`   ID: ${user._id}`);
            console.log('   ---');
        });
        
        // Check for users without approved status
        const unapprovedUsers = users.filter(user => user.status !== 'approved');
        
        if (unapprovedUsers.length > 0) {
            console.log(`\n⚠️  Found ${unapprovedUsers.length} users without "approved" status:`);
            unapprovedUsers.forEach(user => {
                console.log(`   - ${user.username || user.email}: ${user.status || 'UNDEFINED'}`);
            });
            
            console.log('\n🔧 To fix this, run: node fix-user-status.js');
        } else {
            console.log('\n✅ All users have approved status');
        }
        
    } catch (error) {
        console.error('❌ Error checking user statuses:', error);
    } finally {
        mongoose.disconnect();
        console.log('\n🔌 Disconnected from MongoDB');
    }
}

checkUserStatuses();
