const mongoose = require('mongoose');
require('dotenv').config();

const LineItem = require('./models/LineItem');

async function checkReceivedQuantities() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('✅ Connected to MongoDB');

        // Get line items with received quantities
        const itemsWithReceived = await LineItem.find({
            quantityReceived: { $exists: true, $ne: null, $gt: 0 }
        }).limit(10);

        console.log('\n📦 Items with quantityReceived > 0:');
        itemsWithReceived.forEach(item => {
            console.log(`  - ${item.memo}:`);
            console.log(`    Expected: ${item.quantityExpected}`);
            console.log(`    Ordered: ${item.quantityOrdered}`);
            console.log(`    Received: ${item.quantityReceived}`);
            console.log(`    Status: ${item.itemStatus}`);
            console.log(`    Received flag: ${item.received}`);
        });

        // Check a specific item (TORA BLUE SALPIGLOSSIS if it exists)
        const toraItem = await LineItem.findOne({
            memo: /TORA BLUE SALPIGLOSSIS/i
        });

        if (toraItem) {
            console.log('\n🔍 TORA BLUE SALPIGLOSSIS details:');
            console.log(`    Expected: ${toraItem.quantityExpected}`);
            console.log(`    Ordered: ${toraItem.quantityOrdered}`);
            console.log(`    Received: ${toraItem.quantityReceived}`);
            console.log(`    Status: ${toraItem.itemStatus}`);
            console.log(`    Received flag: ${toraItem.received}`);
        }

        await mongoose.connection.close();
        process.exit(0);
    } catch (error) {
        console.error('❌ Error:', error);
        process.exit(1);
    }
}

checkReceivedQuantities();
