// Check specific tracking number in database
require('dotenv').config();
const mongoose = require('mongoose');
const LineItem = require('./models/LineItem');

async function checkTracking() {
    try {
        await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/purchase-orders');
        console.log('✅ Connected to MongoDB\n');

        const trackingNumber = '884850643662';
        
        const items = await LineItem.find({ trackingNumber }).lean();
        
        if (items.length === 0) {
            console.log(`❌ No items found with tracking number: ${trackingNumber}`);
        } else {
            console.log(`✅ Found ${items.length} item(s) with tracking number: ${trackingNumber}\n`);
            
            items.forEach((item, i) => {
                console.log(`Item ${i + 1}:`);
                console.log(`  PO: ${item.poNumber}`);
                console.log(`  Memo: ${item.memo}`);
                console.log(`  Tracking #: ${item.trackingNumber}`);
                console.log(`  Carrier: ${item.trackingCarrier || 'N/A'}`);
                console.log(`  Status: ${item.trackingStatus || 'N/A'}`);
                console.log(`  Location: ${item.trackingLocation || 'N/A'}`);
                console.log(`  Last Update: ${item.trackingLastUpdate || 'N/A'}`);
                console.log(`  Created: ${item.createdAt}`);
                console.log(`  Updated: ${item.updatedAt}`);
                console.log('');
            });
        }

        await mongoose.disconnect();
        process.exit(0);
    } catch (error) {
        console.error('❌ Error:', error);
        process.exit(1);
    }
}

checkTracking();
