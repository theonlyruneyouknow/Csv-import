const mongoose = require('mongoose');

// Connect without conflicting with main server
const db = mongoose.createConnection(process.env.MONGODB_URI || 'mongodb://localhost:27017/purchase-orders');

const LineItem = require('./models/LineItem.js');

async function checkData() {
  console.log('🔍 Checking PO10812 line items for quantity values...');
  
  // Use the separate connection
  const LineItemModel = db.model('LineItem', LineItem.schema);
  
  const sp794 = await LineItemModel.findOne({poNumber: 'PO10812', sku: 'SP794 : SP794/OR.M'});
  const sp795 = await LineItemModel.findOne({poNumber: 'PO10812', sku: 'SP795 : SP795/OR.M'});
  const bt157 = await LineItemModel.findOne({poNumber: 'PO10812', sku: 'BT157 : BT157/OR.M'});
  
  console.log('\n🎯 Quantity validation:');
  if (sp794) {
    console.log(`- SP794: quantityExpected=${sp794.quantityExpected} (should be 6000)`);
    console.log(`  Notes: ${sp794.notes}`);
  }
  if (sp795) {
    console.log(`- SP795: quantityExpected=${sp795.quantityExpected} (should be 7000)`);
    console.log(`  Notes: ${sp795.notes}`);
  }
  if (bt157) {
    console.log(`- BT157: quantityExpected=${bt157.quantityExpected} (should be 2000)`);
    console.log(`  Notes: ${bt157.notes}`);
  }
  
  await db.close();
  process.exit(0);
}

checkData().catch(console.error);
