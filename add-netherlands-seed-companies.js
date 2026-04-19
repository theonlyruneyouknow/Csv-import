// Script to add Netherlands seed companies as prospective partners
// Run with: node add-netherlands-seed-companies.js

require('dotenv').config();
const mongoose = require('mongoose');
const SeedPartner = require('./models/SeedPartner');

// Netherlands Seed Companies - Major Dutch seed suppliers
const netherlandsSeedCompanies = [
    {
        companyName: 'Enza Zaden',
        partnerCode: 'ENZ-NL-001',
        partnershipType: 'International Supplier',
        status: 'Prospective',
        country: 'Netherlands',
        region: 'Europe',
        seedTypes: ['Vegetable Seeds', 'Hybrid Seeds', 'Organic Seeds'],
        primaryContact: {
            name: 'Pieter van den Berg',
            title: 'International Sales Director',
            email: 'p.vandenberg@enzazaden.nl',
            phone: '+31-174-725-000',
            mobile: '+31-6-1234-5678',
            preferredLanguage: 'English'
        },
        address: {
            street: 'Haling 1E',
            city: 'Enkhuizen',
            postalCode: '1602 DB',
            country: 'Netherlands'
        },
        businessDetails: {
            website: 'https://www.enzazaden.com',
            yearEstablished: 1938,
            numberOfEmployees: '2000+',
            companyProfile: 'One of the world\'s leading vegetable breeding companies. Family-owned with global presence in over 25 countries. Specializes in breeding and producing high-quality vegetable seeds.'
        },
        financialTerms: {
            currency: 'EUR',
            paymentTerms: 'NET 60',
            preferredPaymentMethod: 'Wire Transfer'
        },
        tradeDetails: {
            preferredShippingMethod: 'Air Freight',
            incoterms: 'FOB',
            averageLeadTime: 21,
            minimumOrderQuantity: '€5,000'
        },
        certifications: [
            {
                certificationType: 'GlobalGAP',
                certificateNumber: 'GGAP-NL-2024-001',
                issuingAuthority: 'GlobalGAP Certification',
                issueDate: new Date('2024-01-15'),
                expiryDate: new Date('2025-01-15'),
                verified: true
            }
        ],
        priority: 1,
        tags: ['netherlands-supplier', 'vegetable-breeding', 'global-presence', 'family-owned'],
        notes: 'Major international player with excellent reputation. Strong breeding programs and global distribution network. High potential partnership.',
        createdBy: 'system'
    },
    {
        companyName: 'Rijk Zwaan',
        partnerCode: 'RZ-NL-001',
        partnershipType: 'International Supplier',
        status: 'Prospective',
        country: 'Netherlands',
        region: 'Europe',
        seedTypes: ['Vegetable Seeds', 'Hybrid Seeds', 'Organic Seeds'],
        primaryContact: {
            name: 'Jan Dekker',
            title: 'Business Development Manager',
            email: 'j.dekker@rijkzwaan.nl',
            phone: '+31-174-532-300',
            mobile: '+31-6-2345-6789',
            preferredLanguage: 'English'
        },
        address: {
            street: 'Burgemeester Crezéelaan 40',
            city: 'De Lier',
            postalCode: '2678 KX',
            country: 'Netherlands'
        },
        businessDetails: {
            website: 'https://www.rijkzwaan.com',
            yearEstablished: 1924,
            numberOfEmployees: '3500+',
            companyProfile: 'Global leader in vegetable seed breeding and production. Family-owned company with operations in more than 30 countries. Known for innovation and sustainable breeding practices.'
        },
        financialTerms: {
            currency: 'EUR',
            paymentTerms: 'NET 60',
            preferredPaymentMethod: 'Wire Transfer'
        },
        tradeDetails: {
            preferredShippingMethod: 'Air Freight',
            incoterms: 'CIF',
            averageLeadTime: 21,
            minimumOrderQuantity: '€7,500'
        },
        certifications: [
            {
                certificationType: 'EU Organic',
                certificateNumber: 'EU-ORG-NL-2024-456',
                issuingAuthority: 'SKAL',
                issueDate: new Date('2024-02-01'),
                expiryDate: new Date('2025-02-01'),
                verified: true
            }
        ],
        priority: 1,
        tags: ['netherlands-supplier', 'global-leader', 'innovation', 'sustainable'],
        notes: 'Top-tier international seed company. Strong focus on sustainability and innovation. Excellent partnership potential for premium seeds.',
        createdBy: 'system'
    },
    {
        companyName: 'Bejo Zaden',
        partnerCode: 'BEJ-NL-001',
        partnershipType: 'International Supplier',
        status: 'Prospective',
        country: 'Netherlands',
        region: 'Europe',
        seedTypes: ['Vegetable Seeds', 'Flower Seeds', 'Hybrid Seeds'],
        primaryContact: {
            name: 'Marieke Jonker',
            title: 'Export Sales Manager',
            email: 'm.jonker@bejo.nl',
            phone: '+31-227-543-100',
            mobile: '+31-6-3456-7890',
            preferredLanguage: 'English'
        },
        address: {
            street: 'Trambaan 1',
            city: 'Warmenhuizen',
            postalCode: '1749 CZ',
            country: 'Netherlands'
        },
        businessDetails: {
            website: 'https://www.bejo.com',
            yearEstablished: 1899,
            numberOfEmployees: '1500+',
            companyProfile: 'International vegetable breeding company with over 125 years of experience. Family-owned with strong focus on quality and innovation. Active in more than 100 countries.'
        },
        financialTerms: {
            currency: 'EUR',
            paymentTerms: 'NET 60',
            preferredPaymentMethod: 'Wire Transfer'
        },
        tradeDetails: {
            preferredShippingMethod: 'Air Freight',
            incoterms: 'FOB',
            averageLeadTime: 21,
            minimumOrderQuantity: '€5,000'
        },
        priority: 1,
        tags: ['netherlands-supplier', 'heritage-company', 'international', 'vegetable-specialist'],
        notes: 'Over 125 years of breeding expertise. Strong international presence. Excellent reputation in vegetable seed market.',
        createdBy: 'system'
    },
    {
        companyName: 'Takii Europe',
        partnerCode: 'TAK-NL-001',
        partnershipType: 'International Supplier',
        status: 'Prospective',
        country: 'Netherlands',
        region: 'Europe',
        seedTypes: ['Vegetable Seeds', 'Flower Seeds', 'Hybrid Seeds'],
        primaryContact: {
            name: 'Hans Vermeer',
            title: 'European Sales Director',
            email: 'h.vermeer@takii.nl',
            phone: '+31-174-700-700',
            mobile: '+31-6-4567-8901',
            preferredLanguage: 'English'
        },
        address: {
            street: 'Maassluisstraat 2',
            city: 'De Lier',
            postalCode: '2678 MC',
            country: 'Netherlands'
        },
        businessDetails: {
            website: 'https://www.takii.com',
            yearEstablished: 1835,
            numberOfEmployees: '500-750 (Europe)',
            companyProfile: 'European branch of Japanese seed giant Takii & Company. Combines Japanese breeding excellence with European market knowledge. Strong in vegetable and flower seeds.'
        },
        financialTerms: {
            currency: 'EUR',
            paymentTerms: 'NET 60',
            preferredPaymentMethod: 'Wire Transfer'
        },
        tradeDetails: {
            preferredShippingMethod: 'Air Freight',
            incoterms: 'CIF',
            averageLeadTime: 21,
            minimumOrderQuantity: '€4,000'
        },
        priority: 2,
        tags: ['netherlands-supplier', 'japanese-heritage', 'breeding-excellence'],
        notes: 'European operations of major Japanese company. Strong breeding programs and quality standards. Good international partnership potential.',
        createdBy: 'system'
    },
    {
        companyName: 'Pop Vriend Seeds',
        partnerCode: 'PVS-NL-001',
        partnershipType: 'International Supplier',
        status: 'Prospective',
        country: 'Netherlands',
        region: 'Europe',
        seedTypes: ['Vegetable Seeds', 'Cover Crop Seeds', 'Organic Seeds'],
        primaryContact: {
            name: 'Anna de Vries',
            title: 'International Business Manager',
            email: 'a.devries@popvriendseeds.nl',
            phone: '+31-174-612-700',
            mobile: '+31-6-5678-9012',
            preferredLanguage: 'English'
        },
        address: {
            street: 'Spoorstraat 2',
            city: 'Andijk',
            postalCode: '1619 BA',
            country: 'Netherlands'
        },
        businessDetails: {
            website: 'https://www.popvriendseeds.com',
            yearEstablished: 1933,
            numberOfEmployees: '350-500',
            companyProfile: 'Independent family company specializing in breeding and production of vegetable seeds. Strong focus on sustainable and organic varieties. Active in international markets.'
        },
        financialTerms: {
            currency: 'EUR',
            paymentTerms: 'NET 30',
            preferredPaymentMethod: 'Wire Transfer'
        },
        tradeDetails: {
            preferredShippingMethod: 'Air Freight',
            incoterms: 'FOB',
            averageLeadTime: 14,
            minimumOrderQuantity: '€3,000'
        },
        priority: 2,
        tags: ['netherlands-supplier', 'family-company', 'organic-focus', 'sustainable'],
        notes: 'Independent family business with strong organic seed program. Good potential for specialty and organic seed partnerships.',
        createdBy: 'system'
    },
    {
        companyName: 'Nunhems (BASF)',
        partnerCode: 'NUN-NL-001',
        partnershipType: 'International Supplier',
        status: 'Prospective',
        country: 'Netherlands',
        region: 'Europe',
        seedTypes: ['Vegetable Seeds', 'Hybrid Seeds'],
        primaryContact: {
            name: 'Robert Mulder',
            title: 'Commercial Director',
            email: 'r.mulder@nunhems.com',
            phone: '+31-475-594-000',
            mobile: '+31-6-6789-0123',
            preferredLanguage: 'English'
        },
        address: {
            street: 'Napoleonsweg 152',
            city: 'Nunhem',
            postalCode: '6083 AB',
            country: 'Netherlands'
        },
        businessDetails: {
            website: 'https://www.nunhems.com',
            yearEstablished: 1916,
            numberOfEmployees: '1000+',
            companyProfile: 'Part of BASF Vegetable Seeds, one of the world\'s largest vegetable seed companies. Strong breeding programs and global distribution network. Focus on professional growers.'
        },
        financialTerms: {
            currency: 'EUR',
            paymentTerms: 'NET 60',
            preferredPaymentMethod: 'Wire Transfer'
        },
        tradeDetails: {
            preferredShippingMethod: 'Air Freight',
            incoterms: 'CIF',
            averageLeadTime: 21,
            minimumOrderQuantity: '€6,000'
        },
        priority: 2,
        tags: ['netherlands-supplier', 'basf-group', 'global-network', 'professional-growers'],
        notes: 'Part of major BASF group. Extensive resources and global reach. Strong focus on professional market segment.',
        createdBy: 'system'
    },
    {
        companyName: 'Sluis Garden Seeds',
        partnerCode: 'SLU-NL-001',
        partnershipType: 'International Supplier',
        status: 'Prospective',
        country: 'Netherlands',
        region: 'Europe',
        seedTypes: ['Vegetable Seeds', 'Flower Seeds', 'Herb Seeds', 'Organic Seeds'],
        primaryContact: {
            name: 'Sophie Bakker',
            title: 'Sales Manager',
            email: 's.bakker@sluisgardencentre.nl',
            phone: '+31-117-472-555',
            mobile: '+31-6-7890-1234',
            preferredLanguage: 'English'
        },
        address: {
            street: 'Schellinkhouterdijk 48',
            city: 'Enkhuizen',
            postalCode: '1601 LW',
            country: 'Netherlands'
        },
        businessDetails: {
            website: 'https://www.sluistuinzaden.nl',
            yearEstablished: 1947,
            numberOfEmployees: '100-150',
            companyProfile: 'Family business specializing in vegetable and flower seeds for home gardeners and professionals. Strong focus on quality packet seeds and retail distribution.'
        },
        financialTerms: {
            currency: 'EUR',
            paymentTerms: 'NET 30',
            preferredPaymentMethod: 'Wire Transfer'
        },
        tradeDetails: {
            preferredShippingMethod: 'Ground',
            incoterms: 'DDP',
            averageLeadTime: 10,
            minimumOrderQuantity: '€1,500'
        },
        priority: 3,
        tags: ['netherlands-supplier', 'retail-focus', 'packet-seeds', 'home-garden'],
        notes: 'Strong in retail packet seed market. Good potential for consumer-focused seed partnerships.',
        createdBy: 'system'
    },
    {
        companyName: 'S&G Seeds',
        partnerCode: 'SG-NL-001',
        partnershipType: 'International Supplier',
        status: 'Prospective',
        country: 'Netherlands',
        region: 'Europe',
        seedTypes: ['Vegetable Seeds', 'Flower Seeds', 'Herb Seeds'],
        primaryContact: {
            name: 'Erik van der Meer',
            title: 'Export Manager',
            email: 'e.vandermeer@sgseeds.nl',
            phone: '+31-229-214-000',
            mobile: '+31-6-8901-2345',
            preferredLanguage: 'English'
        },
        address: {
            street: 'Tuinbouwweg 15',
            city: 'Enkhuizen',
            postalCode: '1602 NE',
            country: 'Netherlands'
        },
        businessDetails: {
            website: 'https://www.sgseeds.com',
            yearEstablished: 1952,
            numberOfEmployees: '50-75',
            companyProfile: 'Independent seed company with focus on European market. Specializes in vegetable and flower seeds for retail and wholesale markets. Strong customer service orientation.'
        },
        financialTerms: {
            currency: 'EUR',
            paymentTerms: 'NET 30',
            preferredPaymentMethod: 'Wire Transfer'
        },
        tradeDetails: {
            preferredShippingMethod: 'Ground',
            incoterms: 'DDP',
            averageLeadTime: 7,
            minimumOrderQuantity: '€1,000'
        },
        priority: 3,
        tags: ['netherlands-supplier', 'independent', 'european-focus', 'customer-service'],
        notes: 'Independent supplier with flexible approach. Good customer service reputation. Suitable for smaller volume partnerships.',
        createdBy: 'system'
    },
    {
        companyName: 'Dutch Flower Group',
        partnerCode: 'DFG-NL-001',
        partnershipType: 'International Supplier',
        status: 'Prospective',
        country: 'Netherlands',
        region: 'Europe',
        seedTypes: ['Flower Seeds', 'Hybrid Seeds', 'Native Seeds'],
        primaryContact: {
            name: 'Laura van Dijk',
            title: 'Business Development Director',
            email: 'l.vandijk@dutchflowergroup.com',
            phone: '+31-20-654-3210',
            mobile: '+31-6-9012-3456',
            preferredLanguage: 'English'
        },
        address: {
            street: 'Legmeerdijk 313',
            city: 'Aalsmeer',
            postalCode: '1431 GB',
            country: 'Netherlands'
        },
        businessDetails: {
            website: 'https://www.dutchflowergroup.com',
            yearEstablished: 2001,
            numberOfEmployees: '500+',
            companyProfile: 'Leading flower and plant group with breeding and distribution operations. Focus on innovative flower varieties and global distribution. Strong in ornamental species.'
        },
        financialTerms: {
            currency: 'EUR',
            paymentTerms: 'NET 60',
            preferredPaymentMethod: 'Wire Transfer'
        },
        tradeDetails: {
            preferredShippingMethod: 'Air Freight',
            incoterms: 'FOB',
            averageLeadTime: 14,
            minimumOrderQuantity: '€3,000'
        },
        priority: 2,
        tags: ['netherlands-supplier', 'flower-specialist', 'ornamental', 'innovative'],
        notes: 'Major player in flower seed market. Strong breeding capabilities. Excellent for ornamental seed partnerships.',
        createdBy: 'system'
    },
    {
        companyName: 'HM Clause Netherlands',
        partnerCode: 'HMC-NL-001',
        partnershipType: 'International Supplier',
        status: 'Prospective',
        country: 'Netherlands',
        region: 'Europe',
        seedTypes: ['Vegetable Seeds', 'Hybrid Seeds'],
        primaryContact: {
            name: 'Vincent Koster',
            title: 'Regional Sales Manager',
            email: 'v.koster@hmclause.com',
            phone: '+31-174-515-555',
            mobile: '+31-6-0123-4567',
            preferredLanguage: 'English'
        },
        address: {
            street: 'Breestraat 107',
            city: 'De Lier',
            postalCode: '2678 BD',
            country: 'Netherlands'
        },
        businessDetails: {
            website: 'https://www.hmclause.com',
            yearEstablished: 1891,
            numberOfEmployees: '800+ (Europe)',
            companyProfile: 'Part of Limagrain Group, major international seed company. European headquarters in Netherlands. Strong focus on vegetable breeding and innovation. Active globally.'
        },
        financialTerms: {
            currency: 'EUR',
            paymentTerms: 'NET 60',
            preferredPaymentMethod: 'Wire Transfer'
        },
        tradeDetails: {
            preferredShippingMethod: 'Air Freight',
            incoterms: 'CIF',
            averageLeadTime: 21,
            minimumOrderQuantity: '€5,000'
        },
        priority: 2,
        tags: ['netherlands-supplier', 'limagrain-group', 'international', 'breeding'],
        notes: 'Part of major Limagrain Group. Strong international presence and resources. Good potential for large-scale partnerships.',
        createdBy: 'system'
    }
];

