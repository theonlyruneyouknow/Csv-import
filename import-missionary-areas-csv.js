require('dotenv').config();
const mongoose = require('mongoose');
const fs = require('fs');
const Papa = require('papaparse');
const Missionary = require('./models/Missionary');
const MissionArea = require('./models/MissionArea');

// CSV should have columns: a_id (alum_id), area_id, area_nam (area_name)
// Example: 0,1,Banbury - This links alumId=0 to area_id=1 (Banbury)

async function importMissionaryAreas(csvFilePath) {
    try {
        console.log('🔍 Step 1: Connecting to MongoDB...');
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('✅ Connected to MongoDB');

        console.log('🔍 Step 2: Reading CSV file...');
        const csvContent = fs.readFileSync(csvFilePath, 'utf8');
        console.log(`✅ Read ${csvContent.length} bytes from file`);

        console.log('🔍 Step 3: Parsing CSV data...');
        const parsed = Papa.parse(csvContent, {
            header: true,
            skipEmptyLines: true,
            transformHeader: (header) => header.trim()
        });

        console.log(`✅ Parsed ${parsed.data.length} rows from CSV`);
        
        if (parsed.data.length === 0) {
            throw new Error('No data found in CSV file');
        }

        // Show first record for validation
        console.log('🔍 Step 4: Validating first record...');
        console.log('First record:', JSON.stringify(parsed.data[0], null, 2));

        console.log('🔍 Step 5: Loading all missionaries and areas into memory...');
        const missionaries = await Missionary.find({}).select('_id legacyData.alumId firstName lastName areasServed');
        const areas = await MissionArea.find({}).select('_id legacyAreaId name');
        
        // Create lookup maps
        const missionaryMap = new Map();
        missionaries.forEach(m => {
            if (m.legacyData && m.legacyData.alumId) {
                missionaryMap.set(m.legacyData.alumId, m);
            }
        });
        
        const areaMap = new Map();
        areas.forEach(a => {
            if (a.legacyAreaId) {
                areaMap.set(a.legacyAreaId, a);
            }
        });

        console.log(`✅ Loaded ${missionaries.length} missionaries and ${areas.length} areas`);

        console.log('🔍 Step 6: Starting missionary-area linking process...');
        
        let linked = 0;
        let alreadyLinked = 0;
        let notFoundMissionary = 0;
        let notFoundArea = 0;
        let skipped = 0;
        const errors = [];

        for (let i = 0; i < parsed.data.length; i++) {
            const row = parsed.data[i];
            const recordNum = i + 1;

            try {
                // Skip if missing required IDs
                if (!row.a_id || row.a_id === 'NULL' || row.a_id.trim() === '') {
                    skipped++;
                    continue;
                }
                
                if (!row.area_id || row.area_id === 'NULL' || row.area_id.trim() === '') {
                    skipped++;
                    continue;
                }

                const alumId = row.a_id.trim();
                const areaId = row.area_id.trim();
                const areaName = row.area_nam || row.area_name || 'Unknown';

                console.log(`📝 Record ${recordNum}: Linking alumId=${alumId} to area_id=${areaId} (${areaName})`);

                // Find missionary
                const missionary = missionaryMap.get(alumId);
                if (!missionary) {
                    console.log(`   ⚠️  Missionary not found for alumId=${alumId}`);
                    notFoundMissionary++;
                    continue;
                }

                // Find area
                const area = areaMap.get(areaId);
                if (!area) {
                    console.log(`   ⚠️  Area not found for area_id=${areaId}`);
                    notFoundArea++;
                    continue;
                }

                // Check if already linked
                const areaAlreadyLinked = missionary.areasServed.some(
                    aId => aId.toString() === area._id.toString()
                );

                if (areaAlreadyLinked) {
                    console.log(`   ↷ Already linked: ${missionary.firstName} ${missionary.lastName} ↔ ${area.name}`);
                    alreadyLinked++;
                } else {
                    // Add area to missionary
                    missionary.areasServed.push(area._id);
                    await missionary.save();
                    linked++;
                    console.log(`   ✓ Linked: ${missionary.firstName} ${missionary.lastName} ↔ ${area.name}`);
                }

            } catch (error) {
                console.error(`❌ Error processing record ${recordNum}:`, error.message);
                errors.push({
                    record: recordNum,
                    alumId: row.a_id,
                    areaId: row.area_id,
                    areaName: row.area_nam || row.area_name,
                    error: error.message
                });
            }
        }

        console.log('\n' + '='.repeat(60));
        console.log('📊 LINKING SUMMARY');
        console.log('='.repeat(60));
        console.log(`✓ Linked:               ${linked} new missionary-area connections`);
        console.log(`↷ Already linked:       ${alreadyLinked} connections`);
        console.log(`⊘ Skipped (blank):      ${skipped} records`);
        console.log(`⚠️  Missionary not found: ${notFoundMissionary} records`);
        console.log(`⚠️  Area not found:       ${notFoundArea} records`);
        console.log(`✗ Errors:               ${errors.length} records`);
        
        if (errors.length > 0) {
            console.log('\n❌ ERRORS:');
            errors.forEach(err => {
                console.log(`   Record ${err.record} (alumId=${err.alumId}, area=${err.areaName}): ${err.error}`);
            });
        }

        console.log('='.repeat(60) + '\n');

    } catch (error) {
        console.error('❌ Fatal error:', error);
        throw error;
    } finally {
        await mongoose.connection.close();
        console.log('👋 Disconnected from MongoDB');
    }
}

// Get CSV file path from command line
const csvFilePath = process.argv[2];

if (!csvFilePath) {
    console.error('❌ Usage: node import-missionary-areas-csv.js <path-to-csv-file>');
    console.error('   Example: node import-missionary-areas-csv.js "c:\\Users\\runet\\Documents\\missionary-areas.csv"');
    process.exit(1);
}

if (!fs.existsSync(csvFilePath)) {
    console.error(`❌ File not found: ${csvFilePath}`);
    process.exit(1);
}

importMissionaryAreas(csvFilePath)
    .then(() => {
        console.log('✅ Import completed successfully');
        process.exit(0);
    })
    .catch((error) => {
        console.error('❌ Import failed:', error);
        process.exit(1);
    });
