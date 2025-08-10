require('dotenv').config();
const mongoose = require('mongoose');
const OrganicVendor = require('./models/OrganicVendor');

async function fixJohnnySeeds() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('✅ Connected to MongoDB Atlas');

        // Look for any Johnny/Johnnys entries
        const johnnyVendors = await OrganicVendor.find({
            vendorName: { $regex: /johnny/i }
        });

        console.log('\n🔍 Current Johnny-related vendors:');
        johnnyVendors.forEach(vendor => {
            console.log(`- ${vendor.vendorName} (ID: ${vendor.internalId})`);
        });

        // Delete the incorrect "JOHNNY SEEDS" entry
        const deleteResult = await OrganicVendor.deleteOne({ vendorName: 'JOHNNY SEEDS' });
        console.log(`\n🗑️ Deleted ${deleteResult.deletedCount} "JOHNNY SEEDS" entries`);

        // Check if "JOHNNYS SELECTED SEEDS" already exists
        const existingJohnnys = await OrganicVendor.findOne({ vendorName: 'JOHNNYS SELECTED SEEDS' });

        if (!existingJohnnys) {
            // Create the correct entry for JOHNNYS SELECTED SEEDS
            const johnnysSeedsCorrect = {
                vendorName: 'JOHNNYS SELECTED SEEDS',
                internalId: '235',
                lastOrganicCertificationDate: new Date('2024-10-22'),
                certificate: {
                    filename: 'Johnnys Selected Seeds Certificate Issue Date 20241022.pdf',
                    data: '',
                    mimeType: 'application/pdf',
                    uploadDate: new Date()
                },
                operationsProfile: {
                    filename: 'Johnnys Selected Seeds Operation Profile (2200000040) updated on 20241022.pdf',
                    data: '',
                    mimeType: 'application/pdf',
                    uploadDate: new Date()
                },
                tscItem: 'ORG-SEEDS-235',
                tscDescription: 'Commercial organic seed varieties',
                organicDatabaseId: '2200000040',
                status: 'Active',
                notes: 'Certifier: Maine Organic Farmers & Gardeners Association'
            };

            const newVendor = await OrganicVendor.create(johnnysSeedsCorrect);
            console.log('✅ Created correct "JOHNNYS SELECTED SEEDS" entry');
        } else {
            console.log('✅ "JOHNNYS SELECTED SEEDS" already exists - no action needed');
        }

        // Verify final state
        const finalJohnnyVendors = await OrganicVendor.find({
            vendorName: { $regex: /johnny/i }
        });

        console.log('\n✅ Final Johnny-related vendors:');
        finalJohnnyVendors.forEach(vendor => {
            console.log(`- ${vendor.vendorName} (ID: ${vendor.internalId})`);
        });

        // Get total count
        const totalCount = await OrganicVendor.countDocuments();
        console.log(`\n📊 Total vendors in database: ${totalCount}`);

        mongoose.connection.close();
        console.log('✅ Johnny Seeds correction completed!');

    } catch (error) {
        console.error('❌ Error fixing Johnny Seeds:', error);
        process.exit(1);
    }
}

fixJohnnySeeds();
