require('dotenv').config();
const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');
const Papa = require('papaparse');

async function analyzeAreaData() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('✅ Connected to MongoDB\n');

        // Read the CSV files to understand structure
        const missionaryAreasPath = path.join(__dirname, 'missionary-areas.csv');
        const areasPath = path.join(__dirname, 'areas.csv');

        console.log('📋 ANALYZING CSV STRUCTURE\n');
        console.log('='.repeat(60));

        // Check missionary-areas CSV
        if (fs.existsSync(missionaryAreasPath)) {
            const csvContent = fs.readFileSync(missionaryAreasPath, 'utf8');
            const parsed = Papa.parse(csvContent, { header: true, skipEmptyLines: true });
            
            console.log('\n1️⃣  MISSIONARY-AREAS CSV (relationships)');
            console.log('   File:', missionaryAreasPath);
            console.log('   Total rows:', parsed.data.length);
            console.log('   Columns:', Object.keys(parsed.data[0] || {}));
            console.log('\n   Sample rows (first 10):');
            parsed.data.slice(0, 10).forEach((row, i) => {
                console.log(`   ${i + 1}. alum_id=${row.alum_id}, a_id=${row.a_id || 'N/A'}, area_id=${row.area_id}`);
            });

            // Analyze unique values
            const uniqueAIds = new Set();
            const uniqueAreaIds = new Set();
            const aIdToAreaIdMap = new Map();

            parsed.data.forEach(row => {
                if (row.a_id) uniqueAIds.add(row.a_id);
                if (row.area_id) uniqueAreaIds.add(row.area_id);
                if (row.a_id && row.area_id) {
                    if (!aIdToAreaIdMap.has(row.a_id)) {
                        aIdToAreaIdMap.set(row.a_id, new Set());
                    }
                    aIdToAreaIdMap.get(row.a_id).add(row.area_id);
                }
            });

            console.log(`\n   📊 Statistics:`);
            console.log(`      Unique a_id values: ${uniqueAIds.size}`);
            console.log(`      Unique area_id values: ${uniqueAreaIds.size}`);
            console.log(`      Rows with a_id: ${parsed.data.filter(r => r.a_id).length}`);
            console.log(`      Rows with only area_id: ${parsed.data.filter(r => !r.a_id && r.area_id).length}`);
        } else {
            console.log('\n1️⃣  MISSIONARY-AREAS CSV: Not found');
        }

        // Check areas CSV
        if (fs.existsSync(areasPath)) {
            const csvContent = fs.readFileSync(areasPath, 'utf8');
            const parsed = Papa.parse(csvContent, { header: true, skipEmptyLines: true });
            
            console.log('\n\n2️⃣  AREAS CSV (area definitions)');
            console.log('   File:', areasPath);
            console.log('   Total rows:', parsed.data.length);
            console.log('   Columns:', Object.keys(parsed.data[0] || {}));
            console.log('\n   Sample rows (first 20):');
            parsed.data.slice(0, 20).forEach((row, i) => {
                console.log(`   ${i + 1}. a_id=${row.a_id || 'N/A'}, area_id=${row.area_id}, area_nam="${row.area_nam || row.area_name}"`);
            });

            // Group by area_id to show normalization needs
            console.log('\n\n3️⃣  NORMALIZATION ANALYSIS');
            console.log('   Grouping by area_id to show spelling variants:\n');

            const groupedByAreaId = new Map();
            parsed.data.forEach(row => {
                const areaId = row.area_id;
                if (!areaId || areaId === 'NULL') return;

                if (!groupedByAreaId.has(areaId)) {
                    groupedByAreaId.set(areaId, []);
                }
                groupedByAreaId.get(areaId).push({
                    a_id: row.a_id,
                    name: row.area_nam || row.area_name
                });
            });

            // Show first 10 groups with multiple variants
            let shown = 0;
            for (const [areaId, variants] of groupedByAreaId.entries()) {
                if (variants.length > 1 && shown < 10) {
                    console.log(`   area_id=${areaId} has ${variants.length} spelling variants:`);
                    variants.forEach(v => {
                        console.log(`      • a_id=${v.a_id}: "${v.name}"`);
                    });
                    console.log('');
                    shown++;
                }
            }

            console.log(`\n   📊 Normalization Statistics:`);
            console.log(`      Total area_id groups: ${groupedByAreaId.size}`);
            console.log(`      Groups with multiple spellings: ${Array.from(groupedByAreaId.values()).filter(v => v.length > 1).length}`);
            console.log(`      Groups with single spelling: ${Array.from(groupedByAreaId.values()).filter(v => v.length === 1).length}`);

            const allVariants = Array.from(groupedByAreaId.values()).flat();
            console.log(`      Total a_id variants: ${allVariants.length}`);
        } else {
            console.log('\n\n2️⃣  AREAS CSV: Not found');
        }

        console.log('\n\n' + '='.repeat(60));
        console.log('📝 RECOMMENDATIONS:\n');
        console.log('1. Update MissionArea schema to include:');
        console.log('   • legacyAId (individual spelling variant ID)');
        console.log('   • legacyAreaId (normalized group ID)');
        console.log('   • isCanonical (marks the preferred spelling)');
        console.log('   • canonicalAreaId (reference to canonical version)\n');
        console.log('2. Import all a_id variants as separate MissionArea docs');
        console.log('3. Link missionaries to specific a_id (preserves original data)');
        console.log('4. Create UI to mark one variant as canonical per area_id group');
        console.log('5. Display uses canonical name but preserves original links');

    } catch (error) {
        console.error('❌ Error:', error.message);
    } finally {
        await mongoose.connection.close();
        console.log('\n✅ Database connection closed');
    }
}

analyzeAreaData();
