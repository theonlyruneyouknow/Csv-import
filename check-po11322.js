// Quick script to check PO11322 status before and after import
require('dotenv').config();
const mongoose = require('mongoose');
const PurchaseOrder = require('./models/PurchaseOrder');
const LineItem = require('./models/LineItem');

async function checkPO11322() {
  try {
    console.log('🔍 Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    const poNumber = 'PO11322';
    console.log(`\n🔍 Checking status of ${poNumber}...`);
    console.log('=' + '='.repeat(50));

    // Find the PO
    const po = await PurchaseOrder.findOne({ poNumber: poNumber });
    
    if (!po) {
      console.log(`❌ PO ${poNumber} not found in database`);
      return;
    }

    console.log(`📋 PO ${poNumber} Details:`);
    console.log(`   Vendor: ${po.vendor}`);
    console.log(`   Amount: $${po.amount}`);
    console.log(`   NS Status: ${po.nsStatus}`);
    console.log(`   Custom Status: ${po.status || '(empty)'}`);
    console.log(`   Date: ${po.date}`);
    console.log(`   Hidden: ${po.isHidden ? 'YES' : 'NO'}`);
    
    if (po.isHidden) {
      console.log(`   Hidden Date: ${po.hiddenDate}`);
      console.log(`   Hidden Reason: ${po.hiddenReason}`);
      console.log(`   Hidden By: ${po.hiddenBy}`);
    }

    // Check line items
    const lineItems = await LineItem.find({ poNumber: poNumber });
    const hiddenLineItems = await LineItem.find({ poNumber: poNumber, isHidden: true });
    
    console.log(`\n📦 Line Items for ${poNumber}:`);
    console.log(`   Total: ${lineItems.length}`);
    console.log(`   Hidden: ${hiddenLineItems.length}`);
    console.log(`   Visible: ${lineItems.length - hiddenLineItems.length}`);

    if (hiddenLineItems.length > 0) {
      console.log(`\n🔍 Hidden Line Item Reasons:`);
      const reasons = [...new Set(hiddenLineItems.map(item => item.hiddenReason))];
      reasons.forEach(reason => {
        const count = hiddenLineItems.filter(item => item.hiddenReason === reason).length;
        console.log(`   ${reason}: ${count} items`);
      });
    }

    console.log('\n' + '='.repeat(52));
    console.log(`🎯 Ready for import test with ${poNumber}!`);
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await mongoose.disconnect();
    console.log('👋 Disconnected from MongoDB');
  }
}

checkPO11322();
