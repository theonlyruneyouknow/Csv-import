const mongoose = require('mongoose');
require('dotenv').config();

// Import models
const User = require('./models/User');
const Household = require('./models/Household');

async function setupAdmin() {
    try {
        await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost/purchase-orders', {
            useNewUrlParser: true,
            useUnifiedTopology: true
        });
        
        console.log('\n✅ Connected to MongoDB');
        console.log('🔧 Admin Setup Tool\n');
        
        // Get username or email from command line
        const identifier = process.argv[2];
        
        if (!identifier) {
            console.log('Usage: node setup-admin.js <username or email>');
            console.log('Example: node setup-admin.js myusername');
            console.log('         node setup-admin.js user@example.com');
            console.log('\nAvailable users:');
            
            const allUsers = await User.find({}).select('username email role status firstName lastName');
            if (allUsers.length === 0) {
                console.log('   No users found in database.');
            } else {
                allUsers.forEach(u => {
                    console.log(`   ${u.username} (${u.email})`);
                    console.log(`      ${u.firstName} ${u.lastName} - Role: ${u.role}, Status: ${u.status}`);
                });
            }
            
            await mongoose.disconnect();
            process.exit(1);
        }
        
        // Find user by username or email
        const user = await User.findOne({
            $or: [
                { username: identifier },
                { email: identifier.toLowerCase() }
            ]
        });
        
        if (!user) {
            console.log(`❌ User not found: ${identifier}\n`);
            console.log('Available users:');
            const allUsers = await User.find({}).select('username email role status');
            allUsers.forEach(u => {
                console.log(`   ${u.username} (${u.email}) - Role: ${u.role}, Status: ${u.status}`);
            });
            await mongoose.disconnect();
            process.exit(1);
        }
        
        console.log(`\n✓ Found user: ${user.username} (${user.email})`);
        console.log(`  Name: ${user.firstName} ${user.lastName}`);
        console.log(`  Current role: ${user.role}`);
        console.log(`  Current status: ${user.status}`);
        
        // Update to admin
        user.role = 'admin';
        user.status = 'approved';
        user.emailVerified = true;
        
        // Enable ALL permissions
        if (user.permissions) {
            Object.keys(user.permissions).forEach(key => {
                user.permissions[key] = true;
            });
        }
        
        await user.save();
        
        console.log('\n✅ User promoted to administrator!');
        console.log(`   Role: ${user.role}`);
        console.log(`   Status: ${user.status}`);
        console.log('   All permissions enabled ✓');
        
        // Check/create household for food management
        if (!user.household) {
            console.log('\n🏠 Setting up household for food management...');
            
            const household = new Household({
                name: `${user.firstName}'s Household`,
                description: 'Administrator household for testing and management',
                type: 'individual',
                createdBy: user._id,
                members: [{
                    user: user._id,
                    role: 'owner',
                    canManageShopping: true,
                    canManagePantry: true,
                    canManageRecipes: true,
                    canManageMealPlans: true,
                    canInviteMembers: true
                }]
            });
            
            await household.save();
            
            user.household = household._id;
            await user.save();
            
            console.log(`✅ Household created: "${household.name}"`);
            console.log('   You now have full access to food management features!');
        } else {
            const household = await Household.findById(user.household);
            if (household) {
                console.log(`\n✓ Already member of household: "${household.name}"`);
                
                // Ensure user is owner with all permissions
                const memberIndex = household.members.findIndex(
                    m => m.user.toString() === user._id.toString()
                );
                
                if (memberIndex !== -1) {
                    household.members[memberIndex].role = 'owner';
                    household.members[memberIndex].canManageShopping = true;
                    household.members[memberIndex].canManagePantry = true;
                    household.members[memberIndex].canManageRecipes = true;
                    household.members[memberIndex].canManageMealPlans = true;
                    household.members[memberIndex].canInviteMembers = true;
                    await household.save();
                    console.log('   Household permissions updated to owner with all access ✓');
                } else {
                    // Add user as owner if not in members
                    household.members.push({
                        user: user._id,
                        role: 'owner',
                        canManageShopping: true,
                        canManagePantry: true,
                        canManageRecipes: true,
                        canManageMealPlans: true,
                        canInviteMembers: true
                    });
                    await household.save();
                    console.log('   Added as owner to household ✓');
                }
            } else {
                console.log('\n⚠️  User has invalid household reference');
            }
        }
        
        console.log('\n🎉 Setup complete! You can now:');
        console.log('   • Access all system features as administrator');
        console.log('   • Manage household and food features');
        console.log('   • Create and approve other users');
        console.log('   • Test all functionality');
        console.log('   • Create universal food items (user: null)');
        console.log('   • Manage shopping lists, pantry, recipes, and meal plans\n');
        
        await mongoose.disconnect();
        console.log('✅ Disconnected from MongoDB\n');
        process.exit(0);
        
    } catch (error) {
        console.error('\n❌ Error:', error.message);
        console.error(error.stack);
        await mongoose.disconnect();
        process.exit(1);
    }
}

setupAdmin();
