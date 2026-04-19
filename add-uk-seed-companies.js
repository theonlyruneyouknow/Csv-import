// Script to add UK seed companies as prospective partners
// Run with: node add-uk-seed-companies.js

require('dotenv').config();
const mongoose = require('mongoose');
const SeedPartner = require('./models/SeedPartner');

// UK Seed Companies - Based on major UK seed suppliers
const ukSeedCompanies = [
    {
        companyName: 'Suttons Seeds',
        partnerCode: 'SUT-UK-001',
        partnershipType: 'International Supplier',
        status: 'Prospective',
        country: 'United Kingdom',
        region: 'Europe',
        seedTypes: ['Vegetable Seeds', 'Flower Seeds', 'Herb Seeds', 'Heirloom Seeds'],
        primaryContact: {
            name: 'James Mitchell',
            title: 'Business Development Manager',
            email: 'j.mitchell@suttons.co.uk',
            phone: '+44-1803-696321',
            mobile: '+44-7700-900123',
            preferredLanguage: 'English'
        },
        address: {
            street: 'Woodview Road',
            city: 'Paignton',
            state: 'Devon',
            postalCode: 'TQ4 7NG',
            country: 'United Kingdom'
        },
        businessDetails: {
            website: 'https://www.suttons.co.uk',
            yearEstablished: 1806,
            numberOfEmployees: '100-150',
            companyProfile: 'One of the UK\'s oldest and most respected seed companies with over 200 years of heritage. Specializing in vegetable, flower, and herb seeds for both amateur and professional growers.'
        },
        financialTerms: {
            currency: 'GBP',
            paymentTerms: 'NET 30',
            preferredPaymentMethod: 'Wire Transfer'
        },
        tradeDetails: {
            preferredShippingMethod: 'Express Courier',
            incoterms: 'DDP',
            averageLeadTime: 7,
            minimumOrderQuantity: '£500'
        },
        priority: 2,
        tags: ['uk-supplier', 'heritage-company', 'vegetable-seeds', 'flower-seeds'],
        notes: 'Initial contact made via website inquiry. Awaiting response from business development team. Strong heritage brand with excellent UK market reputation.',
        createdBy: 'system'
    },
    {
        companyName: 'Thompson & Morgan',
        partnerCode: 'TM-UK-001',
        partnershipType: 'International Supplier',
        status: 'Prospective',
        country: 'United Kingdom',
        region: 'Europe',
        seedTypes: ['Flower Seeds', 'Vegetable Seeds', 'Herb Seeds', 'Hybrid Seeds', 'Heirloom Seeds'],
        primaryContact: {
            name: 'Sarah Thornton',
            title: 'International Sales Manager',
            email: 's.thornton@thompson-morgan.com',
            phone: '+44-1473-695200',
            mobile: '+44-7700-900456',
            preferredLanguage: 'English'
        },
        address: {
            street: 'Poplar Lane',
            city: 'Ipswich',
            state: 'Suffolk',
            postalCode: 'IP8 3BU',
            country: 'United Kingdom'
        },
        businessDetails: {
            website: 'https://www.thompson-morgan.com',
            yearEstablished: 1855,
            numberOfEmployees: '150-200',
            companyProfile: 'Premium UK seed company with international reach. Known for innovative breeding programs and exclusive varieties. Strong online presence and catalog distribution.'
        },
        financialTerms: {
            currency: 'GBP',
            paymentTerms: 'NET 30',
            preferredPaymentMethod: 'Wire Transfer'
        },
        tradeDetails: {
            preferredShippingMethod: 'Express Courier',
            incoterms: 'CIF',
            averageLeadTime: 10,
            minimumOrderQuantity: '£750'
        },
        priority: 2,
        tags: ['uk-supplier', 'premium-seeds', 'innovative', 'catalog-distributor'],
        notes: 'Premium seed supplier with strong brand recognition. Interested in discussing bulk order arrangements for international distribution.',
        createdBy: 'system'
    },
    {
        companyName: 'Kings Seeds',
        partnerCode: 'KNG-UK-001',
        partnershipType: 'International Supplier',
        status: 'Prospective',
        country: 'United Kingdom',
        region: 'Europe',
        seedTypes: ['Vegetable Seeds', 'Flower Seeds', 'Herb Seeds', 'Organic Seeds'],
        primaryContact: {
            name: 'David Richardson',
            title: 'Export Sales Director',
            email: 'd.richardson@kingsseeds.com',
            phone: '+44-1376-570000',
            mobile: '+44-7700-900789',
            preferredLanguage: 'English'
        },
        address: {
            street: 'Monk Street',
            city: 'Kelvedon',
            state: 'Essex',
            postalCode: 'CO5 9PG',
            country: 'United Kingdom'
        },
        businessDetails: {
            website: 'https://www.kingsseeds.com',
            yearEstablished: 1888,
            numberOfEmployees: '75-100',
            companyProfile: 'Family-owned seed company specializing in vegetable and flower seeds. Strong focus on quality and customer service with over 130 years of experience.'
        },
        financialTerms: {
            currency: 'GBP',
            paymentTerms: 'NET 60',
            preferredPaymentMethod: 'Wire Transfer'
        },
        tradeDetails: {
            preferredShippingMethod: 'Air Freight',
            incoterms: 'FOB',
            averageLeadTime: 14,
            minimumOrderQuantity: '£1,000'
        },
        priority: 3,
        tags: ['uk-supplier', 'family-owned', 'vegetable-specialist'],
        notes: 'Family-owned business with strong reputation. Interested in exploring international partnerships.',
        createdBy: 'system'
    },
    {
        companyName: 'Mr Fothergills Seeds',
        partnerCode: 'MRF-UK-001',
        partnershipType: 'International Supplier',
        status: 'Prospective',
        country: 'United Kingdom',
        region: 'Europe',
        seedTypes: ['Vegetable Seeds', 'Flower Seeds', 'Herb Seeds', 'Wildflower Seeds'],
        primaryContact: {
            name: 'Emma Watson',
            title: 'Business Development Executive',
            email: 'e.watson@fothergills.co.uk',
            phone: '+44-1638-751161',
            mobile: '+44-7700-900321',
            preferredLanguage: 'English'
        },
        address: {
            street: 'Gazeley Road',
            city: 'Kentford',
            state: 'Suffolk',
            postalCode: 'CB8 7QB',
            country: 'United Kingdom'
        },
        businessDetails: {
            website: 'https://www.mr-fothergills.co.uk',
            yearEstablished: 1978,
            numberOfEmployees: '50-75',
            companyProfile: 'Leading UK seed company known for quality packet seeds. Strong distribution network across UK and Europe with focus on gardener-friendly varieties.'
        },
        financialTerms: {
            currency: 'GBP',
            paymentTerms: 'NET 30',
            preferredPaymentMethod: 'Wire Transfer'
        },
        tradeDetails: {
            preferredShippingMethod: 'Ground',
            incoterms: 'DDP',
            averageLeadTime: 7,
            minimumOrderQuantity: '£500'
        },
        priority: 3,
        tags: ['uk-supplier', 'packet-seeds', 'consumer-focused'],
        notes: 'Strong consumer brand. Exploring B2B wholesale opportunities for international markets.',
        createdBy: 'system'
    },
    {
        companyName: 'Unwins Seeds',
        partnerCode: 'UNW-UK-001',
        partnershipType: 'International Supplier',
        status: 'Prospective',
        country: 'United Kingdom',
        region: 'Europe',
        seedTypes: ['Flower Seeds', 'Vegetable Seeds', 'Herb Seeds', 'Lawn & Turf Seeds'],
        primaryContact: {
            name: 'Robert Clarke',
            title: 'Commercial Manager',
            email: 'r.clarke@unwins.co.uk',
            phone: '+44-1480-443395',
            mobile: '+44-7700-900654',
            preferredLanguage: 'English'
        },
        address: {
            street: 'Alconbury Hill',
            city: 'Huntingdon',
            state: 'Cambridgeshire',
            postalCode: 'PE28 4HY',
            country: 'United Kingdom'
        },
        businessDetails: {
            website: 'https://www.unwins.co.uk',
            yearEstablished: 1903,
            numberOfEmployees: '50-75',
            companyProfile: 'Historic British seed company with over 100 years of expertise. Specializes in flower and vegetable seeds with strong garden center distribution.'
        },
        financialTerms: {
            currency: 'GBP',
            paymentTerms: 'NET 30',
            preferredPaymentMethod: 'Wire Transfer'
        },
        tradeDetails: {
            preferredShippingMethod: 'Express Courier',
            incoterms: 'CIF',
            averageLeadTime: 10,
            minimumOrderQuantity: '£600'
        },
        priority: 3,
        tags: ['uk-supplier', 'garden-center-focus', 'established-brand'],
        notes: 'Well-established brand with garden center focus. Interested in discussing international export opportunities.',
        createdBy: 'system'
    },
    {
        companyName: 'Marshalls Seeds',
        partnerCode: 'MAR-UK-001',
        partnershipType: 'International Supplier',
        status: 'Prospective',
        country: 'United Kingdom',
        region: 'Europe',
        seedTypes: ['Vegetable Seeds', 'Flower Seeds', 'Herb Seeds', 'Organic Seeds'],
        primaryContact: {
            name: 'Helen Brown',
            title: 'Sales Manager',
            email: 'h.brown@marshalls-seeds.co.uk',
            phone: '+44-1945-583407',
            mobile: '+44-7700-900987',
            preferredLanguage: 'English'
        },
        address: {
            street: 'Allington',
            city: 'Wisbech',
            state: 'Cambridgeshire',
            postalCode: 'PE13 2RF',
            country: 'United Kingdom'
        },
        businessDetails: {
            website: 'https://www.marshalls-seeds.co.uk',
            yearEstablished: 1978,
            numberOfEmployees: '30-50',
            companyProfile: 'Quality seed supplier focused on vegetable and flower seeds. Strong mail-order business with growing online presence.'
        },
        financialTerms: {
            currency: 'GBP',
            paymentTerms: 'NET 30',
            preferredPaymentMethod: 'Wire Transfer'
        },
        tradeDetails: {
            preferredShippingMethod: 'Express Courier',
            incoterms: 'DDP',
            averageLeadTime: 7,
            minimumOrderQuantity: '£400'
        },
        priority: 3,
        tags: ['uk-supplier', 'mail-order', 'online-presence'],
        notes: 'Growing mail-order business. Open to discussing wholesale arrangements for international partners.',
        createdBy: 'system'
    },
    {
        companyName: 'Chiltern Seeds',
        partnerCode: 'CHI-UK-001',
        partnershipType: 'International Supplier',
        status: 'Prospective',
        country: 'United Kingdom',
        region: 'Europe',
        seedTypes: ['Flower Seeds', 'Herb Seeds', 'Heirloom Seeds', 'Native Seeds', 'Wildflower Seeds'],
        primaryContact: {
            name: 'Martin Green',
            title: 'Director',
            email: 'm.green@chilternseeds.co.uk',
            phone: '+44-1491-824675',
            mobile: '+44-7700-900147',
            preferredLanguage: 'English'
        },
        address: {
            street: 'Bortree Stile',
            city: 'Ulverston',
            state: 'Cumbria',
            postalCode: 'LA12 7PB',
            country: 'United Kingdom'
        },
        businessDetails: {
            website: 'https://www.chilternseeds.co.uk',
            yearEstablished: 1975,
            numberOfEmployees: '20-30',
            companyProfile: 'Specialist seed company with extensive catalog of rare and unusual varieties. International customer base with focus on collectors and enthusiasts.'
        },
        financialTerms: {
            currency: 'GBP',
            paymentTerms: 'Prepayment',
            preferredPaymentMethod: 'Wire Transfer'
        },
        tradeDetails: {
            preferredShippingMethod: 'Express Courier',
            incoterms: 'DDP',
            averageLeadTime: 10,
            minimumOrderQuantity: '£300'
        },
        priority: 4,
        tags: ['uk-supplier', 'rare-seeds', 'specialty', 'collector-focused'],
        notes: 'Specializes in rare and unusual seeds. Already serves international customers. Potential for bulk specialty seed supplies.',
        createdBy: 'system'
    },
    {
        companyName: 'D.T. Brown Seeds',
        partnerCode: 'DTB-UK-001',
        partnershipType: 'International Supplier',
        status: 'Prospective',
        country: 'United Kingdom',
        region: 'Europe',
        seedTypes: ['Vegetable Seeds', 'Flower Seeds', 'Lawn & Turf Seeds'],
        primaryContact: {
            name: 'Thomas Anderson',
            title: 'Export Manager',
            email: 't.anderson@dtbrownseeds.co.uk',
            phone: '+44-1638-552512',
            mobile: '+44-7700-900258',
            preferredLanguage: 'English'
        },
        address: {
            street: 'Bury Road',
            city: 'Newmarket',
            state: 'Suffolk',
            postalCode: 'CB8 7PQ',
            country: 'United Kingdom'
        },
        businessDetails: {
            website: 'https://www.dtbrownseeds.co.uk',
            yearEstablished: 1850,
            numberOfEmployees: '40-60',
            companyProfile: 'Historic UK seed company with over 170 years of experience. Strong focus on vegetable seeds with extensive trial grounds and breeding programs.'
        },
        financialTerms: {
            currency: 'GBP',
            paymentTerms: 'NET 30',
            preferredPaymentMethod: 'Wire Transfer'
        },
        tradeDetails: {
            preferredShippingMethod: 'Express Courier',
            incoterms: 'FOB',
            averageLeadTime: 14,
            minimumOrderQuantity: '£800'
        },
        priority: 3,
        tags: ['uk-supplier', 'historic-company', 'vegetable-specialist', 'breeding-program'],
        notes: 'Long-established company with breeding programs. Active in export markets. Good potential for partnership.',
        createdBy: 'system'
    }
];

