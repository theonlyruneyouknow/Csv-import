// Check what's in both collections
const mongoose = require('mongoose');

mongoose.connect('mongodb://localhost:27017/ebmdb')
    .then(async () => {
        console.log('✅ Connected to MongoDB\n');
        
        // Get collection names
        const collections = await mongoose.connection.db.listCollections().toArray();
        const seedCollections = collections.filter(c => c.name.toLowerCase().includes('seed'));
        
        console.log('📁 Seed-related collections:');
        for (const coll of seedCollections) {
            const count = await mongoose.connection.db.collection(coll.name).countDocuments();
            console.log(`  - ${coll.name}: ${count} documents`);
        }
        
        // Check seedpartners
        console.log('\n📊 SeedPartner collection (seedpartners):');
        const seedPartnerCount = await mongoose.connection.db.collection('seedpartners').countDocuments();
        console.log(`  Total: ${seedPartnerCount}`);
        if (seedPartnerCount > 0) {
            const samples = await mongoose.connection.db.collection('seedpartners').find().limit(3).toArray();
            samples.forEach(p => console.log(`    - ${p.companyName} (${p.country}) isDomestic: ${p.isDomestic}`));
        }
        
        // Check usseedpartners
        console.log('\n🇺🇸 USSeedPartner collection (usseedpartners):');
        const usCount = await mongoose.connection.db.collection('usseedpartners').countDocuments();
        console.log(`  Total: ${usCount}`);
        if (usCount > 0) {
            const samples = await mongoose.connection.db.collection('usseedpartners').find().limit(3).toArray();
            samples.forEach(p => console.log(`    - ${p.companyName} (${p.state || p.country})`));
        }
        
        process.exit(0);
    })
    .catch(err => {
        console.error('Error:', err);
        process.exit(1);
    });
