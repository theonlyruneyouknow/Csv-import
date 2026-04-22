require('dotenv').config();
const mongoose = require('mongoose');

const seedPartnerSchema = new mongoose.Schema({
  companyName: String,
  partnerCode: String,
  isDomestic: Boolean,
  country: String,
  state: String,
  stateCode: String,
  status: String,
  isActive: Boolean,
  partnershipType: String,
  createdAt: Date
}, { collection: 'seedpartners', strict: false });

const SeedPartner = mongoose.model('SeedPartner', seedPartnerSchema);

async function checkPartnerStatuses() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB\n');

    const usPartners = await SeedPartner.find({ country: 'United States' })
      .sort({ stateCode: 1, companyName: 1 })
      .select('companyName partnerCode stateCode status isActive partnershipType createdAt');

    console.log('='.repeat(80));
    console.log('🔍 DOMESTIC PARTNER STATUS AUDIT');
    console.log('='.repeat(80));
    console.log('\n📋 ALL US PARTNERS WITH STATUS FIELDS:\n');

    usPartners.forEach((partner, index) => {
      const statusDisplay = partner.status || 'NOT SET';
      const isActiveDisplay = partner.isActive === true ? 'true' : partner.isActive === false ? 'false' : 'NOT SET';
      const partnershipType = partner.partnershipType || 'NOT SET';
      
      console.log(`${(index + 1).toString().padStart(2)}. ${partner.companyName.padEnd(50)} | ${partner.stateCode || 'N/A'}`);
      console.log(`    Status: ${statusDisplay.padEnd(20)} | isActive: ${isActiveDisplay.padEnd(8)} | Type: ${partnershipType}`);
      console.log('');
    });

    // Summary by status
    console.log('='.repeat(80));
    console.log('📊 SUMMARY BY STATUS:');
    console.log('='.repeat(80));
    
    const statusCounts = await SeedPartner.aggregate([
      { $match: { country: 'United States' } },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 },
          companies: { $push: '$companyName' }
        }
      },
      { $sort: { _id: 1 } }
    ]);

    statusCounts.forEach(status => {
      const statusLabel = status._id || 'NOT SET';
      console.log(`\n${statusLabel}: ${status.count} partners`);
      status.companies.forEach(company => {
        console.log(`   • ${company}`);
      });
    });

    // isActive field summary
    console.log('\n' + '='.repeat(80));
    console.log('📊 SUMMARY BY isActive FLAG:');
    console.log('='.repeat(80));
    
    const activeCounts = await SeedPartner.aggregate([
      { $match: { country: 'United States' } },
      {
        $group: {
          _id: '$isActive',
          count: { $sum: 1 },
          companies: { $push: '$companyName' }
        }
      },
      { $sort: { _id: 1 } }
    ]);

    activeCounts.forEach(active => {
      const activeLabel = active._id === true ? 'true' : active._id === false ? 'false' : 'NOT SET';
      console.log(`\nisActive=${activeLabel}: ${active.count} partners`);
      active.companies.forEach(company => {
        console.log(`   • ${company}`);
      });
    });

    // Partnership Type summary
    console.log('\n' + '='.repeat(80));
    console.log('📊 SUMMARY BY PARTNERSHIP TYPE:');
    console.log('='.repeat(80));
    
    const typeCounts = await SeedPartner.aggregate([
      { $match: { country: 'United States' } },
      {
        $group: {
          _id: '$partnershipType',
          count: { $sum: 1 },
          companies: { $push: '$companyName' }
        }
      },
      { $sort: { _id: 1 } }
    ]);

    typeCounts.forEach(type => {
      const typeLabel = type._id || 'NOT SET';
      console.log(`\n${typeLabel}: ${type.count} partners`);
      type.companies.forEach(company => {
        console.log(`   • ${company}`);
      });
    });

    console.log('\n' + '='.repeat(80));
    console.log('💡 FIELD EXPLANATIONS:');
    console.log('='.repeat(80));
    console.log('\n1. STATUS FIELD (partnership lifecycle):');
    console.log('   • Prospective: Potential partner, not yet contacted');
    console.log('   • Active: Currently working relationship');
    console.log('   • On Hold: Temporarily paused');
    console.log('   • Inactive: Was active, now dormant');
    console.log('   • Terminated: Relationship ended');
    console.log('   • Non-Alternative: Researched but decided not to pursue');
    
    console.log('\n2. isActive FLAG (record status):');
    console.log('   • true: Record is active in system');
    console.log('   • false: Record is archived/soft-deleted');
    
    console.log('\n3. PARTNERSHIP TYPE:');
    console.log('   • Domestic Supplier: US company we might source seeds from');
    console.log('   • International Supplier: Foreign company we source from');
    console.log('   • Domestic Client: US company we sell to');
    console.log('   • International Client: Foreign company we sell to');
    console.log('   • Both Supplier & Client: Two-way relationship');

    console.log('\n' + '='.repeat(80));
    console.log('⚠️  ISSUE IDENTIFIED:');
    console.log('='.repeat(80));
    console.log('These are newly researched POTENTIAL partners.');
    console.log('They should be:');
    console.log('   • status: "Prospective"');
    console.log('   • isActive: true');
    console.log('   • partnershipType: "Domestic Supplier"');
    console.log('\nIf any have different values, they may need correction.');

    await mongoose.connection.close();
    process.exit(0);

  } catch (error) {
    console.error('❌ Error:', error);
    await mongoose.connection.close();
    process.exit(1);
  }
}

checkPartnerStatuses();
