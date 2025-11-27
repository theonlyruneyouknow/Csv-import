const mongoose = require('mongoose');
const LineItem = require('./models/LineItem');

mongoose.connect('mongodb://localhost:27017/purchase-orders', {
    useNewUrlParser: true,
    useUnifiedTopology: true
});

async function checkON540() {
    try {
        console.log('🔍 Looking for ON540 items...\n');

        const items = await LineItem.find({
            sku: /ON540/i
        }).lean();

        console.log(`Found ${items.length} items with ON540 in SKU\n`);

        items.forEach((item, index) => {
            console.log(`Item ${index + 1}:`);
            console.log(`  SKU: ${item.sku}`);
            console.log(`  PO Number: ${item.poNumber}`);
            console.log(`  Received: ${item.received}`);
            console.log(`  Raw Quantity: ${item.inventoryRawQuantity} (type: ${typeof item.inventoryRawQuantity})`);
            console.log(`  Child Quantity: ${item.inventoryChildQuantity} (type: ${typeof item.inventoryChildQuantity})`);
            console.log(`  Measure: ${item.inventoryMeasure}`);
            console.log(`  Last Updated: ${item.inventoryLastUpdated}`);
            console.log(`  _id: ${item._id}`);
            console.log('');
        });

        // Test the exact query used by the endpoint
        console.log('🔍 Testing endpoint query (received: false)...\n');
        const unreceivedON540 = await LineItem.find({
            sku: /ON540/i,
            received: false
        }).lean();

        console.log(`Found ${unreceivedON540.length} unreceived ON540 items\n`);
        unreceivedON540.forEach((item, index) => {
            console.log(`Unreceived Item ${index + 1}:`);
            console.log(`  SKU: ${item.sku}`);
            console.log(`  Raw: ${item.inventoryRawQuantity} (${typeof item.inventoryRawQuantity})`);
            console.log(`  Child: ${item.inventoryChildQuantity} (${typeof item.inventoryChildQuantity})`);
            console.log(`  Check if null: raw=${item.inventoryRawQuantity === null}, child=${item.inventoryChildQuantity === null}`);
            console.log(`  Check if undefined: raw=${item.inventoryRawQuantity === undefined}, child=${item.inventoryChildQuantity === undefined}`);
            console.log(`  Check if 0: raw=${item.inventoryRawQuantity === 0}, child=${item.inventoryChildQuantity === 0}`);
            console.log('');
        });

    } catch (error) {
        console.error('❌ Error:', error);
    } finally {
        await mongoose.connection.close();
        process.exit(0);
    }
}

checkON540();
