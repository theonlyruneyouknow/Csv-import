const mongoose = require('mongoose');
const LineItem = require('./models/LineItem');
require('dotenv').config();

async function checkInventory() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    // Find items with inventory data
    const itemsWithInventory = await LineItem.find({ 
      inventoryRawQuantity: { $ne: null } 
    })
    .select('sku inventoryRawQuantity inventoryChildQuantity inventoryMeasure received poNumber')
    .limit(10)
    .lean();

    console.log('\n📦 Sample items WITH inventory data:');
    console.log(JSON.stringify(itemsWithInventory, null, 2));

    // Count unreceived items with inventory
    const unreceivedWithInventory = await LineItem.countDocuments({ 
      received: false,
      inventoryRawQuantity: { $ne: null } 
    });

    console.log(`\n✅ Total unreceived items with inventory: ${unreceivedWithInventory}`);

    // Count total unreceived
    const totalUnreceived = await LineItem.countDocuments({ received: false });
    console.log(`📊 Total unreceived items: ${totalUnreceived}`);

    // Find a specific SKU from the unreceived report
    const br094 = await LineItem.findOne({ 
      sku: /^BR094/i,
      received: false 
    })
    .select('sku inventoryRawQuantity inventoryChildQuantity inventoryMeasure received poNumber')
    .lean();

    console.log('\n🔍 BR094 item (from unreceived report):');
    console.log(JSON.stringify(br094, null, 2));

    await mongoose.disconnect();
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

checkInventory();
