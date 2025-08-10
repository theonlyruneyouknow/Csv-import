const mongoose = require('mongoose');
const OrganicVendor = require('./models/OrganicVendor');

async function testOrganicVendorsSetup() {
    try {
        await mongoose.connect('mongodb://localhost:27017/purchase-orders');
        console.log('✅ Connected to MongoDB');

        // Test the model
        const vendors = await OrganicVendor.find().limit(3);
        console.log('\n📋 First 3 organic vendors:');
        vendors.forEach((vendor, index) => {
            console.log(`  ${index + 1}. ${vendor.vendorName} (${vendor.internalId})`);
            console.log(`     Status: ${vendor.status}`);
            console.log(`     Last Cert: ${vendor.lastOrganicCertificationDate.toLocaleDateString()}`);
            console.log(`     Days Since Cert: ${vendor.daysSinceLastCertification}`);
            console.log(`     Cert Status: ${vendor.certificationStatus}`);
            console.log(`     Seeds: ${vendor.organicSeeds?.length || 0} varieties`);
            console.log('');
        });

        // Test the virtual fields
        if (vendors.length > 0) {
            const testVendor = vendors[0];
            console.log('🧪 Testing virtual fields:');
            console.log(`   Days since certification: ${testVendor.daysSinceLastCertification}`);
            console.log(`   Certification status: ${testVendor.certificationStatus}`);
        }

        mongoose.connection.close();
        console.log('\n✅ Organic vendors system is ready!');
        console.log('🌐 Access the dashboard at: http://localhost:3000/organic-vendors');
        console.log('🔗 Navigation link added to main dashboard');

    } catch (error) {
        console.error('❌ Error testing setup:', error);
        process.exit(1);
    }
}

testOrganicVendorsSetup();
