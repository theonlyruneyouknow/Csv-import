const mongoose = require('mongoose');
const OrganicVendor = require('./models/OrganicVendor');

async function importRealOrganicVendors() {
    try {
        await mongoose.connect('mongodb://localhost:27017/purchase-orders');
        console.log('✅ Connected to MongoDB');

        // Clear existing organic vendors
        await OrganicVendor.deleteMany({});
        console.log('🧹 Cleared existing organic vendors');

        // Real vendor data from your spreadsheet
        const realVendors = [
            {
                vendorName: 'A P WHALEY LLC',
                internalId: '56',
                lastOrganicCertificationDate: new Date('2025-07-01'),
                certificate: {
                    filename: 'A.P. Whaley Certificate_9950004583_07-01-issued 20250701.pdf',
                    data: '', // Would contain base64 data in real scenario
                    mimeType: 'application/pdf',
                    uploadDate: new Date()
                },
                operationsProfile: {
                    filename: 'A.P. Whaley LLC Operation Profile (9950004583) updated on 20250701.pdf',
                    data: '', // Would contain base64 data in real scenario
                    mimeType: 'application/pdf',
                    uploadDate: new Date()
                },
                tscItem: 'ORG-SEEDS-056',
                tscDescription: 'Organic seed production and handling',
                organicDatabaseId: '9950004583',
                status: 'Active',
                notes: 'Certifier: Midwest Organic Services Association, Inc. | Anniversary Date: 6/25/2026'
            },
            {
                vendorName: 'ALBERT LEA SEED HOUSE',
                internalId: '63',
                lastOrganicCertificationDate: new Date('2025-03-20'),
                certificate: {
                    filename: 'Albert Lea Seed House, Inc Certificate_3670300004 20250320.pdf',
                    data: '',
                    mimeType: 'application/pdf',
                    uploadDate: new Date()
                },
                operationsProfile: {
                    filename: 'Albert Lea Seed House, Inc 3670300004_OperationProfile 20250320.pdf',
                    data: '',
                    mimeType: 'application/pdf',
                    uploadDate: new Date()
                },
                tscItem: 'ORG-SEEDS-063',
                tscDescription: 'Organic seed distribution and handling',
                organicDatabaseId: '3670300004',
                status: 'Active',
                notes: 'Certifier: Minnesota Crop Improvement Association | Anniversary Date: 3/20/2026'
            },
            {
                vendorName: 'BALL HORTICULTURE COMPANY',
                internalId: '453',
                lastOrganicCertificationDate: new Date('2025-07-18'),
                certificate: {
                    filename: 'Ball Horticulture Certificate_8830000503 Issue date 20250718.pdf',
                    data: '',
                    mimeType: 'application/pdf',
                    uploadDate: new Date()
                },
                operationsProfile: {
                    filename: 'Ball Horticulture Company 8830000503_OperationProfile 20250718.pdf',
                    data: '',
                    mimeType: 'application/pdf',
                    uploadDate: new Date()
                },
                tscItem: 'ORG-SEEDS-453',
                tscDescription: 'Organic horticultural products and seeds',
                organicDatabaseId: '8830000503',
                status: 'Active',
                notes: 'Certifier: Organic Crop Improvement Association | Anniversary Date: 7/18/2026'
            },
            {
                vendorName: 'BEJO SEEDS',
                internalId: '79',
                lastOrganicCertificationDate: new Date('2025-04-23'),
                certificate: {
                    filename: 'Bejo BSI Organic certificate 04-23-2025.pdf',
                    data: '',
                    mimeType: 'application/pdf',
                    uploadDate: new Date()
                },
                operationsProfile: {
                    filename: 'Bejo Seeds, Inc. Operation Profile (8150001476) updated on 202420912.pdf',
                    data: '',
                    mimeType: 'application/pdf',
                    uploadDate: new Date()
                },
                tscItem: 'ORG-SEEDS-079',
                tscDescription: 'Organic vegetable seeds and breeding',
                organicDatabaseId: '8150001476',
                status: 'Active',
                notes: 'Certifier: Oregon Tilth Certified Organic'
            },
            {
                vendorName: 'CASCADIA MUSHROOMS',
                internalId: '619',
                lastOrganicCertificationDate: new Date('2025-06-25'),
                certificate: {
                    filename: 'Cascadia Mushroom Certificate_2780002380 Issued 20250625.pdf',
                    data: '',
                    mimeType: 'application/pdf',
                    uploadDate: new Date()
                },
                operationsProfile: {
                    filename: 'Cascadia Mushroom Operation Profile (2780002380) updated 20250625.pdf',
                    data: '',
                    mimeType: 'application/pdf',
                    uploadDate: new Date()
                },
                tscItem: 'ORG-MUSH-619',
                tscDescription: 'Organic mushroom production and distribution',
                organicDatabaseId: '2780002380',
                organicDatabaseUrl: 'https://organic.ams.usda.gov/integrity/CP/OPP?cid=82&nopid=2780002380&ret=Home&retName=Home',
                status: 'Active',
                notes: 'Certifier: Washington State Department of Agriculture | Anniversary Date: 6/26/2025'
            },
            {
                vendorName: 'Country Joy, LLC DBA Country Joy Farm',
                internalId: '675',
                lastOrganicCertificationDate: new Date('2025-05-28'),
                certificate: {
                    filename: 'Country Joy, LLC DBA Country Joy Farm Certificate Issue Date 20250528.pdf',
                    data: '',
                    mimeType: 'application/pdf',
                    uploadDate: new Date()
                },
                operationsProfile: {
                    filename: 'Country Joy, LLC DBA Country Joy Farm Operations Profile Issue Date 20250528.pdf',
                    data: '',
                    mimeType: 'application/pdf',
                    uploadDate: new Date()
                },
                tscItem: 'ORG-FARM-675',
                tscDescription: 'Organic farm production and seed sales',
                status: 'Active',
                notes: 'Certifier: Oregon Tilth Certified Organic'
            },
            {
                vendorName: 'De Bolster BV',
                internalId: '14',
                lastOrganicCertificationDate: new Date('2024-12-18'),
                certificate: {
                    filename: 'De Bolster B.V. Skal Biocontrole (9180019678) 20241218 to 20260101.pdf',
                    data: '',
                    mimeType: 'application/pdf',
                    uploadDate: new Date()
                },
                operationsProfile: {
                    filename: 'De Bolster B.V. Skal Biocontrole Operation Profile (9180019678) updated on 20240226.pdf',
                    data: '',
                    mimeType: 'application/pdf',
                    uploadDate: new Date()
                },
                tscItem: 'ORG-SEEDS-014',
                tscDescription: 'International organic seed supply',
                organicDatabaseId: '9180019678',
                status: 'Active',
                notes: 'Certifier: Skal Biocontrole | Anniversary Date: 1/1/2026'
            },
            {
                vendorName: 'ENZA ZADEN/VITALIS',
                internalId: '145',
                lastOrganicCertificationDate: new Date('2024-10-22'),
                certificate: {
                    filename: 'Vitalis Organic Seeds, a division of Enza Zaden USA, Inc. (Salinas) Certificate Issue Date 20241022.pdf',
                    data: '',
                    mimeType: 'application/pdf',
                    uploadDate: new Date()
                },
                operationsProfile: {
                    filename: 'Vitalis Organic Seeds - division of Enza Zaden North America, Inc. Operation Profile (5561000614) updated on 20241022.pdf',
                    data: '',
                    mimeType: 'application/pdf',
                    uploadDate: new Date()
                },
                tscItem: 'ORG-SEEDS-145',
                tscDescription: 'Organic vegetable seeds and varieties',
                organicDatabaseId: '5561000614',
                status: 'Active',
                notes: 'Certifier: CCOF Certification Services, LLC | Anniversary Date: 10/22/2025'
            },
            {
                vendorName: "Ernie's Organics",
                internalId: '734',
                lastOrganicCertificationDate: new Date('2025-01-08'),
                certificate: {
                    filename: "Ernie's Organics, LLC Certification Issue Date 20250108.pdf",
                    data: '',
                    mimeType: 'application/pdf',
                    uploadDate: new Date()
                },
                operationsProfile: {
                    filename: "Ernie's Organics, LLC Operation Profile (2170032112) updated on 20250108.pdf",
                    data: '',
                    mimeType: 'application/pdf',
                    uploadDate: new Date()
                },
                tscItem: 'ORG-SEEDS-734',
                tscDescription: 'Organic seed and plant production',
                organicDatabaseId: '2170032112',
                status: 'Active',
                notes: 'Certifier: Idaho State Department of Agriculture | Anniversary Date: 4/29/2025'
            },
            {
                vendorName: 'GENESIS SEEDS LTD',
                internalId: '40',
                lastOrganicCertificationDate: new Date('2025-03-04'),
                certificate: {
                    filename: 'Genesis Seed Secal NOP Certificates 2025-01 GENESIS 859067-SIGN 20250304.pdf',
                    data: '',
                    mimeType: 'application/pdf',
                    uploadDate: new Date()
                },
                operationsProfile: {
                    filename: 'Genesis Operations Profile 20250304 Secal Israel Inspection & Certification',
                    data: '',
                    mimeType: 'application/pdf',
                    uploadDate: new Date()
                },
                tscItem: 'ORG-SEEDS-040',
                tscDescription: 'International organic seed supply',
                status: 'Active',
                notes: 'Certifier: Secal Israel Inspection & Certification | Anniversary Date: 2/1/2026'
            },
            {
                vendorName: 'GRAINES VOLTZ',
                internalId: '661',
                lastOrganicCertificationDate: new Date('2024-10-15'),
                certificate: {
                    filename: 'Graines Voltz FR-BIO-01.250-0083784.2024.002 EN LATEST to 03-31-2026',
                    data: '',
                    mimeType: 'application/pdf',
                    uploadDate: new Date()
                },
                operationsProfile: {
                    filename: 'Graines Voltz FR-BIO-01.250-0083784.2024.002 EN LATEST to 03-31-2026',
                    data: '',
                    mimeType: 'application/pdf',
                    uploadDate: new Date()
                },
                tscItem: 'ORG-SEEDS-661',
                tscDescription: 'European organic seed varieties',
                status: 'Active',
                notes: 'Certifier: ECOCERT FRANCE (FR-BIO-01) | Anniversary Date: 1/31/2026'
            },
            {
                vendorName: 'HARRIS GARDEN TRENDS',
                internalId: '176',
                lastOrganicCertificationDate: new Date('2025-04-02'),
                certificate: {
                    filename: 'Harris Seeds Organic, Garden Trends, Inc Certificate Issue date 20250402.pdf',
                    data: '',
                    mimeType: 'application/pdf',
                    uploadDate: new Date()
                },
                operationsProfile: {
                    filename: 'Harris Seeds Organic, Garden Trends, Inc Operation Profile (3250200253) updated on 20250402.pdf',
                    data: '',
                    mimeType: 'application/pdf',
                    uploadDate: new Date()
                },
                tscItem: 'ORG-SEEDS-176',
                tscDescription: 'Organic garden seeds and supplies',
                organicDatabaseId: '3250200253',
                status: 'Active',
                notes: 'Certifier: NOFA-NY Certified Organic, LLC | Anniversary Date: 11/7/2025'
            },
            {
                vendorName: 'HIGH MOWING SEEDS',
                internalId: '181',
                lastOrganicCertificationDate: new Date('2025-06-23'),
                certificate: {
                    filename: 'High Mowing Organic Seeds Inc Certificate_4210099166 20250623.pdf',
                    data: '',
                    mimeType: 'application/pdf',
                    uploadDate: new Date()
                },
                operationsProfile: {
                    filename: 'High Mowing Organic Seeds Inc 4210099166_OperationProfile 20250623.pdf',
                    data: '',
                    mimeType: 'application/pdf',
                    uploadDate: new Date()
                },
                tscItem: 'ORG-SEEDS-181',
                tscDescription: 'Premium organic vegetable seeds',
                organicDatabaseId: '4210099166',
                status: 'Active',
                notes: 'Certifier: Vermont Organic Farmers, LLC | Anniversary Date: 6/23/2026'
            },
            {
                vendorName: 'HOLLAND-SELECT BV',
                internalId: '19',
                lastOrganicCertificationDate: new Date('2025-01-29'),
                certificate: {
                    filename: 'Holland-Select Skal 013685 Biocertificaat - Eng 20250129-20260101.pdf',
                    data: '',
                    mimeType: 'application/pdf',
                    uploadDate: new Date()
                },
                operationsProfile: {
                    filename: 'Holland-Select Skal 013685 Biocertificaat - Eng 20250129-20260101.pdf',
                    data: '',
                    mimeType: 'application/pdf',
                    uploadDate: new Date()
                },
                tscItem: 'ORG-SEEDS-019',
                tscDescription: 'Dutch organic seed varieties',
                status: 'Active',
                notes: 'Certifier: Skal Biocontrole | Anniversary Date: 3/27/2025'
            },
            {
                vendorName: 'JELITTO STAUDENSAMEN GMBH',
                internalId: 'J44',
                lastOrganicCertificationDate: new Date('2025-04-14'),
                certificate: {
                    filename: 'JELITTO STAUDENSAMEN GMBH Certificate_2026 14-04-2025 31-01-2027.pdf',
                    data: '',
                    mimeType: 'application/pdf',
                    uploadDate: new Date()
                },
                operationsProfile: {
                    filename: 'JELITTO STAUDENSAMEN GMBH Certificate_Information_2024.pdf',
                    data: '',
                    mimeType: 'application/pdf',
                    uploadDate: new Date()
                },
                tscItem: 'ORG-SEEDS-J44',
                tscDescription: 'Organic perennial seeds and wildflowers',
                status: 'Active',
                notes: 'Certifier: ABCERT AG (DE-ÖKO-006) | Anniversary Date: 7/17/2025'
            },
            {
                vendorName: "JOHNNY'S SELECTED SEEDS - Albion Farm",
                internalId: '197A',
                lastOrganicCertificationDate: new Date('2025-03-04'),
                certificate: {
                    filename: "Johnny's Selected Seeds - Albion Farm Certifcate Issue Date 20250304.pdf",
                    data: '',
                    mimeType: 'application/pdf',
                    uploadDate: new Date()
                },
                operationsProfile: {
                    filename: "Johnny's Selected Seeds - Albion Farm Operation Profile (7142074112) updated on 20250304.pdf",
                    data: '',
                    mimeType: 'application/pdf',
                    uploadDate: new Date()
                },
                tscItem: 'ORG-SEEDS-197A',
                tscDescription: 'Organic vegetable and flower seeds - Albion location',
                organicDatabaseId: '7142074112',
                status: 'Active',
                notes: 'Certifier: MOFGA Certification Services, LLC - MCS'
            },
            {
                vendorName: "JOHNNY'S SELECTED SEEDS - Winslow",
                internalId: '197B',
                lastOrganicCertificationDate: new Date('2025-03-25'),
                certificate: {
                    filename: "Johnny's Selected Seeds - Winslow Certificate Issue Date 20250325.pdf",
                    data: '',
                    mimeType: 'application/pdf',
                    uploadDate: new Date()
                },
                operationsProfile: {
                    filename: "Johnny's Selected Seeds - Winslow Operation Profile (7142070692) updated on 20250325.pdf",
                    data: '',
                    mimeType: 'application/pdf',
                    uploadDate: new Date()
                },
                tscItem: 'ORG-SEEDS-197B',
                tscDescription: 'Organic vegetable and flower seeds - Winslow location',
                organicDatabaseId: '7142070692',
                status: 'Active',
                notes: 'Certifier: MOFGA Certification Services, LLC - MCS | Anniversary Date: 25-Apr'
            },
            {
                vendorName: 'PACIFIC COAST SEED',
                internalId: '199',
                lastOrganicCertificationDate: new Date('2025-06-21'),
                certificate: {
                    filename: 'Pacific Coast Seed Certificate_8150001170_06-21- issued 20250621.pdf',
                    data: '',
                    mimeType: 'application/pdf',
                    uploadDate: new Date()
                },
                operationsProfile: {
                    filename: 'Pacific Coast Seed Certificate_8150001170_06-21- issued 20250621.pdf',
                    data: '',
                    mimeType: 'application/pdf',
                    uploadDate: new Date()
                },
                tscItem: 'ORG-SEEDS-199',
                tscDescription: 'West coast organic seed production',
                organicDatabaseId: '8150001170',
                status: 'Active',
                notes: 'Certifier: Oregon Tilth Certified Organic'
            },
            {
                vendorName: 'LONDON SPRING FARMS LLC',
                internalId: '219',
                lastOrganicCertificationDate: new Date('2024-10-22'),
                certificate: {
                    filename: 'London Spring Farms Certificate Issue Date 20241022.pdf',
                    data: '',
                    mimeType: 'application/pdf',
                    uploadDate: new Date()
                },
                operationsProfile: {
                    filename: 'London Spring Farms Operation Profile (5561005472) updated on 20241022.pdf',
                    data: '',
                    mimeType: 'application/pdf',
                    uploadDate: new Date()
                },
                tscItem: 'ORG-SEEDS-219',
                tscDescription: 'Organic farm and seed production',
                organicDatabaseId: '5561005472',
                status: 'Active',
                notes: 'Certifier: CCOF Certification Services, LLC | Anniversary Date: 10/22/2025'
            },
            {
                vendorName: 'MEADOWLARK HEARTH',
                internalId: '228',
                lastOrganicCertificationDate: new Date('2024-11-17'),
                certificate: {
                    filename: 'Meadowlark Hearth Living Environment Foundation dba Meadowlark Hearth Issue Date 20241117.pdf',
                    data: '',
                    mimeType: 'application/pdf',
                    uploadDate: new Date()
                },
                operationsProfile: {
                    filename: 'Meadowlark Hearth Living Environment Foundation dba Meadowlark Hearth Operation Profile (2580002662) updated on 20241117.pdf',
                    data: '',
                    mimeType: 'application/pdf',
                    uploadDate: new Date()
                },
                tscItem: 'ORG-SEEDS-228',
                tscDescription: 'Biodynamic and organic seed production',
                organicDatabaseId: '2580002662',
                status: 'Active',
                notes: 'Certifier: OneCert, Inc. | Anniversary Date: 11/17/2025'
            },
            // Continue with more vendors...
            {
                vendorName: 'SAKATA SEED AMERICA',
                internalId: '5',
                lastOrganicCertificationDate: new Date('2024-11-15'),
                certificate: {
                    filename: 'Sakata Seed America, Inc. Certificate Issue Date 20241115.pdf',
                    data: '',
                    mimeType: 'application/pdf',
                    uploadDate: new Date()
                },
                operationsProfile: {
                    filename: 'SAKATA 2024 Operation Profile (2780099697) updated on 20241021.pdf',
                    data: '',
                    mimeType: 'application/pdf',
                    uploadDate: new Date()
                },
                tscItem: 'ORG-SEEDS-005',
                tscDescription: 'Premium organic vegetable and flower seeds',
                organicDatabaseId: '2780099697',
                status: 'Active',
                notes: 'Certifier: CCOF Certification Services, LLC | Anniversary Date: 11/15/2025'
            },
            {
                vendorName: 'WILD GARDEN SEED',
                internalId: '368',
                lastOrganicCertificationDate: new Date('2025-07-22'),
                certificate: {
                    filename: 'Shoulder to Shoulder Farm DBA Wild Garden Seed Certificate_8150000159 20250722.pdf',
                    data: '',
                    mimeType: 'application/pdf',
                    uploadDate: new Date()
                },
                operationsProfile: {
                    filename: 'Shoulder to Shoulder Farm DBA Wild Garden Seed 8150000159_OperationProfile 20250722.pdf',
                    data: '',
                    mimeType: 'application/pdf',
                    uploadDate: new Date()
                },
                tscItem: 'ORG-SEEDS-368',
                tscDescription: 'Specialty organic and heirloom seeds',
                organicDatabaseId: '8150000159',
                status: 'Active',
                notes: 'Certifier: Oregon Tilth Certified Organic | Anniversary Date: 7/22/2026'
            },
            {
                vendorName: 'WOOD PRAIRIE FAMILY FARM',
                internalId: '371',
                lastOrganicCertificationDate: new Date('2025-02-21'),
                certificate: {
                    filename: 'Wood Prairie Family Farm Certificate_7142070488_02-21-2025_01-00-42_AM anniversery date 20250630.pdf',
                    data: '',
                    mimeType: 'application/pdf',
                    uploadDate: new Date()
                },
                operationsProfile: {
                    filename: 'Wood Prairie Family Farm 7142070488_OperationProfile NOP Anniversery 20250630.pdf',
                    data: '',
                    mimeType: 'application/pdf',
                    uploadDate: new Date()
                },
                tscItem: 'ORG-SEEDS-371',
                tscDescription: 'Organic potato and vegetable seed production',
                organicDatabaseId: '7142070488',
                status: 'Active',
                notes: 'Certifier: MOFGA Certification Services, LLC - MCS | Anniversary Date: 6/30/2025'
            }
        ];

        // Insert the real vendor data
        const createdVendors = await OrganicVendor.insertMany(realVendors);
        console.log(`✅ Successfully imported ${createdVendors.length} organic vendors:`);

        // Display summary by status
        const stats = {
            total: createdVendors.length,
            active: createdVendors.filter(v => v.status === 'Active').length,
            current: createdVendors.filter(v => v.certificationStatus === 'Current').length,
            expiringSoon: createdVendors.filter(v => v.certificationStatus === 'Expiring Soon').length,
            expired: createdVendors.filter(v => v.certificationStatus === 'Expired').length
        };

        console.log('\n📊 Import Summary:');
        console.log(`   Total Vendors: ${stats.total}`);
        console.log(`   Active Status: ${stats.active}`);
        console.log(`   Current Certifications: ${stats.current}`);
        console.log(`   Expiring Soon: ${stats.expiringSoon}`);
        console.log(`   Expired Certifications: ${stats.expired}`);

        // Show some examples
        console.log('\n📋 Sample imported vendors:');
        createdVendors.slice(0, 5).forEach((vendor, index) => {
            console.log(`   ${index + 1}. ${vendor.vendorName} (${vendor.internalId})`);
            console.log(`      Last Cert: ${vendor.lastOrganicCertificationDate.toLocaleDateString()}`);
            console.log(`      Status: ${vendor.certificationStatus} | ${vendor.daysSinceLastCertification} days ago`);
            console.log(`      Database ID: ${vendor.organicDatabaseId || 'Not provided'}`);
            console.log('');
        });

        mongoose.connection.close();
        console.log('✅ Real organic vendors data import completed!');
        console.log('🌐 View at: http://localhost:3000/organic-vendors');

    } catch (error) {
        console.error('❌ Error importing real vendor data:', error);
        process.exit(1);
    }
}

importRealOrganicVendors();
