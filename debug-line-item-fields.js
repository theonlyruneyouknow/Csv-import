const mongoose = require('mongoose');
require('dotenv').config();

const LineItem = require('./models/LineItem');

async function debugLineItemFields() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('✅ Connected to MongoDB');

        // Get one line item from trouble seed
        const item = await LineItem.findOne({
            received: false,
            $or: [
                { eta: { $exists: true, $ne: null } },
                { expectedArrivalDate: { $exists: true, $ne: null } }
            ]
        }).limit(1);

        if (item) {
            console.log('\n📋 Line Item Fields:');
            console.log('_id:', item._id);
            console.log('memo:', item.memo);
            console.log('quantityOrdered:', item.quantityOrdered);
            console.log('quantityExpected:', item.quantityExpected);
            console.log('quantityReceived:', item.quantityReceived);
            console.log('itemStatus:', item.itemStatus);
            console.log('sku:', item.sku);
            
            console.log('\n📊 Full item object keys:');
            console.log(Object.keys(item.toObject()).sort());
        } else {
            console.log('❌ No line items found');
        }

        await mongoose.connection.close();
        process.exit(0);
    } catch (error) {
        console.error('❌ Error:', error);
        process.exit(1);
    }
}

debugLineItemFields();
