const mongoose = require('mongoose');
require('dotenv').config();

const LineItem = require('./models/LineItem');

async function checkQuantityFields() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('✅ Connected to MongoDB');

        // Get line items with quantityExpected
        const itemsWithExpected = await LineItem.find({
            quantityExpected: { $exists: true, $ne: null, $gt: 0 }
        }).limit(5);

        console.log('\n📊 Items with quantityExpected:');
        itemsWithExpected.forEach(item => {
            console.log(`  - ${item.memo}: Expected=${item.quantityExpected}, Ordered=${item.quantityOrdered}, Received=${item.quantityReceived}`);
        });

        // Get line items with quantityOrdered
        const itemsWithOrdered = await LineItem.find({
            quantityOrdered: { $exists: true, $ne: null, $gt: 0 }
        }).limit(5);

        console.log('\n📦 Items with quantityOrdered:');
        itemsWithOrdered.forEach(item => {
            console.log(`  - ${item.memo}: Expected=${item.quantityExpected}, Ordered=${item.quantityOrdered}, Received=${item.quantityReceived}`);
        });

        await mongoose.connection.close();
        process.exit(0);
    } catch (error) {
        console.error('❌ Error:', error);
        process.exit(1);
    }
}

checkQuantityFields();
