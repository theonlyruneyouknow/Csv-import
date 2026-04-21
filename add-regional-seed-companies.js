// add-regional-seed-companies.js
// Add verified seed companies from different US regions to staging for approval

require('dotenv').config();
const mongoose = require('mongoose');
const StagedPartner = require('./models/StagedPartner');

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI)
    .then(() => console.log('✅ Connected to MongoDB'))
    .catch(err => {
        console.error('❌ MongoDB connection error:', err);
        process.exit(1);
    });

const regionalCompanies = [
    {
        companyName: 'Renee\'s Garden',
        country: 'United States',
        region: 'West',
        state: 'California',
        stateCode: 'CA',
        city: 'Felton',
        isDomestic: true,
        partnershipType: 'Domestic Supplier',
        status: 'Active',
        seedTypes: [
            'Vegetables',
            'Herbs',
            'Flowers',
            'Certified Organic',
            'Heirloom',
            'International Varieties'
        ],
        businessDetails: {
            website: 'https://www.reneesgarden.com',
            foundedYear: 1998,
            description: 'Founded by Renee Shepherd PhD from UC Santa Cruz. Pioneering innovator in introducing international vegetable, culinary herb and flower varieties to home gardeners. Trial gardens on West and East coasts test ~300 varieties annually.',
            certifications: ['Safe Seed Pledge', 'Certified Organic Options', 'Non-GMO', 'Million Pollinator Garden Challenge']
        },
        primaryContact: {
            contactName: 'Renee Shepherd',
            role: 'Founder'
        },
        sourceVerification: {
            websiteVerified: true,
            verifiedAt: new Date('2026-04-21'),
            verificationMethod: 'Manual web research',
            verificationNotes: 'Active e-commerce site, trial gardens in Felton CA, sources from USA, Holland, Italy, England, France, Germany, Hungary, Canada, Mexico, Chile, Thailand, Japan, China, New Zealand'
        },
        submittedBy: 'System Research',
        researchNotes: 'Known for authentically sourced international varieties, detailed seed packets with watercolor illustrations, complete growing instructions, recipes. Wide seed donation program to community/school/prison gardens. Founded by UC Santa Cruz PhD.'
    },
    {
        companyName: 'Baker Creek Heirloom Seeds',
        country: 'United States',
        region: 'Midwest',
        state: 'Missouri',
        stateCode: 'MO',
        city: 'Mansfield',
        isDomestic: true,
        partnershipType: 'Domestic Supplier',
        status: 'Active',
        seedTypes: [
            'Heirloom',
            'Open-Pollinated',
            'Vegetables',
            'Herbs',
            'Flowers',
            'Rare Varieties'
        ],
        businessDetails: {
            website: 'https://www.rareseeds.com',
            description: 'America\'s favorite heirloom seed company. Specializes in rare, non-GMO heirloom seeds. Hosts National Heirloom Expo and seasonal planting festivals. Known for protecting seed heritage and preserving rare varieties.',
            certifications: ['Safe Seed Pledge', 'Non-GMO', 'Open-Pollinated', '100% Guarantee']
        },
        primaryContact: {
            phone: '(417) 924-8917',
            email: 'seeds@rareseeds.com'
        },
        sourceVerification: {
            websiteVerified: true,
            verifiedAt: new Date('2026-04-21'),
            verificationMethod: 'Manual web research',
            verificationNotes: 'Active e-commerce at rareseeds.com, physical location at 2278 Baker Creek Road, Mansfield MO 65704, hosts annual festivals'
        },
        submittedBy: 'System Research',
        researchNotes: '2026 Festival Dates: Flower Festival April 12-13, Spring Planting Festival May 3-4, National Heirloom Expo September 27-28. Known for extensive rare heirloom catalog and preservation efforts.'
    },
    {
        companyName: 'Peaceful Valley Farm & Garden Supply',
        country: 'United States',
        region: 'West',
        state: 'California',
        stateCode: 'CA',
        city: 'Grass Valley',
        isDomestic: true,
        partnershipType: 'Domestic Supplier',
        status: 'Active',
        seedTypes: [
            'Vegetables',
            'Herbs',
            'Flowers',
            'Cover Crops',
            'Certified Organic',
            'Heirloom',
            'Hybrid'
        ],
        businessDetails: {
            website: 'https://www.groworganic.com',
            foundedYear: 1976,
            description: 'Family-owned organic nursery and garden supply store since 1976. Provides non-GMO and organic seeds, fruit trees, garden tools, and supplies for home gardeners and commercial growers nationwide.',
            certifications: ['USDA Organic', 'Non-GMO', 'Safe Seed Pledge', 'GROW Rewards Program']
        },
        primaryContact: {
            phone: '(888) 784-1722',
            email: 'helpdesk@groworganic.com'
        },
        sourceVerification: {
            websiteVerified: true,
            verifiedAt: new Date('2026-04-21'),
            verificationMethod: 'Manual web research',
            verificationNotes: 'Active e-commerce site, retail store at 125 Clydesdale Court, Grass Valley CA, open Mon-Fri 9AM-3PM'
        },
        submittedBy: 'System Research',
        researchNotes: 'Offers 50+ new seed varieties for 2026, bare root trees, berry plants, cover crops, and extensive growing supplies. Free shipping over $100. Affiliate program available. Known for organic expertise.'
    },
    {
        companyName: 'Botanical Interests',
        country: 'United States',
        region: 'Mountain',
        state: 'Colorado',
        stateCode: 'CO',
        city: 'Broomfield',
        isDomestic: true,
        partnershipType: 'Domestic Supplier',
        status: 'Active',
        seedTypes: [
            'Vegetables',
            'Herbs',
            'Flowers',
            'Organic',
            'Heirloom',
            'Hybrid',
            'Seed Shakers'
        ],
        businessDetails: {
            website: 'https://www.botanicalinterests.com',
            description: 'Family seed company offering detailed seed packets with growing instructions and beautiful illustrations. Known for seed shaker products and exclusive seed bundles. Offers garden planner tool.',
            certifications: ['Non-GMO', 'Organic Options', 'Safe Seed']
        },
        primaryContact: {
            phone: '720-782-2506',
            email: 'customerservice@botanicalinterests.com'
        },
        sourceVerification: {
            websiteVerified: true,
            verifiedAt: new Date('2026-04-21'),
            verificationMethod: 'Manual web research',
            verificationNotes: 'Active e-commerce site, headquarters at 525 Burbank St Unit 1, Broomfield CO 80020, customer service Mon-Fri 8-4 MST'
        },
        submittedBy: 'System Research',
        researchNotes: 'Unique seed shaker products covering up to 2,632 sq ft. Offers raised bed kits, vertical planters, and exclusive seed bundles. Free online garden planner tool. Rewards program available.'
    },
    {
        companyName: 'Johnny\'s Selected Seeds',
        country: 'United States',
        region: 'Northeast',
        state: 'Maine',
        stateCode: 'ME',
        city: 'Winslow',
        isDomestic: true,
        partnershipType: 'Domestic Supplier',
        status: 'Active',
        seedTypes: [
            'Vegetables',
            'Herbs',
            'Flowers',
            'Organic',
            'Hybrid',
            'Heirloom',
            'Farm Seed'
        ],
        businessDetails: {
            website: 'https://www.johnnyseeds.com',
            description: 'Mission: Help families, friends, and communities feed one another by providing superior seeds, tools, information, and service. Known for research trials and professional grower supplies.',
            certifications: ['Non-GMO', 'Organic Options', 'Professional Quality']
        },
        primaryContact: {
            phone: '877-564-6697'
        },
        sourceVerification: {
            websiteVerified: true,
            verifiedAt: new Date('2026-04-21'),
            verificationMethod: 'Manual web research',
            verificationNotes: 'Active e-commerce site, extensive growers library, professional-grade tools and supplies'
        },
        submittedBy: 'System Research',
        researchNotes: 'Known for: Benary\'s Giant zinnias, tomato trials, precision seeders, transplanting tools. Extensive grower education resources. 10% off bed prep tools promotion running. Free catalog available.'
    },
    {
        companyName: 'Fedco Seeds',
        country: 'United States',
        region: 'Northeast',
        state: 'Maine',
        stateCode: 'ME',
        city: 'Clinton',
        isDomestic: true,
        partnershipType: 'Domestic Supplier',
        status: 'Active',
        seedTypes: [
            'Vegetables',
            'Flowers',
            'Herbs',
            'Potatoes',
            'Cover Crops',
            'Organic',
            'Heirloom',
            'Cold-Hardy'
        ],
        businessDetails: {
            website: 'https://www.fedcoseeds.com',
            foundedYear: 1978,
            description: 'Worker- and consumer-owned cooperative offering seeds, trees, tubers, and supplies. Known for cold-hardy varieties and cooperative business model. Specializes in varieties suited for northern climates.',
            certifications: ['Cooperative Owned', 'Non-GMO', 'Organic Options', 'Benefit Sharing Program']
        },
        primaryContact: {
            phone: '(207) 426-9900',
            email: 'questions@fedcoseeds.com'
        },
        sourceVerification: {
            websiteVerified: true,
            verifiedAt: new Date('2026-04-21'),
            verificationMethod: 'Manual web research',
            verificationNotes: 'Active e-commerce site, retail store in Clinton ME open year-round Mon-Fri 9AM-3PM, PO Box 520 Clinton ME 04927'
        },
        submittedBy: 'System Research',
        researchNotes: 'Cooperative structure since 1978. Over 1,200 varieties. Known for: asparagus crowns, seed potatoes, sweet potato slips, fruit trees, cover crops. Active supplier code transparency. No phone orders. Membership program available.'
    },
    {
        companyName: 'High Mowing Organic Seeds',
        country: 'United States',
        region: 'Northeast',
        state: 'Vermont',
        stateCode: 'VT',
        city: 'Wolcott',
        isDomestic: true,
        partnershipType: 'Domestic Supplier',
        status: 'Active',
        seedTypes: [
            'Vegetables',
            'Herbs',
            'Flowers',
            'Cover Crops',
            '100% Certified Organic',
            'Hybrid',
            'Open-Pollinated'
        ],
        businessDetails: {
            website: 'https://www.highmowingseeds.com',
            description: '100% certified organic seed company. All varieties bred to perform best in organic conditions with robust genetics and modern disease resistances. Regularly tested for germination, disease, and GMO contamination.',
            certifications: ['100% USDA Certified Organic', 'Vermont Certified Organic', 'Non-GMO', 'Employee-Owned']
        },
        sourceVerification: {
            websiteVerified: true,
            verifiedAt: new Date('2026-04-21'),
            verificationMethod: 'Manual web research',
            verificationNotes: 'Active e-commerce site, Vermont-based, free shipping on orders over $200'
        },
        submittedBy: 'System Research',
        researchNotes: 'Unique: 100% certified organic (not just organic options). Employee-owned company. Known for seed potato sales, new Blue Tonic F1 and Blue Beech tomatoes for 2026. Active fundraisers and affiliate programs.'
    },
    {
        companyName: 'Native Seeds/SEARCH',
        country: 'United States',
        region: 'Southwest',
        state: 'Arizona',
        stateCode: 'AZ',
        city: 'Tucson',
        isDomestic: true,
        partnershipType: 'Domestic Supplier',
        status: 'Active',
        seedTypes: [
            'Native Seeds',
            'Desert-Adapted',
            'Heirloom',
            'Traditional Varieties',
            'Arid-Adapted Crops',
            'Vegetables',
            'Herbs'
        ],
        businessDetails: {
            website: 'https://www.nativeseeds.org',
            description: 'Mission: Conserve and share seeds of the people of the desert Southwest and Mexico so arid-adapted crops may benefit communities and nourish a changing world. Specialized in desert agriculture.',
            certifications: ['Non-Profit Organization', 'Traditional Seed Conservation', 'Membership Program']
        },
        sourceVerification: {
            websiteVerified: true,
            verifiedAt: new Date('2026-04-21'),
            verificationMethod: 'Manual web research',
            verificationNotes: 'Active non-profit site, desert Southwest focus, seed conservation mission'
        },
        submittedBy: 'System Research',
        researchNotes: 'Nonprofit organization focused on conserving traditional desert-adapted crops. Membership program (save 10%). Specializes in varieties suited for arid climates of Southwest and Mexico. Important for biodiversity preservation.'
    }
];

