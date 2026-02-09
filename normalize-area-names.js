require('dotenv').config();
const mongoose = require('mongoose');
const MissionArea = require('./models/MissionArea');
const readline = require('readline');

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

function question(prompt) {
    return new Promise((resolve) => {
        rl.question(prompt, (answer) => {
            resolve(answer);
        });
    });
}

async function normalizeAreas() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('\n✅ Connected to MongoDB\n');
        console.log('='.repeat(70));
        console.log('MISSION AREA NORMALIZATION TOOL');
        console.log('='.repeat(70));
        console.log('\nThis tool helps you establish canonical (normalized) names for areas');
        console.log('by grouping variants by area_id and letting you choose the preferred spelling.\n');

        // Get all areas grouped by area_id
        const areas = await MissionArea.find({}).sort({ legacyAreaId: 1, name: 1 });
        
        console.log(`📊 Found ${areas.length} total area variants in database\n`);

        // Group by area_id
        const grouped = new Map();
        const noAreaId = [];
        
        areas.forEach(area => {
            if (!area.legacyAreaId) {
                noAreaId.push(area);
            } else {
                const key = area.legacyAreaId;
                if (!grouped.has(key)) {
                    grouped.set(key, []);
                }
                grouped.get(key).push(area);
            }
        });

        console.log(`📈 Statistics:`);
        console.log(`   • Area groups (area_id): ${grouped.size}`);
        console.log(`   • Variants without area_id: ${noAreaId.length}`);
        console.log(`   • Groups with multiple spellings: ${Array.from(grouped.values()).filter(v => v.length > 1).length}`);
        console.log(`   • Groups with single spelling: ${Array.from(grouped.values()).filter(v => v.length === 1).length}\n`);

        const action = await question('What would you like to do?\n  1) Review all groups with multiple spellings\n  2) Auto-select most common spelling\n  3) Generate report only\n  4) Mark specific area as canonical\n  5) Clear all canonical flags\n\nChoice (1-5): ');

        switch(action.trim()) {
            case '1':
                await reviewMultipleSpellings(grouped);
                break;
            case '2':
                await autoSelectCanonical(grouped);
                break;
            case '3':
                await generateReport(grouped, noAreaId);
                break;
            case '4':
                await markSpecificCanonical();
                break;
            case '5':
                await clearCanonical();
                break;
            default:
                console.log('❌ Invalid choice');
        }

    } catch (error) {
        console.error('❌ Error:', error.message);
    } finally {
        rl.close();
        await mongoose.connection.close();
        console.log('\n✅ Database connection closed');
    }
}

async function reviewMultipleSpellings(grouped) {
    console.log('\n' + '='.repeat(70));
    console.log('REVIEWING GROUPS WITH MULTIPLE SPELLINGS');
    console.log('='.repeat(70) + '\n');

    const multipleSpellings = Array.from(grouped.entries())
        .filter(([_, variants]) => variants.length > 1)
        .sort((a, b) => b[1].length - a[1].length); // Sort by variant count

    console.log(`Found ${multipleSpellings.length} groups with multiple spellings\n`);

    for (const [areaId, variants] of multipleSpellings) {
        console.log(`\n${'─'.repeat(70)}`);
        console.log(`📍 area_id: ${areaId} (${variants.length} variants)`);
        console.log(`${'─'.repeat(70)}`);

        variants.forEach((variant, index) => {
            const isCanonical = variant.isCanonical ? ' ⭐ CANONICAL' : '';
            console.log(`  ${index + 1}. "${variant.name}" (a_id: ${variant.legacyAId})${isCanonical}`);
        });

        const choice = await question('\nSelect canonical version (1-' + variants.length + '), or S to skip, Q to quit: ');
        
        if (choice.toUpperCase() === 'Q') break;
        if (choice.toUpperCase() === 'S') continue;

        const index = parseInt(choice) - 1;
        if (index >= 0 && index < variants.length) {
            // Clear all canonical flags for this group
            await MissionArea.updateMany(
                { legacyAreaId: areaId },
                { $set: { isCanonical: false } }
            );
            
            // Set the selected one as canonical
            await MissionArea.findByIdAndUpdate(
                variants[index]._id,
                { $set: { isCanonical: true } }
            );
            
            console.log(`✅ Set "${variants[index].name}" as canonical for area_id ${areaId}`);
        } else {
            console.log('❌ Invalid selection');
        }
    }
}

