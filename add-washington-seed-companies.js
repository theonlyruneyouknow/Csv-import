require('dotenv').config();
const mongoose = require('mongoose');

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
    certifications: [String]
  },
  contactInfo: {
    email: String,
    phone: String,
    mailingAddress: String
  },
  reviewStatus: {
    type: String,
    enum: ['pending', 'approved', 'rejected', 'needs-info'],
    default: 'pending'
  },
  sourceVerification: {
    websiteVerified: Boolean,
    verifiedAt: Date,
    verificationMethod: String,
    verificationNotes: String
  },
  researchNotes: String,
  addedAt: { type: Date, default: Date.now }
});

const StagedPartner = mongoose.model('StagedPartner', stagedPartnerSchema, 'stagedpartners');

const washingtonCompanies = [
  {
    companyName: "Osborne Quality Seeds",
    country: "United States",
    region: "Pacific Northwest",
    state: "Washington",
    stateCode: "WA",
    city: "Mount Vernon",
    zipCode: "98273",
    seedTypes: ["vegetables", "herbs", "flowers"],
    businessDetails: {
      website: "https://www.osborneseed.com",
      specialties: [
        "Hybrid and open-pollinated varieties",
        "Organic seeds",
        "Microgreens",
        "Cover crops",
        "Treated, untreated, and pelleted seed forms"
      ],
      foundedYear: 1984,
      certifications: ["Organic", "GMO-free for 40+ years"]
    },
    contactInfo: {
      email: "orders@osborneseed.com",
      phone: "(360) 424-7333",
      mailingAddress: "PO Box 1647, Mount Vernon, WA 98273"
    },
    reviewStatus: "pending",
    sourceVerification: {
      websiteVerified: true,
      verifiedAt: new Date(),
      verificationMethod: "Website research and customer review verification",
      verificationNotes: "Family-owned seed company serving farmers and professional growers for 40+ years. Located in Washington's Skagit Valley. Customer rating: 4.61/5 stars from 355 reviews. Extensive testimonials show strong customer satisfaction. Offers comprehensive catalog of vegetables, flowers, herbs, microgreens, and cover crops. Ships across US and Canada. Team includes Tim Terpstra. 2026 catalog available."
    },
    researchNotes: "Excellent partnership potential. Established business (40+ years) with strong reputation serving both farmers and home growers. Currently offers hybrid and open-pollinated varieties with organic options. Would benefit from expanded European heirloom variety offerings. Strong customer base demonstrates market demand. Geographic location in Pacific Northwest provides unique growing conditions and market access."
  },
  {
    companyName: "Uprising Seeds",
    country: "United States",
    region: "Pacific Northwest",
    state: "Washington",
    stateCode: "WA",
    city: "Bellingham",
    zipCode: "98229",
    seedTypes: ["vegetables", "herbs", "flowers"],
    businessDetails: {
      website: "https://www.uprisingorganics.com",
      specialties: [
        "Certified organic seeds",
        "Open-pollinated varieties only",
        "Pacific Northwest-grown seed",
        "Italian varieties (Gusto Italiano Project)",
        "Chicory and radicchio specialists",
        "Breeding program and variety improvement",
        "Specialty cut flowers"
      ],
      foundedYear: 2005,
      certifications: ["USDA Certified Organic"]
    },
    contactInfo: {
      email: "info@uprisingorganics.com",
      phone: "(360) 778-3749",
      mailingAddress: "1501 Fraser St. Suite 105, Bellingham, WA 98229"
    },
    reviewStatus: "pending",
    sourceVerification: {
      websiteVerified: true,
      verifiedAt: new Date(),
      verificationMethod: "Website research and certification verification",
      verificationNotes: "Celebrating 20th year (founded ~2005). Family operation with team: Brian, Crystine, Rio, Bre, Jesse, Peter + farm kids Rowan and Meira. USDA Certified Organic (certificate UO25.pdf verified). Customer rating: 5.0/5 stars. Focus on 'vegetable varieties with a focus on culinary qualities and food traditions from around the world.' Trialed, grown, and selected in organic field cropping systems. Partnership with Smarties.Bio in Northern Italy for chicory/radicchio. 10 new varieties for 2026 including longkeeper tomatoes. Active breeding work."
    },
    researchNotes: "EXCELLENT partnership potential - demonstrates strong interest in international collaboration (already partners with Italian company Smarties.Bio). 20-year certified organic operation with breeding program shows commitment to quality and innovation. Specialty focus on Italian varieties and culinary traditions indicates openness to European seed offerings. Family-owned with hands-on farming and breeding work. Pacific Northwest regional focus provides market differentiation. Ideal candidate for expanding European vegetable and herb varieties."
  }
];

async function addWashingtonCompanies() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    let addedCount = 0;
    let skippedCount = 0;

    for (const company of washingtonCompanies) {
      const existing = await StagedPartner.findOne({ 
        companyName: company.companyName 
      });

      if (existing) {
        console.log(`⚠️  Skipped ${company.companyName} (already in staging)`);
        skippedCount++;
      } else {
        await StagedPartner.create(company);
        console.log(`✅ Added ${company.companyName} (${company.city}, ${company.stateCode}) to staging`);
        addedCount++;
      }
    }

    // Get summary stats
    const stats = await StagedPartner.aggregate([
      {
        $group: {
          _id: '$reviewStatus',
          count: { $sum: 1 }
        }
      }
    ]);

    const summary = stats.reduce((acc, stat) => {
      acc[stat._id] = stat.count;
      return acc;
    }, {});

    console.log('\n✨ Complete! Added', addedCount, 'companies, skipped', skippedCount, 'duplicates.');
    console.log('\n📊 Staging Summary:');
    console.log(`   Pending Review: ${summary.pending || 0}`);
    console.log(`   Needs Info: ${summary['needs-info'] || 0}`);
    console.log(`   Approved: ${summary.approved || 0}`);
    console.log(`   Rejected: ${summary.rejected || 0}`);

    // Geographic breakdown
    const geoStats = await StagedPartner.aggregate([
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
        $sort: { count: -1 }
      }
    ]);

    console.log('\n📍 Pending Companies by State:');
    geoStats.forEach(stat => {
      console.log(`   ${stat._id}: ${stat.count}`);
    });

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await mongoose.connection.close();
    console.log('\n👋 Database connection closed');
  }
}

addWashingtonCompanies();
