require('dotenv').config();
const mongoose = require('mongoose');
const PurchaseOrder = require('./models/PurchaseOrder');

async function checkPO() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('✅ Connected to MongoDB');

        const po = await PurchaseOrder.findOne({ poNumber: 'PO10840' });

        if (!po) {
            console.log('❌ PO10840 not found');
            process.exit(0);
        }

        console.log('\n📋 PO10840 Details:');
        console.log('- ID:', po._id);
        console.log('- PO Number:', po.poNumber);
        console.log('- Vendor:', po.vendor);
        console.log('- Status:', po.nsStatus);
        console.log('\n⏰ Snooze Status:');
        console.log('- snoozedUntil:', po.snoozedUntil);
        console.log('- snoozedBy:', po.snoozedBy);
        console.log('- snoozeDuration:', po.snoozeDuration);

        if (po.snoozedUntil) {
            const now = new Date();
            const diff = po.snoozedUntil - now;
            const daysRemaining = Math.ceil(diff / (1000 * 60 * 60 * 24));
            console.log('\n✅ PO IS SNOOZED');
            console.log('- Wake up date:', po.snoozedUntil.toLocaleString());
            console.log('- Days remaining:', daysRemaining);
            console.log('- Is in future?', po.snoozedUntil > now ? 'YES ✅' : 'NO ❌');
        } else {
            console.log('\n❌ PO IS NOT SNOOZED');
        }

        // Test the query that the API uses
        console.log('\n🔍 Testing API query...');
        const snoozedPOs = await PurchaseOrder.find({
            snoozedUntil: { $exists: true, $ne: null, $gt: new Date() }
        }).sort({ snoozedUntil: 1 });

        console.log(`Found ${snoozedPOs.length} snoozed POs total`);
        
        const po10840InList = snoozedPOs.find(p => p.poNumber === 'PO10840');
        if (po10840InList) {
            console.log('✅ PO10840 IS in the snoozed list');
        } else {
            console.log('❌ PO10840 IS NOT in the snoozed list');
        }

        console.log('\n📋 All snoozed POs:');
        snoozedPOs.forEach(p => {
            console.log(`  - ${p.poNumber} (${p.vendor}) - wakes ${p.snoozedUntil.toLocaleDateString()}`);
        });

    } catch (error) {
        console.error('❌ Error:', error);
    } finally {
        await mongoose.disconnect();
        process.exit(0);
    }
}

checkPO();
