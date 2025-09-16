// Test Resurrection Logic Directly
require('dotenv').config();
const mongoose = require('mongoose');
const PurchaseOrder = require('./models/PurchaseOrder');
const LineItem = require('./models/LineItem');

async function testResurrectionLogic() {
  try {
    console.log('🧪 TESTING RESURRECTION LOGIC DIRECTLY');
    console.log('=' + '='.repeat(50));
    
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB\n');

    // Find PO11322
    const po11322 = await PurchaseOrder.findOne({ poNumber: 'PO11322' });
    if (!po11322) {
      console.log('❌ PO11322 not found!');
      return;
    }

    console.log('📋 Current PO11322 Status:');
    console.log(`   Hidden: ${po11322.isHidden}`);
    console.log(`   Hidden Date: ${po11322.hiddenDate}`);
    console.log(`   Hidden Reason: "${po11322.hiddenReason}"`);
    console.log(`   Hidden By: "${po11322.hiddenBy}"`);

    // Manually test the resurrection logic
    if (po11322.isHidden) {
      console.log('\n🔄 MANUALLY TESTING RESURRECTION...');
      
      const updateData = {
        reportDate: po11322.reportDate,
        date: po11322.date,
        poNumber: po11322.poNumber,
        vendor: po11322.vendor,
        nsStatus: po11322.nsStatus,
        amount: po11322.amount,
        location: po11322.location,
        updatedAt: new Date(),
        notes: po11322.notes,
        status: po11322.status,
        $unset: {
          isHidden: 1,
          hiddenDate: 1,
          hiddenReason: 1,
          hiddenBy: 1
        }
      };

      console.log('   Applying $unset operation...');
      const result = await PurchaseOrder.findByIdAndUpdate(po11322._id, updateData, { new: true });
      
      console.log(`   Updated Hidden Status: ${result.isHidden}`);
      console.log(`   Hidden Date: ${result.hiddenDate}`);
      console.log(`   Hidden Reason: "${result.hiddenReason}"`);
      
      // Also test line item resurrection
      console.log('\n🔄 TESTING LINE ITEM RESURRECTION...');
      const lineItemResult = await LineItem.updateMany(
        { poNumber: po11322.poNumber, hiddenReason: 'Parent PO hidden' },
        {
          $unset: {
            isHidden: 1,
            hiddenDate: 1,
            hiddenReason: 1,
            hiddenBy: 1
          }
        }
      );
      
      console.log(`   Line items updated: ${lineItemResult.modifiedCount}`);
      
      // Verify the changes
      console.log('\n✅ VERIFICATION:');
      const updatedPO = await PurchaseOrder.findOne({ poNumber: 'PO11322' });
      const updatedLineItems = await LineItem.find({ poNumber: 'PO11322' });
      const hiddenLineItems = updatedLineItems.filter(item => item.isHidden);
      
      console.log(`   PO Hidden: ${updatedPO.isHidden || false}`);
      console.log(`   Line Items Total: ${updatedLineItems.length}`);
      console.log(`   Line Items Hidden: ${hiddenLineItems.length}`);
      console.log(`   Line Items Visible: ${updatedLineItems.length - hiddenLineItems.length}`);
      
      if (!updatedPO.isHidden && hiddenLineItems.length === 0) {
        console.log('\n🎉 RESURRECTION SUCCESSFUL!');
        console.log('   The manual resurrection logic works correctly.');
        console.log('   The issue must be in the import flow or $unset usage.');
      } else {
        console.log('\n❌ RESURRECTION FAILED!');
        console.log('   There\'s an issue with the resurrection logic itself.');
      }
      
    } else {
      console.log('\n✅ PO11322 is already visible (not hidden)');
    }

    console.log('\n' + '='.repeat(52));
    console.log('🎯 TEST COMPLETE!');
    
  } catch (error) {
    console.error('❌ Error in resurrection test:', error);
  } finally {
    await mongoose.disconnect();
    console.log('👋 Disconnected from MongoDB');
  }
}

testResurrectionLogic();
