const mongoose = require('mongoose');
require('dotenv').config();

const User = require('./models/User');
const Household = require('./models/Household');
const readline = require('readline');

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

function question(query) {
    return new Promise(resolve => rl.question(query, resolve));
}

async function createYourAdmin() {
    try {
        await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost/purchase-orders');
        console.log('\n✅ Connected to MongoDB');
        console.log('🎯 Create Your Administrator Account\n');
        
        // Get user details
        const username = await question('Enter your username: ');
        const email = await question('Enter your email: ');
        const firstName = await question('Enter your first name: ');
        const lastName = await question('Enter your last name: ');
        const password = await question('Enter a password: ');
        
        // Check if user exists
        const existing = await User.findOne({
            $or: [{ username }, { email: email.toLowerCase() }]
        });
        
        if (existing) {
            console.log('\n❌ User already exists with that username or email');
            rl.close();
            await mongoose.disconnect();
            process.exit(1);
        }
        
        // Create admin user
        const user = new User({
            username,
            email: email.toLowerCase(),
            password,
            firstName,
            lastName,
            role: 'admin',
            status: 'approved',
            emailVerified: true
        });
        
        // Enable all permissions
        user.permissions = {
            canManageVendors: true,
            canManagePurchaseOrders: true,
            canManageLineItems: true,
            canManageLabels: true,
            canManagePrescriptions: true,
            canManagePatients: true,
            canManageRecipes: true,
            canManageProducts: true,
            canManageInventory: true,
            canManagePrePurchaseOrders: true,
            canManageTracking: true,
            canManageRawMaterials: true,
            canManageLocations: true,
            canManageOrganicCropList: true,
            canManageSettings: true,
            canViewReports: true,
            canManageUsers: true,
            canExportData: true,
            canImportData: true,
            canManageAuditLogs: true,
            canManageSystemSettings: true,
            canManageGroceryItems: true,
            canManageShoppingLists: true
        };
        
        await user.save();
        
        console.log('\n✅ Administrator account created successfully!');
        console.log(`   Username: ${username}`);
        console.log(`   Email: ${email}`);
        console.log(`   Role: admin`);
        console.log(`   Status: approved`);
        
        // Create household
        console.log('\n🏠 Creating your household...');
        const household = new Household({
            name: `${firstName}'s Household`,
            description: 'Administrator household for food management',
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
        
        console.log(`✅ Household created: ${household.name}`);
        console.log(`   You are the owner with full permissions\n`);
        
        console.log('🎉 Setup complete! You can now login at:');
        console.log('   http://localhost:3000\n');
        
        rl.close();
        await mongoose.disconnect();
        process.exit(0);
        
    } catch (error) {
        console.error('\n❌ Error:', error.message);
        rl.close();
        await mongoose.disconnect();
        process.exit(1);
    }
}

createYourAdmin();
