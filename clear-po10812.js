const mongoose = require('mongoose');
require('dotenv').config();

mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/purchase-orders');

const LineItem = require('./models/LineItem.js');

async function clearPO10812() {
  console.log('🗑️ Clearing existing PO10812 line items...');
  
  const result = await LineItem.deleteMany({poNumber: 'PO10812'});
  console.log(`✅ Deleted ${result.deletedCount} line items for PO10812`);
  
  process.exit(0);
}

clearPO10812().catch(console.error);
