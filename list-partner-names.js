// Script to list all seed partner company names
// Run with: node list-partner-names.js

require('dotenv').config();
const mongoose = require('mongoose');
const SeedPartner = require('./models/SeedPartner');

async function listPartners() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('✅ Connected to MongoDB\n');

        const partners = await SeedPartner.find({})
            .select('companyName businessDetails.website country')
            .sort({ country: 1, companyName: 1 });

        console.log(`📋 Total Partners: ${partners.length}\n`);

        let currentCountry = '';
        partners.forEach(partner => {
            if (partner.country !== currentCountry) {
                currentCountry = partner.country;
                console.log(`\n🌍 ${currentCountry}:`);
                console.log('='.repeat(50));
            }
            const hasWebsite = partner.businessDetails?.website ? '🌐' : '❌';
            console.log(`${hasWebsite} ${partner.companyName}`);
        });

        await mongoose.connection.close();

    } catch (error) {
        console.error('❌ Error:', error);
        process.exit(1);
    }
}

listPartners();
