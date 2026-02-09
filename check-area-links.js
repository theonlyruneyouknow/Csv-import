require('dotenv').config();
const mongoose = require('mongoose');
const MissionArea = require('./models/MissionArea');
const Missionary = require('./models/Missionary');

async function checkAreaData() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('✅ Connected to MongoDB\n');

        // Get a sample missionary with areas
        const missionary = await Missionary.findOne({ 
            'legacyData.alumId': '86' // Trygve
        }).populate('areasServed');

        console.log('📍 Missionary: Rune Trygve Larsen (alum_id: 86)');
        console.log('   Areas served:', missionary.areasServed.length);
        
        if (missionary.areasServed.length > 0) {
            console.log('\n   Current linked areas:');
            missionary.areasServed.forEach((area, i) => {
                console.log(`   ${i + 1}. "${area.name}"`);
                console.log(`      - legacyAId (a_id): ${area.legacyAId || 'N/A'}`);
                console.log(`      - legacyAreaId (area_id): ${area.legacyAreaId || 'N/A'}`);
                console.log(`      - isCanonical: ${area.isCanonical}`);
            });
        }

        // Check what areas exist for area_id=1 (Banbury)
        console.log('\n📋 All variants for area_id=1 (Banbury group):');
        const banburyVariants = await MissionArea.find({ legacyAreaId: '1' });
        banburyVariants.forEach((area, i) => {
            console.log(`   ${i + 1}. "${area.name}"`);
            console.log(`      - legacyAId (a_id): ${area.legacyAId || 'MISSING'}`);
            console.log(`      - legacyAreaId (area_id): ${area.legacyAreaId}`);
            console.log(`      - isCanonical: ${area.isCanonical}`);
        });

        // Show some sample areas with their IDs
        console.log('\n📋 Sample of first 20 areas in database:');
        const sampleAreas = await MissionArea.find({}).limit(20).sort({ legacyAId: 1 });
        sampleAreas.forEach((area, i) => {
            console.log(`   ${i + 1}. a_id=${area.legacyAId || 'NULL'}, area_id=${area.legacyAreaId || 'NULL'}, name="${area.name}"`);
        });

        // Check if alum_area_id might be in the data
        console.log('\n💡 ANALYSIS:');
        console.log('   Your CSV has columns: alum_area_id, alum_id, area_id, area_sequence');
        console.log('   Current areas imported: 683 total');
        console.log('   - With legacyAId (a_id): ' + await MissionArea.countDocuments({ legacyAId: { $exists: true, $ne: null } }));
        console.log('   - With legacyAreaId (area_id): ' + await MissionArea.countDocuments({ legacyAreaId: { $exists: true, $ne: null } }));
        
        console.log('\n📝 QUESTION:');
        console.log('   Is "alum_area_id" in your CSV the same as "a_id" from your areas table?');
        console.log('   Or is it just a sequential relationship ID (1, 2, 3...)?');
        console.log('\n   From the logs, alum_area_id looks sequential (1, 2, 3, 4, 5...)');
        console.log('   This suggests it\'s NOT the a_id from areas table.');
        console.log('\n   You need to export data with the actual a_id column to preserve');
        console.log('   the specific spelling each missionary entered.');

    } catch (error) {
        console.error('❌ Error:', error.message);
    } finally {
        await mongoose.connection.close();
        console.log('\n✅ Database connection closed');
    }
}

checkAreaData();
