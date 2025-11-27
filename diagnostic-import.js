const mongoose = require('mongoose');
const LineItem = require('./models/LineItem');
require('dotenv').config();

async function diagnoseImport() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB\n');

    // Get a sample unreceived item SKU
    const sampleUnreceived = await LineItem.findOne({ received: false })
      .select('sku poNumber received')
      .lean();
    
    console.log('📋 Sample UNRECEIVED item from database:');
    console.log('   SKU:', sampleUnreceived.sku);
    console.log('   PO:', sampleUnreceived.poNumber);
    console.log('   Received:', sampleUnreceived.received);

    // Extract the base SKU code
    const baseSku = sampleUnreceived.sku.split(':')[0].trim();
    console.log('\n🔍 Base SKU code:', baseSku);

    // Test the regex pattern
    const skuPattern = new RegExp(`^${baseSku.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(\\s*:|$)`, 'i');
    console.log('   Regex pattern:', skuPattern);

    // Try to find with exact match
    const exactMatch = await LineItem.findOne({ sku: baseSku, received: false });
    console.log('\n❓ Exact match (sku === "' + baseSku + '"):', exactMatch ? 'FOUND' : 'NOT FOUND');

    // Try to find with regex match
    const regexMatch = await LineItem.findOne({ sku: skuPattern, received: false });
    console.log('❓ Regex match (sku matches pattern):', regexMatch ? 'FOUND ✅' : 'NOT FOUND');
    
    if (regexMatch) {
      console.log('   Matched SKU:', regexMatch.sku);
    }

    // Now simulate what happens during import
    console.log('\n\n🔬 SIMULATING IMPORT PROCESS:');
    console.log('===============================');
    
    const testImportSku = baseSku; // This is what comes from Excel
    console.log('1️⃣ Import file has SKU:', testImportSku);

    // Find phase (this works)
    const findResult = await LineItem.find({ sku: skuPattern });
    console.log('2️⃣ Find query found:', findResult.length, 'items');
    if (findResult.length > 0) {
      console.log('   Found SKUs:', findResult.map(item => item.sku).join(', '));
      console.log('   Received status:', findResult.map(item => item.received));
    }

    // Update phase (let's test both methods)
    console.log('\n3️⃣ Testing UPDATE queries:');
    
    // Method 1: Exact match (OLD - BROKEN)
    const exactUpdateCount = await LineItem.countDocuments({ sku: testImportSku });
    console.log('   Exact match update would affect:', exactUpdateCount, 'items', exactUpdateCount === 0 ? '❌ BROKEN' : '✅');

    // Method 2: Regex match (NEW - SHOULD WORK)
    const regexUpdateCount = await LineItem.countDocuments({ sku: skuPattern });
    console.log('   Regex match update would affect:', regexUpdateCount, 'items', regexUpdateCount > 0 ? '✅ WORKS' : '❌');

    // Check if any unreceived items have inventory data
    console.log('\n\n📊 CURRENT DATABASE STATE:');
    console.log('===========================');
    
    const totalUnreceived = await LineItem.countDocuments({ received: false });
    console.log('Total unreceived items:', totalUnreceived);

    const unreceivedWithInventory = await LineItem.countDocuments({ 
      received: false,
      inventoryRawQuantity: { $ne: null }
    });
    console.log('Unreceived WITH inventory data:', unreceivedWithInventory);

    const receivedWithInventory = await LineItem.countDocuments({ 
      received: true,
      inventoryRawQuantity: { $ne: null }
    });
    console.log('Received WITH inventory data:', receivedWithInventory);

    if (unreceivedWithInventory > 0) {
      console.log('\n✅ SUCCESS! Found unreceived items with inventory data:');
      const samples = await LineItem.find({ 
        received: false,
        inventoryRawQuantity: { $ne: null }
      })
      .select('sku poNumber inventoryRawQuantity inventoryChildQuantity inventoryMeasure')
      .limit(5)
      .lean();
      
      samples.forEach(item => {
        console.log(`   • ${item.sku} (${item.poNumber}): Raw=${item.inventoryRawQuantity}, Child=${item.inventoryChildQuantity}, Measure=${item.inventoryMeasure}`);
      });
    } else {
      console.log('\n❌ NO unreceived items have inventory data yet!');
      console.log('   This means the import is not updating the correct items.');
    }

    await mongoose.disconnect();
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

diagnoseImport();
