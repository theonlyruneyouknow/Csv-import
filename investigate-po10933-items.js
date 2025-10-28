require('dotenv').config();
const mongoose = require('mongoose');
const PurchaseOrder = require('./models/PurchaseOrder');
const LineItem = require('./models/LineItem');

async function investigateLineItems() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('✅ Connected to MongoDB');

        const po = await PurchaseOrder.findOne({ poNumber: 'PO10933' });
        console.log('\n📋 PO10933 ID:', po._id);

        // Try different field names
        console.log('\n🔍 Searching for line items with different field names:');
        
        const byPoId = await LineItem.find({ poId: po._id });
        console.log(`- poId field: ${byPoId.length} items`);
        
        const byPurchaseOrder = await LineItem.find({ purchaseOrder: po._id });
        console.log(`- purchaseOrder field: ${byPurchaseOrder.length} items`);
        
        const byPoNumber = await LineItem.find({ poNumber: 'PO10933' });
        console.log(`- poNumber field: ${byPoNumber.length} items`);

        // Check all line items to see if any reference this PO
        const allItems = await LineItem.find({});
        const matchingItems = allItems.filter(item => {
            return item.poId?.toString() === po._id.toString() ||
                   item.purchaseOrder?.toString() === po._id.toString() ||
                   item.poNumber === 'PO10933' ||
                   (item.memo && item.memo.includes('10933'));
        });
        
        console.log(`\n🔎 Manual search through all ${allItems.length} line items: ${matchingItems.length} matches`);
        
        if (matchingItems.length > 0) {
            console.log('\n✅ Found matching items:');
            matchingItems.forEach((item, idx) => {
                console.log(`\n${idx + 1}. ${item.memo}`);
                console.log(`   - _id: ${item._id}`);
                console.log(`   - poId: ${item.poId}`);
                console.log(`   - purchaseOrder: ${item.purchaseOrder}`);
                console.log(`   - poNumber: ${item.poNumber}`);
                console.log(`   - quantity: ${item.quantity || item.quantityExpected}`);
                console.log(`   - received: ${item.quantityReceived || 0}`);
            });
        }

        // Check the LineItem schema to see what fields exist
        console.log('\n📊 LineItem Schema Fields:');
        const sampleItem = await LineItem.findOne({});
        if (sampleItem) {
            console.log(Object.keys(sampleItem.toObject()).join(', '));
        }

    } catch (error) {
        console.error('❌ Error:', error);
    } finally {
        await mongoose.disconnect();
        process.exit(0);
    }
}

investigateLineItems();
