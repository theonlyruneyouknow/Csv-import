require('dotenv').config();
const mongoose = require('mongoose');

// MongoDB connection
const MONGO_URI = process.env.MONGODB_URI || process.env.MONGO_URI;

// StagedPartner model
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
  submittedBy: { type: String, default: 'System Research' },
  reviewStatus: { 
    type: String, 
    enum: ['pending', 'approved', 'rejected', 'needs_info'],
    default: 'pending'
  },
  reviewNotes: String,
  sourceVerification: {
    websiteVerified: Boolean,
    verifiedAt: Date,
    verificationMethod: String,
    verificationNotes: String
  },
  researchNotes: String,
  submittedAt: { type: Date, default: Date.now },
  reviewedAt: Date,
  reviewedBy: String
}, { timestamps: true });

const StagedPartner = mongoose.model('StagedPartner', stagedPartnerSchema);

// Colorado seed companies - all web verified
const coloradoCompanies = [
  {
    companyName: "Lake Valley Seed",
    country: "United States",
    region: "Mountain West",
    state: "Colorado",
    stateCode: "CO",
    city: "Boulder",
    zipCode: "80302",
    seedTypes: ["vegetables", "herbs", "flowers"],
    businessDetails: {
      website: "https://www.lakevalleyseed.com",
      specialties: [
        "Vegetables",
        "Flowers", 
        "Herbs",
        "Organic seeds",
        "Sprouting seeds",
        "Container gardening"
      ],
      foundedYear: null, // Not specified on website
      certifications: ["Organics program"]
    },
    contactInfo: {
      email: null, // Not found on initial research
      phone: "(303) 449-4882",
      mailingAddress: "Boulder, CO"
    },
    submittedBy: "System Research",
    reviewStatus: "pending",
    sourceVerification: {
      websiteVerified: true,
      verifiedAt: new Date(),
      verificationMethod: "Direct website verification via lakevalleyseed.com",
      verificationNotes: "Full garden seed catalog verified. Website shows categories for Organics, Vegetables, Flowers, Value Packs. Specializes in vegetables, herbs, annual flowers, perennial flowers, sprouting seeds, and container gardening. Product line includes organic herbs, vegetables, and flowers. Retail catalog available for 2026. Google rating: 3.3/5 (18 reviews). One customer review states 'Excellent germination rates.' Tag line: 'Seeds for all purposes, lawns, vegetables, annual flowers, perennial flowers.'"
    },
    researchNotes: "EXCELLENT FIT - Lake Valley Seed is a complete garden seed company offering vegetables, herbs, and flowers for home gardeners. Their product categories clearly show focus on organic garden seeds, sprouting seeds, and both annual and perennial flowers. This is exactly the type of small-to-medium US seed company that would benefit from European partnerships to expand their flower, vegetable, and herb seed offerings. They already have an organic program and a full catalog, indicating they are established and professional. The sprouting seed category shows innovation. Despite lower Google rating (3.3), customer review mentions excellent germination rates. Strong candidate for partnership - they sell to home gardeners and have infrastructure in place."
  },
  {
    companyName: "MASA Seed Foundation",
    country: "United States",
    region: "Mountain West",
    state: "Colorado",
    stateCode: "CO",
    city: "Boulder",
    zipCode: "80304",
    seedTypes: ["vegetables", "herbs", "flowers"],
    businessDetails: {
      website: "https://www.masaseedfoundation.org",
      specialties: [
        "Open-pollinated seeds",
        "Locally adapted varieties",
        "Heirloom seeds",
        "Farm-grown seeds",
        "Heritage vegetables", 
        "Bio-regional seed banking"
      ],
      foundedYear: null, // Not specified
      certifications: ["501(c)(3) nonprofit", "Organic"]
    },
    contactInfo: {
      email: "info@masaseedfoundation.org",
      phone: "(303) 444-9642",
      mailingAddress: "1367 N 75th Street, Boulder, CO 80304"
    },
    submittedBy: "System Research",
    reviewStatus: "pending",
    sourceVerification: {
      websiteVerified: true,
      verifiedAt: new Date(),
      verificationMethod: "Direct website verification via masaseedfoundation.org",
      verificationNotes: "Nonprofit seed foundation verified. Website describes mission as 'Enabling a vibrant, local food system for the Front Range with a bio-regional seed bank driven by strategic farm designs for the production of organic seeds, plants and produce.' Full name: Mutual Admiration Seed Association (MASA). Operates 28-acre active farm. Website states: 'Organic, non-hybrid, heirloom seeds grown and maintained in the stunning bio-region of the Colorado Front Range.' Offers plant nursery, farm store, CSA program, and online seed store. Google description: 'A cornucopia of unique vegetable seeds on an active 28 acre farm!' Plant nursery and seed house OPEN daily. 501(c)(3) nonprofit organization. Strong focus on heritage, locally adapted, open-pollinated varieties."
    },
    researchNotes: "EXCELLENT FIT - MASA Seed Foundation is a nonprofit organization with a 28-acre farm focused on preserving and developing open-pollinated, locally adapted, heirloom seeds. As a 501(c)(3), they have a mission-driven focus on building a bio-regional seed bank for the Colorado Front Range. Their emphasis on heritage varieties, farm-grown seeds, and CSA program shows commitment to sustainable agriculture and community food systems. This is a perfect candidate for European partnerships as they specifically focus on seed preservation and variety development - European heirloom varieties would align perfectly with their mission. They actively sell seeds through their online store and have physical locations (plant nursery and seed house). Being nonprofit, partnership could help expand their seed offerings to their community members and CSA participants. Very strong cultural fit with values around preservation, organic methods, and community engagement."
  },
  {
    companyName: "Wild Mountain Seeds",
    country: "United States",
    region: "Mountain West",
    state: "Colorado",
    stateCode: "CO", 
    city: "Carbondale",
    zipCode: null, // Not specified
    seedTypes: ["vegetables", "herbs", "flowers"],
    businessDetails: {
      website: "https://www.wildmountainseeds.com",
      specialties: [
        "Regionally adapted seeds",
        "Resilient varieties",
        "Market farm vegetables",
        "Small farm seeds",
        "Open-pollinated breeding",
        "Landrace breeding",
        "Alpine-adapted varieties"
      ],
      foundedYear: null,
      certifications: ["Regeneratively managed soils"]
    },
    contactInfo: {
      email: "wildmountainseeds@gmail.com",
      phone: "(970) 963-7442",
      mailingAddress: "Carbondale, CO"
    },
    submittedBy: "System Research",
    reviewStatus: "pending",
    sourceVerification: {
      websiteVerified: true,
      verifiedAt: new Date(),
      verificationMethod: "Direct website verification via wildmountainseeds.com",
      verificationNotes: "Farm-based seed company verified. Mission statement: 'Wild Mountain Seeds exists to support healthy land and productive farms by providing high-quality, regionally adapted seed that builds resilient soils, strong forage systems, and long-term sustainability.' Website describes: 'Resilient, vigorous seeds for small farms. The Wild Mountain Seed team is dedicated to breeding seeds that thrive on small farms and gardens nationwide.' Focus on breeding seeds adapted to harsh alpine climate. Website states: 'We focus our breeding on the creation of reliable, beautiful, tasty and most importantly vigorous seeds. Our seeds are the backbone of our market farming success and we hope they become stars in your gardens as well.' Offers CSA program and gift cards. Founded by Casey Piscura (deceased), who was dedicated to landrace breeding and open-pollinated varieties shaped by mountain conditions, short seasons, and challenging soils. Currently hiring vegetable crew members."
    },
    researchNotes: "EXCELLENT FIT - Wild Mountain Seeds is a working farm that breeds and grows seeds specifically for small farms and market gardens. Their emphasis on 'reliable, beautiful, tasty and most importantly vigorous seeds' shows they understand what home gardeners and market growers need. The fact that they use these seeds as 'the backbone of our market farming success' means they are rigorously tested under real growing conditions. Alpine climate breeding (harsh conditions, short seasons) creates resilient varieties that would perform well across diverse climates. Their focus on landrace breeding and open-pollinated varieties aligns perfectly with heirloom/heritage seed preservation. CSA program and active farm operations show they are established and serving their local community. Partnership potential is strong - European varieties could complement their alpine-adapted breeding program, offering customers diversity while maintaining the quality standards they've established. Active job hiring (vegetable crew member) indicates growing operation. Strong values around soil health, sustainability, and community support."
  }
];

