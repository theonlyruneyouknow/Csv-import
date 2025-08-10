// Test delete functionality
require('dotenv').config();
const mongoose = require('mongoose');
const OrganicVendor = require('./models/OrganicVendor');

async function testDelete() {
    try {
        console.log('🔗 Connecting to MongoDB...');
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('✅ Connected to MongoDB');

        // Get all vendors to see what we have
        const vendors = await OrganicVendor.find({}, 'vendorName _id').lean();
        console.log(`📊 Found ${vendors.length} vendors:`);

        vendors.forEach((vendor, index) => {
            console.log(`   ${index + 1}. ${vendor.vendorName} (ID: ${vendor._id})`);
        });

        // Find one of the extra vendors to test delete
        const extraVendors = ['PIETERPIKZONEN BV HOLLAND', 'SATIVA RHEINAU GMBH', 'SEED DEVELOPMENTS'];
        const testVendor = vendors.find(v => extraVendors.includes(v.vendorName.toUpperCase()));

        if (testVendor) {
            console.log(`\n🧪 Testing delete with: ${testVendor.vendorName}`);
            console.log(`   Vendor ID: ${testVendor._id}`);

            const result = await OrganicVendor.findByIdAndDelete(testVendor._id);

            if (result) {
                console.log(`✅ Successfully deleted: ${result.vendorName}`);

                // Verify deletion
                const check = await OrganicVendor.findById(testVendor._id);
                if (!check) {
                    console.log(`✅ Confirmed: Vendor no longer exists in database`);
                } else {
                    console.log(`❌ Error: Vendor still exists in database`);
                }
            } else {
                console.log(`❌ Delete operation returned null`);
            }
        } else {
            console.log(`\n⚠️  No extra vendors found to test with`);
        }

    } catch (error) {
        console.error('❌ Error testing delete:', error);
    } finally {
        await mongoose.disconnect();
        console.log('\n🔌 Disconnected from MongoDB');
    }
}

// Run the test
testDelete();
