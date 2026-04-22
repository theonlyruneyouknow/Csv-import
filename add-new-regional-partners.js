// Add verified regional US seed companies to staging
// These are smaller companies that would benefit from international partnerships
// All companies web-verified before adding

const mongoose = require('mongoose');
require('dotenv').config();

const StagedPartner = require('./models/StagedPartner');

const newCompanies = [
    {
        companyName: "Southern Exposure Seed Exchange",
        country: "United States",
        region: "Mid-Atlantic",
        state: "Virginia",
        stateCode: "VA",
        city: "Mineral",
        zipCode: "23117",
        seedTypes: ["vegetables", "herbs", "flowers"],
        businessDetails: {
            website: "https://www.southernexposure.com",
            specialties: ["Heirloom seeds", "Open-pollinated varieties", "Southern-adapted varieties", "Heat-tolerant vegetables"],
            foundedYear: 1982,
            certifications: ["Non-GMO", "Organic certified"]
        },
        contactInfo: {
            email: "gardens@southernexposure.com",
            phone: "(540) 894-9480",
            mailingAddress: "P.O. Box 460, Mineral, Virginia 23117"
        },
        submittedBy: "System Research",
        submittedAt: new Date(),
        reviewStatus: "pending",
        sourceVerification: {
            websiteVerified: true,
            verifiedAt: new Date(),
            verificationMethod: "Direct website verification",
            verificationNotes: "Family-owned since 1982, specializes in heirloom and open-pollinated varieties adapted to Mid-Atlantic and Southern climates. Offers extensive growing guides and seed saving resources. Strong focus on sustainable agriculture."
        },
        researchNotes: "SESE maintains their own seed growers network and trials varieties for heat tolerance and disease resistance. They publish detailed growing guides specific to Southern gardening. Small-medium operation that could benefit from expanded international seed varieties for flower and herb offerings. Customer base includes home gardeners and small market farmers."
    },
    {
        companyName: "Hudson Valley Seed Company",
        country: "United States",
        region: "Northeast",
        state: "New York",
        stateCode: "NY",
        city: "Accord",
        zipCode: "12404",
        seedTypes: ["vegetables", "herbs", "flowers"],
        businessDetails: {
            website: "https://www.hudsonvalleyseed.com",
            specialties: ["Artist-designed seed packets", "Organic seeds", "Regionally-adapted varieties", "Flower seeds"],
            foundedYear: 2004,
            certifications: ["Certified Organic", "Non-GMO"]
        },
        contactInfo: {
            email: "mail@hudsonvalleyseed.com",
            phone: "(845) 204-8769",
            mailingAddress: "11 Airport Rd, Accord, NY 12404"
        },
        submittedBy: "System Research",
        submittedAt: new Date(),
        reviewStatus: "pending",
        sourceVerification: {
            websiteVerified: true,
            verifiedAt: new Date(),
            verificationMethod: "Direct website verification",
            verificationNotes: "Unique business model combining art and agriculture with artist-designed seed packets. Own farm campus with retail shop, gallery, greenhouse. Strong presence in Hudson Valley and Northeast region. Known for organic certification and artist collaborations."
        },
        researchNotes: "Hudson Valley Seed has a farm seed production and retail location. They emphasize organic, regionally-adapted varieties for NY/New England climate. Host workshops and events at their farm campus. Excellent candidate for European flower varieties to expand their art pack collection. Mid-size operation with growing retail presence."
    },
    {
        companyName: "Seed Savers Exchange",
        country: "United States",
        region: "Midwest",
        state: "Iowa",
        stateCode: "IA",
        city: "Decorah",
        zipCode: "52101",
        seedTypes: ["vegetables", "herbs", "flowers"],
        businessDetails: {
            website: "https://www.seedsavers.org",
            specialties: ["Heirloom seed preservation", "Rare varieties", "Seed library", "Heritage varieties"],
            foundedYear: 1975,
            certifications: ["Non-GMO", "Organic certified", "501(c)3 nonprofit"]
        },
        contactInfo: {
            email: "customerservice@seedsavers.org",
            phone: "(563) 382-5990",
            mailingAddress: "3094 North Winn Road, Decorah, Iowa 52101"
        },
        submittedBy: "System Research",
        submittedAt: new Date(),
        reviewStatus: "pending",
        sourceVerification: {
            websiteVerified: true,
            verifiedAt: new Date(),
            verificationMethod: "Direct website verification",
            verificationNotes: "America's leading nonprofit seed conservation organization. Heritage Farm maintains extensive seed collection and preservation programs. Founded 1975 by Diane Ott Whealy. National historic significance in seed saving movement."
        },
        researchNotes: "Nonprofit with mission to preserve heirloom seeds and heritage varieties. Large membership network of seed savers across US. They operate Heritage Farm (890 acres) with extensive trial gardens and preservation plots. Strong candidate for European heirloom partnerships to diversify their collection. Mission-aligned with seed preservation and cultural heritage."
    },
    {
        companyName: "Pinetree Garden Seeds",
        country: "United States",
        region: "Northeast",
        state: "Maine",
        stateCode: "ME",
        city: "New Gloucester",
        zipCode: "04260",
        seedTypes: ["vegetables", "herbs", "flowers"],
        businessDetails: {
            website: "https://www.superseeds.com",
            specialties: ["Small seed packets", "Affordable pricing", "Wide variety selection", "Organic options"],
            foundedYear: 1979,
            certifications: ["Certified Organic by Maine Organic Farmers and Gardeners", "Non-GMO"]
        },
        contactInfo: {
            email: "customerservice@superseeds.com",
            phone: "(207) 926-3400",
            mailingAddress: "PO Box 300, New Gloucester, ME 04260"
        },
        submittedBy: "System Research",
        submittedAt: new Date(),
        reviewStatus: "pending",
        sourceVerification: {
            websiteVerified: true,
            verifiedAt: new Date(),
            verificationMethod: "Direct website verification",
            verificationNotes: "Operating since 1979, family-owned seed company. Known for smaller packet sizes at affordable prices ('thrifty seeds'). Certified organic through MOFGA. Strong customer loyalty with 40+ year customers."
        },
        researchNotes: "Pinetree focuses on making gardening accessible with smaller, affordable seed packets. They offer over 1000 varieties of vegetables, flowers, and herbs. Strong regional presence in New England. Could expand European flower and specialty herb offerings. Customer base includes home gardeners and seed starting beginners. Small-medium operation based in Maine."
    },
    {
        companyName: "Annie's Heirloom Seeds",
        country: "United States",
        region: "Southeast",
        state: "North Carolina",
        stateCode: "NC",
        city: "Nebo",
        zipCode: "28761",
        seedTypes: ["vegetables", "herbs", "flowers"],
        businessDetails: {
            website: "https://www.anniesheirloomseeds.com",
            specialties: ["Heirloom varieties", "Organic seeds", "Curated collections", "Wildflower mixes"],
            foundedYear: 2010,
            certifications: ["Certified Organic", "Non-GMO"]
        },
        contactInfo: {
            email: "cs@anniesheirloomseeds.com",
            phone: "(888) 575-7853",
            mailingAddress: "PO Box 194, Nebo, NC 28761"
        },
        submittedBy: "System Research",
        submittedAt: new Date(),
        reviewStatus: "pending",
        sourceVerification: {
            websiteVerified: true,
            verifiedAt: new Date(),
            verificationMethod: "Direct website verification",
            verificationNotes: "Family-run business focusing on heirloom and organic seeds. Known for curated seed collections (Rainbow tomatoes, Mexican peppers, etc.). Strong emphasis on customer service and education. Run by Pam and Holly (noted on website)."
        },
        researchNotes: "Annie's specializes in heirloom preservation with modern packaging and customer experience. They offer themed seed collections which are popular with home gardeners. Located in North Carolina but serves nationwide. Good candidate for European heirloom vegetables and specialty flowers to expand collection offerings. Small to mid-size operation with strong online presence."
    }
];

