const mongoose = require('mongoose');
const OrganicVendor = require('./models/OrganicVendor');

async function importRemainingVendors() {
    try {
        await mongoose.connect('mongodb://localhost:27017/purchase-orders');
        console.log('✅ Connected to MongoDB');

        // Additional vendors from the spreadsheet
        const remainingVendors = [
            {
                vendorName: 'MYRTLE CREEK FARM LLC',
                internalId: '487',
                lastOrganicCertificationDate: new Date('2024-10-22'),
                certificate: {
                    filename: 'Myrtle Creek Farm LLC Certificate Issue Date 20241022.pdf',
                    data: '',
                    mimeType: 'application/pdf',
                    uploadDate: new Date()
                },
                operationsProfile: {
                    filename: 'Myrtle Creek Farm LLC Operation Profile (8150000858) updated on 20241022.pdf',
                    data: '',
                    mimeType: 'application/pdf',
                    uploadDate: new Date()
                },
                tscItem: 'ORG-FARM-487',
                tscDescription: 'Organic farm production and specialty crops',
                organicDatabaseId: '8150000858',
                status: 'Active',
                notes: 'Certifier: Oregon Tilth Certified Organic | Anniversary Date: 10/22/2025'
            },
            {
                vendorName: 'OMEGA SEED INC',
                internalId: '255',
                lastOrganicCertificationDate: new Date('2024-10-22'),
                certificate: {
                    filename: 'Omega Seed Certificate Issue Date 20241022.pdf',
                    data: '',
                    mimeType: 'application/pdf',
                    uploadDate: new Date()
                },
                operationsProfile: {
                    filename: 'Omega Seed Operation Profile (5561002349) updated on 20241022.pdf',
                    data: '',
                    mimeType: 'application/pdf',
                    uploadDate: new Date()
                },
                tscItem: 'ORG-SEEDS-255',
                tscDescription: 'Organic seed varieties and distribution',
                organicDatabaseId: '5561002349',
                status: 'Active',
                notes: 'Certifier: CCOF Certification Services, LLC | Anniversary Date: 10/22/2025'
            },
            {
                vendorName: 'OREGON STATE UNIVERSITY',
                internalId: '871',
                lastOrganicCertificationDate: new Date('2025-01-07'),
                certificate: {
                    filename: 'Oregon State University Lewis-Brown Farm Certificate Issue Date 20250107.pdf',
                    data: '',
                    mimeType: 'application/pdf',
                    uploadDate: new Date()
                },
                operationsProfile: {
                    filename: 'Oregon State University Lewis-Brown Farm Operation Profile (8150001620) updated on 20250107.pdf',
                    data: '',
                    mimeType: 'application/pdf',
                    uploadDate: new Date()
                },
                tscItem: 'ORG-RESEARCH-871',
                tscDescription: 'University research farm and seed development',
                organicDatabaseId: '8150001620',
                status: 'Active',
                notes: 'Certifier: Oregon Tilth Certified Organic | Anniversary Date: 4/1/2026'
            },
            {
                vendorName: 'OSBORNE SEED COMPANY',
                internalId: '260',
                lastOrganicCertificationDate: new Date('2025-07-26'),
                certificate: {
                    filename: 'Osborne Quality Seeds, a division of Gowan Seed Company, LLC Certificate_2780003366 20250726.pdf',
                    data: '',
                    mimeType: 'application/pdf',
                    uploadDate: new Date()
                },
                operationsProfile: {
                    filename: 'Osborne Quality Seeds, a division of Gowan Seed Company, LLC 2780003366_OperationProfile 20250726.pdf',
                    data: '',
                    mimeType: 'application/pdf',
                    uploadDate: new Date()
                },
                tscItem: 'ORG-SEEDS-260',
                tscDescription: 'Quality organic seed production and distribution',
                organicDatabaseId: '2780003366',
                status: 'Active',
                notes: 'Certifier: Washington State Department of Agriculture Organic Program | Anniversary Date: 7/26/2026'
            },
            {
                vendorName: 'PAN AMERICAN',
                internalId: '263',
                lastOrganicCertificationDate: new Date('2025-07-18'),
                certificate: {
                    filename: 'Pan American (Ball) Certificate_8830000503_07-18-2025 Issue date 202507181.pdf',
                    data: '',
                    mimeType: 'application/pdf',
                    uploadDate: new Date()
                },
                operationsProfile: {
                    filename: 'Pan American (Ball) 8830000503_OperationProfile 20250718.pdf',
                    data: '',
                    mimeType: 'application/pdf',
                    uploadDate: new Date()
                },
                tscItem: 'ORG-SEEDS-263',
                tscDescription: 'Commercial organic seed and plant production',
                organicDatabaseId: '8830000503',
                status: 'Active',
                notes: 'Certifier: Organic Crop Improvement Association'
            },
            {
                vendorName: 'PIETERPIKZONEN BV HOLLAND',
                internalId: '26',
                lastOrganicCertificationDate: new Date('2024-09-24'),
                certificate: {
                    filename: 'PieterPikzonen BV Certificate validity period from 02 May 2023 to 31 December 2024.pdf',
                    data: '',
                    mimeType: 'application/pdf',
                    uploadDate: new Date()
                },
                tscItem: 'ORG-SEEDS-026',
                tscDescription: 'European organic seed varieties',
                status: 'Certification Expired',
                notes: 'Certifier: Skal Biocontrole | Anniversary Date: 9/24/2025 | EXPIRED - NEEDS RENEWAL'
            },
            {
                vendorName: 'PRAYING MANTIS FARM',
                internalId: '278',
                lastOrganicCertificationDate: new Date('2024-10-15'),
                certificate: {
                    filename: 'Praying Mantis Farm Certificate Issue Date 20241015.pdf',
                    data: '',
                    mimeType: 'application/pdf',
                    uploadDate: new Date()
                },
                operationsProfile: {
                    filename: 'Praying Mantis Farm Operation Profile (8150000115) updated on 20241015.pdf',
                    data: '',
                    mimeType: 'application/pdf',
                    uploadDate: new Date()
                },
                tscItem: 'ORG-FARM-278',
                tscDescription: 'Small scale organic farm and seed saving',
                organicDatabaseId: '8150000115',
                status: 'Active',
                notes: 'Certifier: Oregon Tilth Certified Organic'
            },
            {
                vendorName: 'PURE LINE SEEDS INC',
                internalId: '280',
                lastOrganicCertificationDate: new Date('2024-11-18'),
                certificate: {
                    filename: 'Pure Line Seeds, Inc. Certificate Issue Date 20241122.pdf',
                    data: '',
                    mimeType: 'application/pdf',
                    uploadDate: new Date()
                },
                operationsProfile: {
                    filename: 'Pure Line Seeds, Inc. Operation Profile (2780003261) updated on 20241122.pdf',
                    data: '',
                    mimeType: 'application/pdf',
                    uploadDate: new Date()
                },
                tscItem: 'ORG-SEEDS-280',
                tscDescription: 'Pure line organic seed varieties',
                organicDatabaseId: '2780003261',
                status: 'Active',
                notes: 'Certifier: Washington State Department of Agriculture | Anniversary Date: 11/18/2025'
            },
            {
                vendorName: 'SATIVA RHEINAU GMBH',
                internalId: '26B',
                lastOrganicCertificationDate: new Date('2024-10-28'),
                certificate: {
                    filename: 'Sativa Sativa_Rheinau_AG_CH-U.S._Organic_Equivalency_Arrangement_EN_2025 valid intil 20251231.pdf',
                    data: '',
                    mimeType: 'application/pdf',
                    uploadDate: new Date()
                },
                operationsProfile: {
                    filename: 'Sativa Sativa_Rheinau_AG_CH-Bio_BioSuisse_Demeter_2025_EN valid until 20251231.pdf',
                    data: '',
                    mimeType: 'application/pdf',
                    uploadDate: new Date()
                },
                tscItem: 'ORG-SEEDS-026B',
                tscDescription: 'Swiss organic and biodynamic seeds',
                status: 'Active',
                notes: 'Certifier: bio.inspecta AG | Anniversary Date: 12/31/2025'
            },
            {
                vendorName: 'SEED DEVELOPMENTS',
                internalId: '28',
                lastOrganicCertificationDate: new Date('2025-05-31'),
                certificate: {
                    filename: 'Seed Developments Organic Certificate 2025-2026 valid until 20260531.pdf',
                    data: '',
                    mimeType: 'application/pdf',
                    uploadDate: new Date()
                },
                operationsProfile: {
                    filename: 'Seed Developments Organic Certificate 2025-2026 valid until 20260531.pdf',
                    data: '',
                    mimeType: 'application/pdf',
                    uploadDate: new Date()
                },
                tscItem: 'ORG-SEEDS-028',
                tscDescription: 'UK organic seed development and production',
                status: 'Active',
                notes: 'Certifier: Soil Association Certification Ltd (SACL) | Anniversary Date: 5/31/2025'
            },
            {
                vendorName: 'SEED DYNAMICS INC',
                internalId: '293',
                lastOrganicCertificationDate: new Date('2025-06-26'),
                certificate: {
                    filename: 'Seed Dynamics Certificate_5561002447_06-26-2025.pdf',
                    data: '',
                    mimeType: 'application/pdf',
                    uploadDate: new Date()
                },
                operationsProfile: {
                    filename: 'Seed Dynamics 5561002447_OperationProfile updated 20250626.pdf',
                    data: '',
                    mimeType: 'application/pdf',
                    uploadDate: new Date()
                },
                tscItem: 'ORG-SEEDS-293',
                tscDescription: 'Dynamic organic seed varieties and innovation',
                organicDatabaseId: '5561002447',
                status: 'Active',
                notes: 'Certifier: CCOF Certification Services, LLC'
            },
            {
                vendorName: 'SEEDS BY DESIGN',
                internalId: '300',
                lastOrganicCertificationDate: new Date('2024-10-22'),
                certificate: {
                    filename: 'Seed Savers Exchange 2023 SSE OG CERT Processor (1) 20241114.pdf',
                    data: '',
                    mimeType: 'application/pdf',
                    uploadDate: new Date()
                },
                operationsProfile: {
                    filename: 'Seed Savers Exchange Operation Profile (5400000129) updated on 20240718.pdf',
                    data: '',
                    mimeType: 'application/pdf',
                    uploadDate: new Date()
                },
                tscItem: 'ORG-SEEDS-300',
                tscDescription: 'Heritage and heirloom organic seed varieties',
                organicDatabaseId: '5400000129',
                status: 'Active',
                notes: 'Certifier: Iowa Department of Agriculture and Land Stewardship | Anniversary Date: 10/22/2025'
            },
            {
                vendorName: 'TERRA ORGANICS',
                internalId: '326',
                lastOrganicCertificationDate: new Date('2024-11-15'),
                certificate: {
                    filename: 'Terra Organics [CCOF] CCOF Certification Services, LLC Issue Date 20241115.pdf',
                    data: '',
                    mimeType: 'application/pdf',
                    uploadDate: new Date()
                },
                operationsProfile: {
                    filename: 'Terra Organics Operation Profile (5561002181) updated on 20241022.pdf',
                    data: '',
                    mimeType: 'application/pdf',
                    uploadDate: new Date()
                },
                tscItem: 'ORG-SEEDS-326',
                tscDescription: 'Sustainable organic seed and plant production',
                organicDatabaseId: '5561002181',
                status: 'Active',
                notes: 'Certifier: CCOF Certification Services, LLC | Anniversary Date: 4/15/2025'
            },
            {
                vendorName: 'Territorial Seed Company',
                internalId: '328',
                lastOrganicCertificationDate: new Date('2024-12-17'),
                certificate: {
                    filename: 'Territorial Seed Company Certificate Issue Date 20241022.pdf',
                    data: '',
                    mimeType: 'application/pdf',
                    uploadDate: new Date()
                },
                operationsProfile: {
                    filename: 'Territorial Seed Company Operation Profile (5561005470) updated on 20241022.pdf',
                    data: '',
                    mimeType: 'application/pdf',
                    uploadDate: new Date()
                },
                tscItem: 'ORG-SEEDS-328',
                tscDescription: 'Regional organic seed varieties for Pacific Northwest',
                organicDatabaseId: '5561005470',
                status: 'Active',
                notes: 'Certifier: CCOF Certification Services, LLC'
            },
            {
                vendorName: 'TOZER SEEDS AMERICA LLC',
                internalId: '417',
                lastOrganicCertificationDate: new Date('2024-10-22'),
                certificate: {
                    filename: 'Tozer Seeds America, LLC Certificate Issue Date 20241022.pdf',
                    data: '',
                    mimeType: 'application/pdf',
                    uploadDate: new Date()
                },
                operationsProfile: {
                    filename: 'Tozer Seeds America, LLC Operation Profile (5561002428) updated on 20241022.pdf',
                    data: '',
                    mimeType: 'application/pdf',
                    uploadDate: new Date()
                },
                tscItem: 'ORG-SEEDS-417',
                tscDescription: 'Professional organic vegetable seed varieties',
                organicDatabaseId: '5561002428',
                status: 'Active',
                notes: 'Certifier: CCOF Certification Services, LLC | Anniversary Date: 10/22/2025'
            },
            {
                vendorName: 'WHISTLING DUCK',
                internalId: '364',
                lastOrganicCertificationDate: new Date('2025-07-29'),
                certificate: {
                    filename: 'Whistling Duck Farm, LLC Certificate_7270000728_07-29- 20250729.pdf',
                    data: '',
                    mimeType: 'application/pdf',
                    uploadDate: new Date()
                },
                operationsProfile: {
                    filename: 'Whistling Duck Farm, LLC 7270000728_OperationProfile Updated 20250729.pdf',
                    data: '',
                    mimeType: 'application/pdf',
                    uploadDate: new Date()
                },
                tscItem: 'ORG-FARM-364',
                tscDescription: 'Small farm organic production and direct sales',
                organicDatabaseId: '7270000728',
                status: 'Active',
                notes: 'Certifier: Oregon Department of Agriculture (ODA)'
            }
        ];

        // Insert the remaining vendor data
        const createdVendors = await OrganicVendor.insertMany(remainingVendors);
        console.log(`✅ Successfully imported ${createdVendors.length} additional vendors`);

        // Get total count
        const totalCount = await OrganicVendor.countDocuments();
        const activeCount = await OrganicVendor.countDocuments({ status: 'Active' });
        const expiredCount = await OrganicVendor.countDocuments({ status: 'Certification Expired' });

        console.log('\n📊 Complete Database Summary:');
        console.log(`   Total Vendors: ${totalCount}`);
        console.log(`   Active Vendors: ${activeCount}`);
        console.log(`   Expired Certifications: ${expiredCount}`);

        console.log('\n🌱 All your organic vendor data has been imported!');

        mongoose.connection.close();
        console.log('✅ Remaining vendors import completed!');

    } catch (error) {
        console.error('❌ Error importing remaining vendors:', error);
        process.exit(1);
    }
}

importRemainingVendors();
