// Standalone migration script - doesn't need server to be stopped
const mongoose = require('mongoose');
require('dotenv').config();

// Use environment variable or default connection string
const mongoURI = process.env.MONGODB_URI || 'mongodb://localhost:27017/seedcompany';

// User schema (minimal version for migration)
const userSchema = new mongoose.Schema({
    username: String,
    role: String,
    permissions: {
        accessMedicineManagement: { type: Boolean, default: false }
        // other permissions exist but we only need this one
    }
});

const User = mongoose.model('User', userSchema);

async function migrateMedicinePermissions() {
    try {
        console.log('🚀 Starting Medicine Management permissions migration...');
        
        // Connect with a different app name to avoid conflicts
        await mongoose.connect(mongoURI, {
            useNewUrlParser: true,
            useUnifiedTopology: true,
            appName: 'MedicineMigration'
        });

        console.log('🔗 Connected to MongoDB for migration');

        // Find all users
        const users = await User.find({});
        console.log(`📊 Found ${users.length} users to migrate`);

        let updatedCount = 0;

        for (const user of users) {
            let shouldHaveAccess = false;

            // Grant access based on role
            switch (user.role) {
                case 'admin':
                    shouldHaveAccess = true;
                    break;
                case 'manager':
                    shouldHaveAccess = true;
                    break;
                case 'user':
                    // Regular users get access by default
                    shouldHaveAccess = true;
                    break;
                case 'viewer':
                    // Viewers don't get access by default
                    shouldHaveAccess = false;
                    break;
                default:
                    shouldHaveAccess = false;
            }

            // Update the user if permission is different than what it should be
            if (user.permissions.accessMedicineManagement !== shouldHaveAccess) {
                await User.updateOne(
                    { _id: user._id },
                    { $set: { 'permissions.accessMedicineManagement': shouldHaveAccess } }
                );

                console.log(`✅ Updated ${user.username} (${user.role}) -> accessMedicineManagement: ${shouldHaveAccess}`);
                updatedCount++;
            } else {
                console.log(`➡️ ${user.username} already has correct permission: ${user.permissions.accessMedicineManagement}`);
            }
        }

        console.log(`\n🎉 Migration completed! Updated ${updatedCount} users.`);
        
        // Verify the migration
        const verifyUsers = await User.find({}).select('username role permissions.accessMedicineManagement');
        console.log('\n📋 Final permissions status:');
        verifyUsers.forEach(user => {
            console.log(`   ${user.username} (${user.role}): ${user.permissions.accessMedicineManagement}`);
        });

        
    } catch (error) {
        console.error('❌ Migration failed:', error);
        process.exit(1);
    } finally {
        await mongoose.disconnect();
        console.log('\n🔌 Disconnected from MongoDB');
        console.log('✅ Medicine Management permissions migration completed successfully!');
        process.exit(0);
    }
}

// Run migration
migrateMedicinePermissions();
