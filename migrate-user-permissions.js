const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
require('dotenv').config();

// Define User schema inline to avoid loading issues
const userSchema = new mongoose.Schema({
    username: { type: String, required: true, unique: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    firstName: { type: String, required: true },
    lastName: { type: String, required: true },
    role: { type: String, enum: ['admin', 'manager', 'user', 'viewer'], default: 'user' },
    status: { type: String, enum: ['pending', 'approved', 'suspended', 'rejected'], default: 'pending' },
    permissions: {
        viewDashboard: { type: Boolean, default: true },
        editLineItems: { type: Boolean, default: false },
        managePOs: { type: Boolean, default: false },
        manageUsers: { type: Boolean, default: false },
        viewReports: { type: Boolean, default: false },
        manageDropship: { type: Boolean, default: false },
        manageOrganicVendors: { type: Boolean, default: false },
        accessReceiving: { type: Boolean, default: false },
        accessTasks: { type: Boolean, default: false },
        accessDropship: { type: Boolean, default: false },
        accessFoodManagement: { type: Boolean, default: false },
        accessOrganicVendors: { type: Boolean, default: false },
        accessLineItemsManager: { type: Boolean, default: false },
        accessTrackingDashboard: { type: Boolean, default: false },
        accessNotesManager: { type: Boolean, default: false },
        accessFileUpload: { type: Boolean, default: false },
        accessTroubleSeed: { type: Boolean, default: false },
        accessOrphanedItems: { type: Boolean, default: false }
    },
    lastLogin: Date,
    loginAttempts: { type: Number, default: 0 },
    lockUntil: Date,
    emailVerified: { type: Boolean, default: false },
    emailVerificationToken: String,
    passwordResetToken: String,
    passwordResetExpires: Date,
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    approvedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
}, { timestamps: true });

const User = mongoose.model('User', userSchema);

async function migrateUserPermissions() {
    try {
        console.log('🔄 Connecting to MongoDB...');
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('✅ Connected to MongoDB');

        // Get all users
        const users = await User.find({});
        console.log(`📋 Found ${users.length} users to migrate`);

        for (const user of users) {
            console.log(`\n🔄 Migrating permissions for user: ${user.username} (${user.role})`);
            
            // Set permissions based on role
            let permissions = { ...user.permissions };

            if (user.role === 'admin') {
                // Admin gets all permissions
                permissions = {
                    viewDashboard: true,
                    editLineItems: true,
                    managePOs: true,
                    manageUsers: true,
                    viewReports: true,
                    manageDropship: true,
                    manageOrganicVendors: true,
                    // Module access permissions
                    accessReceiving: true,
                    accessTasks: true,
                    accessDropship: true,
                    accessFoodManagement: true,
                    accessOrganicVendors: true,
                    // Tool access permissions
                    accessLineItemsManager: true,
                    accessTrackingDashboard: true,
                    accessNotesManager: true,
                    accessFileUpload: true,
                    accessTroubleSeed: true,
                    accessOrphanedItems: true
                };
                console.log('   ✅ Granted all permissions (admin)');
            } else if (user.role === 'manager') {
                // Manager gets most permissions except user management
                permissions = {
                    viewDashboard: true,
                    editLineItems: true,
                    managePOs: true,
                    manageUsers: false,
                    viewReports: true,
                    manageDropship: true,
                    manageOrganicVendors: true,
                    // Module access permissions
                    accessReceiving: true,
                    accessTasks: true,
                    accessDropship: true,
                    accessFoodManagement: true,
                    accessOrganicVendors: true,
                    // Tool access permissions
                    accessLineItemsManager: true,
                    accessTrackingDashboard: true,
                    accessNotesManager: true,
                    accessFileUpload: true,
                    accessTroubleSeed: true,
                    accessOrphanedItems: true
                };
                console.log('   ✅ Granted manager permissions');
            } else if (user.role === 'user') {
                // Regular user gets basic access
                permissions = {
                    viewDashboard: true,
                    editLineItems: false,
                    managePOs: false,
                    manageUsers: false,
                    viewReports: true,
                    manageDropship: false,
                    manageOrganicVendors: false,
                    // Module access permissions
                    accessReceiving: true,
                    accessTasks: true,
                    accessDropship: false,
                    accessFoodManagement: true,
                    accessOrganicVendors: false,
                    // Tool access permissions
                    accessLineItemsManager: true,
                    accessTrackingDashboard: true,
                    accessNotesManager: false,
                    accessFileUpload: false,
                    accessTroubleSeed: false,
                    accessOrphanedItems: false
                };
                console.log('   ✅ Granted user permissions');
            } else if (user.role === 'viewer') {
                // Viewer gets read-only access
                permissions = {
                    viewDashboard: true,
                    editLineItems: false,
                    managePOs: false,
                    manageUsers: false,
                    viewReports: true,
                    manageDropship: false,
                    manageOrganicVendors: false,
                    // Module access permissions
                    accessReceiving: true,
                    accessTasks: false,
                    accessDropship: false,
                    accessFoodManagement: false,
                    accessOrganicVendors: false,
                    // Tool access permissions
                    accessLineItemsManager: false,
                    accessTrackingDashboard: true,
                    accessNotesManager: false,
                    accessFileUpload: false,
                    accessTroubleSeed: false,
                    accessOrphanedItems: false
                };
                console.log('   ✅ Granted viewer permissions');
            }

            // Update the user
            await User.findByIdAndUpdate(user._id, { permissions });
            console.log(`   💾 Updated permissions for ${user.username}`);
        }

        console.log('\n✅ Migration completed successfully!');
        console.log('📊 Summary:');
        console.log(`   - Migrated ${users.length} users`);
        console.log('   - All users now have proper permissions based on their role');
        console.log('   - Dashboards dropdown should now work correctly');

    } catch (error) {
        console.error('❌ Migration failed:', error);
    } finally {
        await mongoose.connection.close();
        console.log('🔌 Disconnected from MongoDB');
        process.exit();
    }
}

// Run migration if this file is executed directly
if (require.main === module) {
    migrateUserPermissions();
}

module.exports = migrateUserPermissions;
