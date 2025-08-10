require('dotenv').config();
const mongoose = require('mongoose');
const OrganicVendor = require('./models/OrganicVendor');

async function addUSDAUrls() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('✅ Connected to MongoDB Atlas');

        // Find all vendors with organic database IDs but no URLs
        const vendorsWithIds = await OrganicVendor.find({
            organicDatabaseId: { $exists: true, $ne: '' },
            $or: [
                { organicDatabaseUrl: { $exists: false } },
                { organicDatabaseUrl: '' }
            ]
        });

        console.log(`\n🔧 Found ${vendorsWithIds.length} vendors that need USDA URLs`);

        for (const vendor of vendorsWithIds) {
            // Generate the USDA URL from the organic database ID
            vendor.organicDatabaseUrl = `https://organic.ams.usda.gov/integrity/CP/OPP?cid=45&nopid=${vendor.organicDatabaseId}&ret=Home&retName=Home`;

            await vendor.save();
            console.log(`✅ Added USDA URL for ${vendor.vendorName}`);
        }

        console.log(`\n✅ Successfully updated ${vendorsWithIds.length} vendors with USDA URLs`);

        // Verify the results
        const withUrls = await OrganicVendor.countDocuments({
            organicDatabaseUrl: { $exists: true, $ne: '' }
        });
        console.log(`📊 Total vendors with USDA URLs: ${withUrls}`);

        mongoose.connection.close();

    } catch (error) {
        console.error('❌ Error adding USDA URLs:', error);
        process.exit(1);
    }
}

addUSDAUrls();
