// migrate-statistics-indexes.js
// Run this script once to remove the old unique date index and rebuild indexes

const mongoose = require('mongoose');
require('dotenv').config();

async function migrateIndexes() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    // Get the DailyStatistics collection
    const db = mongoose.connection.db;
    const collection = db.collection('dailystatistics');

    // Get current indexes
    const indexes = await collection.indexes();
    console.log('\n📋 Current indexes:');
    indexes.forEach(idx => {
      console.log('  -', JSON.stringify(idx.key), idx.unique ? '(UNIQUE)' : '');
    });

    // Drop the old date_1 unique index if it exists
    try {
      await collection.dropIndex('date_1');
      console.log('\n✅ Dropped old date_1 index');
    } catch (error) {
      if (error.code === 27) {
        console.log('\n✅ date_1 index does not exist (already removed)');
      } else {
        console.log('\n⚠️  Error dropping date_1 index:', error.message);
      }
    }

    // Now load the model which will create the correct indexes
    const DailyStatistics = require('./models/DailyStatistics');
    
    // Sync indexes (this will create missing indexes)
    console.log('\n🔄 Syncing indexes from model...');
    await DailyStatistics.syncIndexes();
    console.log('✅ Indexes synced successfully');

    // Show new indexes
    const newIndexes = await collection.indexes();
    console.log('\n📋 Updated indexes:');
    newIndexes.forEach(idx => {
      console.log('  -', JSON.stringify(idx.key), idx.unique ? '(UNIQUE)' : '');
    });

    console.log('\n✅ Migration complete!');
    process.exit(0);

  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
}

migrateIndexes();
