require('dotenv').config();
const mongoose = require('mongoose');
const OrganicVendor = require('./models/OrganicVendor');
const USDAOrganicIntegration = require('./lib/USDAOrganicIntegration');

async function updateVendorsWithUSDAData() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('✅ Connected to MongoDB Atlas');

        const usda = new USDAOrganicIntegration();

        // Get all vendors that have organic database IDs
        const vendors = await OrganicVendor.find({
            organicDatabaseId: { $exists: true, $ne: '' }
        }).limit(5); // Start with first 5 vendors for testing

        console.log(`\n📋 Found ${vendors.length} vendors with organic database IDs`);

        for (const vendor of vendors) {
            console.log(`\n🔄 Processing: ${vendor.vendorName} (DB ID: ${vendor.organicDatabaseId})`);

            try {
                // Process vendor using their organic database ID
                const usdaData = await usda.processVendor(vendor.vendorName, vendor.organicDatabaseId);

                if (usdaData) {
                    const updateData = {};

                    // Update documents if downloaded
                    if (usdaData.documents.certificate) {
                        updateData.certificate = usdaData.documents.certificate;
                        console.log(`✅ Updated certificate for ${vendor.vendorName}`);
                    }

                    if (usdaData.documents.operationsProfile) {
                        updateData.operationsProfile = usdaData.documents.operationsProfile;
                        console.log(`✅ Updated operational profile for ${vendor.vendorName}`);
                    }

                    // Update certified products for TSC reference
                    if (usdaData.certifiedProducts && usdaData.certifiedProducts.length > 0) {
                        updateData.certifiedProducts = usdaData.certifiedProducts;

                        // Generate TSC description from products
                        const productCategories = [...new Set(usdaData.certifiedProducts.map(p => p.category))];
                        const tscDescription = `Certified organic: ${productCategories.join(', ')}`;
                        updateData.tscDescription = tscDescription;

                        console.log(`✅ Updated ${usdaData.certifiedProducts.length} certified products for ${vendor.vendorName}`);
                    }

                    // Update vendor details
                    if (usdaData.vendorDetails.certifier) {
                        updateData.certifier = usdaData.vendorDetails.certifier;
                    }

                    if (usdaData.vendorDetails.anniversaryDate) {
                        // Parse anniversary date if possible
                        const anniversaryDate = new Date(usdaData.vendorDetails.anniversaryDate);
                        if (!isNaN(anniversaryDate.getTime())) {
                            updateData.anniversaryDate = anniversaryDate;
                        }
                    }

                    updateData.lastUSDASync = new Date();

                    // Update the vendor in database
                    await OrganicVendor.findByIdAndUpdate(vendor._id, updateData);
                    console.log(`✅ Successfully updated ${vendor.vendorName} with USDA data`);

                } else {
                    console.log(`⚠️ Could not fetch USDA data for ${vendor.vendorName}`);
                }

                // Add delay to be respectful to USDA servers
                await new Promise(resolve => setTimeout(resolve, 2000));

            } catch (vendorError) {
                console.error(`❌ Error processing ${vendor.vendorName}:`, vendorError.message);
            }
        }

        console.log('\n✅ USDA data update completed!');

        // Show summary
        const updatedVendors = await OrganicVendor.find({
            lastUSDASync: { $exists: true }
        });

        console.log(`\n📊 Summary:`);
        console.log(`   Vendors processed: ${vendors.length}`);
        console.log(`   Vendors updated with USDA data: ${updatedVendors.length}`);

        mongoose.connection.close();

    } catch (error) {
        console.error('❌ Error updating vendors with USDA data:', error);
        process.exit(1);
    }
}

// Test with A P WHALEY first
async function testAPWhaley() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('✅ Connected to MongoDB Atlas');

        const usda = new USDAOrganicIntegration();

        // Test with A P WHALEY using the organic database ID
        console.log('\n🧪 Testing with A P WHALEY LLC...');
        const apWhaleyData = await usda.processVendor('A P WHALEY LLC', '8150000016');

        if (apWhaleyData) {
            console.log('\n📋 A P WHALEY Data Retrieved:');
            console.log('Vendor Details:', JSON.stringify(apWhaleyData.vendorDetails, null, 2));
            console.log(`Certificate Document: ${apWhaleyData.documents.certificate ? 'Downloaded' : 'Not found'}`);
            console.log(`Operations Profile: ${apWhaleyData.documents.operationsProfile ? 'Downloaded' : 'Not found'}`);
            console.log(`Certified Products: ${apWhaleyData.certifiedProducts.length} products found`);

            if (apWhaleyData.certifiedProducts.length > 0) {
                console.log('\n🌱 Certified Products:');
                apWhaleyData.certifiedProducts.forEach((product, index) => {
                    console.log(`${index + 1}. ${product.category} > ${product.subcategory} > ${product.product}`);
                    if (product.description) console.log(`   Description: ${product.description}`);
                });
            }
        }

        mongoose.connection.close();

    } catch (error) {
        console.error('❌ Test error:', error);
        process.exit(1);
    }
}

// Run test first, then full update
if (process.argv.includes('--test')) {
    testAPWhaley();
} else {
    updateVendorsWithUSDAData();
}
