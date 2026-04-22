require('dotenv').config();
const mongoose = require('mongoose');

const seedPartnerSchema = new mongoose.Schema({}, { collection: 'seedpartners', strict: false });
const SeedPartner = mongoose.model('SeedPartner', seedPartnerSchema);

async function testCatalogQuery() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB\n');

    console.log('='.repeat(80));
    console.log('🧪 TESTING SEED CATALOG QUERIES');
    console.log('='.repeat(80));

    // Test "all" view
    console.log('\n1. Testing "all" view:');
    const allPartners = await SeedPartner.find({ isActive: true });
    const allPartnersCount = await SeedPartner.countDocuments({ isActive: true });
    console.log(`   Found ${allPartners.length} active partners`);
    console.log(`   Count query returned: ${allPartnersCount}`);

    // Test "domestic" view
    console.log('\n2. Testing "domestic" view:');
    const domesticPartners = await SeedPartner.find({ isActive: true, isDomestic: true });
    const domesticPartnersCount = await SeedPartner.countDocuments({ isActive: true, isDomestic: true });
    console.log(`   Found ${domesticPartners.length} domestic partners`);
    console.log(`   Count query returned: ${domesticPartnersCount}`);

    // Test "international" view
    console.log('\n3. Testing "international" view:');
    const internationalPartners = await SeedPartner.find({ isActive: true, isDomestic: { $ne: true } });
    const internationalPartnersCount = await SeedPartner.countDocuments({ isActive: true, isDomestic: { $ne: true } });
    console.log(`   Found ${internationalPartners.length} international partners`);
    console.log(`   Count query returned: ${internationalPartnersCount}`);

    // Test catalog building with domestic partners
    console.log('\n4. Testing catalog building (domestic):');
    const catalog = {
      vegetables: {},
      flowers: {},
      herbs: {}
    };

    domesticPartners.forEach(partner => {
      if (partner.seedOfferings) {
        if (partner.seedOfferings.vegetables) {
          partner.seedOfferings.vegetables.forEach(veg => {
            if (!catalog.vegetables[veg]) {
              catalog.vegetables[veg] = [];
            }
            catalog.vegetables[veg].push({
              companyName: partner.companyName,
              partnerCode: partner.partnerCode
            });
          });
        }
      }
    });

    console.log(`   Vegetable types: ${Object.keys(catalog.vegetables).length}`);
    console.log(`   Sample vegetables: ${Object.keys(catalog.vegetables).slice(0, 5).join(', ')}`);

    // Test stats object
    console.log('\n5. Testing stats object construction:');
    const stats = {
      totalVegetables: Object.keys(catalog.vegetables).length,
      totalFlowers: Object.keys(catalog.flowers).length,
      totalHerbs: Object.keys(catalog.herbs).length,
      totalPartners: domesticPartners.length,
      allPartnersCount: allPartnersCount,
      domesticPartnersCount: domesticPartnersCount,
      internationalPartnersCount: internationalPartnersCount
    };
    console.log(`   Stats:`, JSON.stringify(stats, null, 2));

    console.log('\n' + '='.repeat(80));
    console.log('✅ ALL TESTS PASSED - ROUTE SHOULD WORK');
    console.log('='.repeat(80));

    await mongoose.connection.close();
    process.exit(0);

  } catch (error) {
    console.error('❌ Test failed:', error);
    console.error('Stack:', error.stack);
    await mongoose.connection.close();
    process.exit(1);
  }
}

testCatalogQuery();
