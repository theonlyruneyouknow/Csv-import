const mongoose = require('mongoose');
const LineItem = require('./models/LineItem');
require('dotenv').config();

async function checkBR094() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('✅ Connected to MongoDB\n');

        // Find BR094 exactly
        const br094 = await LineItem.findOne({
            sku: 'BR094 : BR094/OR.M.OG',
            received: false
        })
            .select('_id sku poNumber received inventoryRawQuantity inventoryChildQuantity inventoryMeasure inventoryLastUpdated')
            .lean();

        console.log('🔍 BR094 : BR094/OR.M.OG in database:');
        console.log(JSON.stringify(br094, null, 2));

        if (br094) {
            console.log('\n✅ Item exists!');
            console.log('   PO Number:', br094.poNumber);
            console.log('   Received:', br094.received);
            console.log('   Inv Raw:', br094.inventoryRawQuantity);
            console.log('   Inv Child:', br094.inventoryChildQuantity);
            console.log('   Inv Measure:', br094.inventoryMeasure);
            console.log('   Last Updated:', br094.inventoryLastUpdated);

            if (br094.inventoryRawQuantity === 340 && br094.inventoryChildQuantity === 650) {
                console.log('\n✅✅✅ DATA MATCHES! Raw=340, Child=650');
            } else {
                console.log('\n⚠️ Data does NOT match expected values (Raw=340, Child=650)');
            }
        } else {
            console.log('\n❌ BR094 : BR094/OR.M.OG not found in unreceived items');
        }

        await mongoose.disconnect();
        process.exit(0);
    } catch (error) {
        console.error('❌ Error:', error);
        process.exit(1);
    }
}

checkBR094();
