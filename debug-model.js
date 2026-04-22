// debug-model.js
const mongoose = require('mongoose');
const USSeedPartner = require('./models/USSeedPartner');

console.log('Model name:', USSeedPartner.modelName);
console.log('Collection name:', USSeedPartner.collection.name);

mongoose.connect('mongodb://localhost:27017/tsc-purchasing')
    .then(async () => {
        console.log('✅ Connected to MongoDB\n');

        // Check what collections exist
        const collections = await mongoose.connection.db.listCollections().toArray();
        console.log('📚 Available collections:');
        collections.forEach(c => {
            if (c.name.toLowerCase().includes('seed') || c.name.toLowerCase().includes('partner')) {
                console.log(`   - ${c.name}`);
            }
        });

        // Try different queries
        console.log('\n🔍 Testing queries:');

        const count1 = await USSeedPartner.countDocuments();
        console.log(`   USSeedPartner.countDocuments(): ${count1}`);

        const count2 = await mongoose.connection.db.collection('usseedpartners').countDocuments();
        console.log(`   Direct collection 'usseedpartners': ${count2}`);

        const count3 = await mongoose.connection.db.collection('USSeedPartners').countDocuments();
        console.log(`   Direct collection 'USSeedPartners': ${count3}`);

        // Check if data exists with different case
        const allCollections = await mongoose.connection.db.listCollections().toArray();
        for (const col of allCollections) {
            if (col.name.toLowerCase().includes('us') && col.name.toLowerCase().includes('seed')) {
                const cnt = await mongoose.connection.db.collection(col.name).countDocuments();
                console.log(`   Collection '${col.name}': ${cnt} documents`);
            }
        }

        mongoose.connection.close();

    })
    .catch(error => {
        console.error('❌ Error:', error.message);
        process.exit(1);
    });
