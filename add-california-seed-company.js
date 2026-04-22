require('dotenv').config();
const mongoose = require('mongoose');

// Schema definition
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

const StagedPartner = mongoose.model('StagedPartner', stagedPartnerSchema);

// California seed company data
const californiaCompany = {
  companyName: "Renee's Garden",
  country: "United States",
  region: "West",
  state: "California",
  stateCode: "CA",
  city: "Felton",
  zipCode: "95018",
  seedTypes: ["vegetables", "herbs", "flowers"],
  businessDetails: {
    website: "https://www.reneesgarden.com",
    specialties: [
      "International gourmet varieties",
      "Heirloom vegetables and flowers",
      "Certified Organic options",
      "Trial garden tested varieties",
      "Specialty herbs and culinary varieties",
      "Global seed sourcing from 14+ countries",
      "Beautiful watercolor seed packets with detailed growing instructions"
    ],
    foundedYear: 1998,
    certifications: [
      "Safe Seed Pledge",
      "Non-GMO",
      "USDA Certified Organic (selected varieties)",
      "Million Pollinator Garden Challenge participant"
    ],
    companySize: "Small independent company"
  },
  contactInfo: {
    email: "Contact via website form",
    phone: "1-888-880-7228",
    mailingAddress: "6060 Graham Hill Rd, Felton, CA 95018"
  },
  reviewStatus: "pending",
  sourceVerification: {
    websiteVerified: true,
    verifiedAt: new Date(),
    verificationMethod: "Comprehensive website research and contact page verification",
    verificationNotes: "Founded by Renee Shepherd, PhD from UC Santa Cruz. Company established 1998. Sources seeds from USA, Holland, Italy, England, France, Germany, Hungary, Canada, Mexico, Chile, Thailand, Japan, China and New Zealand. Maintains trial gardens in Felton, CA (West Coast) and East Coast locations. Tests ~300 new varieties annually. Author of 3 Kitchen Garden cookbooks. Strong focus on international variety selection."
  },
  researchNotes: "EXCELLENT partnership potential. Renee's Garden is an ideal candidate for European seed partnerships:\n\n" +
    "1. **Already sources internationally**: Currently imports from Italy, France, England, Germany, Hungary, and other European countries - proven international partnerships\n" +
    "2. **Quality-focused selection process**: Tests 300+ varieties annually in trial gardens, selecting only the best performers\n" +
    "3. **Home gardener expertise**: 28 years serving home gardeners specifically, not commercial growers\n" +
    "4. **Educational approach**: Detailed packet instructions, recipes, and growing guides demonstrate commitment to customer success\n" +
    "5. **Global seed sourcing experience**: Works with growers in 14+ countries worldwide\n" +
    "6. **Quality standards**: Safe Seed Pledge signatory, organic options, non-GMO commitment\n" +
    "7. **Garden-to-table philosophy**: Strong culinary focus aligns with European heirloom varieties\n" +
    "8. **Trial garden infrastructure**: Dedicated testing facilities ensure variety performance before offering to customers\n" +
    "9. **Established distribution**: National reach through retail partners and direct-to-consumer sales\n" +
    "10. **Mission alignment**: 'Seeds from around the world' perfectly matches European partnership goals\n\n" +
    "Founder Renee Shepherd's background (PhD, UC Santa Cruz educator, cookbook author) and 'garden to table' philosophy make her an ideal partner for introducing European heirloom vegetables, herbs, and flowers to American home gardeners. The company's existing relationships with European seed sources provide a proven foundation for expanding partnerships."
};

// Function to add company
async function addCaliforniaCompany() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    // Check for duplicates
    const existingCompany = await StagedPartner.findOne({
      companyName: californiaCompany.companyName
    });

    if (existingCompany) {
      console.log(`⚠️  ${californiaCompany.companyName} already exists in staging. Skipping.`);
      return;
    }

    // Add company to staging
    const newCompany = new StagedPartner(californiaCompany);
    await newCompany.save();

    console.log(`✅ Added ${californiaCompany.companyName} (${californiaCompany.city}, ${californiaCompany.stateCode}) to staging`);

  } catch (error) {
    console.error(`❌ Error adding ${californiaCompany.companyName}:`, error.message);
  }
}

// Execute and display summary
async function run() {
  try {
    await addCaliforniaCompany();

    // Summary statistics
    const summary = await StagedPartner.aggregate([
      {
        $group: {
          _id: '$reviewStatus',
          count: { $sum: 1 }
        }
      }
    ]);

    console.log('\n📊 Staging Summary:');
    summary.forEach(status => {
      const label = status._id.charAt(0).toUpperCase() + status._id.slice(1).replace('_', ' ');
      console.log(`   ${label}: ${status.count}`);
    });

    // Companies by state
    const byState = await StagedPartner.aggregate([
      {
        $match: { reviewStatus: 'pending' }
      },
      {
        $group: {
          _id: '$stateCode',
          count: { $sum: 1 }
        }
      },
      {
        $sort: { _id: 1 }
      }
    ]);

    if (byState.length > 0) {
      console.log('\n📍 Pending Companies by State:');
      byState.forEach(state => {
        console.log(`   ${state._id}: ${state.count}`);
      });
    }

    console.log('\n👋 Database connection closed');
    await mongoose.connection.close();
    process.exit(0);

  } catch (error) {
    console.error('❌ Error:', error);
    await mongoose.connection.close();
    process.exit(1);
  }
}

run();
