require('dotenv').config();
const mongoose = require('mongoose');

const seedPartnerSchema = new mongoose.Schema({}, { collection: 'seedpartners', strict: false });
const SeedPartner = mongoose.model('SeedPartner', seedPartnerSchema);

async function checkAnniesSeeds() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB\n');

    // Find Annie's Heirloom Seeds
    const partner = await SeedPartner.findOne({ 
      companyName: /Annie.*Heirloom/i 
    });

    if (!partner) {
      console.log('❌ Annie\'s Heirloom Seeds not found in database');
      await mongoose.connection.close();
      process.exit(1);
      return;
    }

    console.log('='.repeat(80));
    console.log('📋 ANNIE\'S HEIRLOOM SEEDS - FULL RECORD');
    console.log('='.repeat(80));
    console.log('\nBASIC INFO:');
    console.log(`Company Name: ${partner.companyName}`);
    console.log(`Partner Code: ${partner.partnerCode}`);
    console.log(`Status: ${partner.status}`);
    console.log(`Country: ${partner.country}`);
    console.log(`State: ${partner.state}`);
    console.log(`State Code: ${partner.stateCode}`);
    console.log(`City: ${partner.city}`);

    console.log('\nCONTACT INFORMATION:');
    console.log(`Website: ${partner.website || '❌ MISSING'}`);
    console.log(`Catalog URL: ${partner.catalogUrl || '❌ MISSING'}`);
    console.log(`Email: ${partner.email || '❌ MISSING'}`);
    console.log(`Phone: ${partner.phone || '❌ MISSING'}`);
    console.log(`Address: ${partner.address || '❌ MISSING'}`);
    console.log(`Zip Code: ${partner.zipCode || '❌ MISSING'}`);
    console.log(`Contact Person: ${partner.contactPerson || '❌ MISSING'}`);

    console.log('\nOTHER FIELDS:');
    console.log(`Partnership Type: ${partner.partnershipType}`);
    console.log(`Is Domestic: ${partner.isDomestic}`);
    console.log(`Is Active: ${partner.isActive}`);
    console.log(`Priority: ${partner.priority}`);

    console.log('\n' + '='.repeat(80));
    console.log('RAW DOCUMENT (JSON):');
    console.log('='.repeat(80));
    console.log(JSON.stringify(partner.toObject(), null, 2));

    await mongoose.connection.close();
    process.exit(0);

  } catch (error) {
    console.error('❌ Fatal error:', error);
    await mongoose.connection.close();
    process.exit(1);
  }
}

checkAnniesSeeds();
