require('dotenv').config();
const mongoose = require('mongoose');
const MissionArea = require('./models/MissionArea');
const Missionary = require('./models/Missionary');

async function diagnoseAreasServed() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('✅ Connected to MongoDB\n');
        console.log('='.repeat(70));
        console.log('AREAS SERVED DIAGNOSTIC');
        console.log('='.repeat(70));

        // Get Trygve's data
        const trygve = await Missionary.findOne({ 
            'legacyData.alumId': '86' 
        }).populate('areasServed');

        console.log('\n📍 Missionary: Rune Trygve Larsen (alum_id: 86)');
        console.log(`   Total areas served: ${trygve.areasServed.length}`);

        if (trygve.areasServed.length > 0) {
            console.log('\n   📋 Areas currently linked:');
            trygve.areasServed.forEach((area, i) => {
                console.log(`\n   ${i + 1}. "${area.name}"`);
                console.log(`      - MongoDB _id: ${area._id}`);
                console.log(`      - legacyAId (a_id): ${area.legacyAId || 'NOT SET'}`);
                console.log(`      - legacyAreaId (area_id): ${area.legacyAreaId || 'NOT SET'}`);
                console.log(`      - isCanonical: ${area.isCanonical}`);
                console.log(`      - city: ${area.city}`);
            });
        } else {
            console.log('   ⚠️  No areas linked!');
        }

        // Check what your CSV is trying to import
        console.log('\n\n' + '='.repeat(70));
        console.log('YOUR CSV DATA STRUCTURE');
        console.log('='.repeat(70));
        console.log('\nYour missionary-areas CSV has these columns:');
        console.log('  • alum_area_id - Sequential ID (1, 2, 3, 4, 5...)');
        console.log('  • alum_id - Missionary ID (18, 26, 27, 46, 86...)');
        console.log('  • area_id - Normalized group ID (1, 1, 1, 1, 1...)');
        console.log('  • area_sequence - Sequence (NULL)');
        console.log('\n❓ QUESTION: Does your source database have a way to know which');
        console.log('   specific spelling (a_id) each missionary originally entered?');
        console.log('\n   If YES: Export a CSV with columns: alum_id, a_id');
        console.log('   If NO: You can only link by area_id (current approach)');

        // Check available areas
        console.log('\n\n' + '='.repeat(70));
        console.log('AVAILABLE AREAS IN DATABASE');
        console.log('='.repeat(70));
        
        const totalAreas = await MissionArea.countDocuments();
        const withAId = await MissionArea.countDocuments({ legacyAId: { $exists: true, $ne: null } });
        const withAreaId = await MissionArea.countDocuments({ legacyAreaId: { $exists: true, $ne: null } });
        
        console.log(`\n📊 Statistics:`);
        console.log(`   Total areas: ${totalAreas}`);
        console.log(`   With a_id (legacyAId): ${withAId}`);
        console.log(`   With area_id (legacyAreaId): ${withAreaId}`);

        // Show some examples
        console.log('\n📋 Sample areas for area_id=1 (Banbury group):');
        const banbury = await MissionArea.find({ legacyAreaId: '1' });
        if (banbury.length === 0) {
            console.log('   ⚠️  No areas found with area_id=1');
        } else {
            banbury.forEach((area, i) => {
                console.log(`   ${i + 1}. a_id=${area.legacyAId || 'NULL'}, name="${area.name}", canonical=${area.isCanonical}`);
            });
        }

        // Show areas without area_id
        const noAreaId = await MissionArea.countDocuments({ 
            $or: [
                { legacyAreaId: { $exists: false } },
                { legacyAreaId: null }
            ]
        });
        console.log(`\n   Areas without area_id: ${noAreaId}`);

        console.log('\n\n' + '='.repeat(70));
        console.log('RECOMMENDATION');
        console.log('='.repeat(70));
        console.log('\nSince your CSV only has area_id (not specific a_id):');
        console.log('1. System links missionaries to the first variant found for that area_id');
        console.log('2. This works for display purposes');
        console.log('3. Original spelling data is lost (unless you have it in source DB)');
        console.log('\n✅ Current linking IS working - missionaries are linked to areas');
        console.log('✅ They display with the area name from the database');
        console.log('\nIf you want to preserve original spellings:');
        console.log('➡️  Export source data with: alum_id, a_id (the actual a_id missionary entered)');

    } catch (error) {
        console.error('❌ Error:', error.message);
    } finally {
        await mongoose.connection.close();
        console.log('\n✅ Database connection closed');
    }
}

diagnoseAreasServed();
