// Strategic Analysis: Why PO11322 specifically gets missed
require('dotenv').config();
const mongoose = require('mongoose');
const PurchaseOrder = require('./models/PurchaseOrder');

async function strategicAnalysis() {
  try {
    console.log('🎯 STRATEGIC ANALYSIS: PO11322 vs Working POs');
    console.log('=' + '='.repeat(60));
    
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB\n');

    // Get PO11322 and compare with working POs from same report date
    const po11322 = await PurchaseOrder.findOne({ poNumber: 'PO11322' });
    const workingPOs = await PurchaseOrder.find({ 
      reportDate: po11322.reportDate,
      isHidden: { $ne: true }
    }).limit(5);

    console.log('🔍 COMPARISON: PO11322 vs WORKING POs');
    console.log('-'.repeat(50));
    
    console.log('❌ PO11322 (HIDDEN):');
    console.log(`   PO Number: "${po11322.poNumber}"`);
    console.log(`   Vendor: "${po11322.vendor}"`);
    console.log(`   NS Status: "${po11322.nsStatus}"`);
    console.log(`   Amount: $${po11322.amount}`);
    console.log(`   Location: "${po11322.location || '(empty)'}"`);
    console.log(`   Hidden Reason: "${po11322.hiddenReason}"`);
    console.log(`   Hidden Date: ${po11322.hiddenDate}`);
    console.log(`   Last Updated: ${po11322.updatedAt}`);

    console.log('\n✅ WORKING POs (NOT HIDDEN):');
    workingPOs.forEach((po, i) => {
      console.log(`   ${i + 1}. ${po.poNumber}:`);
      console.log(`      Vendor: "${po.vendor}"`);
      console.log(`      NS Status: "${po.nsStatus}"`);
      console.log(`      Amount: $${po.amount}`);
      console.log(`      Location: "${po.location || '(empty)'}"`);
      console.log(`      Last Updated: ${po.updatedAt}`);
    });

    // Check patterns in hidden vs non-hidden POs
    console.log('\n🔍 PATTERN ANALYSIS:');
    console.log('-'.repeat(50));
    
    const allPOsSameDate = await PurchaseOrder.find({ 
      reportDate: po11322.reportDate 
    });
    
    const hiddenPOs = allPOsSameDate.filter(po => po.isHidden);
    const visiblePOs = allPOsSameDate.filter(po => !po.isHidden);
    
    console.log(`📊 POs with report date "${po11322.reportDate}":`);
    console.log(`   Total: ${allPOsSameDate.length}`);
    console.log(`   Hidden: ${hiddenPOs.length}`);
    console.log(`   Visible: ${visiblePOs.length}`);
    
    if (hiddenPOs.length > 0) {
      console.log('\n❌ ALL HIDDEN POs:');
      hiddenPOs.forEach(po => {
        console.log(`   ${po.poNumber} - ${po.vendor} - Hidden: ${po.hiddenDate?.toLocaleDateString()}`);
      });
    }

    // Check for import timing patterns
    console.log('\n🔍 IMPORT TIMING ANALYSIS:');
    console.log('-'.repeat(50));
    
    // Group by update date to see import batches
    const updateDates = {};
    allPOsSameDate.forEach(po => {
      const dateKey = po.updatedAt.toDateString();
      if (!updateDates[dateKey]) {
        updateDates[dateKey] = { total: 0, hidden: 0, visible: 0, pos: [] };
      }
      updateDates[dateKey].total++;
      updateDates[dateKey].pos.push(po.poNumber);
      if (po.isHidden) {
        updateDates[dateKey].hidden++;
      } else {
        updateDates[dateKey].visible++;
      }
    });

    console.log('📅 Import batches by update date:');
    Object.entries(updateDates).forEach(([date, stats]) => {
      console.log(`   ${date}: ${stats.total} POs (${stats.hidden} hidden, ${stats.visible} visible)`);
      if (stats.pos.includes('PO11322')) {
        console.log(`      🎯 PO11322 was updated on this date`);
      }
    });

    // Check if there's a pattern in vendor names or amounts
    console.log('\n🔍 VENDOR PATTERN ANALYSIS:');
    console.log('-'.repeat(50));
    
    const vendorStats = {};
    allPOsSameDate.forEach(po => {
      if (!vendorStats[po.vendor]) {
        vendorStats[po.vendor] = { total: 0, hidden: 0, visible: 0 };
      }
      vendorStats[po.vendor].total++;
      if (po.isHidden) {
        vendorStats[po.vendor].hidden++;
      } else {
        vendorStats[po.vendor].visible++;
      }
    });

    console.log('🏢 Vendor breakdown:');
    Object.entries(vendorStats)
      .sort((a, b) => b[1].total - a[1].total)
      .slice(0, 10)
      .forEach(([vendor, stats]) => {
        const status = stats.hidden > 0 ? (stats.visible > 0 ? 'MIXED' : 'ALL HIDDEN') : 'ALL VISIBLE';
        console.log(`   ${vendor}: ${stats.total} POs (${status})`);
        if (vendor === po11322.vendor) {
          console.log(`      🎯 This is PO11322's vendor!`);
        }
      });

    console.log('\n' + '='.repeat(62));
    console.log('🎯 STRATEGIC ANALYSIS COMPLETE!');
    
  } catch (error) {
    console.error('❌ Error in strategic analysis:', error);
  } finally {
    await mongoose.disconnect();
    console.log('👋 Disconnected from MongoDB');
  }
}

strategicAnalysis();
