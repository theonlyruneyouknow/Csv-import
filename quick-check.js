const mongoose = require('mongoose');
require('dotenv').config();

mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/purchase-orders');

const LineItem = require('./models/LineItem.js');

async function checkData() {
  console.log('🔍 Checking recent line items for PO10812...');
  
  const items = await LineItem.find({poNumber: 'PO10812'})
    .sort({createdAt: -1})
    .limit(10);
  
  console.log('📊 Recent line items:');
  items.forEach(item => {
    console.log(`- ${item.sku}: quantityExpected=${item.quantityExpected}, unit=${item.unit}`);
  });
  
  // Check specific items that should have large quantities
  const sp794 = await LineItem.findOne({poNumber: 'PO10812', sku: 'SP794 : SP794/OR.M'});
  const sp795 = await LineItem.findOne({poNumber: 'PO10812', sku: 'SP795 : SP795/OR.M'});
  
  console.log('\n🎯 Large quantity items check:');
  if (sp794) console.log(`- SP794: quantityExpected=${sp794.quantityExpected} (should be 6000)`);
  if (sp795) console.log(`- SP795: quantityExpected=${sp795.quantityExpected} (should be 7000)`);
  
  process.exit(0);
}

checkData().catch(console.error);
