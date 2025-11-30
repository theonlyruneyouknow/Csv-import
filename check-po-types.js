require('dotenv').config();
const mongoose = require('mongoose');
const PurchaseOrder = require('./models/PurchaseOrder');
const LineItem = require('./models/LineItem');

async function checkPOTypes() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('✅ Connected to MongoDB\n');

        const poNumbers = ['PO10995', 'PO11037', 'PO11503'];

        for (const poNum of poNumbers) {
            console.log(`\n${'='.repeat(60)}`);
            console.log(`🔍 Checking ${poNum}`);
            console.log('='.repeat(60));

            // Find the PO
            const po = await PurchaseOrder.findOne({ poNumber: poNum }).lean();
            
            if (!po) {
                console.log(`❌ PO not found: ${poNum}`);
                continue;
            }

            console.log('\n📦 Purchase Order Details:');
            console.log(`   PO Number: ${po.poNumber}`);
            console.log(`   PO Type: "${po.poType}" (type: ${typeof po.poType})`);
            console.log(`   Status: ${po.status}`);
            console.log(`   Vendor: ${po.vendor}`);
            console.log(`   Date: ${po.date}`);
            console.log(`   ETA: ${po.eta}`);

            // Check all fields that might be related
            console.log('\n🔎 All PO fields:');
            Object.keys(po).forEach(key => {
                if (!['_id', '__v', 'createdAt', 'updatedAt'].includes(key)) {
                    console.log(`   ${key}: ${JSON.stringify(po[key])}`);
                }
            });

            // Find unreceived line items
            const unreceivedItems = await LineItem.find({ 
                poNumber: poNum,
                received: false 
            }).lean();

            console.log(`\n📋 Found ${unreceivedItems.length} unreceived line items`);
            
            if (unreceivedItems.length > 0) {
                console.log('\n📊 Sample line items (first 3):');
                unreceivedItems.slice(0, 3).forEach((item, idx) => {
                    console.log(`\n   Item ${idx + 1}:`);
                    console.log(`      SKU: ${item.sku}`);
                    console.log(`      Memo: ${item.memo}`);
                    console.log(`      Quantity: ${item.quantityExpected || item.quantityOrdered}`);
                    console.log(`      Item Status: ${item.itemStatus}`);
                    console.log(`      Received: ${item.received}`);
                });
            }
        }

        console.log('\n' + '='.repeat(60));
        console.log('🔍 MYSTERY INVESTIGATION');
        console.log('='.repeat(60));
        
        // Find all POs with poType = "N/A" or undefined/null
        const naTypePOs = await PurchaseOrder.find({
            $or: [
                { poType: 'N/A' },
                { poType: null },
                { poType: { $exists: false } },
                { poType: '' }
            ]
        }).select('poNumber poType status vendor').lean();

        console.log(`\n📊 Found ${naTypePOs.length} POs with poType = N/A, null, or empty`);
        
        if (naTypePOs.length > 0) {
            console.log('\n📋 Sample POs with N/A type (first 10):');
            naTypePOs.slice(0, 10).forEach(po => {
                console.log(`   ${po.poNumber}: poType="${po.poType}", status="${po.status}", vendor="${po.vendor}"`);
            });
        }

        // Check if those specific POs are in the N/A list
        console.log('\n🔎 Checking if your POs are in the N/A list:');
        poNumbers.forEach(poNum => {
            const found = naTypePOs.find(p => p.poNumber === poNum);
            if (found) {
                console.log(`   ✅ ${poNum} IS in N/A list - poType: "${found.poType}"`);
            } else {
                console.log(`   ❌ ${poNum} is NOT in N/A list`);
            }
        });

        // Now check what those POs actually have
        console.log('\n🔍 Actual poType values for your POs:');
        for (const poNum of poNumbers) {
            const po = await PurchaseOrder.findOne({ poNumber: poNum }).select('poNumber poType').lean();
            if (po) {
                console.log(`   ${po.poNumber}: poType = "${po.poType}" (${po.poType === 'Seed' ? 'SEED TYPE!' : 'not seed'})`);
            }
        }

    } catch (error) {
        console.error('❌ Error:', error);
    } finally {
        await mongoose.disconnect();
        console.log('\n✅ Disconnected from MongoDB');
    }
}

checkPOTypes();
