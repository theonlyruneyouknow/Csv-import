// update-user-permissions.js
// Script to update existing users with new module permissions

const mongoose = require('mongoose');
require('dotenv').config();

const User = require('./models/User');

async function updateUserPermissions() {
    try {
        console.log('🔄 Connecting to MongoDB...');
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('✅ Connected to MongoDB');

        // Find all users
        const users = await User.find({});
        console.log(`📋 Found ${users.length} users to update`);

        for (const user of users) {
            console.log(`\n🔄 Updating permissions for user: ${user.username} (${user.role})`);
            
            // Set default permissions based on role
            const newPermissions = {
                // Keep existing permissions
                ...user.permissions,
                // Add new module permissions based on role
            };

            if (user.role === 'admin') {
                // Admin gets access to everything
                Object.assign(newPermissions, {
                    accessReceiving: true,
                    accessTasks: true,
                    accessDropship: true,
                    accessFoodManagement: true,
                    accessOrganicVendors: true,
                    accessLineItemsManager: true,
                    accessTrackingDashboard: true,
                    accessNotesManager: true,
                    accessFileUpload: true,
                    accessTroubleSeed: true,
                    accessOrphanedItems: true
                });
                console.log('  ✅ Admin: Full access granted');
            } else if (user.role === 'manager') {
                // Manager gets access to most modules
                Object.assign(newPermissions, {
                    accessReceiving: true,
                    accessTasks: true,
                    accessDropship: true,
                    accessFoodManagement: true,
                    accessOrganicVendors: true,
                    accessLineItemsManager: true,
                    accessTrackingDashboard: true,
                    accessNotesManager: true,
                    accessFileUpload: true,
                    accessTroubleSeed: false,  // Restricted for managers
                    accessOrphanedItems: false // Restricted for managers
                });
                console.log('  ✅ Manager: Most modules granted');
            } else if (user.role === 'user') {
                // Regular user gets limited access
                Object.assign(newPermissions, {
                    accessReceiving: false,
                    accessTasks: true,
                    accessDropship: false,
                    accessFoodManagement: true,  // Give users access to Food Management
                    accessOrganicVendors: false,
                    accessLineItemsManager: false,
                    accessTrackingDashboard: true,
                    accessNotesManager: false,
                    accessFileUpload: false,
                    accessTroubleSeed: false,
                    accessOrphanedItems: false
                });
                console.log('  ✅ User: Limited access granted');
            } else if (user.role === 'viewer') {
                // Viewer gets minimal access
                Object.assign(newPermissions, {
                    accessReceiving: false,
                    accessTasks: false,
                    accessDropship: false,
                    accessFoodManagement: false,
                    accessOrganicVendors: false,
                    accessLineItemsManager: false,
                    accessTrackingDashboard: true,  // View tracking only
                    accessNotesManager: false,
                    accessFileUpload: false,
                    accessTroubleSeed: false,
                    accessOrphanedItems: false
                });
                console.log('  ✅ Viewer: View-only access granted');
            }

            // Update user permissions
            user.permissions = newPermissions;
            await user.save();
            console.log(`  💾 Saved permissions for ${user.username}`);
        }

        console.log('\n🎉 All user permissions updated successfully!');
        console.log('\n📋 Permission Summary:');
        console.log('👑 Admin: Full access to all modules');
        console.log('👨‍💼 Manager: Access to most modules (restricted Trouble Seed & Orphaned Items)');
        console.log('👤 User: Limited access (Tasks, Food Management, Tracking)');
        console.log('👀 Viewer: View-only access (Tracking Dashboard only)');

    } catch (error) {
        console.error('❌ Error updating user permissions:', error);
    } finally {
        await mongoose.disconnect();
        console.log('🔌 Disconnected from MongoDB');
        process.exit(0);
    }
}

// Run the migration
updateUserPermissions();
