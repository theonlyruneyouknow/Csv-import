require('dotenv').config();
const mongoose = require('mongoose');
const PurchaseOrder = require('./models/PurchaseOrder');
const LineItem = require('./models/LineItem');

// SKU pattern detection rules
function detectTypeFromSKU(sku) {
    if (!sku) return null;
    
    const skuUpper = sku.toUpperCase();
    
    // Seed patterns - typically have prefixes like these
    const seedPrefixes = ['BT', 'CR', 'FL', 'RD', 'SW', 'SM', 'SQ', 'LT', 'PE', 'TO', 'PU', 'BE', 'CA', 'ME', 'AR', 'BA', 'CO', 'CU', 'EG', 'LE', 'OK', 'ON', 'PA', 'SP', 'SU', 'TU', 'WA', 'ZU'];
    
    // Check if SKU starts with common seed prefixes
    for (const prefix of seedPrefixes) {
        if (skuUpper.startsWith(prefix) && /^[A-Z]{2}\d/.test(skuUpper)) {
            return 'Seed';
        }
    }
    
    // Hardgood patterns - tools, containers, equipment
    const hardgoodKeywords = ['TOOL', 'POT', 'TRAY', 'CONTAINER', 'STAKE', 'LABEL', 'TAG', 'KNIFE', 'PRUNER', 'SHEAR', 'HOSE', 'SPRAYER', 'GLOVE', 'BAG', 'BOX', 'BASKET', 'CART'];
    if (hardgoodKeywords.some(kw => skuUpper.includes(kw))) {
        return 'Hardgood';
    }
    
    // Greengood patterns - plants, bulbs, starts
    const greengoodKeywords = ['PLANT', 'BULB', 'START', 'PLUG', 'TRANSPLANT', 'BARE ROOT', 'GRAFTED', 'ROSE', 'TREE', 'SHRUB', 'PERENNIAL', 'ANNUAL'];
    if (greengoodKeywords.some(kw => skuUpper.includes(kw))) {
        return 'Greengood';
    }
    
    // Supplies patterns - soil, amendments, packaging
    const suppliesKeywords = ['SOIL', 'MIX', 'COMPOST', 'FERTILIZER', 'AMENDMENT', 'PEAT', 'PERLITE', 'VERMICULITE', 'MULCH', 'BARK', 'PACKAGING', 'PAPER', 'PLASTIC'];
    if (suppliesKeywords.some(kw => skuUpper.includes(kw))) {
        return 'Supplies';
    }
    
    return null;
}

function detectTypeFromMemo(memo) {
    if (!memo) return null;
    
    const memoUpper = memo.toUpperCase();
    
    // Check for common vegetable/seed names
    const seedKeywords = ['CARROT', 'BEET', 'RADISH', 'LETTUCE', 'TOMATO', 'PEPPER', 'SQUASH', 'BEAN', 'PEA', 'CUCUMBER', 'MELON', 'SEED', 'ORGANIC', 'HYBRID', 'VARIETY'];
    if (seedKeywords.some(kw => memoUpper.includes(kw))) {
        return 'Seed';
    }
    
    // Hardgood keywords
    const hardgoodKeywords = ['TOOL', 'POT', 'TRAY', 'CONTAINER', 'STAKE', 'LABEL'];
    if (hardgoodKeywords.some(kw => memoUpper.includes(kw))) {
        return 'Hardgood';
    }
    
    // Greengood keywords
    const greengoodKeywords = ['PLANT', 'BULB', 'START', 'PLUG', 'ROSE', 'TREE'];
    if (greengoodKeywords.some(kw => memoUpper.includes(kw))) {
        return 'Greengood';
    }
    
    // Supplies keywords
    const suppliesKeywords = ['SOIL', 'MIX', 'COMPOST', 'FERTILIZER', 'MULCH'];
    if (suppliesKeywords.some(kw => memoUpper.includes(kw))) {
        return 'Supplies';
    }
    
    return null;
}

