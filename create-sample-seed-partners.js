// Script to create sample World Seed Partnership data
// Run with: node create-sample-seed-partners.js

require('dotenv').config();
const mongoose = require('mongoose');
const SeedPartner = require('./models/SeedPartner');

// Sample seed partner companies
const samplePartners = [
    {
        companyName: 'Dutch Seeds International B.V.',
        partnerCode: 'DSI-NL-001',
        partnershipType: 'International Supplier',
        status: 'Active',
        country: 'Netherlands',
        region: 'Europe',
        seedTypes: ['Vegetable Seeds', 'Flower Seeds', 'Organic Seeds'],
        primaryContact: {
            name: 'Jan van der Berg',
            title: 'Export Manager',
            email: 'j.vandenberg@dutchseeds.nl',
            phone: '+31-20-123-4567',
            mobile: '+31-6-9876-5432',
            whatsapp: '+31-6-9876-5432',
            preferredLanguage: 'English'
        },
        address: {
            street: 'Zaadweg 45',
            city: 'Amsterdam',
            postalCode: '1012 AB',
            country: 'Netherlands'
        },
        businessDetails: {
            website: 'https://www.dutchseeds.nl',
            yearEstablished: 1985,
            numberOfEmployees: '150-200',
            companyProfile: 'Leading European supplier of high-quality vegetable and flower seeds. Family-owned business with over 35 years of experience in seed breeding and international trade.'
        },
        financialTerms: {
            currency: 'EUR',
            paymentTerms: 'NET 60',
            preferredPaymentMethod: 'Wire Transfer'
        },
        tradeDetails: {
            preferredShippingMethod: 'Air Freight',
            incoterms: 'CIF',
            averageLeadTime: 21
        },
        certifications: [
            {
                certificationType: 'EU Organic',
                certificateNumber: 'EU-ORG-2024-12345',
                issuingAuthority: 'EU Organic Certification Body',
                issueDate: new Date('2024-01-15'),
                expiryDate: new Date('2026-01-15'),
                verified: true
            }
        ],
        priority: 1,
        partnershipStartDate: new Date('2022-03-15'),
        totalOrdersPlaced: 24,
        totalOrderValue: 485000,
        isActive: true,
        createdBy: 'system'
    },
    {
        companyName: 'Pacific Seed Company Ltd',
        partnerCode: 'PSC-CN-001',
        partnershipType: 'International Supplier',
        status: 'Active',
        country: 'China',
        region: 'Asia',
        seedTypes: ['Vegetable Seeds', 'Herb Seeds', 'Hybrid Seeds'],
        primaryContact: {
            name: 'Li Wei',
            title: 'International Sales Director',
            email: 'lwei@pacificseed.cn',
            phone: '+86-10-8765-4321',
            mobile: '+86-138-0123-4567',
            whatsapp: '+86-138-0123-4567',
            preferredLanguage: 'English'
        },
        address: {
            street: '88 Agricultural Road, Haidian District',
            city: 'Beijing',
            postalCode: '100089',
            country: 'China'
        },
        businessDetails: {
            website: 'https://www.pacificseed.cn',
            yearEstablished: 1998,
            numberOfEmployees: '500+',
            companyProfile: 'One of Asia\'s largest seed producers specializing in hybrid vegetable seeds. State-of-the-art breeding facilities and international export capabilities.'
        },
        financialTerms: {
            currency: 'USD',
            paymentTerms: 'Letter of Credit',
            preferredPaymentMethod: 'Letter of Credit'
        },
        tradeDetails: {
            preferredShippingMethod: 'Sea Freight',
            incoterms: 'FOB',
            averageLeadTime: 45,
            minimumOrderQuantity: '$10,000 USD'
        },
        certifications: [
            {
                certificationType: 'GlobalGAP',
                certificateNumber: 'GGAP-CN-2024-789',
                issuingAuthority: 'GlobalGAP Certification',
                issueDate: new Date('2024-02-01'),
                expiryDate: new Date('2025-02-01'),
                verified: true
            },
            {
                certificationType: 'Phytosanitary',
                certificateNumber: 'PHYTO-CN-2024-456',
                issuingAuthority: 'China AQSIQ',
                issueDate: new Date('2024-01-10'),
                expiryDate: new Date('2024-12-31'),
                verified: true
            }
        ],
        priority: 2,
        partnershipStartDate: new Date('2021-06-20'),
        totalOrdersPlaced: 18,
        totalOrderValue: 320000,
        isActive: true,
        createdBy: 'system'
    },
    {
        companyName: 'Heritage Seeds Co.',
        partnerCode: 'HSC-US-001',
        partnershipType: 'Domestic Supplier',
        status: 'Active',
        country: 'United States',
        region: 'North America',
        seedTypes: ['Heirloom Seeds', 'Organic Seeds', 'Vegetable Seeds', 'Native Seeds'],
        primaryContact: {
            name: 'Sarah Johnson',
            title: 'Business Development Manager',
            email: 'sjohnson@heritageseeds.com',
            phone: '+1-541-555-0123',
            mobile: '+1-541-555-0124',
            preferredLanguage: 'English'
        },
        address: {
            street: '2450 Seed Valley Road',
            city: 'Corvallis',
            state: 'Oregon',
            postalCode: '97330',
            country: 'United States'
        },
        businessDetails: {
            website: 'https://www.heritageseeds.com',
            yearEstablished: 2005,
            numberOfEmployees: '50-75',
            companyProfile: 'Specialized heirloom and organic seed producer committed to preserving rare and heritage varieties. USDA Organic certified with extensive catalog of open-pollinated seeds.'
        },
        financialTerms: {
            currency: 'USD',
            paymentTerms: 'NET 30',
            preferredPaymentMethod: 'ACH'
        },
        tradeDetails: {
            preferredShippingMethod: 'Ground',
            incoterms: 'DDP',
            averageLeadTime: 7
        },
        certifications: [
            {
                certificationType: 'USDA Organic',
                certificateNumber: 'USDA-ORG-2024-OR-5678',
                issuingAuthority: 'Oregon Tilth',
                issueDate: new Date('2024-01-01'),
                expiryDate: new Date('2025-01-01'),
                verified: true
            },
            {
                certificationType: 'Non-GMO Project',
                certificateNumber: 'NGP-2024-3456',
                issuingAuthority: 'Non-GMO Project',
                issueDate: new Date('2023-11-15'),
                expiryDate: new Date('2025-11-15'),
                verified: true
            }
        ],
        priority: 1,
        partnershipStartDate: new Date('2020-01-15'),
        totalOrdersPlaced: 42,
        totalOrderValue: 680000,
        isActive: true,
        createdBy: 'system'
    },
    {
        companyName: 'Australian Seed Growers',
        partnerCode: 'ASG-AU-001',
        partnershipType: 'International Client',
        status: 'Active',
        country: 'Australia',
        region: 'Australia/Oceania',
        seedTypes: ['Vegetable Seeds', 'Flower Seeds', 'Native Seeds'],
        primaryContact: {
            name: 'Michael Thompson',
            title: 'Procurement Manager',
            email: 'mthompson@ausseedseed.au',
            phone: '+61-3-9876-5432',
            mobile: '+61-4-1234-5678',
            preferredLanguage: 'English'
        },
        address: {
            street: '156 Farming Lane',
            city: 'Melbourne',
            state: 'Victoria',
            postalCode: '3000',
            country: 'Australia'
        },
        businessDetails: {
            website: 'https://www.ausseedseed.au',
            yearEstablished: 2010,
            numberOfEmployees: '100-150',
            companyProfile: 'Major Australian seed distributor looking for reliable international suppliers. Strong distribution network across Australia and New Zealand.'
        },
        financialTerms: {
            currency: 'AUD',
            paymentTerms: 'NET 30',
            preferredPaymentMethod: 'Wire Transfer'
        },
        tradeDetails: {
            preferredShippingMethod: 'Air Freight',
            incoterms: 'DAP',
            averageLeadTime: 14
        },
        priority: 2,
        partnershipStartDate: new Date('2023-09-01'),
        totalOrdersPlaced: 8,
        totalOrderValue: 125000,
        isActive: true,
        createdBy: 'system'
    },
    {
        companyName: 'BioSemillas Argentina S.A.',
        partnerCode: 'BSA-AR-001',
        partnershipType: 'Both Supplier & Client',
        status: 'Prospective',
        country: 'Argentina',
        region: 'South America',
        seedTypes: ['Vegetable Seeds', 'Grain Seeds', 'Cover Crop Seeds'],
        primaryContact: {
            name: 'Carlos Mendez',
            title: 'CEO',
            email: 'cmendez@biosemillas.ar',
            phone: '+54-11-4567-8900',
            mobile: '+54-9-11-6543-2100',
            whatsapp: '+54-9-11-6543-2100',
            preferredLanguage: 'Spanish'
        },
        address: {
            street: 'Avenida Agricultura 789',
            city: 'Buenos Aires',
            postalCode: 'C1010',
            country: 'Argentina'
        },
        businessDetails: {
            website: 'https://www.biosemillas.ar',
            yearEstablished: 2015,
            numberOfEmployees: '75-100',
            companyProfile: 'Emerging South American seed company with strong local market presence. Interested in both importing specialty seeds and exporting native varieties.'
        },
        financialTerms: {
            currency: 'USD',
            paymentTerms: 'Prepayment',
            preferredPaymentMethod: 'Wire Transfer'
        },
        tradeDetails: {
            preferredShippingMethod: 'Sea Freight',
            incoterms: 'FOB',
            averageLeadTime: 30
        },
        priority: 3,
        partnershipStartDate: null,
        totalOrdersPlaced: 0,
        totalOrderValue: 0,
        isActive: true,
        createdBy: 'system',
        notes: 'Initial contact made. Awaiting sample order to establish relationship. Strong potential for long-term partnership in South American market.'
    },
    {
        companyName: 'Kenya Seeds Ltd',
        partnerCode: 'KSL-KE-001',
        partnershipType: 'International Client',
        status: 'Prospective',
        country: 'Kenya',
        region: 'Africa',
        seedTypes: ['Vegetable Seeds', 'Grain Seeds', 'Drought-Resistant Seeds'],
        primaryContact: {
            name: 'Amani Ochieng',
            title: 'Import Manager',
            email: 'aochieng@kenyaseeds.co.ke',
            phone: '+254-20-123-4567',
            mobile: '+254-722-345-678',
            whatsapp: '+254-722-345-678',
            preferredLanguage: 'English'
        },
        address: {
            street: 'Agricultural Plaza, Mombasa Road',
            city: 'Nairobi',
            postalCode: '00100',
            country: 'Kenya'
        },
        businessDetails: {
            website: 'https://www.kenyaseeds.co.ke',
            yearEstablished: 2008,
            numberOfEmployees: '50-75',
            companyProfile: 'Leading East African seed distributor focused on climate-resilient varieties. Expanding import program to serve growing agricultural sector.'
        },
        financialTerms: {
            currency: 'USD',
            paymentTerms: 'Letter of Credit',
            preferredPaymentMethod: 'Letter of Credit'
        },
        tradeDetails: {
            preferredShippingMethod: 'Sea Freight',
            incoterms: 'CIF',
            averageLeadTime: 35,
            minimumOrderQuantity: '$15,000 USD'
        },
        priority: 3,
        partnershipStartDate: null,
        totalOrdersPlaced: 0,
        totalOrderValue: 0,
        isActive: true,
        createdBy: 'system',
        notes: 'Very interested in drought-resistant and locally-adapted varieties. Requires phytosanitary certificates for all shipments.'
    }
];

