require('dotenv').config();
const mongoose = require('mongoose');
const PurchaseOrder = require('./models/PurchaseOrder');

async function checkHidden() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('✅ Connected to MongoDB');

        const po = await PurchaseOrder.findOne({ poNumber: 'PO10933' });
        
        console.log('\n📋 PO10933 Hidden Status:');
        console.log('- isHidden:', po.isHidden);
        console.log('- hiddenBy:', po.hiddenBy);
        console.log('- hiddenDate:', po.hiddenDate);
        console.log('- hiddenReason:', po.hiddenReason);
        
        console.log('\n🔍 Will it appear in dashboard?');
        const includeHidden = false; // Default dashboard behavior
        const query = {};
        if (!includeHidden) {
            query.isHidden = { $ne: true };
        }
        
        const wouldAppear = await PurchaseOrder.findOne({ poNumber: 'PO10933', ...query });
        console.log('With default filter (isHidden $ne true):', wouldAppear ? 'YES ✅' : 'NO ❌');
        
        // Count all POs
        const totalPOs = await PurchaseOrder.countDocuments({});
        const nonHiddenPOs = await PurchaseOrder.countDocuments({ isHidden: { $ne: true } });
        const hiddenPOs = await PurchaseOrder.countDocuments({ isHidden: true });
        
        console.log('\n📊 Overall Stats:');
        console.log(`- Total POs: ${totalPOs}`);
        console.log(`- Non-hidden POs: ${nonHiddenPOs}`);
        console.log(`- Hidden POs: ${hiddenPOs}`);

    } catch (error) {
        console.error('❌ Error:', error);
    } finally {
        await mongoose.disconnect();
        process.exit(0);
    }
}

checkHidden();
