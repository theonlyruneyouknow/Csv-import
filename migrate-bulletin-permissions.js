// migrate-bulletin-permissions.js
require('dotenv').config();
const mongoose = require('mongoose');

// Import the User model
const User = require('./models/User');

const mongoURI = process.env.MONGODB_URI || 'mongodb://localhost:27017/csv-import-test';

console.log('🔄 Connecting to MongoDB...');
mongoose.connect(mongoURI)
    .then(async () => {
        console.log('✅ Connected to MongoDB successfully');
        
        try {
            // Add bulletin management permissions to all users
            const result = await User.updateMany(
                {},
                {
                    $set: {
                        'permissions.accessBulletinManagement': true
                    }
                }
            );
            
            console.log(`✅ Updated ${result.modifiedCount} users with bulletin management permissions`);
            
            // Verify the update
            const users = await User.find({}, 'username permissions.accessBulletinManagement');
            console.log('📋 Current bulletin permissions:');
            users.forEach(user => {
                console.log(`   ${user.username}: ${user.permissions?.accessBulletinManagement || false}`);
            });
            
        } catch (error) {
            console.error('❌ Error updating permissions:', error);
        } finally {
            mongoose.disconnect();
            console.log('🔌 Disconnected from MongoDB');
        }
    })
    .catch((error) => {
        console.error('❌ MongoDB connection error:', error);
        process.exit(1);
    });
