// add-oregon-companies-to-staging.js
// Script to add verified Oregon seed companies to staging for approval workflow testing

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

const oregonCompanies = [
    {
        companyName: 'Territorial Seed Company',
        country: 'United States',
        region: 'Pacific Northwest',
        state: 'Oregon',
        stateCode: 'OR',
        city: 'Cottage Grove',
        isDomestic: true,
        partnershipType: 'Domestic Supplier',
        status: 'Active',
        seedTypes: [
            'Vegetables',
            'Flowers',
            'Herbs',
            'Fruits',
            'Heirloom',
            'Hybrid',
            'Organic'
        ],
        businessDetails: {
            website: 'https://www.territorialseed.com',
            foundedYear: 1979,
            description: 'Family-owned seed company specializing in vegetables, flowers, herbs, and fruits. Known for regionally adapted varieties for the Pacific Northwest.',
            certifications: ['100% Satisfaction Guarantee']
        },
        sourceVerification: {
            websiteVerified: true,
            verifiedAt: new Date('2026-04-21'),
            verificationMethod: 'Manual web research',
            verificationNotes: 'Active e-commerce site, catalog available, established company since 1979'
        },
        submittedBy: 'System Research',
        researchNotes: 'Specializes in tomatoes, peppers, lettuce, carrots, beans, squash, cucumbers (vegetables); zinnias, sunflowers, marigolds, nasturtiums (flowers); basil, dill, parsley, cilantro (herbs); strawberries, kiwi, mulberry, fig (fruits). 2026 catalog with new varieties available.'
    },
    {
        companyName: 'Wild Garden Seed',
        country: 'United States',
        region: 'Pacific Northwest',
        state: 'Oregon',
        stateCode: 'OR',
        city: 'Philomath',
        isDomestic: true,
        partnershipType: 'Domestic Supplier',
        status: 'Active',
        seedTypes: [
            'Vegetables',
            'Lettuce',
            'Salad Greens',
            'Organic',
            'Heirloom',
            'Open-Pollinated',
            'Farm Original'
        ],
        businessDetails: {
            website: 'https://www.wildgardenseed.com',
            foundedYear: 1994,
            description: 'Organic farm in Willamette Valley operated by Frank & Karen Morton, specializing in salad greens and lettuce breeding. Farm-original varieties bred for organic conditions.',
            certifications: ['USDA Organic', 'Open Source Seed Initiative Partner']
        },
        primaryContact: {
            contactName: 'Frank & Karen Morton',
            role: 'Owners/Breeders'
        },
        sourceVerification: {
            websiteVerified: true,
            verifiedAt: new Date('2026-04-21'),
            verificationMethod: 'Manual web research',
            verificationNotes: 'Active farm website, 2026 catalog available, known for ecological plant breeding'
        },
        submittedBy: 'System Research',
        researchNotes: '2026 catalog includes: Tall Dark Sahara Rudbeckia, Hannah\'s Grex Sesame, Buffon d\' Glaces Lettuce, Speckled Romaine, Goodie Tomato, Hawaii Marigold, Rainbow Broomcorn, Black Eagle Wheat. OSSI partner with open source seed pledge.'
    },
    {
        companyName: 'Adaptive Seeds',
        country: 'United States',
        region: 'Pacific Northwest',
        state: 'Oregon',
        stateCode: 'OR',
        city: 'Sweet Home',
        isDomestic: true,
        partnershipType: 'Domestic Supplier',
        status: 'Active',
        seedTypes: [
            'Vegetables',
            'Flowers',
            'Herbs',
            'Grains',
            'Open-Pollinated',
            'Organic',
            'Heirloom',
            'Dry-Farmed'
        ],
        businessDetails: {
            website: 'https://www.adaptiveseeds.com',
            foundedYear: 2009,
            description: 'Oregon Tilth certified organic seed company. Most seed grown on their own farm, adapted to Pacific Northwest conditions. Only open-pollinated varieties - no hybrids, patents, or GMOs.',
            certifications: ['Oregon Tilth Certified Organic (since 2013)', 'Open Source Seed Initiative']
        },
        sourceVerification: {
            websiteVerified: true,
            verifiedAt: new Date('2026-04-21'),
            verificationMethod: 'Manual web research',
            verificationNotes: 'Active e-commerce site, certified organic, 2026 catalog available'
        },
        submittedBy: 'System Research',
        researchNotes: '26 new/returning varieties for 2026. Specializes in dry farming adapted varieties for the Pacific Northwest. Free US shipping on orders $100+. Open Source pledged varieties available.'
    },
    {
        companyName: 'Siskiyou Seeds',
        country: 'United States',
        region: 'Pacific Northwest',
        state: 'Oregon',
        stateCode: 'OR',
        city: 'Williams',
        isDomestic: true,
        partnershipType: 'Domestic Supplier',
        status: 'Active',
        seedTypes: [
            'Vegetables',
            'Flowers',
            'Herbs',
            'Grains',
            'Seed Potatoes',
            'Open-Pollinated',
            'Heirloom',
            'Organic'
        ],
        businessDetails: {
            website: 'https://www.siskiyouseeds.com',
            description: 'Bio-regional seed hub in Southwest Oregon. Network of certified organic small farms growing heirloom and open-pollinated varieties. Offers permaculture consultations and seed academy programs.',
            certifications: ['Certified Organic Network', 'Heirloom Seed Seller']
        },
        sourceVerification: {
            websiteVerified: true,
            verifiedAt: new Date('2026-04-21'),
            verificationMethod: 'Manual web research',
            verificationNotes: 'Active website, 2026 catalog available, educational programs offered'
        },
        submittedBy: 'System Research',
        researchNotes: 'Bio-regional focus on Southwest Oregon adapted varieties. Offers vegetables, flowers, herbs, grains, and seed potatoes. Provides permaculture consultation services and seed academy programs.'
    }
];

async function addOregonCompanies() {
    try {
        console.log('\n🌱 Adding Oregon seed companies to staging...\n');

        // Check if any already exist
        for (const company of oregonCompanies) {
            const exists = await StagedPartner.findOne({ companyName: company.companyName });
            if (exists) {
                console.log(`⚠️  ${company.companyName} already exists in staging (status: ${exists.reviewStatus})`);
                continue;
            }

            const staged = new StagedPartner(company);
            await staged.save();
            console.log(`✅ Added ${company.companyName} to staging for review`);
        }

        console.log('\n✨ Complete! Oregon companies added to staging.');
        console.log('\n📋 Next steps:');
        console.log('   1. Start the server: npm start');
        console.log('   2. Navigate to: http://localhost:3001/staged-partners/review');
        console.log('   3. Review and approve/reject each company\n');

        // Show summary
        const pending = await StagedPartner.countDocuments({ reviewStatus: 'pending' });
        const needsInfo = await StagedPartner.countDocuments({ reviewStatus: 'needs_info' });
        const approved = await StagedPartner.countDocuments({ reviewStatus: 'approved' });
        const rejected = await StagedPartner.countDocuments({ reviewStatus: 'rejected' });

        console.log('📊 Staging Summary:');
        console.log(`   Pending Review: ${pending}`);
        console.log(`   Needs Info: ${needsInfo}`);
        console.log(`   Approved: ${approved}`);
        console.log(`   Rejected: ${rejected}`);
        console.log('');

    } catch (error) {
        console.error('❌ Error adding companies:', error);
    } finally {
        await mongoose.connection.close();
        console.log('🔌 Database connection closed');
    }
}

addOregonCompanies();
