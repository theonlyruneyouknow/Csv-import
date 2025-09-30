/**
 * Test script to verify vendor splitting and matching functionality
 */

const mongoose = require('mongoose');
require('dotenv').config();

// Import models and utilities
const PurchaseOrder = require('./models/PurchaseOrder');
const Vendor = require('./models/Vendor');
const { splitVendorData, createVendorMatchingPatterns, normalizeVendorName } = require('./lib/vendorUtils');

async function testVendorMatching() {
    try {
        console.log('🔄 Connecting to MongoDB...');
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('✅ Connected to MongoDB');

        console.log('\n📊 Testing vendor splitting functionality...');
        
        // Get some sample PO data
        const samplePOs = await PurchaseOrder.find({
            vendor: { $exists: true, $ne: null, $ne: "" }
        }).limit(10).lean();

        console.log(`\n🔍 Sample vendor splitting results:`);
        samplePOs.forEach((po, index) => {
            const split = splitVendorData(po.vendor);
            console.log(`${index + 1}. "${po.vendor}"`);
            console.log(`   → Number: "${split.vendorNumber}", Name: "${split.vendorName}"`);
            console.log(`   → Database: Number="${po.vendorNumber}", Name="${po.vendorName}"`);
            
            if (po.vendorNumber !== split.vendorNumber || po.vendorName !== split.vendorName) {
                console.log(`   ⚠️  Mismatch detected!`);
            } else {
                console.log(`   ✅ Database matches split result`);
            }
        });

        console.log('\n🔍 Testing vendor matching patterns...');
        
        // Get vendor records from database
        const vendors = await Vendor.find().limit(10).lean();
        console.log(`Found ${vendors.length} vendor records to test against`);

        // Test matching between PO vendors and vendor records
        const uniqueVendors = [...new Set(samplePOs.map(po => po.vendor))];
        const vendorNumbers = [...new Set(samplePOs.map(po => po.vendorNumber).filter(Boolean))];
        const vendorNames = [...new Set(samplePOs.map(po => po.vendorName).filter(Boolean))];

        console.log(`\n📋 Unique PO vendor strings: ${uniqueVendors.length}`);
        console.log(`📋 Unique vendor numbers: ${vendorNumbers.length}`);
        console.log(`📋 Unique vendor names: ${vendorNames.length}`);

        // Test enhanced matching
        console.log(`\n🧪 Testing enhanced vendor matching...`);
        
        const vendorRecords = await Vendor.find({
            $or: [
                { vendorName: { $in: uniqueVendors } },
                { vendorCode: { $in: uniqueVendors } },
                { vendorName: { $in: vendorNames } },
                { vendorCode: { $in: vendorNumbers } }
            ]
        }).lean();

        console.log(`📊 Direct matches found: ${vendorRecords.length}`);

        // Try enhanced case-insensitive matching
        const additionalVendorRecords = await Vendor.find({
            $or: [
                ...uniqueVendors.map(vendorName => ({
                    $or: [
                        { vendorName: { $regex: new RegExp(`^${vendorName.trim()}$`, 'i') } },
                        { vendorCode: { $regex: new RegExp(`^${vendorName.trim()}$`, 'i') } }
                    ]
                })),
                ...vendorNumbers.map(vendorNumber => ({
                    $or: [
                        { vendorCode: { $regex: new RegExp(`^${vendorNumber.trim()}$`, 'i') } },
                        { vendorName: { $regex: new RegExp(`^${vendorNumber.trim()}`, 'i') } }
                    ]
                })),
                ...vendorNames.map(vendorName => ({
                    $or: [
                        { vendorName: { $regex: new RegExp(`^${vendorName.trim()}$`, 'i') } },
                        { vendorCode: { $regex: new RegExp(`^${vendorName.trim()}$`, 'i') } }
                    ]
                }))
            ]
        }).lean();

        console.log(`📊 Enhanced matches found: ${additionalVendorRecords.length}`);

        // Combine and deduplicate
        const allVendorRecords = [...vendorRecords, ...additionalVendorRecords];
        const uniqueVendorRecords = allVendorRecords.filter((vendor, index, self) => 
            index === self.findIndex(v => v._id.toString() === vendor._id.toString())
        );

        console.log(`📊 Total unique vendor matches: ${uniqueVendorRecords.length}`);

        // Create mapping
        const vendorMap = {};
        let mappingCount = 0;

        uniqueVendorRecords.forEach(vendor => {
            vendorMap[vendor.vendorName] = vendor._id;
            if (vendor.vendorCode) {
                vendorMap[vendor.vendorCode] = vendor._id;
            }
            
            uniqueVendors.forEach(poVendor => {
                const trimmedPoVendor = poVendor.trim();
                const vendorSplit = createVendorMatchingPatterns(poVendor);
                
                // Try exact matches first
                if (vendor.vendorName.toLowerCase() === trimmedPoVendor.toLowerCase() ||
                    (vendor.vendorCode && vendor.vendorCode.toLowerCase() === trimmedPoVendor.toLowerCase())) {
                    if (!vendorMap[poVendor]) {
                        vendorMap[poVendor] = vendor._id;
                        mappingCount++;
                    }
                }
                // Try matching with vendor number
                else if (vendorSplit.vendorNumber && 
                        (vendor.vendorCode === vendorSplit.vendorNumber ||
                         vendor.vendorName.toLowerCase().includes(vendorSplit.vendorNumber.toLowerCase()))) {
                    if (!vendorMap[poVendor]) {
                        vendorMap[poVendor] = vendor._id;
                        mappingCount++;
                    }
                }
                // Try matching with vendor name (normalized)
                else if (vendorSplit.vendorName && 
                        (vendor.vendorName.toLowerCase() === vendorSplit.vendorName.toLowerCase() ||
                         normalizeVendorName(vendor.vendorName) === normalizeVendorName(vendorSplit.vendorName))) {
                    if (!vendorMap[poVendor]) {
                        vendorMap[poVendor] = vendor._id;
                        mappingCount++;
                    }
                }
            });
        });

        console.log(`\n🎯 Mapping Results:`);
        console.log(`   Total vendor map entries: ${Object.keys(vendorMap).length}`);
        console.log(`   PO vendor mappings created: ${mappingCount}`);
        
        const matchedPOVendors = uniqueVendors.filter(vendor => vendorMap[vendor]);
        console.log(`   PO vendors with links: ${matchedPOVendors.length} out of ${uniqueVendors.length}`);
        console.log(`   Matching rate: ${((matchedPOVendors.length / uniqueVendors.length) * 100).toFixed(1)}%`);

        if (matchedPOVendors.length > 0) {
            console.log(`\n✅ Successfully linked vendors:`);
            matchedPOVendors.slice(0, 10).forEach((vendor, index) => {
                const vendorRecord = uniqueVendorRecords.find(v => v._id.toString() === vendorMap[vendor].toString());
                console.log(`   ${index + 1}. "${vendor}" → ${vendorRecord ? `"${vendorRecord.vendorName}" (${vendorRecord.vendorCode})` : 'Unknown'}`);
            });
        }

        const unmatchedPOVendors = uniqueVendors.filter(vendor => !vendorMap[vendor]);
        if (unmatchedPOVendors.length > 0) {
            console.log(`\n❌ Unmatched PO vendors:`);
            unmatchedPOVendors.slice(0, 10).forEach((vendor, index) => {
                const split = splitVendorData(vendor);
                console.log(`   ${index + 1}. "${vendor}" (Number: "${split.vendorNumber}", Name: "${split.vendorName}")`);
            });
        }

    } catch (error) {
        console.error('❌ Test error:', error);
    } finally {
        await mongoose.disconnect();
        console.log('\n🔌 Disconnected from MongoDB');
        process.exit(0);
    }
}

// Run the test
console.log('🧪 Starting vendor matching tests...');
testVendorMatching();
