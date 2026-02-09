require('dotenv').config();
const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');
const Papa = require('papaparse');
const Missionary = require('./models/Missionary');
const MissionArea = require('./models/MissionArea');

// CSV should have columns: a_id or alum_id (missionary ID), area_id (area ID), area_nam or area_name (area name)
// Example: 18,1,"Banbury" - This links alumId=18 to area_id=1 (Banbury)

// Create logs directory if it doesn't exist
const logsDir = path.join(__dirname, 'logs');
if (!fs.existsSync(logsDir)) {
    fs.mkdirSync(logsDir);
}

// Create log file with timestamp
const timestamp = new Date().toISOString().replace(/:/g, '-').replace(/\..+/, '');
const logFilePath = path.join(logsDir, `missionary-areas-import-${timestamp}.log`);
const logStream = fs.createWriteStream(logFilePath, { flags: 'a' });

// Helper function to log to both console and file
function log(message) {
    console.log(message);
    logStream.write(message + '\n');
}

async function importMissionaryAreas(csvFilePath) {
    try {
        log('🔍 Step 1: Connecting to MongoDB...');
        await mongoose.connect(process.env.MONGODB_URI);
        log('✅ Connected to MongoDB');

        log('🔍 Step 2: Reading CSV file...');
        const csvContent = fs.readFileSync(csvFilePath, 'utf8');
        log(`✅ Read ${csvContent.length} bytes from file`);

        log('🔍 Step 3: Parsing CSV data...');
        const parsed = Papa.parse(csvContent, {
            header: true,
            skipEmptyLines: true,
            transformHeader: (header) => header.trim()
        });

        log(`✅ Parsed ${parsed.data.length} rows from CSV`);
        
        if (parsed.data.length === 0) {
            throw new Error('No data found in CSV file');
        }

        // Show first record for validation
        log('🔍 Step 4: Validating first record...');
        log('First record: ' + JSON.stringify(parsed.data[0], null, 2));

        log('🔍 Step 5: Loading all missionaries and areas into memory...');
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

        log(`✅ Loaded ${missionaries.length} missionaries and ${areas.length} areas`);

        log('🔍 Step 6: Starting missionary-area linking process...');
        
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
                // Handle both a_id and alum_id column names
                const alumIdValue = row.alum_id || row.a_id;
                const areaIdValue = row.area_id;
                
                // Skip if missing required IDs
                if (!alumIdValue || alumIdValue === 'NULL' || alumIdValue.trim() === '') {
                    skipped++;
                    continue;
                }
                
                if (!areaIdValue || areaIdValue === 'NULL' || areaIdValue.trim() === '') {
                    skipped++;
                    continue;
                }

                const alumId = alumIdValue.trim();
                const areaId = areaIdValue.trim();
                const areaName = row.area_nam || row.area_name || 'Unknown';

                log(`📝 Record ${recordNum}: Linking alumId=${alumId} to area_id=${areaId} (${areaName})`);

                // Find missionary
                const missionary = missionaryMap.get(alumId);
                if (!missionary) {
                    log(`   ⚠️  Missionary not found for alumId=${alumId}`);
                    notFoundMissionary++;
                    continue;
                }

                // Find area
                const area = areaMap.get(areaId);
                if (!area) {
                    log(`   ⚠️  Area not found for area_id=${areaId}`);
                    notFoundArea++;
                    continue;
                }

                // Check if already linked
                const areaAlreadyLinked = missionary.areasServed.some(
                    aId => aId.toString() === area._id.toString()
                );

                if (areaAlreadyLinked) {
                    log(`   ↷ Already linked: ${missionary.firstName} ${missionary.lastName} ↔ ${area.name}`);
                    alreadyLinked++;
                } else {
                    // Add area to missionary
                    missionary.areasServed.push(area._id);
                    await missionary.save();
                    linked++;
                    log(`   ✓ Linked: ${missionary.firstName} ${missionary.lastName} ↔ ${area.name}`);
                }

            } catch (error) {
                const errorMsg = `❌ Error processing record ${recordNum}: ${error.message}`;
                log(errorMsg);
                errors.push({
                    record: recordNum,
                    alumId: row.alum_id || row.a_id,
                    areaId: row.area_id,
                    areaName: row.area_nam || row.area_name,
                    error: error.message
                });
            }
        }

        log('\n' + '='.repeat(60));
        log('📊 LINKING SUMMARY');
        log('='.repeat(60));
        log(`✓ Linked:               ${linked} new missionary-area connections`);
        log(`↷ Already linked:       ${alreadyLinked} connections`);
        log(`⊘ Skipped (blank):      ${skipped} records`);
        log(`⚠️  Missionary not found: ${notFoundMissionary} records`);
        log(`⚠️  Area not found:       ${notFoundArea} records`);
        log(`✗ Errors:               ${errors.length} records`);
        
        if (errors.length > 0) {
            log('\n❌ ERRORS:');
            errors.forEach(err => {
                log(`   Record ${err.record} (alumId=${err.alumId}, area=${err.areaName}): ${err.error}`);
            });
        }

        log('='.repeat(60) + '\n');
        log(`📄 Full log saved to: ${logFilePath}`);

    } catch (error) {
        log('❌ Fatal error: ' + error.message);
        log(error.stack);
        throw error;
    } finally {
        await mongoose.connection.close();
        log('👋 Disconnected from MongoDB');
        logStream.end();
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
        console.log('\n✅ Import completed successfully');
        console.log(`📄 Full log saved to: ${logFilePath}`);
        process.exit(0);
    })
    .catch((error) => {
        console.error('❌ Import failed:', error.message);
        console.log(`📄 Full log saved to: ${logFilePath}`);
        process.exit(1);
    });
