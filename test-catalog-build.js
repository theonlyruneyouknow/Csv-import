// Test the catalog building logic
const mongoose = require('mongoose');
require('dotenv').config();

async function testCatalog() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('✅ Connected\n');

        const USSeedPartner = require('./models/USSeedPartner');

        // Get all partners
        const partners = await USSeedPartner.find({});
        console.log(`📊 Found ${partners.length} partners\n`);

        // Build catalog (same logic as route)
        const catalog = {
            vegetables: {},
            flowers: {},
            herbs: {}
        };

        partners.forEach(partner => {
            if (partner.seedOfferings) {
                // Vegetables
                if (partner.seedOfferings.vegetables) {
                    partner.seedOfferings.vegetables.forEach(veg => {
                        if (!catalog.vegetables[veg]) {
                            catalog.vegetables[veg] = [];
                        }
                        catalog.vegetables[veg].push({
                            companyName: partner.companyName,
                            state: partner.state
                        });
                    });
                }

                // Flowers
                if (partner.seedOfferings.flowers) {
                    partner.seedOfferings.flowers.forEach(flower => {
                        if (!catalog.flowers[flower]) {
                            catalog.flowers[flower] = [];
                        }
                        catalog.flowers[flower].push({
                            companyName: partner.companyName,
                            state: partner.state
                        });
                    });
                }

                // Herbs
                if (partner.seedOfferings.herbs) {
                    partner.seedOfferings.herbs.forEach(herb => {
                        if (!catalog.herbs[herb]) {
                            catalog.herbs[herb] = [];
                        }
                        catalog.herbs[herb].push({
                            companyName: partner.companyName,
                            state: partner.state
                        });
                    });
                }
            }
        });

        const stats = {
            vegetables: Object.keys(catalog.vegetables).length,
            flowers: Object.keys(catalog.flowers).length,
            herbs: Object.keys(catalog.herbs).length
        };

        console.log('📊 Catalog Statistics:');
        console.log(`   Vegetables: ${stats.vegetables} types`);
        console.log(`   Flowers: ${stats.flowers} types`);
        console.log(`   Herbs: ${stats.herbs} types\n`);

        // Show sample vegetables
        const vegTypes = Object.keys(catalog.vegetables).sort();
        console.log(`🥕 Sample Vegetables (first 10):`);
        vegTypes.slice(0, 10).forEach(veg => {
            console.log(`   ${veg}: ${catalog.vegetables[veg].length} partners`);
        });

        // Show sample flowers
        const flowerTypes = Object.keys(catalog.flowers).sort();
        console.log(`\n🌸 Sample Flowers (first 10):`);
        flowerTypes.slice(0, 10).forEach(flower => {
            console.log(`   ${flower}: ${catalog.flowers[flower].length} partners`);
        });

        // Show sample herbs
        const herbTypes = Object.keys(catalog.herbs).sort();
        console.log(`\n🌿 Sample Herbs (all):`);
        herbTypes.forEach(herb => {
            console.log(`   ${herb}: ${catalog.herbs[herb].length} partners`);
        });

        // Check if data structure is correct
        console.log(`\n🔍 Data Validation:`);
        const samplePartner = partners[0];
        console.log(`   Partner: ${samplePartner.companyName}`);
        console.log(`   Has seedOfferings: ${!!samplePartner.seedOfferings}`);
        console.log(`   Vegetables array: ${samplePartner.seedOfferings?.vegetables?.length || 0}`);
        console.log(`   Flowers array: ${samplePartner.seedOfferings?.flowers?.length || 0}`);
        console.log(`   Herbs array: ${samplePartner.seedOfferings?.herbs?.length || 0}`);

    } catch (error) {
        console.error('❌ Error:', error);
    } finally {
        await mongoose.disconnect();
    }
}

testCatalog();
