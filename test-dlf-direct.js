// Direct test of DLF vendor creation
const mongoose = require('mongoose');
const OrganicVendor = require('./models/OrganicVendor');
const { splitVendorData } = require('./lib/vendorUtils');

async function testDLFVendorCreation() {
    try {
        // Connect to database
        await mongoose.connect('mongodb+srv://user:pass@cluster0.8elw1gh.mongodb.net/purchase-orders?retryWrites=true&w=majority');
        console.log('✅ Connected to MongoDB');

        // Test vendor splitting
        const dlfVendorString = "792 DLF USA Inc";
        const vendorData = splitVendorData(dlfVendorString);
        
        console.log('🔍 Testing DLF vendor splitting:');
        console.log('  Input:', dlfVendorString);
        console.log('  Result:', vendorData);

        // Generate internal ID
        const internalId = vendorData.vendorNumber || vendorData.vendorName.replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
        console.log('  Generated Internal ID:', internalId);

        // Check if vendor already exists
        const existingVendor = await OrganicVendor.findOne({
            $or: [
                { internalId: internalId },
                { vendorName: vendorData.vendorName },
                { internalId: vendorData.vendorNumber }
            ]
        });

        if (existingVendor) {
            console.log('✅ DLF vendor already exists:');
            console.log('  ID:', existingVendor._id);
            console.log('  Internal ID:', existingVendor.internalId);
            console.log('  Name:', existingVendor.vendorName);
            console.log('  Status:', existingVendor.status);
        } else {
            console.log('🆕 DLF vendor does not exist, would create:');
            console.log('  Name:', vendorData.vendorName || `Vendor ${vendorData.vendorNumber}`);
            console.log('  Internal ID:', internalId);
            console.log('  Status: Pending Review');
        }

        await mongoose.disconnect();
        console.log('🔌 Disconnected from MongoDB');

    } catch (error) {
        console.error('❌ Error testing DLF vendor:', error);
        process.exit(1);
    }
}

testDLFVendorCreation();
