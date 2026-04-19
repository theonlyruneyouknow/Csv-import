// Check database and collections
const mongoose = require('mongoose');
require('dotenv').config();

async function checkDatabase() {
    try {
        console.log('🔍 Checking database connection and collections...\n');
        
        await mongoose.connect(process.env.MONGODB_URI);
        console.log(`✅ Connected to: ${process.env.MONGODB_URI}\n`);
        
        const db = mongoose.connection.db;
        const collections = await db.listCollections().toArray();
        
        console.log(`📊 Found ${collections.length} collections:\n`);
        
        for (const coll of collections) {
            const count = await db.collection(coll.name).countDocuments();
            console.log(`   ${coll.name}: ${count} documents`);
        }
        
        // Specifically check for US seed partner collections
        console.log('\n🔍 Looking for US seed partner data...');
        const possibleNames = ['usseedpartners', 'USSeedPartners', 'us_seed_partners', 'US_Seed_Partners'];
        
        for (const name of possibleNames) {
            try {
                const count = await db.collection(name).countDocuments();
                if (count > 0) {
                    console.log(`   ✅ Found ${count} documents in '${name}'`);
                    const sample = await db.collection(name).findOne();
                    console.log(`   Sample:`, JSON.stringify(sample, null, 2).substring(0, 300));
                }
            } catch (e) {
                // Collection doesn't exist
            }
        }
        
    } catch (error) {
        console.error('❌ Error:', error);
    } finally {
        await mongoose.disconnect();
    }
}

checkDatabase();
