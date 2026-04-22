require('dotenv').config();
const mongoose = require('mongoose');

const seedPartnerSchema = new mongoose.Schema({}, { collection: 'seedpartners', strict: false });
const SeedPartner = mongoose.model('SeedPartner', seedPartnerSchema);

async function checkContactFields() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('✅ Connected to MongoDB\n');

        // Get all US partners to see what fields exist
        const partners = await SeedPartner.find({
            country: 'United States'
        }).sort({ stateCode: 1, companyName: 1 });

        console.log('='.repeat(80));
        console.log('📋 CURRENT CONTACT FIELDS FOR ALL 25 DOMESTIC PARTNERS');
        console.log('='.repeat(80));

        partners.forEach((partner, index) => {
            console.log(`\n${index + 1}. ${partner.companyName} (${partner.partnerCode})`);
            console.log(`   State: ${partner.stateCode}`);
            console.log(`   Website: ${partner.website || '❌ MISSING'}`);
            console.log(`   Catalog URL: ${partner.catalogUrl || '❌ MISSING'}`);
            console.log(`   Email: ${partner.email || '❌ MISSING'}`);
            console.log(`   Phone: ${partner.phone || '❌ MISSING'}`);
            console.log(`   Address: ${partner.address || '❌ MISSING'}`);
            console.log(`   City: ${partner.city || '❌ MISSING'}`);
            console.log(`   Zip: ${partner.zipCode || '❌ MISSING'}`);
            console.log(`   Contact Person: ${partner.contactPerson || '❌ MISSING'}`);
        });

        // Summary of missing fields
        console.log('\n' + '='.repeat(80));
        console.log('📊 MISSING FIELDS SUMMARY');
        console.log('='.repeat(80));

        const missingCounts = {
            catalogUrl: 0,
            email: 0,
            phone: 0,
            address: 0,
            contactPerson: 0
        };

        partners.forEach(partner => {
            if (!partner.catalogUrl) missingCounts.catalogUrl++;
            if (!partner.email) missingCounts.email++;
            if (!partner.phone) missingCounts.phone++;
            if (!partner.address) missingCounts.address++;
            if (!partner.contactPerson) missingCounts.contactPerson++;
        });

        console.log(`\nCatalog URL missing: ${missingCounts.catalogUrl}/25 partners`);
        console.log(`Email missing: ${missingCounts.email}/25 partners`);
        console.log(`Phone missing: ${missingCounts.phone}/25 partners`);
        console.log(`Address missing: ${missingCounts.address}/25 partners`);
        console.log(`Contact Person missing: ${missingCounts.contactPerson}/25 partners`);

        await mongoose.connection.close();
        process.exit(0);

    } catch (error) {
        console.error('❌ Fatal error:', error);
        await mongoose.connection.close();
        process.exit(1);
    }
}

checkContactFields();
