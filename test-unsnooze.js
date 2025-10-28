require('dotenv').config();
const mongoose = require('mongoose');
const PurchaseOrder = require('./models/PurchaseOrder');

async function testUnsnooze() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('✅ Connected to MongoDB');

        // Find a snoozed PO
        const snoozedPO = await PurchaseOrder.findOne({
            snoozedUntil: { $exists: true, $ne: null }
        });

        if (!snoozedPO) {
            console.log('❌ No snoozed POs found to test with');
            process.exit(0);
        }

        console.log('\n📋 Found snoozed PO:', snoozedPO.poNumber);
        console.log('Before unsnooze:');
        console.log('- snoozedUntil:', snoozedPO.snoozedUntil);
        console.log('- snoozedBy:', snoozedPO.snoozedBy);
        console.log('- snoozeDuration:', snoozedPO.snoozeDuration);

        // Unsnooze it
        console.log('\n🔓 Unsnoozing...');
        snoozedPO.snoozedUntil = null;
        snoozedPO.snoozedBy = '';
        snoozedPO.snoozeDuration = null;
        await snoozedPO.save();

        console.log('✅ Unsnoozed successfully!');
        console.log('After unsnooze:');
        console.log('- snoozedUntil:', snoozedPO.snoozedUntil);
        console.log('- snoozedBy:', snoozedPO.snoozedBy);
        console.log('- snoozeDuration:', snoozedPO.snoozeDuration);

        // Verify
        const verified = await PurchaseOrder.findById(snoozedPO._id);
        console.log('\n🔍 Verification from DB:');
        console.log('- snoozedUntil:', verified.snoozedUntil);
        console.log('- Is snoozed?', verified.snoozedUntil ? 'YES ❌' : 'NO ✅');

    } catch (error) {
        console.error('❌ Error:', error);
    } finally {
        await mongoose.disconnect();
        process.exit(0);
    }
}

testUnsnooze();
