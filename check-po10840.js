require('dotenv').config();
const mongoose = require('mongoose');
const LineItem = require('./models/LineItem');

async function checkPO() {
    try {
        await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/csv-import');
        console.log('Connected to MongoDB');
        
        // Search for PO 10840
        const items = await LineItem.find({ poNumber: '10840' })
            .select('poNumber memo sku quantityOrdered quantityReceived quantityRemaining vendor eta')
            .lean();
        
        console.log('\n=== PO 10840 Line Items ===');
        console.log(`Found ${items.length} items\n`);
        
        items.forEach((item, index) => {
            console.log(`Item ${index + 1}:`);
            console.log(`  Memo: ${item.memo}`);
            console.log(`  SKU: ${item.sku || 'N/A'}`);
            console.log(`  Ordered: ${item.quantityOrdered}`);
            console.log(`  Received: ${item.quantityReceived}`);
            console.log(`  Remaining: ${item.quantityRemaining}`);
            console.log(`  Vendor: ${item.vendor}`);
            console.log(`  ETA: ${item.eta || 'N/A'}`);
            console.log('---');
        });
        
        // Look specifically for Tiara
        const tiaraItems = items.filter(item => 
            item.memo && item.memo.toLowerCase().includes('tiara')
        );
        
        if (tiaraItems.length > 0) {
            console.log('\n=== Tiara Items ===');
            tiaraItems.forEach(item => {
                console.log(`Memo: ${item.memo}`);
                console.log(`Ordered: ${item.quantityOrdered}, Received: ${item.quantityReceived}, Remaining: ${item.quantityRemaining}`);
            });
        }
        
        await mongoose.connection.close();
        process.exit(0);
    } catch (error) {
        console.error('Error:', error);
        process.exit(1);
    }
}

checkPO();
