// Quick script to check what partners exist and their isDomestic status
const mongoose = require('mongoose');
const SeedPartner = require('./models/SeedPartner');

mongoose.connect('mongodb://localhost:27017/ebmdb')
    .then(async () => {
        console.log('✅ Connected to MongoDB');
        
        const total = await SeedPartner.countDocuments({isActive: true});
        const domestic = await SeedPartner.countDocuments({isActive: true, isDomestic: true});
        const international = await SeedPartner.countDocuments({isActive: true, isDomestic: {$ne: true}});
        
        console.log('\n📊 Partner Counts:');
        console.log('  Total active partners:', total);
        console.log('  Domestic partners:', domestic);
        console.log('  International partners:', international);
        
        // Show sample partners from each group
        console.log('\n🏠 Sample Domestic Partners:');
        const domesticSamples = await SeedPartner.find({isActive: true, isDomestic: true}).limit(3);
        domesticSamples.forEach(p => console.log(`  - ${p.companyName} (${p.country})`));
        
        console.log('\n🌍 Sample International Partners:');
        const intlSamples = await SeedPartner.find({isActive: true, isDomestic: {$ne: true}}).limit(3);
        intlSamples.forEach(p => console.log(`  - ${p.companyName} (${p.country})`));
        
        process.exit(0);
    })
    .catch(err => {
        console.error('Error:', err);
        process.exit(1);
    });
