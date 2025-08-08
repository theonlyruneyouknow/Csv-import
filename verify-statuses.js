const mongoose = require('mongoose');
const LineItemStatusOption = require('./models/LineItemStatusOption');

mongoose.connect('mongodb://localhost:27017/purchase-orders').then(async () => {
    const statuses = await LineItemStatusOption.find().sort({ name: 1 });
    console.log('📋 Line Item Status Options in Database:');
    statuses.forEach((status, index) => {
        console.log(`  ${index + 1}. ${status.name} (Default: ${status.isDefault})`);
    });

    console.log('\n🎯 These will appear in the dropdown as:');
    const dropdownOptions = ['', ...statuses.map(s => s.name)];
    dropdownOptions.forEach((option, index) => {
        console.log(`  ${index}. "${option}"`);
    });

    mongoose.connection.close();
}).catch(err => console.error('❌ Database error:', err.message));
