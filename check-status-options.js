const mongoose = require('mongoose');
const LineItemStatusOption = require('./models/LineItemStatusOption');

async function checkStatusOptions() {
    try {
        await mongoose.connect('mongodb://localhost:27017/csv-import');
        console.log('Connected to MongoDB');

        // Check if status options exist
        const statusOptions = await LineItemStatusOption.find().sort({ name: 1 });
        console.log(`Total status options: ${statusOptions.length}`);

        if (statusOptions.length > 0) {
            console.log('Available status options:');
            statusOptions.forEach((option, index) => {
                console.log(`  ${index + 1}. "${option.name}" (default: ${option.isDefault})`);
            });
        } else {
            console.log('No status options found. They will be created when first accessed.');
        }

        await mongoose.disconnect();
        console.log('Disconnected from MongoDB');
    } catch (error) {
        console.error('Error:', error);
    }
}

checkStatusOptions();
