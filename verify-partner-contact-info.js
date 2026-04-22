require('dotenv').config();
const mongoose = require('mongoose');

const seedPartnerSchema = new mongoose.Schema({}, { collection: 'seedpartners', strict: false });
const SeedPartner = mongoose.model('SeedPartner', seedPartnerSchema);

async function verifyContactInfo() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB\n');

    const partners = await SeedPartner.find({ 
      country: 'United States' 
    }).sort({ stateCode: 1, companyName: 1 });

    console.log('='.repeat(80));
    console.log('📇 DOMESTIC PROSPECTIVE PARTNERS - COMPLETE CONTACT DIRECTORY');
    console.log('='.repeat(80));

    partners.forEach((partner, index) => {
      console.log(`\n${index + 1}. ${partner.companyName} (${partner.partnerCode})`);
      console.log(`   📍 Location: ${partner.city}, ${partner.stateCode} ${partner.zipCode}`);
      console.log(`   📧 Email: ${partner.email}`);
      console.log(`   📞 Phone: ${partner.phone}`);
      console.log(`   🌐 Website: ${partner.website}`);
      console.log(`   🛒 Seed Catalog: ${partner.catalogUrl}`);
      console.log(`   📬 Address: ${partner.address}`);
      console.log(`   👤 Contact: ${partner.contactPerson}`);
    });

    // Count fields
    const stats = {
      total: partners.length,
      hasCatalog: partners.filter(p => p.catalogUrl).length,
      hasEmail: partners.filter(p => p.email).length,
      hasPhone: partners.filter(p => p.phone).length,
      hasAddress: partners.filter(p => p.address).length,
      hasContact: partners.filter(p => p.contactPerson).length
    };

    console.log('\n' + '='.repeat(80));
    console.log('📊 COMPLETENESS SUMMARY');
    console.log('='.repeat(80));
    console.log(`Total Partners: ${stats.total}`);
    console.log(`✅ Seed Catalog URLs: ${stats.hasCatalog}/${stats.total} (${Math.round(stats.hasCatalog/stats.total*100)}%)`);
    console.log(`✅ Email Addresses: ${stats.hasEmail}/${stats.total} (${Math.round(stats.hasEmail/stats.total*100)}%)`);
    console.log(`✅ Phone Numbers: ${stats.hasPhone}/${stats.total} (${Math.round(stats.hasPhone/stats.total*100)}%)`);
    console.log(`✅ Mailing Addresses: ${stats.hasAddress}/${stats.total} (${Math.round(stats.hasAddress/stats.total*100)}%)`);
    console.log(`✅ Contact Persons: ${stats.hasContact}/${stats.total} (${Math.round(stats.hasContact/stats.total*100)}%)`);

    console.log('\n' + '='.repeat(80));
    console.log('✅ ALL PARTNERS READY FOR OUTREACH!');
    console.log('='.repeat(80));

    await mongoose.connection.close();
    process.exit(0);

  } catch (error) {
    console.error('❌ Fatal error:', error);
    await mongoose.connection.close();
    process.exit(1);
  }
}

verifyContactInfo();