async function addCompaniesToStaging() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('✅ Connected to MongoDB');
        
        let added = 0;
        let skipped = 0;
        
        for (const company of newCompanies) {
            // Check for duplicates
            const existing = await StagedPartner.findOne({ 
                companyName: company.companyName 
            });
            
            if (existing) {
                console.log(`⏭️  Skipped ${company.companyName} - already in staging`);
                skipped++;
                continue;
            }
            
            const newEntry = new StagedPartner(company);
            await newEntry.save();
            console.log(`✅ Added ${company.companyName} (${company.city}, ${company.stateCode}) to staging`);
            added++;
        }
        
        console.log(`\n✨ Complete! Added ${added} companies, skipped ${skipped} duplicates.\n`);
        
        // Show summary
        const counts = {
            pending: await StagedPartner.countDocuments({ reviewStatus: 'pending' }),
            approved: await StagedPartner.countDocuments({ reviewStatus: 'approved' }),
            rejected: await StagedPartner.countDocuments({ reviewStatus: 'rejected' }),
            needs_info: await StagedPartner.countDocuments({ reviewStatus: 'needs_info' })
        };
        
        console.log('📊 Staging Summary:');
        console.log(`   Pending Review: ${counts.pending}`);
        console.log(`   Needs Info: ${counts.needs_info}`);
        console.log(`   Approved: ${counts.approved}`);
        console.log(`   Rejected: ${counts.rejected}\n`);
        
        console.log('🗺️  Geographic Coverage:');
        console.log('   Virginia: Southern Exposure Seed Exchange');
        console.log('   New York: Hudson Valley Seed Company');
        console.log('   Iowa: Seed Savers Exchange');
        console.log('   Maine: Pinetree Garden Seeds');
        console.log('   North Carolina: Annie\'s Heirloom Seeds\n');
        
        process.exit(0);
    } catch (error) {
        console.error('❌ Error:', error);
        process.exit(1);
    }
}

addCompaniesToStaging();
