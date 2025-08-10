require('dotenv').config();
const mongoose = require('mongoose');
const OrganicVendor = require('./models/OrganicVendor');

async function addUSDALinksToVendors() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('✅ Connected to MongoDB Atlas');

        // Update vendors with proper USDA database URLs
        const vendorUpdates = [
            {
                internalId: '56',
                vendorName: 'A P WHALEY LLC',
                organicDatabaseId: '8150000016',
                usdaUrls: {
                    searchUrl: 'https://organic.ams.usda.gov/integrity/CP/OPP?cid=45&nopid=8150000016&ret=Home&retName=Home',
                    certificateUrl: 'https://organic.ams.usda.gov/integrity/CP/OPP/PrintCertificate?cid=45&nopid=8150000016',
                    operationalProfileUrl: 'https://organic.ams.usda.gov/integrity/CP/OPP/ExportToPDF?cid=45&nopid=8150000016'
                }
            }
            // We can add more vendors here as needed
        ];

        for (const update of vendorUpdates) {
            const vendor = await OrganicVendor.findOne({
                $or: [
                    { internalId: update.internalId },
                    { vendorName: update.vendorName }
                ]
            });

            if (vendor) {
                vendor.organicDatabaseUrl = update.usdaUrls.searchUrl;
                vendor.usdaDownloadLinks = {
                    certificate: update.usdaUrls.certificateUrl,
                    operationalProfile: update.usdaUrls.operationalProfileUrl
                };

                await vendor.save();
                console.log(`✅ Updated USDA links for ${vendor.vendorName}`);
            } else {
                console.log(`⚠️ Vendor not found: ${update.vendorName}`);
            }
        }

        console.log('\n✅ USDA links added successfully!');
        mongoose.connection.close();

    } catch (error) {
        console.error('❌ Error adding USDA links:', error);
        process.exit(1);
    }
}

addUSDALinksToVendors();
