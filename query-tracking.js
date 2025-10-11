// Direct database query to check tracking numbers
require('dotenv').config();
const mongoose = require('mongoose');
const LineItem = require('./models/LineItem');

async function main() {
    try {
        // Connect to MongoDB
        const mongoURI = process.env.MONGODB_URI || 'mongodb://localhost:27017/purchase-orders';
        console.log('Connecting to:', mongoURI);
        await mongoose.connect(mongoURI);
        console.log('✅ Connected to MongoDB\n');

        // Query directly from database
        const itemsWithTracking = await LineItem.find({
            trackingNumber: { $exists: true, $ne: '', $ne: null }
        })
        .select('poNumber memo sku trackingNumber trackingCarrier trackingStatus')
        .limit(10)
        .lean();

        console.log(`Found ${itemsWithTracking.length} items with tracking numbers:\n`);
        
        itemsWithTracking.forEach((item, i) => {
            console.log(`${i + 1}. ${item.poNumber} - ${item.memo}`);
            console.log(`   Tracking: ${item.trackingNumber}`);
            console.log(`   Carrier: ${item.trackingCarrier || 'N/A'}`);
            console.log(`   Status: ${item.trackingStatus || 'N/A'}\n`);
        });

        await mongoose.disconnect();
        console.log('✅ Done');
        process.exit(0);
    } catch (error) {
        console.error('❌ Error:', error);
        process.exit(1);
    }
}

main();
