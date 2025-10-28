require('dotenv').config();
const mongoose = require('mongoose');
const PurchaseOrder = require('./models/PurchaseOrder');

async function testSnooze() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('✅ Connected to MongoDB');

        // Find a PO with line items that need attention
        const po = await PurchaseOrder.findOne({ 
            nsStatus: { $nin: ['Fully Billed', 'Closed', 'Cancelled'] }
        });

        if (!po) {
            console.log('❌ No suitable PO found for testing');
            process.exit(0);
        }

        console.log('\n📋 Testing PO:', po.poNumber);
        console.log('Current snoozed status:');
        console.log('- snoozedUntil:', po.snoozedUntil);
        console.log('- snoozedBy:', po.snoozedBy);
        console.log('- snoozeDuration:', po.snoozeDuration);

        // Test snooze
        const snoozeDays = 7;
        const snoozedUntil = new Date();
        snoozedUntil.setDate(snoozedUntil.getDate() + snoozeDays);

        console.log('\n⏰ Snoozing for', snoozeDays, 'days...');
        
        po.snoozedUntil = snoozedUntil;
        po.snoozedBy = 'TestScript';
        po.snoozeDuration = snoozeDays;
        
        await po.save();
        
        console.log('✅ Snoozed successfully!');
        console.log('New snoozed status:');
        console.log('- snoozedUntil:', po.snoozedUntil);
        console.log('- snoozedBy:', po.snoozedBy);
        console.log('- snoozeDuration:', po.snoozeDuration);

        // Verify by querying
        const updated = await PurchaseOrder.findById(po._id);
        console.log('\n🔍 Verification from DB:');
        console.log('- snoozedUntil:', updated.snoozedUntil);
        console.log('- snoozedBy:', updated.snoozedBy);
        console.log('- snoozeDuration:', updated.snoozeDuration);

        // Clean up - unsnooze
        console.log('\n🔓 Unsnoozing...');
        updated.snoozedUntil = null;
        updated.snoozedBy = '';
        updated.snoozeDuration = null;
        await updated.save();
        console.log('✅ Unsnooze complete');

    } catch (error) {
        console.error('❌ Error:', error);
    } finally {
        await mongoose.disconnect();
        process.exit(0);
    }
}

testSnooze();
