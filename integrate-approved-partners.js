require('dotenv').config();
const mongoose = require('mongoose');

// Staged Partners Schema (source)
const stagedPartnerSchema = new mongoose.Schema({
  companyName: { type: String, required: true },
  country: { type: String, default: 'United States' },
  region: String,
  state: String,
  stateCode: String,
  city: String,
  zipCode: String,
  seedTypes: [String],
  businessDetails: {
    website: String,
    specialties: [String],
    foundedYear: Number,
    certifications: [String],
    companySize: String
  },
  contactInfo: {
    email: String,
    phone: String,
    mailingAddress: String
  },
  reviewStatus: {
    type: String,
    enum: ['pending', 'approved', 'rejected', 'needs_info'],
    default: 'pending'
  },
  sourceVerification: {
    websiteVerified: Boolean,
    verifiedAt: Date,
    verificationMethod: String,
    verificationNotes: String
  },
  researchNotes: String,
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
}, { collection: 'stagedpartners' });

// Production Partners Schema (destination)
const seedPartnerSchema = new mongoose.Schema({
  companyName: { type: String, required: true, trim: true, unique: true },
  partnerCode: { type: String, required: true, trim: true, uppercase: true, unique: true },
  isDomestic: { type: Boolean, default: false, index: true },
  country: { type: String, required: true, default: 'United States' },
  region: { type: String, trim: true, required: true },
  state: String,
  stateCode: { type: String, uppercase: true, maxlength: 2 },
  city: { type: String, trim: true },
  zipCode: String,
  partnershipType: {
    type: String,
    enum: ['International Supplier', 'Domestic Supplier', 'International Client', 'Domestic Client', 'Both Supplier & Client'],
    required: true
  },
  status: {
    type: String,
    enum: ['Prospective', 'Active', 'On Hold', 'Inactive', 'Terminated', 'Non-Alternative'],
    default: 'Prospective'
  },
  priority: { type: Number, min: 1, max: 5, default: 3 },
  isActive: { type: Boolean, default: true },
  seedTypes: [String],
  businessDetails: {
    website: String,
    description: String,
    specialties: [String],
    foundedYear: Number,
    certifications: [String],
    companySize: String
  },
  contactInfo: {
    primaryContact: String,
    email: String,
    phone: String,
    fax: String,
    mailingAddress: String,
    shippingAddress: String
  },
  notes: String,
  sourceVerification: {
    websiteVerified: Boolean,
    verifiedAt: Date,
    verificationMethod: String,
    verificationNotes: String
  },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
}, { collection: 'seedpartners' });

const StagedPartner = mongoose.model('StagedPartner', stagedPartnerSchema);
const SeedPartner = mongoose.model('SeedPartner', seedPartnerSchema);

// Helper function to generate partner code
function generatePartnerCode(companyName, stateCode) {
  // Take first 3 letters of company name, uppercase
  const namePrefix = companyName
    .replace(/[^a-zA-Z]/g, '') // Remove non-letters
    .substring(0, 3)
    .toUpperCase()
    .padEnd(3, 'X'); // Pad if less than 3 letters

  // Add state code if available, otherwise use 'US'
  const locationSuffix = stateCode ? stateCode.toUpperCase() : 'US';

  // Add random 2-digit number to ensure uniqueness
  const randomSuffix = Math.floor(10 + Math.random() * 90);

  return `${namePrefix}-${locationSuffix}${randomSuffix}`;
}

