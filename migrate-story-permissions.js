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
        accessStoryManagement: { type: Boolean, default: false },
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

async function addStoryManagementPermissions() {
    try {
        console.log('🔄 Connecting to MongoDB...');
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('✅ Connected to MongoDB');

        // Get all users
        const users = await User.find({});
        console.log(`📋 Found ${users.length} users to update`);

        for (const user of users) {
            console.log(`\n🔄 Adding Story Management permission for user: ${user.username} (${user.role})`);
            
            // Set Story Management permission based on role
            let accessStoryManagement = false;
            
            if (user.role === 'admin' || user.role === 'manager') {
                accessStoryManagement = true;
                console.log('   ✅ Granted Story Management access (admin/manager)');
            } else if (user.role === 'user') {
                accessStoryManagement = true;
                console.log('   ✅ Granted Story Management access (user)');
            } else if (user.role === 'viewer') {
                accessStoryManagement = false;
                console.log('   ❌ No Story Management access (viewer)');
            }

            // Update the user's permissions
            user.permissions.accessStoryManagement = accessStoryManagement;
            await user.save();
            console.log(`   💾 Updated permissions for ${user.username}`);
        }

        console.log('\n✅ Story Management permissions migration completed successfully!');
        console.log('📊 Summary:');
        console.log(`   - Updated ${users.length} users`);
        console.log('   - Admin/Manager/User roles now have Story Management access');
        console.log('   - Viewer roles have no Story Management access');
        console.log('   - Story Management module is now available in the navigation');

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
    addStoryManagementPermissions();
}

module.exports = addStoryManagementPermissions;
