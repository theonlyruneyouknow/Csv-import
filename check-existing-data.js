const mongoose = require('mongoose');
const LineItem = require('./models/LineItem');

async function checkExistingData() {
    try {
        await mongoose.connect('mongodb://localhost:27017/csv-import');
        console.log('Connected to MongoDB');

        // Count total line items
        const totalCount = await LineItem.countDocuments();
        console.log(`\n📊 Total line items: ${totalCount}`);

        if (totalCount > 0) {
            // Check for items with statuses
            const itemsWithStatus = await LineItem.countDocuments({
                itemStatus: { $exists: true, $ne: '', $ne: null }
            });
            console.log(`📋 Items with status: ${itemsWithStatus}`);

            // Get distinct status values
            const distinctStatuses = await LineItem.distinct('itemStatus');
            console.log(`\n🏷️ Distinct status values found:`);
            distinctStatuses.forEach((status, index) => {
                console.log(`  ${index + 1}. "${status}" (${typeof status})`);
            });

            // Count items by status
            console.log(`\n📈 Status distribution:`);
            for (const status of distinctStatuses) {
                const count = await LineItem.countDocuments({ itemStatus: status });
                console.log(`  "${status}": ${count} items`);
            }

            // Sample some line items
            console.log(`\n🔍 Sample line items:`);
            const samples = await LineItem.find().limit(10).select('poNumber memo itemStatus sku received');
            samples.forEach((item, index) => {
                console.log(`  ${index + 1}. PO: ${item.poNumber}, Status: "${item.itemStatus}", SKU: "${item.sku}", Received: ${item.received}`);
                console.log(`     Memo: ${item.memo.substring(0, 60)}...`);
            });
        } else {
            console.log('\n❌ No line items found in database');
            console.log('This means your old statuses were never in the database to begin with.');
        }

        await mongoose.disconnect();
        console.log('\nDisconnected from MongoDB');
    } catch (error) {
        console.error('Error:', error);
    }
}

checkExistingData();
