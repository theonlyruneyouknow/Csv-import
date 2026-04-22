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

const mississippiCompany = {
    companyName: "Seedman.com",
    country: "United States",
    region: "South",
    state: "Mississippi",
    stateCode: "MS",
    city: "Mississippi Gulf Coast",
    seedTypes: ["vegetables", "herbs", "flowers"],
    businessDetails: {
        website: "https://www.seedman.com",
        specialties: [
            "Unusual and hard to find seeds",
            "International varieties",
            "Heirloom vegetables",
            "Rare flowers",
            "Tree and shrub seeds",
            "Over 3,000 varieties"
        ],
        foundedYear: 1992,
        certifications: ["Safe Seed Pledge", "GMO-free", "State of Mississippi Seedmen's Permit #C-391"]
    },
    contactInfo: {
        email: "seeds@seedman.com",
        phone: "Contact via website",
        mailingAddress: "Mississippi Gulf Coast (exact address on website)"
    },
    reviewStatus: "pending",
    sourceVerification: {
        websiteVerified: true,
        verifiedAt: new Date(),
        verificationMethod: "Comprehensive website research and catalog review",
        verificationNotes: "Family-owned business serving gardeners since 1992. Extensive online catalog at seedman.com with over 3,000 varieties. Safe Seed Pledge signatory - pledges not to knowingly buy or sell genetically engineered seeds. All seeds are GMO-free. Ships only within USA (no longer ships to Canada or internationally as of March 2020). Website features complete catalog with vegetables (heirloom and standard), herbs (culinary and medicinal), annual and perennial flowers, tree seeds, and specialty collections. Active e-commerce with detailed growing information. State licensed: Mississippi Seedmen's Permit #C-391, Ohio 90152, Minnesota 20086777."
    },
    researchNotes: "Excellent partnership potential. Established 30+ year family business with extensive international variety collection. Specializes in unusual and hard-to-find seeds from around the world. Very comprehensive catalog including: Giant vegetables, Chinese/Japanese/Korean vegetables, Italian varieties, baby vegetables, heirloom selections, ornamental plants, and specialty categories (Bible garden, bee/butterfly gardens, cutting flowers, etc.). Strong educational focus with growing guides and detailed seed information. Would greatly benefit from expanded European heirloom varieties. Market positioning as specialty/rare variety supplier makes them ideal partner for unique European offerings. Customer base actively seeking unusual international varieties."
};

async function addSeedmanCompany() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('✅ Connected to MongoDB');

        const existing = await StagedPartner.findOne({
            companyName: mississippiCompany.companyName
        });

        if (existing) {
            console.log(`⚠️  ${mississippiCompany.companyName} already exists in staging`);
        } else {
            await StagedPartner.create(mississippiCompany);
            console.log(`✅ Added ${mississippiCompany.companyName} (${mississippiCompany.city}, ${mississippiCompany.stateCode}) to staging`);
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

addSeedmanCompany();
