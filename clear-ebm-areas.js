const mongoose = require('mongoose');
require('dotenv').config();

const MissionArea = require('./models/MissionArea');
const Missionary = require('./models/Missionary');

async function clearAreasAndLinks() {
    try {
        console.log('🔄 Connecting to MongoDB...');
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('✅ Connected to MongoDB\n');

        // Step 1: Count existing data
        const areaCount = await MissionArea.countDocuments();
        const missionariesWithAreas = await Missionary.countDocuments({ 
            areasServed: { $exists: true, $ne: [] } 
        });
        
        console.log('📊 Current Status:');
        console.log(`   - Total MissionAreas: ${areaCount}`);
        console.log(`   - Missionaries with areas: ${missionariesWithAreas}\n`);

        // Step 2: Remove all areas from missionaries
        console.log('🧹 Removing areasServed from all missionaries...');
        const updateResult = await Missionary.updateMany(
            {},
            { $set: { areasServed: [] } }
        );
        console.log(`✅ Updated ${updateResult.modifiedCount} missionaries\n`);

        // Step 3: Delete all MissionArea documents
        console.log('🗑️  Deleting all MissionArea documents...');
        const deleteResult = await MissionArea.deleteMany({});
        console.log(`✅ Deleted ${deleteResult.deletedCount} MissionArea documents\n`);

        // Step 4: Verify cleanup
        const remainingAreas = await MissionArea.countDocuments();
        const remainingMissionariesWithAreas = await Missionary.countDocuments({ 
            areasServed: { $exists: true, $ne: [] } 
        });

        console.log('✅ Cleanup Complete:');
        console.log(`   - Remaining MissionAreas: ${remainingAreas}`);
        console.log(`   - Missionaries with areas: ${remainingMissionariesWithAreas}\n`);

        if (remainingAreas === 0 && remainingMissionariesWithAreas === 0) {
            console.log('✨ All areas and links successfully removed!');
            console.log('📤 Ready for fresh data upload');
        } else {
            console.log('⚠️  Warning: Some data may still remain');
        }

    } catch (error) {
        console.error('❌ Error during cleanup:', error);
    } finally {
        await mongoose.connection.close();
        console.log('\n🔌 Database connection closed');
    }
}

clearAreasAndLinks();
