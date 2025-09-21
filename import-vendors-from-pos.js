const mongoose = require('mongoose');
require('dotenv').config();

// Import models
const PurchaseOrder = require('./models/PurchaseOrder');
const Vendor = require('./models/Vendor');

async function importVendorsFromPOs() {
    try {
        console.log('🔄 Connecting to MongoDB...');
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('✅ Connected to MongoDB');

        console.log('🔍 Finding unique vendors from Purchase Orders...');

        // Get all unique vendors from Purchase Orders
        const uniqueVendors = await PurchaseOrder.aggregate([
            {
                $match: {
                    vendor: { $exists: true, $ne: null, $ne: "" }
                }
            },
            {
                $group: {
                    _id: "$vendor",
                    totalPOs: { $sum: 1 },
                    totalSpent: { $sum: { $ifNull: ["$totalAmount", 0] } },
                    firstOrderDate: { $min: "$poDate" },
                    lastOrderDate: { $max: "$poDate" },
                    avgOrderValue: { $avg: { $ifNull: ["$totalAmount", 0] } },
                    samplePOs: { $push: { poNumber: "$poNumber", date: "$poDate", amount: "$totalAmount" } }
                }
            },
            {
                $sort: { totalPOs: -1 }
            }
        ]);

        console.log(`📊 Found ${uniqueVendors.length} unique vendors in Purchase Orders`);

        let importedCount = 0;
        let skippedCount = 0;
        let updatedCount = 0;

        for (const vendorData of uniqueVendors) {
            const vendorName = vendorData._id;
            
            // Skip empty or null vendor names
            if (!vendorName || vendorName.trim() === '') {
                console.log(`⏭️ Skipping empty vendor name`);
                skippedCount++;
                continue;
            }

            console.log(`\n📝 Processing vendor: ${vendorName}`);
            console.log(`   - Total POs: ${vendorData.totalPOs}`);
            console.log(`   - Total Spent: $${vendorData.totalSpent.toFixed(2)}`);
            console.log(`   - Date Range: ${vendorData.firstOrderDate?.toDateString()} to ${vendorData.lastOrderDate?.toDateString()}`);

            // Check if vendor already exists in Vendor collection
            const existingVendor = await Vendor.findOne({
                $or: [
                    { vendorName: { $regex: new RegExp(`^${vendorName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') } },
                    { vendorCode: { $regex: new RegExp(`^${vendorName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') } }
                ]
            });

            if (existingVendor) {
                console.log(`   ✅ Vendor already exists, updating performance data...`);
                
                // Update performance metrics
                existingVendor.performance = {
                    ...existingVendor.performance,
                    totalOrders: vendorData.totalPOs,
                    totalSpent: vendorData.totalSpent,
                    averageOrderValue: vendorData.avgOrderValue,
                    firstOrderDate: vendorData.firstOrderDate,
                    lastOrderDate: vendorData.lastOrderDate
                };

                await existingVendor.save();
                updatedCount++;
                continue;
            }

            // Generate vendor code from vendor name
            let vendorCode = '';
            const words = vendorName.trim().split(/\s+/);
            
            if (words.length === 1) {
                // Single word: take first 3-4 characters
                vendorCode = words[0].substring(0, 4).toUpperCase();
            } else {
                // Multiple words: take first letter of each word, max 5 characters
                words.forEach(word => {
                    if (vendorCode.length < 5 && word.length > 0) {
                        vendorCode += word.charAt(0);
                    }
                });
                vendorCode = vendorCode.toUpperCase();
            }

            // Ensure vendor code is unique
            let finalVendorCode = vendorCode;
            let counter = 1;
            while (await Vendor.findOne({ vendorCode: finalVendorCode })) {
                finalVendorCode = vendorCode + counter;
                counter++;
            }

            // Determine vendor type based on vendor name
            let vendorType = 'Seeds'; // Default
            const nameLC = vendorName.toLowerCase();
            if (nameLC.includes('seed') || nameLC.includes('variety') || nameLC.includes('genetics')) {
                vendorType = 'Seeds';
            } else if (nameLC.includes('organic')) {
                vendorType = 'Organic Seeds';
            } else if (nameLC.includes('supply') || nameLC.includes('equipment') || nameLC.includes('tool')) {
                vendorType = 'Supplies';
            } else if (nameLC.includes('service') || nameLC.includes('consulting')) {
                vendorType = 'Services';
            } else if (nameLC.includes('fertilizer') || nameLC.includes('nutrient')) {
                vendorType = 'Fertilizers';
            }

            // Create new vendor
            const newVendor = new Vendor({
                vendorName: vendorName.trim(),
                vendorCode: finalVendorCode,
                vendorType: vendorType,
                performance: {
                    totalOrders: vendorData.totalPOs,
                    totalSpent: vendorData.totalSpent,
                    averageOrderValue: vendorData.avgOrderValue,
                    firstOrderDate: vendorData.firstOrderDate,
                    lastOrderDate: vendorData.lastOrderDate,
                    overallRating: 4 // Default rating
                },
                status: 'Active',
                notes: `Imported from Purchase Orders. ${vendorData.totalPOs} orders totaling $${vendorData.totalSpent.toFixed(2)}`,
                createdBy: 'Import Script'
            });

            await newVendor.save();
            console.log(`   ✅ Created vendor: ${finalVendorCode} - ${vendorName}`);
            importedCount++;
        }

        console.log(`\n🎉 Import completed!`);
        console.log(`   📥 Imported: ${importedCount} new vendors`);
        console.log(`   🔄 Updated: ${updatedCount} existing vendors`);
        console.log(`   ⏭️ Skipped: ${skippedCount} invalid entries`);

        // Show summary of all vendors
        const totalVendors = await Vendor.countDocuments();
        const activeVendors = await Vendor.countDocuments({ status: 'Active' });
        
        console.log(`\n📊 Final Summary:`);
        console.log(`   Total Vendors: ${totalVendors}`);
        console.log(`   Active Vendors: ${activeVendors}`);

        // Show top 10 vendors by spending
        const topVendors = await Vendor.find({})
            .sort({ 'performance.totalSpent': -1 })
            .limit(10)
            .select('vendorName vendorCode performance.totalSpent performance.totalOrders');

        console.log(`\n🏆 Top 10 Vendors by Spending:`);
        topVendors.forEach((vendor, index) => {
            console.log(`   ${index + 1}. ${vendor.vendorCode} - ${vendor.vendorName}`);
            console.log(`      $${(vendor.performance?.totalSpent || 0).toLocaleString()} (${vendor.performance?.totalOrders || 0} orders)`);
        });

    } catch (error) {
        console.error('❌ Error importing vendors:', error);
    } finally {
        await mongoose.disconnect();
        console.log('🔌 Disconnected from MongoDB');
        process.exit(0);
    }
}

// Run the import
console.log('🚀 Starting vendor import from Purchase Orders...');
importVendorsFromPOs();
