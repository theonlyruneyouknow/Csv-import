require('dotenv').config();
const mongoose = require('mongoose');
const PurchaseOrder = require('./models/PurchaseOrder');

async function listUndefinedPOTypes() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('✅ Connected to MongoDB\n');

        // Find all POs where poType is NOT one of the four valid types
        const undefinedPOs = await PurchaseOrder.find({
            $or: [
                { poType: { $nin: ['Seed', 'Hardgood', 'Greengood', 'Supplies'] } },
                { poType: null },
                { poType: { $exists: false } },
                { poType: '' }
            ]
        })
            .select('poNumber poType vendor status amount date eta')
            .sort({ poNumber: 1 })
            .lean();

        console.log('='.repeat(80));
        console.log(`📊 PURCHASE ORDERS WITHOUT VALID TYPE`);
        console.log('='.repeat(80));
        console.log(`Found ${undefinedPOs.length} POs without a valid type (Seed, Hardgood, Greengood, or Supplies)\n`);

        if (undefinedPOs.length === 0) {
            console.log('✅ All POs have valid types!');
        } else {
            console.log('PO Number'.padEnd(15) + 'Type'.padEnd(15) + 'Vendor'.padEnd(35) + 'Status'.padEnd(25) + 'Amount'.padEnd(12) + 'Date');
            console.log('-'.repeat(120));

            undefinedPOs.forEach(po => {
                const poNum = (po.poNumber || 'N/A').padEnd(15);
                const type = (po.poType === undefined ? 'undefined' : po.poType || 'null').toString().padEnd(15);
                const vendor = (po.vendor || 'N/A').substring(0, 32).padEnd(35);
                const status = (po.status || 'N/A').substring(0, 22).padEnd(25);
                const amount = ('$' + (po.amount || 0).toLocaleString()).padEnd(12);
                const date = (po.date || 'N/A');

                console.log(`${poNum}${type}${vendor}${status}${amount}${date}`);
            });

            console.log('\n' + '='.repeat(80));
            console.log('📈 BREAKDOWN BY TYPE VALUE');
            console.log('='.repeat(80));

            // Group by actual type value
            const typeGroups = {};
            undefinedPOs.forEach(po => {
                const typeKey = po.poType === undefined ? 'undefined' : (po.poType || 'null');
                if (!typeGroups[typeKey]) {
                    typeGroups[typeKey] = [];
                }
                typeGroups[typeKey].push(po.poNumber);
            });

            Object.keys(typeGroups).sort().forEach(typeKey => {
                console.log(`\n${typeKey}: ${typeGroups[typeKey].length} POs`);
                console.log(`   ${typeGroups[typeKey].slice(0, 10).join(', ')}${typeGroups[typeKey].length > 10 ? '...' : ''}`);
            });

            // Check if any have unusual type values (not undefined/null/empty)
            const unusualTypes = undefinedPOs.filter(po =>
                po.poType &&
                po.poType !== undefined &&
                !['Seed', 'Hardgood', 'Greengood', 'Supplies'].includes(po.poType)
            );

            if (unusualTypes.length > 0) {
                console.log('\n' + '='.repeat(80));
                console.log('⚠️  POS WITH UNUSUAL TYPE VALUES (not undefined/null/empty)');
                console.log('='.repeat(80));
                unusualTypes.forEach(po => {
                    console.log(`   ${po.poNumber}: poType = "${po.poType}"`);
                });
            }
        }

        console.log('\n' + '='.repeat(80));

    } catch (error) {
        console.error('❌ Error:', error);
    } finally {
        await mongoose.disconnect();
        console.log('\n✅ Disconnected from MongoDB');
    }
}

listUndefinedPOTypes();
