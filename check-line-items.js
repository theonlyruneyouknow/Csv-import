const mongoose = require('mongoose');
const LineItem = require('./models/LineItem');

async function checkLineItems() {
    try {
        await mongoose.connect('mongodb://localhost:27017/csv-import');
        console.log('Connected to MongoDB');

        // Count total line items
        const totalCount = await LineItem.countDocuments();
        console.log(`Total line items: ${totalCount}`);

        if (totalCount > 0) {
            // Get all unique itemStatus values (including empty/null)
            const existingStatuses = await LineItem.distinct('itemStatus');
            console.log('All distinct itemStatus values:');
            existingStatuses.forEach((status, index) => {
                console.log(`  ${index + 1}. "${status}" (type: ${typeof status})`);
            });

            // Count items with empty/null statuses
            const emptyStatuses = await LineItem.countDocuments({
                $or: [
                    { itemStatus: '' },
                    { itemStatus: null },
                    { itemStatus: { $exists: false } }
                ]
            });
            console.log(`\nItems with empty/null status: ${emptyStatuses}`);

            // Sample a few line items to see their current state
            const sampleItems = await LineItem.find().limit(5).select('poNumber memo itemStatus sku');
            console.log('\nSample line items:');
            sampleItems.forEach((item, index) => {
                console.log(`  ${index + 1}. PO: ${item.poNumber}, Status: "${item.itemStatus}", SKU: "${item.sku}", Memo: ${item.memo.substring(0, 50)}...`);
            });
        }

        await mongoose.disconnect();
        console.log('Disconnected from MongoDB');
    } catch (error) {
        console.error('Error:', error);
    }
}

checkLineItems();
