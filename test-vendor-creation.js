const mongoose = require('mongoose');
require('dotenv').config();
const { splitVendorData } = require('./lib/vendorUtils');
const OrganicVendor = require('./models/OrganicVendor');

async function testVendorCreation() {
    try {
        console.log('🔄 Connecting to MongoDB...');
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('✅ Connected to MongoDB');
        
        // Test vendor data
        const testVendorString = "792 DLF USA Inc";
        console.log('\n🧪 Testing vendor:', testVendorString);
        
        // Split vendor data
        const vendorData = splitVendorData(testVendorString);
        console.log('📊 Split vendor data:', vendorData);
        
        // Check if vendor exists
        let vendor = await OrganicVendor.findOne({ internalId: vendorData.internalId });
        console.log('🔍 Existing vendor found:', vendor ? 'YES' : 'NO');
        
        if (!vendor) {
            console.log('➕ Creating new vendor...');
            vendor = new OrganicVendor({
                vendorName: vendorData.vendorName,
                internalId: vendorData.internalId,
                lastOrganicCertificationDate: new Date('2024-01-01'),
                status: 'Active'
            });
            
            await vendor.save();
            console.log('✅ Vendor created successfully:', vendor);
        } else {
            console.log('ℹ️ Vendor already exists:', vendor);
        }
        
        // List all DLF vendors
        console.log('\n📋 All DLF vendors in database:');
        const dlfVendors = await OrganicVendor.find({ 
            vendorName: { $regex: /DLF/i } 
        });
        console.log('Found', dlfVendors.length, 'DLF vendors:');
        dlfVendors.forEach(v => {
            console.log(`  - ${v.vendorName} (ID: ${v.internalId})`);
        });
        
    } catch (error) {
        console.error('❌ Test failed:', error);
    } finally {
        mongoose.disconnect();
        console.log('\n🔌 Disconnected from MongoDB');
    }
}

testVendorCreation();