// Main integration function
async function integrateApprovedPartners() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    // Find all approved partners in staging
    const approvedPartners = await StagedPartner.find({ reviewStatus: 'approved' });
    
    if (approvedPartners.length === 0) {
      console.log('⚠️  No approved partners found in staging to integrate.');
      return;
    }

    console.log(`\n📋 Found ${approvedPartners.length} approved partner(s) to integrate:\n`);

    let successCount = 0;
    let skipCount = 0;
    let errorCount = 0;
    const results = [];

    for (const staged of approvedPartners) {
      try {
        // Check if company already exists in production
        const existing = await SeedPartner.findOne({ companyName: staged.companyName });
        
        if (existing) {
          console.log(`   ⚠️  ${staged.companyName} already exists in production (${existing.partnerCode}). Skipping.`);
          skipCount++;
          results.push({
            company: staged.companyName,
            status: 'skipped',
            reason: 'Already in production'
          });
          continue;
        }

        // Generate unique partner code
        let partnerCode = generatePartnerCode(staged.companyName, staged.stateCode);
        let attempts = 0;
        while (await SeedPartner.findOne({ partnerCode }) && attempts < 10) {
          partnerCode = generatePartnerCode(staged.companyName, staged.stateCode);
          attempts++;
        }

        // Map staged partner to production partner
        const productionPartner = {
          companyName: staged.companyName,
          partnerCode: partnerCode,
          isDomestic: staged.country === 'United States',
          country: staged.country || 'United States',
          region: staged.region || 'United States',
          state: staged.state || '',
          stateCode: staged.stateCode || '',
          city: staged.city || '',
          zipCode: staged.zipCode || '',
          partnershipType: 'Domestic Supplier', // Default for US companies from research
          status: 'Prospective', // Start as prospective
          priority: 3, // Medium priority
          isActive: true,
          seedTypes: staged.seedTypes || ['vegetables', 'herbs', 'flowers'],
          businessDetails: {
            website: staged.businessDetails?.website || '',
            description: staged.researchNotes || '',
            specialties: staged.businessDetails?.specialties || [],
            foundedYear: staged.businessDetails?.foundedYear,
            certifications: staged.businessDetails?.certifications || [],
            companySize: staged.businessDetails?.companySize || ''
          },
          contactInfo: {
            email: staged.contactInfo?.email || '',
            phone: staged.contactInfo?.phone || '',
            mailingAddress: staged.contactInfo?.mailingAddress || ''
          },
          notes: staged.researchNotes || '',
          sourceVerification: staged.sourceVerification || {
            websiteVerified: true,
            verifiedAt: new Date(),
            verificationMethod: 'Staged partner integration',
            verificationNotes: 'Migrated from approved staging'
          },
          createdAt: staged.createdAt || new Date(),
          updatedAt: new Date()
        };

        // Create production partner
        await SeedPartner.create(productionPartner);
        
        console.log(`   ✅ ${staged.companyName} (${partnerCode}) → Production`);
        successCount++;
        results.push({
          company: staged.companyName,
          partnerCode: partnerCode,
          status: 'success',
          state: staged.stateCode || 'N/A'
        });

      } catch (error) {
        console.error(`   ❌ Error integrating ${staged.companyName}:`, error.message);
        errorCount++;
        results.push({
          company: staged.companyName,
          status: 'error',
          error: error.message
        });
      }
    }

    // Summary
    console.log('\n' + '='.repeat(60));
    console.log('📊 INTEGRATION SUMMARY');
    console.log('='.repeat(60));
    console.log(`✅ Successfully integrated: ${successCount}`);
    console.log(`⚠️  Skipped (already exist): ${skipCount}`);
    console.log(`❌ Errors: ${errorCount}`);
    console.log(`📝 Total processed: ${approvedPartners.length}`);

    // Show newly integrated companies by state
    if (successCount > 0) {
      console.log('\n📍 Newly Integrated Partners by State:');
      const byState = {};
      results.filter(r => r.status === 'success').forEach(r => {
        const state = r.state || 'Unknown';
        byState[state] = byState[state] || [];
        byState[state].push(`${r.company} (${r.partnerCode})`);
      });
      
      Object.keys(byState).sort().forEach(state => {
        console.log(`\n   ${state}:`);
        byState[state].forEach(company => {
          console.log(`      • ${company}`);
        });
      });
    }

    // Production collection stats
    const totalProduction = await SeedPartner.countDocuments();
    const domesticCount = await SeedPartner.countDocuments({ isDomestic: true });
    
    console.log('\n' + '='.repeat(60));
    console.log('🎯 PRODUCTION COLLECTION STATUS');
    console.log('='.repeat(60));
    console.log(`Total Partners: ${totalProduction}`);
    console.log(`Domestic Partners: ${domesticCount}`);
    console.log(`International Partners: ${totalProduction - domesticCount}`);

    // Staging collection remaining
    const stagingStats = await StagedPartner.aggregate([
      {
        $group: {
          _id: '$reviewStatus',
          count: { $sum: 1 }
        }
      }
    ]);

    console.log('\n📝 STAGING COLLECTION REMAINING:');
    stagingStats.forEach(stat => {
      const label = stat._id.charAt(0).toUpperCase() + stat._id.slice(1).replace('_', ' ');
      console.log(`   ${label}: ${stat.count}`);
    });

    console.log('\n👋 Integration complete!');
    await mongoose.connection.close();
    process.exit(0);

  } catch (error) {
    console.error('❌ Fatal error:', error);
    await mongoose.connection.close();
    process.exit(1);
  }
}

// Run the integration
integrateApprovedPartners();
