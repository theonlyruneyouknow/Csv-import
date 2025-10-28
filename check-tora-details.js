const mongoose = require('mongoose');
require('dotenv').config();

const LineItem = require('./models/LineItem');

async function checkToraItem() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('✅ Connected to MongoDB');

        // Find the TORA BLUE SALPIGLOSSIS item
        const toraItem = await LineItem.findOne({
            memo: /TORA BLUE SALPIGLOSSIS/i
        });

        if (toraItem) {
            console.log('\n📦 TORA BLUE SALPIGLOSSIS Full Details:');
            console.log('ID:', toraItem._id);
            console.log('Memo:', toraItem.memo);
            console.log('SKU:', toraItem.sku);
            console.log('');
            console.log('QUANTITIES:');
            console.log('  quantityExpected:', toraItem.quantityExpected);
            console.log('  quantityOrdered:', toraItem.quantityOrdered);
            console.log('  quantityReceived:', toraItem.quantityReceived);
            console.log('  unit:', toraItem.unit);
            console.log('');
            console.log('STATUS:');
            console.log('  itemStatus:', toraItem.itemStatus);
            console.log('  received:', toraItem.received);
            console.log('  receivedDate:', toraItem.receivedDate);
            console.log('');
            console.log('NOTES:');
            console.log('  notes:', toraItem.notes);
            console.log('  receivingNotes:', toraItem.receivingNotes);
            console.log('');
            console.log('NETSUITE:');
            console.log('  billVarianceStatus:', toraItem.billVarianceStatus);
            console.log('  billVarianceField:', toraItem.billVarianceField);
        } else {
            console.log('❌ TORA BLUE SALPIGLOSSIS not found');
        }

        await mongoose.connection.close();
        process.exit(0);
    } catch (error) {
        console.error('❌ Error:', error);
        process.exit(1);
    }
}

checkToraItem();