async function createSamplePartners() {
    try {
        // Connect to MongoDB
        console.log('🔄 Connecting to MongoDB...');
        await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/ebm', {
            useNewUrlParser: true,
            useUnifiedTopology: true
        });
        console.log('✅ Connected to MongoDB');

        // Clear existing seed partners (optional - comment out if you want to keep existing data)
        console.log('🗑️ Clearing existing seed partners...');
        await SeedPartner.deleteMany({});
        console.log('✅ Cleared existing data');

        // Insert sample partners
        console.log('📝 Creating sample seed partners...');
        const created = await SeedPartner.insertMany(samplePartners);
        console.log(`✅ Created ${created.length} sample seed partners:`);
        
        created.forEach(partner => {
            console.log(`   - ${partner.companyName} (${partner.partnerCode}) - ${partner.status}`);
        });

        console.log('\n🎉 Sample data creation complete!');
        console.log('\nYou can now view your World Seed Partnership dashboard at:');
        console.log('http://localhost:3000/seed-partners');

    } catch (error) {
        console.error('❌ Error creating sample partners:', error);
    } finally {
        // Close MongoDB connection
        await mongoose.connection.close();
        console.log('\n👋 MongoDB connection closed');
        process.exit(0);
    }
}

// Run the script
createSamplePartners();
