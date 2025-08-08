const mongoose = require('mongoose');
const LineItem = require('./models/LineItem');

async function checkStatuses() {
    try {
        await mongoose.connect('mongodb://localhost:27017/csv-import');
        console.log('Connected to MongoDB');

        // Get all unique itemStatus values from existing line items
        const existingStatuses = await LineItem.distinct('itemStatus');
        console.log('Existing statuses in database:');
        existingStatuses.forEach((status, index) => {
            console.log(`  ${index + 1}. '${status}'`);
        });

        // Count how many items have each status
        console.log('\nStatus counts:');
        for (const status of existingStatuses) {
            const count = await LineItem.countDocuments({ itemStatus: status });
            console.log(`  '${status}': ${count} items`);
        }

        await mongoose.disconnect();
        console.log('Disconnected from MongoDB');
    } catch (error) {
        console.error('Error:', error);
    }
}

checkStatuses();
