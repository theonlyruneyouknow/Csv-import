require('dotenv').config();
const mongoose = require('mongoose');
const LineItem = require('./models/LineItem');

async function testAggregation() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('✅ Connected to MongoDB');

        const baseMatch = {
            received: false,
            $or: [
                { itemStatus: { $in: ['Pending', 'Ordered', 'Delivery Delay', 'Back Order'] } },
                { itemStatus: { $exists: false } },
                { itemStatus: '' }
            ]
        };

        const troubleItems = await LineItem.aggregate([
            {
                $lookup: {
                    from: 'purchaseorders',
                    localField: 'poId',
                    foreignField: '_id',
                    as: 'purchaseOrder'
                }
            },
            {
                $addFields: {
                    vendor: { $arrayElemAt: ['$purchaseOrder.vendor', 0] },
                    poNsStatus: { $arrayElemAt: ['$purchaseOrder.nsStatus', 0] },
                    poUrl: { $arrayElemAt: ['$purchaseOrder.poUrl', 0] },
                    poDate: { $arrayElemAt: ['$purchaseOrder.date', 0] },
                    poIsHidden: { $arrayElemAt: ['$purchaseOrder.isHidden', 0] },
                    poNumber: { $arrayElemAt: ['$purchaseOrder.poNumber', 0] }
                }
            },
            {
                $match: {
                    ...baseMatch,
                    poNsStatus: { $in: ['Partially Received', 'Pending Receipt'] },
                    poIsHidden: { $ne: true }
                }
            },
            {
                $match: {
                    poNumber: 'PO10933'  // Only get PO10933 items
                }
            }
        ]);

        console.log(`\n📋 PO10933 items found in aggregation: ${troubleItems.length}`);
        
        if (troubleItems.length > 0) {
            console.log('\n❌ PO10933 IS STILL APPEARING (should be 0)');
            console.log('\nItem details:');
            troubleItems.forEach((item, idx) => {
                console.log(`${idx + 1}. ${item.memo}`);
                console.log(`   - poIsHidden: ${item.poIsHidden}`);
                console.log(`   - poNsStatus: ${item.poNsStatus}`);
                console.log(`   - received: ${item.received}`);
            });
        } else {
            console.log('\n✅ PO10933 is correctly filtered out!');
        }

        // Now test without the hidden filter
        const troubleItemsWithHidden = await LineItem.aggregate([
            {
                $lookup: {
                    from: 'purchaseorders',
                    localField: 'poId',
                    foreignField: '_id',
                    as: 'purchaseOrder'
                }
            },
            {
                $addFields: {
                    vendor: { $arrayElemAt: ['$purchaseOrder.vendor', 0] },
                    poNsStatus: { $arrayElemAt: ['$purchaseOrder.nsStatus', 0] },
                    poIsHidden: { $arrayElemAt: ['$purchaseOrder.isHidden', 0] },
                    poNumber: { $arrayElemAt: ['$purchaseOrder.poNumber', 0] }
                }
            },
            {
                $match: {
                    ...baseMatch,
                    poNsStatus: { $in: ['Partially Received', 'Pending Receipt'] },
                    poNumber: 'PO10933'
                }
            }
        ]);

        console.log(`\n🔍 PO10933 items WITHOUT hidden filter: ${troubleItemsWithHidden.length}`);
        if (troubleItemsWithHidden.length > 0) {
            console.log('Item poIsHidden values:', troubleItemsWithHidden.map(i => i.poIsHidden));
        }

    } catch (error) {
        console.error('❌ Error:', error);
    } finally {
        await mongoose.disconnect();
        process.exit(0);
    }
}

testAggregation();
