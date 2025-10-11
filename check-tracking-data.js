// Quick script to check tracking data in database
require('dotenv').config();
const mongoose = require('mongoose');
const LineItem = require('./models/LineItem');

async function checkTracking() {
    try {
        await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/purchase-orders');
        console.log('✅ Connected to MongoDB');

        // Count total line items
        const total = await LineItem.countDocuments();
        console.log(`\n📊 Total line items: ${total}`);

        // Count items with tracking numbers
        const withTracking = await LineItem.countDocuments({
            trackingNumber: { $exists: true, $ne: '', $ne: null }
        });
        console.log(`📦 Items with tracking numbers: ${withTracking}`);

        // Get a few samples
        const samples = await LineItem.find({
            trackingNumber: { $exists: true, $ne: '', $ne: null }
        })
        .limit(5)
        .lean();

        console.log(`\n📋 Sample items with tracking:`);
        samples.forEach((item, index) => {
            console.log(`\n${index + 1}. PO: ${item.poNumber}`);
            console.log(`   Memo: ${item.memo}`);
            console.log(`   Tracking #: ${item.trackingNumber}`);
            console.log(`   Carrier: ${item.trackingCarrier || 'Not set'}`);
            console.log(`   Status: ${item.trackingStatus || 'Not set'}`);
        });

        // Check items without tracking
        const withoutTracking = await LineItem.countDocuments({
            $or: [
                { trackingNumber: { $exists: false } },
                { trackingNumber: '' },
                { trackingNumber: null }
            ]
        });
        console.log(`\n⚠️  Items WITHOUT tracking: ${withoutTracking}`);

        process.exit(0);
    } catch (error) {
        console.error('❌ Error:', error);
        process.exit(1);
    }
}

checkTracking();
