// Fix Organic Database URLs for all vendors
require('dotenv').config();
const mongoose = require('mongoose');
const OrganicVendor = require('./models/OrganicVendor');

async function fixOrganicDatabaseUrls() {
    try {
        console.log('🔗 Connecting to MongoDB...');
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('✅ Connected to MongoDB');

        // Find all vendors with bad organic database URLs
        const vendors = await OrganicVendor.find({
            organicDatabaseUrl: { $exists: true, $ne: null, $ne: '' }
        });

        console.log(`📊 Found ${vendors.length} vendors with organic database URLs`);

        let updatedCount = 0;
        const correctBaseUrl = 'https://organic.ams.usda.gov/integrity/';

        for (const vendor of vendors) {
            // Check if URL is already correct (starts with the correct base URL)
            if (vendor.organicDatabaseUrl && vendor.organicDatabaseUrl.startsWith(correctBaseUrl)) {
                console.log(`✅ ${vendor.vendorName} - URL already correct: ${vendor.organicDatabaseUrl}`);
                continue;
            }

            // Update with correct base URL
            const oldUrl = vendor.organicDatabaseUrl;
            vendor.organicDatabaseUrl = correctBaseUrl;

            await vendor.save();
            updatedCount++;

            console.log(`🔧 ${vendor.vendorName} - Updated URL:`);
            console.log(`   Old: ${oldUrl}`);
            console.log(`   New: ${vendor.organicDatabaseUrl}`);
        }

        console.log(`\n🎉 Update complete!`);
        console.log(`   Total vendors checked: ${vendors.length}`);
        console.log(`   URLs updated: ${updatedCount}`);
        console.log(`   URLs already correct: ${vendors.length - updatedCount}`);

    } catch (error) {
        console.error('❌ Error fixing organic database URLs:', error);
    } finally {
        await mongoose.disconnect();
        console.log('🔌 Disconnected from MongoDB');
    }
}

// Run the fix
fixOrganicDatabaseUrls();
