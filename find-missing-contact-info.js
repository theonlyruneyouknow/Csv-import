require('dotenv').config();
const mongoose = require('mongoose');

const seedPartnerSchema = new mongoose.Schema({}, { collection: 'seedpartners', strict: false });
const SeedPartner = mongoose.model('SeedPartner', seedPartnerSchema);

async function findMissingContactInfo() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB\n');

    const partners = await SeedPartner.find({ 
      country: 'United States' 
    }).sort({ companyName: 1 });

    console.log('='.repeat(80));
    console.log('🔍 CHECKING FOR MISSING CONTACT INFORMATION');
    console.log('='.repeat(80));

    const missingInfo = [];

    partners.forEach((partner, index) => {
      const missing = [];
      
      if (!partner.catalogUrl) missing.push('catalogUrl');
      if (!partner.email) missing.push('email');
      if (!partner.phone) missing.push('phone');
      if (!partner.address) missing.push('address');
      if (!partner.contactPerson) missing.push('contactPerson');
      if (!partner.website) missing.push('website');

      if (missing.length > 0) {
        missingInfo.push({
          name: partner.companyName,
          code: partner.partnerCode,
          missing: missing
        });
        
        console.log(`\n❌ ${partner.companyName} (${partner.partnerCode})`);
        console.log(`   Missing fields: ${missing.join(', ')}`);
        console.log(`   Current data:`);
        console.log(`     Website: ${partner.website || '❌ MISSING'}`);
        console.log(`     Catalog: ${partner.catalogUrl || '❌ MISSING'}`);
        console.log(`     Email: ${partner.email || '❌ MISSING'}`);
        console.log(`     Phone: ${partner.phone || '❌ MISSING'}`);
        console.log(`     Address: ${partner.address || '❌ MISSING'}`);
        console.log(`     Contact: ${partner.contactPerson || '❌ MISSING'}`);
      }
    });

    console.log('\n' + '='.repeat(80));
    console.log('📊 SUMMARY');
    console.log('='.repeat(80));
    console.log(`Total Partners: ${partners.length}`);
    console.log(`Partners with missing info: ${missingInfo.length}`);
    console.log(`Partners with complete info: ${partners.length - missingInfo.length}`);

    if (missingInfo.length === 0) {
      console.log('\n✅ All partners have complete contact information!');
    } else {
      console.log('\n⚠️  The following partners need contact information:');
      missingInfo.forEach(p => {
        console.log(`   • ${p.name} (${p.code}) - Missing: ${p.missing.join(', ')}`);
      });
    }

    await mongoose.connection.close();
    process.exit(0);

  } catch (error) {
    console.error('❌ Fatal error:', error);
    await mongoose.connection.close();
    process.exit(1);
  }
}

findMissingContactInfo();
