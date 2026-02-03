require('dotenv').config();
const mongoose = require('mongoose');
const fs = require('fs');
const Papa = require('papaparse');
const MissionArea = require('./models/MissionArea');
const User = require('./models/User');

// CSV should have columns: area_id, area_nam (area_name)
// Example: 1,Banbury or 2,Bedford

async function importAreas(csvFilePath) {
    try {
        console.log('🔍 Step 1: Connecting to MongoDB...');
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('✅ Connected to MongoDB');

        console.log('🔍 Step 2: Looking for admin user...');
        const adminUser = await User.findOne({ username: 'adminrune' });
        if (!adminUser) {
            throw new Error('Admin user not found! Need user to attribute imports to.');
        }
        console.log(`✅ Found admin user: ${adminUser.username}`);

        console.log('🔍 Step 3: Reading CSV file...');
        const csvContent = fs.readFileSync(csvFilePath, 'utf8');
        console.log(`✅ Read ${csvContent.length} bytes from file`);

        console.log('🔍 Step 4: Parsing CSV data...');
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
        console.log('🔍 Step 5: Validating first record...');
        console.log('First record:', JSON.stringify(parsed.data[0], null, 2));

        console.log('🔍 Step 6: Starting area import process...');
        
        let imported = 0;
        let updated = 0;
        let skipped = 0;
        const errors = [];

        for (let i = 0; i < parsed.data.length; i++) {
            const row = parsed.data[i];
            const recordNum = i + 1;

            try {
                // Skip if no area_id
                if (!row.area_id || row.area_id === 'NULL' || row.area_id.trim() === '') {
                    console.log(`⚠️  Record ${recordNum}: Skipping - no area_id`);
                    skipped++;
                    continue;
                }

                // Extract area name (handle both area_nam and area_name columns)
                const areaName = row.area_nam || row.area_name || 'Unknown';
                
                // Skip null or empty names
                if (!areaName || areaName === 'NULL' || areaName === 'Null' || areaName.trim() === '') {
                    console.log(`⚠️  Record ${recordNum}: Skipping - no area name (area_id: ${row.area_id})`);
                    skipped++;
                    continue;
                }

                console.log(`📝 Record ${recordNum}: Processing area_id=${row.area_id}, name="${areaName}"`);

                // Check if area already exists by legacy ID
                let area = await MissionArea.findOne({ legacyAreaId: row.area_id });

                if (area) {
                    // Update existing area
                    console.log(`   ↻ Updating existing area: ${area.name}`);
                    area.name = areaName;
                    area.lastEditedBy = adminUser._id;
                    await area.save();
                    updated++;
                    console.log(`   ✓ Updated area: ${areaName}`);
                } else {
                    // Create new area
                    area = new MissionArea({
                        name: areaName,
                        city: areaName, // Default to same as name
                        legacyAreaId: row.area_id,
                        addedBy: adminUser._id,
                        verified: false,
                        isCurrentArea: true
                    });
                    await area.save();
                    imported++;
                    console.log(`   ✓ Created new area: ${areaName} (ID: ${area._id})`);
                }

            } catch (error) {
                console.error(`❌ Error processing record ${recordNum}:`, error.message);
                errors.push({
                    record: recordNum,
                    areaId: row.area_id,
                    name: row.area_nam || row.area_name,
                    error: error.message
                });
            }
        }

        console.log('\n' + '='.repeat(60));
        console.log('📊 IMPORT SUMMARY');
        console.log('='.repeat(60));
        console.log(`✓ Imported: ${imported} new areas`);
        console.log(`↻ Updated:  ${updated} existing areas`);
        console.log(`⊘ Skipped:  ${skipped} records`);
        console.log(`✗ Errors:   ${errors.length} records`);
        
        if (errors.length > 0) {
            console.log('\n❌ ERRORS:');
            errors.forEach(err => {
                console.log(`   Record ${err.record} (${err.name}): ${err.error}`);
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
    console.error('❌ Usage: node import-areas-csv.js <path-to-csv-file>');
    console.error('   Example: node import-areas-csv.js "c:\\Users\\runet\\Documents\\areas.csv"');
    process.exit(1);
}

if (!fs.existsSync(csvFilePath)) {
    console.error(`❌ File not found: ${csvFilePath}`);
    process.exit(1);
}

importAreas(csvFilePath)
    .then(() => {
        console.log('✅ Import completed successfully');
        process.exit(0);
    })
    .catch((error) => {
        console.error('❌ Import failed:', error);
        process.exit(1);
    });
