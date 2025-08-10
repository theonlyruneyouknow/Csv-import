require('dotenv').config();
const mongoose = require('mongoose');
const OrganicVendor = require('./models/OrganicVendor');

async function checkVendorData() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('✅ Connected to MongoDB Atlas');

        const vendors = await OrganicVendor.find({}).limit(10);

        console.log('\n📋 Vendor Data Check:');
        vendors.forEach(vendor => {
            console.log(`\n${vendor.vendorName}:`);
            console.log(`  - Internal ID: ${vendor.internalId}`);
            console.log(`  - Organic DB ID: ${vendor.organicDatabaseId || 'NONE'}`);
            console.log(`  - Organic DB URL: ${vendor.organicDatabaseUrl || 'NONE'}`);
            console.log(`  - Should show Sync button: ${!!(vendor.organicDatabaseId && vendor.organicDatabaseUrl)}`);
        });

        // Also check how many vendors have organic database IDs
        const withDbId = await OrganicVendor.countDocuments({ organicDatabaseId: { $exists: true, $ne: '' } });
        const withDbUrl = await OrganicVendor.countDocuments({ organicDatabaseUrl: { $exists: true, $ne: '' } });

        console.log(`\n📊 Summary:`);
        console.log(`  - Vendors with Organic DB ID: ${withDbId}`);
        console.log(`  - Vendors with Organic DB URL: ${withDbUrl}`);

        mongoose.connection.close();

    } catch (error) {
        console.error('❌ Error:', error);
        process.exit(1);
    }
}

checkVendorData();
