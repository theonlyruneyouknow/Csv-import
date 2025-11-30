const mongoose = require('mongoose');
const LineItem = require('./models/LineItem');

mongoose.connect('mongodb://localhost:27017/purchase-orders', {
  useNewUrlParser: true,
  useUnifiedTopology: true
});

async function checkSKUs() {
  try {
    const skusToCheck = ['BT136', 'HR1132', 'KL388', 'MS469', 'MS517', 'MS520'];
    
    console.log('🔍 Checking for these SKUs in database...\n');
    
    for (const sku of skusToCheck) {
      console.log(`\n📦 Searching for: ${sku}`);
      console.log('─'.repeat(60));
      
      // Exact match
      const exactMatch = await LineItem.find({ sku: sku }).lean();
      console.log(`  Exact match "${sku}": ${exactMatch.length} items`);
      
      // Regex match (starts with)
      const skuPattern = new RegExp(`^${sku.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(\\s*:|$)`, 'i');
      const regexMatch = await LineItem.find({ sku: skuPattern }).lean();
      console.log(`  Regex match /^${sku}(\\s*:|$)/i: ${regexMatch.length} items`);
      
      if (regexMatch.length > 0) {
        console.log(`\n  Found items:`);
        regexMatch.forEach((item, i) => {
          console.log(`    ${i + 1}. SKU: "${item.sku}"`);
          console.log(`       PO: ${item.poNumber}`);
          console.log(`       Received: ${item.received}`);
          console.log(`       Inv Raw: ${item.inventoryRawQuantity}, Child: ${item.inventoryChildQuantity}`);
        });
      }
      
      // Also check for partial matches anywhere in the SKU
      const anywherePattern = new RegExp(sku, 'i');
      const anywhereMatch = await LineItem.find({ sku: anywherePattern }).lean();
      if (anywhereMatch.length > regexMatch.length) {
        console.log(`\n  Additional matches (contains "${sku}"): ${anywhereMatch.length - regexMatch.length} more`);
        anywhereMatch.slice(0, 3).forEach((item, i) => {
          if (!regexMatch.find(r => r._id.equals(item._id))) {
            console.log(`    - SKU: "${item.sku}" (PO: ${item.poNumber}, Received: ${item.received})`);
          }
        });
      }
    }
    
    // Count total unreceived items
    console.log('\n\n📊 Summary:');
    console.log('─'.repeat(60));
    const totalUnreceived = await LineItem.countDocuments({ received: false });
    console.log(`Total unreceived items in database: ${totalUnreceived}`);
    
    // Show sample of unreceived SKUs
    const sampleUnreceived = await LineItem.find({ received: false }).limit(10).lean();
    console.log(`\nSample unreceived SKUs:`);
    sampleUnreceived.forEach((item, i) => {
      console.log(`  ${i + 1}. ${item.sku} (PO: ${item.poNumber})`);
    });

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await mongoose.connection.close();
    process.exit(0);
  }
}

checkSKUs();
