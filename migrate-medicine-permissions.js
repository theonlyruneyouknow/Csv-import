// Migration script to add Medicine Management permissions to existing users
// Run this once after deploying the medicine module

const mongoose = require('mongoose');

// MongoDB connection
const mongoURI = process.env.MONGODB_URI || 'mongodb://localhost:27017/seedcompany';

async function migrateMedicinePermissions() {
    try {
        await mongoose.connect(mongoURI, {
            useNewUrlParser: true,
            useUnifiedTopology: true
        });

        console.log('🔗 Connected to MongoDB');

        // Import User model (this should be done after connection)
        const User = require('./models/User');

        // Find all users
        const users = await User.find({});
        console.log(`📊 Found ${users.length} users to migrate`);

        let updatedCount = 0;
        const bulkOperations = [];

        for (const user of users) {
            // Check if user already has accessMedicineManagement permission
            if (user.permissions.accessMedicineManagement === undefined) {
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

                // Prepare bulk update operation
                bulkOperations.push({
                    updateOne: {
                        filter: { _id: user._id },
                        update: {
                            $set: {
                                'permissions.accessMedicineManagement': shouldHaveAccess
                            }
                        }
                    }
                });

                console.log(`🔄 Will update ${user.username} (${user.role}) -> accessMedicineManagement: ${shouldHaveAccess}`);
                updatedCount++;
            } else {
                console.log(`✅ ${user.username} already has accessMedicineManagement permission: ${user.permissions.accessMedicineManagement}`);
            }
        }

        // Execute bulk operations if any
        if (bulkOperations.length > 0) {
            const result = await User.bulkWrite(bulkOperations);
            console.log(`✅ Successfully updated ${result.modifiedCount} users with Medicine Management permissions`);
        } else {
            console.log('🎉 All users already have Medicine Management permissions configured');
        }

        // Verify the migration
        const verifyUsers = await User.find({}).select('username role permissions.accessMedicineManagement');
        console.log('\n📋 Final permissions status:');
        verifyUsers.forEach(user => {
            console.log(`   ${user.username} (${user.role}): ${user.permissions.accessMedicineManagement}`);
        });

        console.log('\n🎉 Medicine Management permissions migration completed successfully!');
        
    } catch (error) {
        console.error('❌ Migration failed:', error);
        process.exit(1);
    } finally {
        await mongoose.disconnect();
        console.log('🔌 Disconnected from MongoDB');
        process.exit(0);
    }
}

// Run migration if this file is executed directly
if (require.main === module) {
    console.log('🚀 Starting Medicine Management permissions migration...');
    migrateMedicinePermissions();
}

module.exports = migrateMedicinePermissions;