async function addRegionalCompanies() {
    try {
        console.log('\n🌎 Adding regional US seed companies to staging...\n');
        
        let addedCount = 0;
        let skippedCount = 0;
        
        for (const company of regionalCompanies) {
            // Check if already exists in staging
            const existsInStaging = await StagedPartner.findOne({ companyName: company.companyName });
            if (existsInStaging) {
                console.log(`⚠️  ${company.companyName} already exists in staging (status: ${existsInStaging.reviewStatus})`);
                skippedCount++;
                continue;
            }
            
            const staged = new StagedPartner(company);
            await staged.save();
            console.log(`✅ Added ${company.companyName} (${company.city}, ${company.stateCode}) to staging`);
            addedCount++;
        }
        
        console.log(`\n✨ Complete! Added ${addedCount} companies, skipped ${skippedCount} duplicates.\n`);
        
        // Show summary by region
        const pending = await StagedPartner.countDocuments({ reviewStatus: 'pending' });
        const needsInfo = await StagedPartner.countDocuments({ reviewStatus: 'needs_info' });
        const approved = await StagedPartner.countDocuments({ reviewStatus: 'approved' });
        const rejected = await StagedPartner.countDocuments({ reviewStatus: 'rejected' });
        
        console.log('📊 Staging Summary:');
        console.log(`   Pending Review: ${pending}`);
        console.log(`   Needs Info: ${needsInfo}`);
        console.log(`   Approved: ${approved}`);
        console.log(`   Rejected: ${rejected}`);
        console.log('\n📍 Geographic Distribution (newly added):');
        console.log(`   Oregon: Territorial, Wild Garden, Adaptive, Siskiyou`);
        console.log(`   California: Renee's Garden (Felton), Peaceful Valley (Grass Valley)`);
        console.log(`   Missouri: Baker Creek Heirloom (Mansfield)`);
        console.log(`   Colorado: Botanical Interests (Broomfield)`);
        console.log(`   Maine: Johnny's Selected (Winslow), Fedco (Clinton)`);
        console.log(`   Vermont: High Mowing Organic (Wolcott)`);
        console.log(`   Arizona: Native Seeds/SEARCH (Tucson)`);
        console.log('\n📋 Next: Navigate to http://localhost:3001/staged-partners/review to review\n');
        
    } catch (error) {
        console.error('❌ Error adding companies:', error);
    } finally {
        await mongoose.connection.close();
        console.log('🔌 Database connection closed');
    }
}

addRegionalCompanies();
