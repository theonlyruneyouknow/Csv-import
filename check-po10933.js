require('dotenv').config();
const mongoose = require('mongoose');
const PurchaseOrder = require('./models/PurchaseOrder');
const LineItem = require('./models/LineItem');

async function checkPO10933() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('✅ Connected to MongoDB');

        const po = await PurchaseOrder.findOne({ poNumber: 'PO10933' });

        if (!po) {
            console.log('❌ PO10933 not found in database');
            process.exit(0);
        }

        console.log('\n📋 PO10933 Details:');
        console.log('- ID:', po._id);
        console.log('- PO Number:', po.poNumber);
        console.log('- Vendor:', po.vendor);
        console.log('- NetSuite Status:', po.nsStatus);
        console.log('- Created:', po.createdAt);
        console.log('- Updated:', po.updatedAt);
        console.log('\n🏷️ Additional Fields:');
        console.log('- Transaction Date:', po.tranDate);
        console.log('- Expected Receipt Date:', po.expectedReceiptDate);
        console.log('- Last Email Sent:', po.lastEmailSent);
        console.log('- Email Template Used:', po.emailTemplateUsed);
        
        console.log('\n⏰ Snooze Status:');
        console.log('- snoozedUntil:', po.snoozedUntil);
        console.log('- snoozedBy:', po.snoozedBy);
        console.log('- snoozeDuration:', po.snoozeDuration);

        // Check line items
        const lineItems = await LineItem.find({ purchaseOrder: po._id });
        console.log('\n📦 Line Items:', lineItems.length, 'total');
        
        if (lineItems.length > 0) {
            console.log('\nFirst few items:');
            lineItems.slice(0, 3).forEach((item, idx) => {
                console.log(`  ${idx + 1}. ${item.memo}`);
                console.log(`     - Quantity: ${item.quantityExpected || item.quantity}`);
                console.log(`     - Received: ${item.quantityReceived || 0}`);
                console.log(`     - Status: ${item.lineStatus || 'N/A'}`);
                console.log(`     - ETA: ${item.eta || 'None'}`);
            });
        }

        // Check if it would appear in trouble seed
        console.log('\n🔍 Trouble Seed Criteria Check:');
        const hasUnreceived = lineItems.some(item => {
            const qtyExpected = item.quantityExpected || item.quantity || 0;
            const qtyReceived = item.quantityReceived || 0;
            return qtyReceived < qtyExpected;
        });
        console.log('- Has unreceived items?', hasUnreceived ? 'YES ✅' : 'NO ❌');
        
        const isFullyBilled = ['Fully Billed', 'Closed', 'Cancelled'].includes(po.nsStatus);
        console.log('- Is fully billed/closed?', isFullyBilled ? 'YES ❌' : 'NO ✅');
        
        const isSnoozed = po.snoozedUntil && new Date(po.snoozedUntil) > new Date();
        console.log('- Is currently snoozed?', isSnoozed ? 'YES ❌' : 'NO ✅');

        console.log('\n📊 Dashboard Appearance:');
        console.log('- Should appear in Trouble Seed?', (hasUnreceived && !isFullyBilled && !isSnoozed) ? 'YES ✅' : 'NO ❌');
        console.log('- Should appear in PO Dashboard?', !isFullyBilled ? 'YES ✅' : 'NO ❌');

    } catch (error) {
        console.error('❌ Error:', error);
    } finally {
        await mongoose.disconnect();
        process.exit(0);
    }
}

checkPO10933();