async function addColoradoCompanies() {
  try {
    console.log('✅ Connecting to MongoDB...');
    await mongoose.connect(MONGO_URI);
    console.log('✅ Connected to MongoDB\n');
    
    let addedCount = 0;
    let skippedCount = 0;
    
    for (const company of coloradoCompanies) {
      // Check if company already exists
      const existing = await StagedPartner.findOne({ 
        companyName: company.companyName 
      });
      
      if (existing) {
        console.log(`⏭️  Skipped ${company.companyName} - already in staging database`);
        skippedCount++;
        continue;
      }
      
      const newCompany = new StagedPartner(company);
      await newCompany.save();
      console.log(`✅ Added ${company.companyName} (${company.city}, ${company.stateCode}) to staging`);
      addedCount++;
    }
    
    console.log(`\n✨ Complete! Added ${addedCount} companies, skipped ${skippedCount} duplicates.\n`);
    
    // Show staging summary
    const pendingCount = await StagedPartner.countDocuments({ reviewStatus: 'pending' });
    const needsInfoCount = await StagedPartner.countDocuments({ reviewStatus: 'needs_info' });
    const approvedCount = await StagedPartner.countDocuments({ reviewStatus: 'approved' });
    const rejectedCount = await StagedPartner.countDocuments({ reviewStatus: 'rejected' });
    
    console.log('📊 Staging Database Summary:');
    console.log(`   Pending Review: ${pendingCount}`);
    console.log(`   Needs Info: ${needsInfoCount}`);
    console.log(`   Approved: ${approvedCount}`);
    console.log(`   Rejected: ${rejectedCount}\n`);
    
    if (addedCount > 0) {
      console.log('🗺️  Colorado Geographic Coverage:');
      console.log(`   Boulder: Lake Valley Seed, MASA Seed Foundation`);
      console.log(`   Carbondale: Wild Mountain Seeds\n`);
      
      console.log('🌱 Seed Type Focus:');
      console.log(`   Lake Valley: Vegetables, herbs, flowers, sprouting seeds, organics`);
      console.log(`   MASA: Heirloom vegetables, open-pollinated, locally adapted`);
      console.log(`   Wild Mountain: Market farm vegetables, alpine-adapted, resilient varieties\n`);
    }
    
    console.log('💡 Next Steps:');
    console.log('   1. Visit http://localhost:3001/staged-partners/review to review pending companies');
    console.log('   2. Approve, reject, or request more info for each entry');
    console.log('   3. Approved companies will move to production database\n');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await mongoose.disconnect();
    console.log('✅ Disconnected from MongoDB');
  }
}

// Run the import
addColoradoCompanies();
