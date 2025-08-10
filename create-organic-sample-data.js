const mongoose = require('mongoose');
const OrganicVendor = require('./models/OrganicVendor');

async function createSampleOrganicVendors() {
    try {
        await mongoose.connect('mongodb://localhost:27017/purchase-orders');
        console.log('✅ Connected to MongoDB');

        // Clear existing organic vendors (for testing)
        await OrganicVendor.deleteMany({});
        console.log('🧹 Cleared existing organic vendors');

        // Sample organic vendors data
        const sampleVendors = [
            {
                vendorName: 'Green Fields Organic Farm',
                internalId: 'GF001',
                lastOrganicCertificationDate: new Date('2024-03-15'),
                tscItem: 'ORG-SEEDS-001',
                tscDescription: 'Organic vegetable seeds - tomatoes, peppers, herbs',
                organicDatabaseId: 'USDA-ORG-12345',
                organicDatabaseUrl: 'https://organic.ams.usda.gov/integrity/CertificationSearch.aspx?ID=12345',
                organicSeeds: [
                    { name: 'Tomato - Cherokee Purple', variety: 'Heirloom', certificationStatus: 'Certified Organic' },
                    { name: 'Pepper - California Wonder', variety: 'Bell Pepper', certificationStatus: 'Certified Organic' },
                    { name: 'Basil - Sweet Genovese', variety: 'Herb', certificationStatus: 'Certified Organic' }
                ],
                contactPerson: 'John Smith',
                email: 'john@greenfields.com',
                phone: '(555) 123-4567',
                address: {
                    street: '123 Farm Road',
                    city: 'Greenville',
                    state: 'CA',
                    zipCode: '95123',
                    country: 'USA'
                },
                status: 'Active',
                notes: 'Reliable supplier with excellent organic certification history'
            },
            {
                vendorName: 'Sunrise Organic Seeds Co.',
                internalId: 'SOS002',
                lastOrganicCertificationDate: new Date('2023-11-20'),
                tscItem: 'ORG-SEEDS-002',
                tscDescription: 'Specialty organic flower and herb seeds',
                organicDatabaseId: 'USDA-ORG-67890',
                organicDatabaseUrl: 'https://organic.ams.usda.gov/integrity/CertificationSearch.aspx?ID=67890',
                organicSeeds: [
                    { name: 'Sunflower - Mammoth', variety: 'Large Flower', certificationStatus: 'Certified Organic' },
                    { name: 'Marigold - French', variety: 'Companion Plant', certificationStatus: 'Certified Organic' },
                    { name: 'Lavender - English', variety: 'Herb', certificationStatus: 'Certified Organic' }
                ],
                contactPerson: 'Sarah Johnson',
                email: 'sarah@sunriseorganic.com',
                phone: '(555) 987-6543',
                address: {
                    street: '456 Seed Valley Drive',
                    city: 'Boulder',
                    state: 'CO',
                    zipCode: '80301',
                    country: 'USA'
                },
                status: 'Active',
                notes: 'Specializes in rare and heirloom varieties'
            },
            {
                vendorName: 'Heritage Organic Growers',
                internalId: 'HOG003',
                lastOrganicCertificationDate: new Date('2022-08-10'),
                tscItem: 'ORG-SEEDS-003',
                tscDescription: 'Heirloom vegetable seeds and transplants',
                organicSeeds: [
                    { name: 'Lettuce - Black Seeded Simpson', variety: 'Leaf Lettuce', certificationStatus: 'Certified Organic' },
                    { name: 'Carrot - Purple Haze', variety: 'Root Vegetable', certificationStatus: 'Certified Organic' },
                    { name: 'Bean - Cherokee Trail of Tears', variety: 'Pole Bean', certificationStatus: 'Certified Organic' }
                ],
                contactPerson: 'Michael Brown',
                email: 'mike@heritageorganic.com',
                phone: '(555) 456-7890',
                address: {
                    street: '789 Heritage Lane',
                    city: 'Asheville',
                    state: 'NC',
                    zipCode: '28801',
                    country: 'USA'
                },
                status: 'Certification Expired',
                notes: 'Certification expired - needs renewal contact'
            },
            {
                vendorName: 'Pacific Northwest Seeds',
                internalId: 'PNS004',
                lastOrganicCertificationDate: new Date('2024-01-05'),
                tscItem: 'ORG-SEEDS-004',
                tscDescription: 'Cold-hardy organic vegetable varieties',
                organicDatabaseId: 'USDA-ORG-11111',
                organicDatabaseUrl: 'https://organic.ams.usda.gov/integrity/CertificationSearch.aspx?ID=11111',
                organicSeeds: [
                    { name: 'Kale - Lacinato Dinosaur', variety: 'Leafy Green', certificationStatus: 'Certified Organic' },
                    { name: 'Brussels Sprouts - Long Island', variety: 'Brassica', certificationStatus: 'Certified Organic' },
                    { name: 'Spinach - Space', variety: 'Leafy Green', certificationStatus: 'Certified Organic' }
                ],
                contactPerson: 'Lisa Wilson',
                email: 'lisa@pnwseeds.com',
                phone: '(555) 321-0987',
                address: {
                    street: '321 Pacific Drive',
                    city: 'Seattle',
                    state: 'WA',
                    zipCode: '98101',
                    country: 'USA'
                },
                status: 'Active',
                notes: 'Excellent for cold-season crops'
            },
            {
                vendorName: 'Desert Bloom Organics',
                internalId: 'DBO005',
                lastOrganicCertificationDate: new Date('2024-06-30'),
                tscItem: 'ORG-SEEDS-005',
                tscDescription: 'Heat-tolerant organic seeds for arid climates',
                organicSeeds: [
                    { name: 'Tomato - Phoenix', variety: 'Heat Tolerant', certificationStatus: 'Certified Organic' },
                    { name: 'Pepper - New Mexico Chile', variety: 'Hot Pepper', certificationStatus: 'Certified Organic' },
                    { name: 'Melon - Desert King', variety: 'Cantaloupe', certificationStatus: 'Certified Organic' }
                ],
                contactPerson: 'Carlos Rodriguez',
                email: 'carlos@desertbloom.com',
                phone: '(555) 654-3210',
                address: {
                    street: '987 Cactus Way',
                    city: 'Phoenix',
                    state: 'AZ',
                    zipCode: '85001',
                    country: 'USA'
                },
                status: 'Active',
                notes: 'Recently certified - new vendor'
            }
        ];

        // Insert sample vendors
        const createdVendors = await OrganicVendor.insertMany(sampleVendors);
        console.log(`✅ Created ${createdVendors.length} sample organic vendors:`);

        createdVendors.forEach((vendor, index) => {
            console.log(`  ${index + 1}. ${vendor.vendorName} (${vendor.internalId}) - Status: ${vendor.status}`);
            console.log(`     Last Cert: ${vendor.lastOrganicCertificationDate.toLocaleDateString()}`);
            console.log(`     Cert Status: ${vendor.certificationStatus}`);
            console.log(`     Seeds: ${vendor.organicSeeds.length} varieties`);
            console.log('');
        });

        // Show summary statistics
        const totalVendors = await OrganicVendor.countDocuments();
        const activeVendors = await OrganicVendor.countDocuments({ status: 'Active' });
        const expiredCerts = createdVendors.filter(v => v.certificationStatus === 'Expired').length;
        const expiringSoon = createdVendors.filter(v => v.certificationStatus === 'Expiring Soon').length;

        console.log('📊 Summary Statistics:');
        console.log(`   Total Vendors: ${totalVendors}`);
        console.log(`   Active Vendors: ${activeVendors}`);
        console.log(`   Expired Certifications: ${expiredCerts}`);
        console.log(`   Expiring Soon: ${expiringSoon}`);

        console.log('\n🎯 You can now access the dashboard at: http://localhost:3000/organic-vendors');

        mongoose.connection.close();
        console.log('\n✅ Sample data creation completed!');
    } catch (error) {
        console.error('❌ Error creating sample data:', error);
        process.exit(1);
    }
}

createSampleOrganicVendors();
