// Enable Grocery Price Comparison module for admin users
const mongoose = require('mongoose');
const User = require('./models/User');

mongoose.connect('mongodb://localhost/purchase-orders', {
    useNewUrlParser: true,
    useUnifiedTopology: true
});

async function enableGroceryAccess() {
    try {
        // Enable for all users first time
        const result = await User.updateMany(
            {},
            { $set: { 'permissions.accessGroceryPrices': true } }
        );
        
        console.log(`✅ Enabled grocery access for ${result.modifiedCount} users`);
        
        // Show all users with grocery access
        const users = await User.find(
            { 'permissions.accessGroceryPrices': true },
            'firstName lastName email role'
        );
        
        console.log('\n📋 Users with Grocery access:');
        users.forEach(user => {
            console.log(`   - ${user.firstName} ${user.lastName} (${user.role}): ${user.email}`);
        });
        
        process.exit(0);
    } catch (error) {
        console.error('❌ Error:', error);
        process.exit(1);
    }
}

enableGroceryAccess();
