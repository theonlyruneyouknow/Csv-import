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

const utahCompanies = [
    {
        companyName: "True Leaf Market (Mountain Valley Seed Co.)",
        country: "United States",
        region: "Mountain West",
        state: "Utah",
        stateCode: "UT",
        city: "Salt Lake City",
        zipCode: "84115",
        seedTypes: ["vegetables", "herbs", "flowers"],
        businessDetails: {
            website: "https://www.trueleafmarket.com",
            specialties: [
                "Microgreens and sprouting seeds",
                "Open-pollinated varieties",
                "Heirloom vegetables",
                "Organic certified options",
                "Wholesale pricing",
                "Independent seed company"
            ],
            foundedYear: 1974,
            certifications: ["Safe Seed Pledge", "Non-GMO", "Certified Organic options available", "USDA Organic"]
        },
        contactInfo: {
            email: "support@trueleafmarket.com",
            phone: "(801) 491-8700",
            mailingAddress: "175 West 2700 South, Salt Lake City, UT 84115"
        },
        reviewStatus: "pending",
        sourceVerification: {
            websiteVerified: true,
            verifiedAt: new Date(),
            verificationMethod: "Comprehensive website research and company history verification",
            verificationNotes: "Operating since 1974 as Mountain Valley Seed Co., now under True Leaf Market brand. One of the few truly independent seed companies in the nation. Extensive online catalog at trueleafmarket.com with vegetable, herb, sprouting, microgreen, and flower seeds. Strong focus on open-pollinated, heirloom, and certified organic varieties. 100% Non-GMO commitment. Lightning-fast shipping (96% of orders ship within 1 business day). Loyalty rewards program. 30-day satisfaction guarantee. Active e-commerce with extensive inventory including growing supplies, starter plugs, fertilizers, grow lights, and trays. Member of International Sprout Growers Association and Home Garden Seed Association."
        },
        researchNotes: "EXCELLENT partnership potential. Established 50-year business serving both casual home gardeners and hardcore farmers. Originally Mountain Valley Seed Co. (since 1974), now operating as True Leaf Market. Strong commitment to quality and organic growing. Specializes in microgreens and sprouting seeds which indicates interest in specialty/niche varieties. Independent company (not corporate-owned) makes them ideal for European heirloom partnerships. Extensive customer base seeking open-pollinated and heirloom varieties. Would greatly benefit from expanded European vegetable and herb varieties. Fast shipping infrastructure demonstrates operational excellence. Strong online presence with excellent customer reviews."
    },
    {
        companyName: "SeedRenaissance",
        country: "United States",
        region: "Mountain West",
        state: "Utah",
        stateCode: "UT",
        city: "Utah (location to be confirmed)",
        seedTypes: ["vegetables", "herbs", "flowers"],
        businessDetails: {
            website: "https://www.seedrenaissance.com",
            specialties: [
                "Heirloom varieties",
                "Chemical-free seeds",
                "Rare and historic varieties",
                "Cold-soil tolerant",
                "Winter harvest varieties",
                "Self-seeding capacity",
                "Globe-sourced rare seeds"
            ],
            foundedYear: 2010,
            certifications: ["Non-GMO", "Non-hybrid", "No patents", "Chemical-free"]
        },
        contactInfo: {
            email: "Contact via website form",
            phone: "See website",
            mailingAddress: "Utah (details on website)"
        },
        reviewStatus: "pending",
        sourceVerification: {
            websiteVerified: true,
            verifiedAt: new Date(),
            verificationMethod: "Website research and product catalog review",
            verificationNotes: "Founded by Caleb Warnock in 2010. Author of 'Forgotten Skills' books series. Provides heirloom, chemical-free seeds and live plants seasonally at seedrenaissance.com. Unique approach: searches globe for last seeds of important historic varieties to keep alive. Rigorous testing - for every common heirloom offered, 30-40 other varieties are grown and rejected. Evaluates performance in chemical-free gardens without petrochemical fertilizers, pesticides, or herbicides. Tests for earliness, flavor, production, storage, cold-soil tolerance, winter harvest ability, and self-seeding capacity. Guarantees all seeds are pure, never hybrid, GMO, patented, or corporate owned. Strong mission to keep food supply in public domain. Active product catalog with vegetables (tomatoes, beans, squash, peas, etc.) and flowers (zinnias, sunflowers, daisies, larkspur, etc.)."
        },
        researchNotes: "GOOD partnership potential. Smaller operation with strong mission-driven focus on preserving heirloom varieties and historic seeds. Founder Caleb Warnock's extensive variety testing (30-40 varieties tested per one sold) shows commitment to quality. Focus on chemical-free, resilient varieties aligns with European heirloom seed philosophy. 'Globe-searching' for historic varieties indicates openness to international seed sourcing. May have limited infrastructure compared to larger companies but strong niche appeal to serious heirloom gardeners. Would benefit from access to rare European varieties to complement their historic seed collection. Mission to keep seeds in public domain (anti-patent) aligns well with traditional seed-saving culture."
    }
];

async function addUtahCompanies() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('✅ Connected to MongoDB');

        let addedCount = 0;
        let skippedCount = 0;

        for (const company of utahCompanies) {
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

addUtahCompanies();
