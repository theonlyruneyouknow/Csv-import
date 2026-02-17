// Test script to manually create a pre-PO with all fields
const mongoose = require('mongoose');
require('dotenv').config();

const PrePurchaseOrder = require('./models/PrePurchaseOrder');

async function testCreate() {
    try {
        console.log('Connecting to MongoDB...');
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('✅ Connected\n');

        const testData = {
            orderNumber: 'TEST123',
            vendor: 'TEST VENDOR',
            poLink: 'https://test.com/po',
            date: '2026-02-16',
            enteredBy: 'Test User',
            productTeamNotes: 'These are test notes',
            approval: 'Pending',
            ynh: 'Y',
            notesQuestions: 'Test question?',
            response: 'Test response',
            followUp: 'Test follow up',
            createdBy: 'TestScript'
        };

        console.log('Creating pre-PO with data:', testData);

        const prePO = await PrePurchaseOrder.create(testData);

        console.log('\n✅ Created successfully!');
        console.log('ID:', prePO._id);
        console.log('Order Number:', prePO.orderNumber);
        console.log('Vendor:', prePO.vendor);
        console.log('PO Link:', prePO.poLink);
        console.log('Date:', prePO.date);
        console.log('Entered By:', prePO.enteredBy);
        console.log('Product Team Notes:', prePO.productTeamNotes);
        console.log('Approval:', prePO.approval);
        console.log('Y/N/H:', prePO.ynh);
        console.log('Notes/Questions:', prePO.notesQuestions);
        console.log('Response:', prePO.response);
        console.log('Follow-Up:', prePO.followUp);

        await mongoose.disconnect();
        console.log('\n✅ Done');
    } catch (error) {
        console.error('❌ Error:', error.message);
        console.error(error);
        await mongoose.disconnect();
    }
}

testCreate();