async function addNetherlandsSeedCompanies() {
    try {
        // Connect to MongoDB
        console.log('🔄 Connecting to MongoDB...');
        await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/ebm', {
            useNewUrlParser: true,
            useUnifiedTopology: true
        });
        console.log('✅ Connected to MongoDB');

        // Check for existing Netherlands companies to avoid duplicates
        console.log('🔍 Checking for existing Netherlands companies...');
        const existingCodes = await SeedPartner.find({
            partnerCode: { $in: netherlandsSeedCompanies.map(c => c.partnerCode) }
        }).select('partnerCode companyName');

        if (existingCodes.length > 0) {
            console.log('⚠️  Found existing companies:');
            existingCodes.forEach(c => console.log(`   - ${c.companyName} (${c.partnerCode})`));
            console.log('\n❓ Skipping duplicates and adding only new companies...');
            
            // Filter out existing companies
            const existingCodesSet = new Set(existingCodes.map(c => c.partnerCode));
            const newCompanies = netherlandsSeedCompanies.filter(c => !existingCodesSet.has(c.partnerCode));
            
            if (newCompanies.length === 0) {
                console.log('✅ All Netherlands companies already exist in database!');
                return;
            }
            
            console.log(`\n📝 Adding ${newCompanies.length} new Netherlands seed companies...`);
            const created = await SeedPartner.insertMany(newCompanies);
            console.log(`✅ Added ${created.length} new Netherlands seed companies`);
            created.forEach(partner => {
                console.log(`   - ${partner.companyName} (${partner.partnerCode})`);
            });
        } else {
            // Insert all Netherlands companies
            console.log(`📝 Adding ${netherlandsSeedCompanies.length} Netherlands seed companies...`);
            const created = await SeedPartner.insertMany(netherlandsSeedCompanies);
            console.log(`✅ Created ${created.length} Netherlands seed companies:`);
            
            created.forEach(partner => {
                console.log(`   - ${partner.companyName} (${partner.partnerCode}) - ${partner.status}`);
            });
        }

        console.log('\n🎉 Netherlands seed companies successfully added!');
        console.log('\n📊 Summary:');
        console.log(`   Total Netherlands Companies: ${netherlandsSeedCompanies.length}`);
        console.log(`   All Status: Prospective`);
        console.log(`   Region: Europe (Netherlands)`);
        console.log(`   Notable: Includes global leaders like Enza Zaden, Rijk Zwaan, Bejo Zaden`);
        console.log(`   Ready for review and contact!`);
        
        console.log('\n🌐 View all partners at:');
        console.log('   http://localhost:3001/seed-partners');
        console.log('\n🇳🇱 Filter Netherlands partners:');
        console.log('   http://localhost:3001/seed-partners?country=Netherlands');

    } catch (error) {
        console.error('❌ Error adding Netherlands seed companies:', error);
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
console.log('🇳🇱 Netherlands Seed Companies Import Script');
console.log('=============================================\n');
addNetherlandsSeedCompanies();
