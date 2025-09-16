// Deep Debugging Script for PO11322 Issue
require('dotenv').config();
const mongoose = require('mongoose');
const PurchaseOrder = require('./models/PurchaseOrder');
const LineItem = require('./models/LineItem');

async function deepDivePO11322() {
  try {
    console.log('🔬 DEEP DIVE: PO11322 RESURRECTION ANALYSIS');
    console.log('=' + '='.repeat(60));
    
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB\n');

    // 1. Find PO11322 with ALL possible variations
    console.log('🔍 STEP 1: SEARCHING FOR PO11322 WITH ALL VARIATIONS');
    console.log('-'.repeat(50));
    
    const variations = ['PO11322', '11322', 'PO 11322', ' PO11322 ', 'po11322'];
    let foundPO = null;
    
    for (const variation of variations) {
      console.log(`  Searching for: "${variation}"`);
      const po = await PurchaseOrder.findOne({ 
        poNumber: { $regex: new RegExp(`^\\s*${variation.replace(/\s/g, '\\s*')}\\s*$`, 'i') }
      });
      if (po) {
        console.log(`  ✅ FOUND with variation: "${variation}" -> Actual: "${po.poNumber}"`);
        foundPO = po;
        break;
      } else {
        console.log(`  ❌ Not found with: "${variation}"`);
      }
    }
    
    if (!foundPO) {
      console.log('\n❌ PO11322 NOT FOUND in database with any variation!');
      
      // Let's see what POs DO exist with similar numbers
      console.log('\n🔍 Looking for POs with "11322" anywhere in the number...');
      const similarPOs = await PurchaseOrder.find({ 
        poNumber: { $regex: /11322/i }
      });
      
      if (similarPOs.length > 0) {
        console.log(`Found ${similarPOs.length} POs with "11322":`);
        similarPOs.forEach(po => {
          console.log(`  - "${po.poNumber}" (Hidden: ${po.isHidden})`);
        });
      } else {
        console.log('  No POs found with "11322" in the number');
      }
      
      return;
    }

    // 2. Analyze the found PO in detail
    console.log('\n🔍 STEP 2: DETAILED ANALYSIS OF FOUND PO');
    console.log('-'.repeat(50));
    console.log(`📋 PO Details:`);
    console.log(`   Exact PO Number: "${foundPO.poNumber}"`);
    console.log(`   Vendor: ${foundPO.vendor}`);
    console.log(`   Amount: $${foundPO.amount}`);
    console.log(`   NS Status: "${foundPO.nsStatus}"`);
    console.log(`   Custom Status: "${foundPO.status || '(empty)'}"`);
    console.log(`   Date: ${foundPO.date}`);
    console.log(`   Report Date: ${foundPO.reportDate}`);
    console.log(`   Created: ${foundPO.createdAt}`);
    console.log(`   Updated: ${foundPO.updatedAt}`);
    console.log(`   Hidden: ${foundPO.isHidden ? 'YES' : 'NO'}`);
    
    if (foundPO.isHidden) {
      console.log(`   Hidden Date: ${foundPO.hiddenDate}`);
      console.log(`   Hidden Reason: "${foundPO.hiddenReason}"`);
      console.log(`   Hidden By: "${foundPO.hiddenBy}"`);
    }

    // 3. Check line items
    console.log('\n🔍 STEP 3: LINE ITEMS ANALYSIS');
    console.log('-'.repeat(50));
    
    const allLineItems = await LineItem.find({ poNumber: foundPO.poNumber });
    const hiddenLineItems = allLineItems.filter(item => item.isHidden);
    const visibleLineItems = allLineItems.filter(item => !item.isHidden);
    
    console.log(`📦 Line Items Summary:`);
    console.log(`   Total: ${allLineItems.length}`);
    console.log(`   Hidden: ${hiddenLineItems.length}`);
    console.log(`   Visible: ${visibleLineItems.length}`);
    
    if (hiddenLineItems.length > 0) {
      console.log('\n🔍 Hidden Line Items Details:');
      hiddenLineItems.forEach((item, i) => {
        console.log(`   ${i+1}. ${item.sku || 'No SKU'} - Hidden: ${item.hiddenReason} (${item.hiddenBy})`);
      });
    }

    // 4. Check recent import history
    console.log('\n🔍 STEP 4: RECENT IMPORT HISTORY');
    console.log('-'.repeat(50));
    
    // Find other POs with same report date to understand import patterns
    const sameDatePOs = await PurchaseOrder.find({ 
      reportDate: foundPO.reportDate 
    }).limit(10);
    
    console.log(`📅 POs with same report date (${foundPO.reportDate}):`);
    sameDatePOs.forEach(po => {
      console.log(`   ${po.poNumber} - Hidden: ${po.isHidden ? 'YES' : 'NO'} (${po.vendor})`);
    });

    // 5. Data integrity check
    console.log('\n🔍 STEP 5: DATA INTEGRITY CHECK');
    console.log('-'.repeat(50));
    
    console.log(`🔍 PO Number Character Analysis:`);
    console.log(`   Length: ${foundPO.poNumber.length}`);
    console.log(`   Characters: ${foundPO.poNumber.split('').map(c => `'${c}'(${c.charCodeAt(0)})`).join(', ')}`);
    console.log(`   Starts with space: ${foundPO.poNumber.startsWith(' ')}`);
    console.log(`   Ends with space: ${foundPO.poNumber.endsWith(' ')}`);
    console.log(`   Trimmed equals original: ${foundPO.poNumber.trim() === foundPO.poNumber}`);

    console.log('\n' + '='.repeat(62));
    console.log('🎯 ANALYSIS COMPLETE - Ready for targeted fix!');
    
  } catch (error) {
    console.error('❌ Error in deep dive analysis:', error);
  } finally {
    await mongoose.disconnect();
    console.log('👋 Disconnected from MongoDB');
  }
}

deepDivePO11322();