async function autoSelectCanonical(grouped) {
    console.log('\n' + '='.repeat(70));
    console.log('AUTO-SELECTING CANONICAL NAMES');
    console.log('='.repeat(70) + '\n');
    console.log('Strategy: Select the first alphabetically sorted spelling for each area_id\n');

    const confirmation = await question('This will update all area groups. Continue? (yes/no): ');
    if (confirmation.toLowerCase() !== 'yes') {
        console.log('❌ Cancelled');
        return;
    }

    let updated = 0;
    for (const [areaId, variants] of grouped.entries()) {
        if (variants.length === 1) {
            // Single variant - mark as canonical
            await MissionArea.findByIdAndUpdate(
                variants[0]._id,
                { $set: { isCanonical: true } }
            );
            updated++;
        } else {
            // Multiple variants - clear all first
            await MissionArea.updateMany(
                { legacyAreaId: areaId },
                { $set: { isCanonical: false } }
            );
            
            // Sort alphabetically and choose first
            const sorted = [...variants].sort((a, b) => a.name.localeCompare(b.name));
            await MissionArea.findByIdAndUpdate(
                sorted[0]._id,
                { $set: { isCanonical: true } }
            );
            console.log(`✓ area_id ${areaId}: Selected "${sorted[0].name}" from ${variants.length} variants`);
            updated++;
        }
    }

    console.log(`\n✅ Updated ${updated} area groups`);
}

async function generateReport(grouped, noAreaId) {
    console.log('\n' + '='.repeat(70));
    console.log('AREA NORMALIZATION REPORT');
    console.log('='.repeat(70) + '\n');

    console.log('SUMMARY:');
    console.log(`  Total area_id groups: ${grouped.size}`);
    console.log(`  Variants without area_id: ${noAreaId.length}\n`);

    console.log('GROUPS NEEDING NORMALIZATION (multiple spellings):\n');
    const multipleSpellings = Array.from(grouped.entries())
        .filter(([_, variants]) => variants.length > 1)
        .sort((a, b) => b[1].length - a[1].length);

    multipleSpellings.forEach(([areaId, variants]) => {
        console.log(`  area_id ${areaId} (${variants.length} variants):`);
        variants.forEach(v => {
            const isCanonical = v.isCanonical ? ' ⭐' : '';
            console.log(`    • "${v.name}" (a_id: ${v.legacyAId})${isCanonical}`);
        });
        console.log('');
    });

    if (noAreaId.length > 0) {
        console.log('\nVARIANTS WITHOUT area_id (need manual mapping):');
        noAreaId.slice(0, 20).forEach(area => {
            console.log(`  • "${area.name}" (a_id: ${area.legacyAId})`);
        });
        if (noAreaId.length > 20) {
            console.log(`  ... and ${noAreaId.length - 20} more`);
        }
    }
}

async function markSpecificCanonical() {
    const aId = await question('\nEnter a_id to mark as canonical: ');
    const area = await MissionArea.findOne({ legacyAId: aId.trim() });
    
    if (!area) {
        console.log('❌ Area not found with a_id:', aId);
        return;
    }

    if (!area.legacyAreaId) {
        console.log('⚠️  This area has no area_id - cannot set as canonical');
        return;
    }

    // Clear all canonical flags for this area_id group
    await MissionArea.updateMany(
        { legacyAreaId: area.legacyAreaId },
        { $set: { isCanonical: false } }
    );

    // Set this one as canonical
    await MissionArea.findByIdAndUpdate(
        area._id,
        { $set: { isCanonical: true } }
    );

    console.log(`✅ Marked "${area.name}" (a_id: ${aId}) as canonical for area_id ${area.legacyAreaId}`);
}

async function clearCanonical() {
    const confirmation = await question('\nThis will clear all canonical flags. Continue? (yes/no): ');
    if (confirmation.toLowerCase() !== 'yes') {
        console.log('❌ Cancelled');
        return;
    }

    const result = await MissionArea.updateMany(
        {},
        { $set: { isCanonical: false } }
    );

    console.log(`✅ Cleared canonical flag from ${result.modifiedCount} areas`);
}

// Run the tool
normalizeAreas();
