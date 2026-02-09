require('dotenv').config();
const mongoose = require('mongoose');
const MissionArea = require('./models/MissionArea');

async function fixIndexes() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('✅ Connected to MongoDB\n');

        // Get current indexes
        const indexes = await MissionArea.collection.getIndexes();
        console.log('📋 Current indexes on MissionArea collection:');
        Object.keys(indexes).forEach(indexName => {
            console.log(`   - ${indexName}:`, indexes[indexName]);
        });

        // Drop the legacyAreaId unique index if it exists
        try {
            await MissionArea.collection.dropIndex('legacyAreaId_1');
            console.log('\n✅ Dropped unique index on legacyAreaId');
        } catch (error) {
            if (error.code === 27) {
                console.log('\n⚠️  Index legacyAreaId_1 does not exist (already removed)');
            } else {
                console.log('\n❌ Error dropping index:', error.message);
            }
        }

        // Ensure correct indexes exist
        console.log('\n🔄 Ensuring correct indexes...');
        await MissionArea.collection.createIndex({ legacyAId: 1 }, { unique: true, sparse: true });
        await MissionArea.collection.createIndex({ legacyAreaId: 1 }, { sparse: true }); // NOT unique
        await MissionArea.collection.createIndex({ isCanonical: 1 });

        console.log('✅ Indexes updated');

        // Show final indexes
        const finalIndexes = await MissionArea.collection.getIndexes();
        console.log('\n📋 Final indexes:');
        Object.keys(finalIndexes).forEach(indexName => {
            console.log(`   - ${indexName}:`, finalIndexes[indexName]);
        });

    } catch (error) {
        console.error('❌ Error:', error.message);
    } finally {
        await mongoose.connection.close();
        console.log('\n✅ Database connection closed');
    }
}

fixIndexes();
