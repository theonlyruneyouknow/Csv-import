// check-us-partners.js
const mongoose = require('mongoose');
const USSeedPartner = require('./models/USSeedPartner');

mongoose.connect('mongodb://localhost:27017/tsc-purchasing')
    .then(async () => {
        console.log('✅ Connected to MongoDB\n');

        const count = await USSeedPartner.countDocuments();
        console.log(`📊 Total US Partners in database: ${count}\n`);

        if (count === 0) {
            console.log('⚠️  No partners found! Run add-us-seed-partners.js to populate data.\n');
        } else {
            const partners = await USSeedPartner.find().limit(5);
            console.log('Sample Partners:');
            partners.forEach(p => {
                console.log(`\n${p.stateCode}: ${p.companyName}`);
                console.log(`   Website: ${p.businessDetails?.website || 'No website'}`);
                console.log(`   Vegetables: ${p.seedOfferings?.vegetables?.length || 0}`);
                console.log(`   Flowers: ${p.seedOfferings?.flowers?.length || 0}`);
                console.log(`   Herbs: ${p.seedOfferings?.herbs?.length || 0}`);
                console.log(`   Status: ${p.status}`);
            });

            // Check if websites and seed offerings are populated
            const withWebsites = await USSeedPartner.countDocuments({ 'businessDetails.website': { $exists: true, $ne: '' } });
            const withVegetables = await USSeedPartner.countDocuments({ 'seedOfferings.vegetables.0': { $exists: true } });
            const withFlowers = await USSeedPartner.countDocuments({ 'seedOfferings.flowers.0': { $exists: true } });
            const withHerbs = await USSeedPartner.countDocuments({ 'seedOfferings.herbs.0': { $exists: true } });

            console.log(`\n\n📈 Data Quality:`);
            console.log(`   Partners with websites: ${withWebsites}/${count}`);
            console.log(`   Partners with vegetables: ${withVegetables}/${count}`);
            console.log(`   Partners with flowers: ${withFlowers}/${count}`);
            console.log(`   Partners with herbs: ${withHerbs}/${count}`);
        }

        mongoose.connection.close();

    })
    .catch(error => {
        console.error('❌ MongoDB connection error:', error.message);
        process.exit(1);
    });
