// Find where the US seed partners data actually is
const mongoose = require('mongoose');
require('dotenv').config();

async function findData() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('✅ Connected\n');

        const db = mongoose.connection.db;

        // Check both possible collections
        const collections = await db.listCollections().toArray();
        const seedCollections = collections.filter(c => c.name.toLowerCase().includes('seed'));

        console.log('📊 Seed-related collections:');
        for (const coll of seedCollections) {
            const count = await db.collection(coll.name).countDocuments();
            console.log(`   ${coll.name}: ${count} documents`);

            if (coll.name.toLowerCase().includes('us')) {
                // Get a sample
                const sample = await db.collection(coll.name).findOne();
                if (sample) {
                    console.log(`   Sample from ${coll.name}:`, {
                        _id: sample._id,
                        companyName: sample.companyName,
                        state: sample.state,
                        stateCode: sample.stateCode
                    });
                }
            }
        }

        // Direct check of usseedpartners
        console.log('\n🔍 Direct check of specific collections:');
        const usCount = await db.collection('usseedpartners').countDocuments();
        console.log(`   usseedpartners: ${usCount}`);

        // Try to find by company name
        console.log('\n🔍 Searching for Alabama Seed & Feed Supply...');
        for (const coll of seedCollections) {
            const found = await db.collection(coll.name).findOne({ companyName: 'Alabama Seed & Feed Supply' });
            if (found) {
                console.log(`   ✅ FOUND in collection: ${coll.name}`);
                console.log(`   Data:`, JSON.stringify(found, null, 2).substring(0, 500));
            }
        }

    } catch (error) {
        console.error('Error:', error);
    } finally {
        await mongoose.disconnect();
    }
}

findData();
