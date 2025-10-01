// Check if DLF vendor exists in database
const mongoose = require('mongoose');
require('dotenv').config();

async function checkDLFVendor() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('✅ Connected to MongoDB');

        const OrganicVendor = require('./models/OrganicVendor');
        
        // Search for DLF vendors
        const dlfVendors = await OrganicVendor.find({
            $or: [
                { vendorName: { $regex: 'DLF', $options: 'i' } },
                { internalId: '792' },
                { vendorName: { $regex: '792', $options: 'i' } }
            ]
        });

        console.log(`🔍 Found ${dlfVendors.length} DLF-related vendors:`);
        dlfVendors.forEach(vendor => {
            console.log(`  - ID: ${vendor._id}`);
            console.log(`    Internal ID: ${vendor.internalId}`);
            console.log(`    Name: ${vendor.vendorName}`);
            console.log(`    Status: ${vendor.status}`);
            console.log(`    Created: ${vendor.createdAt}`);
            console.log(`    Notes: ${vendor.notes}`);
            console.log('    ---');
        });

        if (dlfVendors.length === 0) {
            console.log('❌ No DLF vendors found in database');
        }

        await mongoose.disconnect();

    } catch (error) {
        console.error('❌ Error checking DLF vendor:', error);
    }
}

checkDLFVendor();
