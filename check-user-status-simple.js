const mongoose = require('mongoose');
const path = require('path');

// Set up environment
require('dotenv').config();

console.log('🔍 Checking user statuses...');

// Simple connection without loading the app
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/Csv-import', {
    useNewUrlParser: true,
    useUnifiedTopology: true
})
.then(() => {
    console.log('✅ Connected to MongoDB');
    return checkUsers();
})
.catch(err => {
    console.error('❌ MongoDB connection error:', err);
    process.exit(1);
});

// Define User schema inline to avoid loading the full app
const userSchema = new mongoose.Schema({
    username: String,
    email: String,
    status: String,
    permissions: {
        accessStoryManagement: Boolean,
        // other permissions...
    }
}, { strict: false }); // Allow additional fields

const User = mongoose.model('User', userSchema);

async function checkUsers() {
    try {
        console.log('📊 Fetching all users...\n');
        
        const users = await User.find({});
        
        if (users.length === 0) {
            console.log('❌ No users found in database');
            return;
        }
        
        console.log(`Found ${users.length} users:\n`);
        
        users.forEach(user => {
            console.log(`👤 ${user.username || user.email || 'Unknown'}`);
            console.log(`   Status: ${user.status || 'UNDEFINED'}`);
            console.log(`   Story Access: ${user.permissions?.accessStoryManagement || false}`);
            console.log(`   Email: ${user.email || 'Not set'}`);
            console.log(`   ID: ${user._id}`);
            console.log('   ---');
        });
        
        // Check for users without approved status
        const unapprovedUsers = users.filter(user => user.status !== 'approved');
        
        if (unapprovedUsers.length > 0) {
            console.log(`\n⚠️  Found ${unapprovedUsers.length} users without "approved" status:`);
            unapprovedUsers.forEach(user => {
                console.log(`   - ${user.username || user.email || 'Unknown'}: ${user.status || 'UNDEFINED'}`);
            });
            
            console.log('\n🔧 These users need their status updated to "approved"');
        } else {
            console.log('\n✅ All users have approved status');
        }
        
    } catch (error) {
        console.error('❌ Error checking user statuses:', error);
    } finally {
        mongoose.disconnect();
        console.log('\n🔌 Disconnected from MongoDB');
        process.exit(0);
    }
}