async function autoPopulatePOTypes() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('✅ Connected to MongoDB\n');

        // Find all POs with undefined type
        const undefinedPOs = await PurchaseOrder.find({
            $or: [
                { poType: { $nin: ['Seed', 'Hardgood', 'Greengood', 'Supplies'] } },
                { poType: null },
                { poType: { $exists: false } },
                { poType: '' }
            ]
        }).lean();

        console.log('='.repeat(80));
        console.log(`🔍 AUTO-POPULATING PO TYPES`);
        console.log('='.repeat(80));
        console.log(`Found ${undefinedPOs.length} POs to analyze\n`);

        const results = {
            Seed: [],
            Hardgood: [],
            Greengood: [],
            Supplies: [],
            Mixed: [],
            Unknown: []
        };

        let updated = 0;
        let skipped = 0;

        for (const po of undefinedPOs) {
            // Find line items for this PO
            const lineItems = await LineItem.find({ poNumber: po.poNumber }).lean();

            if (lineItems.length === 0) {
                console.log(`⚠️  ${po.poNumber}: No line items found - SKIPPED`);
                skipped++;
                continue;
            }

            // Analyze line items to determine type
            const typeVotes = { Seed: 0, Hardgood: 0, Greengood: 0, Supplies: 0 };

            for (const item of lineItems) {
                let detectedType = detectTypeFromSKU(item.sku);
                if (!detectedType) {
                    detectedType = detectTypeFromMemo(item.memo);
                }
                
                if (detectedType) {
                    typeVotes[detectedType]++;
                }
            }

            // Determine the final type based on votes
            const totalVotes = Object.values(typeVotes).reduce((a, b) => a + b, 0);
            
            if (totalVotes === 0) {
                // Could not determine type - default to Supplies
                results.Unknown.push(po.poNumber);
                console.log(`❓ ${po.poNumber}: Could not determine type (${lineItems.length} items) - Setting to Supplies as default`);
                
                await PurchaseOrder.updateOne(
                    { _id: po._id },
                    { $set: { poType: 'Supplies' } }
                );
                updated++;
                continue;
            }

            // Find the type with most votes
            const maxVotes = Math.max(...Object.values(typeVotes));
            const typesWithMaxVotes = Object.keys(typeVotes).filter(type => typeVotes[type] === maxVotes);

            let finalType;
            if (typesWithMaxVotes.length > 1) {
                // Mixed - multiple types with same votes
                // Priority: Seed > Greengood > Hardgood > Supplies
                if (typesWithMaxVotes.includes('Seed')) {
                    finalType = 'Seed';
                } else if (typesWithMaxVotes.includes('Greengood')) {
                    finalType = 'Greengood';
                } else if (typesWithMaxVotes.includes('Hardgood')) {
                    finalType = 'Hardgood';
                } else {
                    finalType = 'Supplies';
                }
                results.Mixed.push(`${po.poNumber} (${Object.entries(typeVotes).filter(([_, v]) => v > 0).map(([k, v]) => `${k}:${v}`).join(', ')})`);
                console.log(`🔀 ${po.poNumber}: Mixed types - ${Object.entries(typeVotes).filter(([_, v]) => v > 0).map(([k, v]) => `${k}:${v}`).join(', ')} - Setting to ${finalType}`);
            } else {
                finalType = typesWithMaxVotes[0];
                results[finalType].push(po.poNumber);
                console.log(`✅ ${po.poNumber}: ${finalType} (${typeVotes[finalType]}/${lineItems.length} items match)`);
            }

            // Update the PO
            await PurchaseOrder.updateOne(
                { _id: po._id },
                { $set: { poType: finalType } }
            );
            updated++;
        }

        console.log('\n' + '='.repeat(80));
        console.log('📊 SUMMARY');
        console.log('='.repeat(80));
        console.log(`Total POs processed: ${undefinedPOs.length}`);
        console.log(`Successfully updated: ${updated}`);
        console.log(`Skipped (no line items): ${skipped}`);
        console.log('');
        console.log(`Seed: ${results.Seed.length} POs`);
        console.log(`Hardgood: ${results.Hardgood.length} POs`);
        console.log(`Greengood: ${results.Greengood.length} POs`);
        console.log(`Supplies: ${results.Supplies.length + results.Unknown.length} POs (${results.Unknown.length} unknown defaulted to Supplies)`);
        console.log(`Mixed types: ${results.Mixed.length} POs`);

        if (results.Mixed.length > 0) {
            console.log('\n📋 Mixed Type POs:');
            results.Mixed.forEach(po => console.log(`   ${po}`));
        }

        if (results.Unknown.length > 0) {
            console.log('\n❓ Unknown Type POs (defaulted to Supplies):');
            results.Unknown.slice(0, 20).forEach(po => console.log(`   ${po}`));
            if (results.Unknown.length > 20) {
                console.log(`   ... and ${results.Unknown.length - 20} more`);
            }
        }

        console.log('\n' + '='.repeat(80));

    } catch (error) {
        console.error('❌ Error:', error);
    } finally {
        await mongoose.disconnect();
        console.log('\n✅ Disconnected from MongoDB');
    }
}

autoPopulatePOTypes();