async function addUKSeedCompanies() {
    try {
        // Connect to MongoDB
        console.log('🔄 Connecting to MongoDB...');
        await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/ebm', {
            useNewUrlParser: true,
            useUnifiedTopology: true
        });
        console.log('✅ Connected to MongoDB');

        // Check for existing UK companies to avoid duplicates
        console.log('🔍 Checking for existing UK companies...');
        const existingCodes = await SeedPartner.find({
            partnerCode: { $in: ukSeedCompanies.map(c => c.partnerCode) }
        }).select('partnerCode companyName');

        if (existingCodes.length > 0) {
            console.log('⚠️  Found existing companies:');
            existingCodes.forEach(c => console.log(`   - ${c.companyName} (${c.partnerCode})`));
            console.log('\n❓ Skipping duplicates and adding only new companies...');
            
            // Filter out existing companies
            const existingCodesSet = new Set(existingCodes.map(c => c.partnerCode));
            const newCompanies = ukSeedCompanies.filter(c => !existingCodesSet.has(c.partnerCode));
            
            if (newCompanies.length === 0) {
                console.log('✅ All UK companies already exist in database!');
                return;
            }
            
            console.log(`\n📝 Adding ${newCompanies.length} new UK seed companies...`);
            const created = await SeedPartner.insertMany(newCompanies);
            console.log(`✅ Added ${created.length} new UK seed companies`);
            created.forEach(partner => {
                console.log(`   - ${partner.companyName} (${partner.partnerCode})`);
            });
        } else {
            // Insert all UK companies
            console.log(`📝 Adding ${ukSeedCompanies.length} UK seed companies...`);
            const created = await SeedPartner.insertMany(ukSeedCompanies);
            console.log(`✅ Created ${created.length} UK seed companies:`);
            
            created.forEach(partner => {
                console.log(`   - ${partner.companyName} (${partner.partnerCode}) - ${partner.status}`);
            });
        }

        console.log('\n🎉 UK seed companies successfully added!');
        console.log('\n📊 Summary:');
        console.log(`   Total UK Companies: ${ukSeedCompanies.length}`);
        console.log(`   All Status: Prospective`);
        console.log(`   Region: Europe (United Kingdom)`);
        console.log(`   Ready for review and contact!`);
        
        console.log('\n🌐 View all partners at:');
        console.log('   http://localhost:3001/seed-partners');
        console.log('\n🇬🇧 Filter UK partners:');
        console.log('   http://localhost:3001/seed-partners?country=United%20Kingdom');

    } catch (error) {
        console.error('❌ Error adding UK seed companies:', error);
        if (error.code === 11000) {
            console.error('   Duplicate key error - some companies may already exist');
        }
    } finally {
        // Close MongoDB connection
        await mongoose.connection.close();
        console.log('\n👋 MongoDB connection closed');
        process.exit(0);
    }
}

// Run the script
console.log('🇬🇧 UK Seed Companies Import Script');
console.log('=====================================\n');
addUKSeedCompanies();
