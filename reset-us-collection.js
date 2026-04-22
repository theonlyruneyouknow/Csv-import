// Drop the usseedpartners collection completely and recreate
const mongoose = require('mongoose');
require('dotenv').config();

async function resetCollection() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('✅ Connected to MongoDB\n');

        const db = mongoose.connection.db;

        // Check if collection exists
        const collections = await db.listCollections({ name: 'usseedpartners' }).toArray();

        if (collections.length > 0) {
            console.log('🗑️  Dropping usseedpartners collection (including all indexes)...');
            await db.collection('usseedpartners').drop();
            console.log('✅ Collection dropped successfully\n');
        } else {
            console.log('ℹ️  Collection does not exist yet\n');
        }

        console.log('✅ Ready for fresh data insertion');

    } catch (error) {
        if (error.message.includes('ns not found')) {
            console.log('ℹ️  Collection does not exist (already clean)');
        } else {
            console.error('❌ Error:', error);
        }
    } finally {
        await mongoose.disconnect();
    }
}

resetCollection();
