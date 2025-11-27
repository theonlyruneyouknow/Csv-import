const mongoose = require('mongoose');
const LineItem = require('./models/LineItem');
require('dotenv').config();

async function testSpecificSKUs() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB\n');

    // Test the exact SKUs from your import data
    const testSKUs = [
      'BR094 : BR094/OR.M.OG',
      'BT143 : BT143/OR.LB.OG',
      'ON535 : ON535/OR.M',
      'BT136 : BT136/OR.LB',
      'HR1132 : HR1132/OR.LB'
    ];

    console.log('🔍 Testing exact SKU matches from your import data:\n');
    
    for (const fullSku of testSKUs) {
      // Try exact match
      const exactMatch = await LineItem.findOne({ sku: fullSku })
        .select('sku poNumber received inventoryRawQuantity inventoryChildQuantity')
        .lean();
      
      // Try with just base code
      const baseSku = fullSku.split(':')[0].trim();
      const basePattern = new RegExp(`^${baseSku.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(\\s*:|$)`, 'i');
      const regexMatch = await LineItem.findOne({ sku: basePattern })
        .select('sku poNumber received inventoryRawQuantity inventoryChildQuantity')
        .lean();

      console.log(`\n📦 Testing: "${fullSku}"`);
      console.log(`   Base SKU: "${baseSku}"`);
      console.log(`   Exact match: ${exactMatch ? '✅ FOUND' : '❌ NOT FOUND'}`);
      if (exactMatch) {
        console.log(`      Database SKU: "${exactMatch.sku}"`);
        console.log(`      Received: ${exactMatch.received}`);
        console.log(`      Has Inventory: ${exactMatch.inventoryRawQuantity !== null}`);
      }
      console.log(`   Regex match: ${regexMatch ? '✅ FOUND' : '❌ NOT FOUND'}`);
      if (regexMatch) {
        console.log(`      Database SKU: "${regexMatch.sku}"`);
        console.log(`      Received: ${regexMatch.received}`);
        console.log(`      Has Inventory: ${regexMatch.inventoryRawQuantity !== null}`);
      }
    }

    await mongoose.disconnect();
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

testSpecificSKUs();
