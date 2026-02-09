const mongoose = require('mongoose');
require('dotenv').config();

const Missionary = require('./models/Missionary');
const MissionArea = require('./models/MissionArea');

async function checkLegacyIds() {
    try {
        console.log('🔄 Connecting to MongoDB...');
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('✅ Connected to MongoDB\n');

        // Check missionaries
        console.log('='.repeat(60));
        console.log('CHECKING MISSIONARIES');
        console.log('='.repeat(60));
        
        const totalMissionaries = await Missionary.countDocuments();
        const missionariesWithAlumId = await Missionary.countDocuments({ 
            'legacyData.alumId': { $exists: true, $ne: null } 
        });
        
        console.log(`Total missionaries: ${totalMissionaries}`);
        console.log(`Missionaries with legacyData.alumId: ${missionariesWithAlumId}`);
        console.log(`Missionaries WITHOUT legacyData.alumId: ${totalMissionaries - missionariesWithAlumId}\n`);
        
        // Show sample missionaries
        console.log('Sample missionaries:');
        const sampleMissionaries = await Missionary.find()
            .select('firstName lastName legacyData.alumId')
            .limit(10);
        
        sampleMissionaries.forEach(m => {
            console.log(`  ${m.firstName} ${m.lastName}: alumId = ${m.legacyData?.alumId || 'NOT SET'}`);
        });
        
        // Check areas
        console.log('\n' + '='.repeat(60));
        console.log('CHECKING MISSION AREAS');
        console.log('='.repeat(60));
        
        const totalAreas = await MissionArea.countDocuments();
        const areasWithLegacyId = await MissionArea.countDocuments({ 
            legacyAreaId: { $exists: true, $ne: null } 
        });
        
        console.log(`Total areas: ${totalAreas}`);
        console.log(`Areas with legacyAreaId: ${areasWithLegacyId}`);
        console.log(`Areas WITHOUT legacyAreaId: ${totalAreas - areasWithLegacyId}\n`);
        
        // Show sample areas
        console.log('Sample areas:');
        const sampleAreas = await MissionArea.find()
            .select('name legacyAreaId')
            .limit(10);
        
        sampleAreas.forEach(a => {
            console.log(`  ${a.name}: legacyAreaId = ${a.legacyAreaId || 'NOT SET'}`);
        });
        
        // Check specific IDs from your CSV
        console.log('\n' + '='.repeat(60));
        console.log('CHECKING SPECIFIC IDs FROM YOUR CSV');
        console.log('='.repeat(60));
        
        const testAlumIds = ['18', '26', '27'];
        const testAreaIds = ['1'];
        
        console.log('\nLooking for alumIds:', testAlumIds.join(', '));
        for (const alumId of testAlumIds) {
            const missionary = await Missionary.findOne({ 'legacyData.alumId': alumId });
            if (missionary) {
                console.log(`  ✓ Found alumId ${alumId}: ${missionary.firstName} ${missionary.lastName}`);
            } else {
                console.log(`  ✗ NOT FOUND: alumId ${alumId}`);
            }
        }
        
        console.log('\nLooking for areaIds:', testAreaIds.join(', '));
        for (const areaId of testAreaIds) {
            const area = await MissionArea.findOne({ legacyAreaId: areaId });
            if (area) {
                console.log(`  ✓ Found areaId ${areaId}: ${area.name}`);
            } else {
                console.log(`  ✗ NOT FOUND: areaId ${areaId}`);
            }
        }
        
        console.log('\n' + '='.repeat(60));
        console.log('DIAGNOSIS');
        console.log('='.repeat(60));
        
        if (missionariesWithAlumId === 0) {
            console.log('❌ PROBLEM: No missionaries have legacyData.alumId set!');
            console.log('   Solution: Re-import missionaries from SQL data to populate alumId');
        } else if (missionariesWithAlumId < totalMissionaries) {
            console.log('⚠️  WARNING: Some missionaries missing legacyData.alumId');
        } else {
            console.log('✓ All missionaries have alumId set');
        }
        
        if (areasWithLegacyId === 0) {
            console.log('❌ PROBLEM: No areas have legacyAreaId set!');
            console.log('   Solution: Re-import areas with area_id column to populate legacyAreaId');
        } else if (areasWithLegacyId < totalAreas) {
            console.log('⚠️  WARNING: Some areas missing legacyAreaId');
        } else {
            console.log('✓ All areas have legacyAreaId set');
        }

    } catch (error) {
        console.error('❌ Error:', error);
    } finally {
        await mongoose.connection.close();
        console.log('\n🔌 Database connection closed');
    }
}

checkLegacyIds();
