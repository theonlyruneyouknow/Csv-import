// Quick check to see seedOfferings data
// Run with: node check-seed-data.js

require('dotenv').config();
const mongoose = require('mongoose');
const SeedPartner = require('./models/SeedPartner');

async function checkData() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('✅ Connected to MongoDB\n');

        const partner = await SeedPartner.findOne({ companyName: 'Suttons Seeds' });

        console.log('Company:', partner.companyName);
        console.log('\nSeed Offerings:');
        console.log('Vegetables:', partner.seedOfferings?.vegetables || 'NONE');
        console.log('Flowers:', partner.seedOfferings?.flowers || 'NONE');
        console.log('Herbs:', partner.seedOfferings?.herbs || 'NONE');

        await mongoose.connection.close();

    } catch (error) {
        console.error('❌ Error:', error);
        process.exit(1);
    }
}

checkData();
