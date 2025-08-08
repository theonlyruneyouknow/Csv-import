const mongoose = require('mongoose');
const LineItemStatusOption = require('./models/LineItemStatusOption');

async function addLineItemStatuses() {
    try {
        await mongoose.connect('mongodb://localhost:27017/purchase-orders');
        console.log('✅ Connected to MongoDB');

        // Your desired statuses
        const statuses = [
            'In Stock',
            'Backordered',
            'Find Different Vendor',
            'Substitute Product',
            'Discontinued',
            'Delivery Delay',
            'On Order',
            'Cancelled',
            'Special Order'
        ];

        // Check what exists
        const existing = await LineItemStatusOption.find();
        console.log('📊 Current status count:', existing.length);

        // Add each status if it doesn't exist
        for (const statusName of statuses) {
            const exists = await LineItemStatusOption.findOne({ name: statusName });
            if (!exists) {
                await LineItemStatusOption.create({ name: statusName, isDefault: true });
                console.log('✅ Added:', statusName);
            } else {
                console.log('⚪ Already exists:', statusName);
            }
        }

        // Show final list
        const final = await LineItemStatusOption.find().sort({ name: 1 });
        console.log('\n📋 All line item status options:');
        final.forEach((s, i) => console.log(`  ${i + 1}. ${s.name}`));

        mongoose.connection.close();
        console.log('\n✅ Done!');
    } catch (error) {
        console.error('❌ Error:', error.message);
        process.exit(1);
    }
}

addLineItemStatuses();
