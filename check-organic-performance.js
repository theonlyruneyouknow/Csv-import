// Performance analysis for Organic Vendors Dashboard
require('dotenv').config();
const mongoose = require('mongoose');
const OrganicVendor = require('./models/OrganicVendor');

async function checkPerformance() {
    try {
        console.log('🔍 Organic Vendors Dashboard Performance Analysis\n');

        await mongoose.connect('mongodb://localhost:27017/purchase-orders');
        console.log('✅ Connected to MongoDB');

        // Test 1: Count documents
        const startCount = Date.now();
        const totalCount = await OrganicVendor.countDocuments();
        const countTime = Date.now() - startCount;
        console.log(`📊 Total Vendors: ${totalCount} (${countTime}ms)`);

        // Test 2: Load dashboard data (optimized)
        const startOptimized = Date.now();
        const vendorsOptimized = await OrganicVendor.find({}, {
            'certificate.data': 0,
            'operationsProfile.data': 0,
            'organicSeedsRawData': 0 // Also exclude large raw data
        }).sort({ vendorName: 1 });
        const optimizedTime = Date.now() - startOptimized;
        console.log(`🚀 Optimized Query: ${vendorsOptimized.length} vendors (${optimizedTime}ms)`);

        // Test 3: Load full data (unoptimized) - for comparison
        const startFull = Date.now();
        const vendorsFull = await OrganicVendor.find({}).sort({ vendorName: 1 });
        const fullTime = Date.now() - startFull;
        console.log(`🐌 Full Query: ${vendorsFull.length} vendors (${fullTime}ms)`);

        // Calculate performance improvement
        const improvement = ((fullTime - optimizedTime) / fullTime * 100).toFixed(1);
        console.log(`\n📈 Performance Improvement: ${improvement}% faster`);

        // Analyze data sizes
        let totalOptimizedSize = 0;
        let totalFullSize = 0;
        let base64FileCount = 0;
        let base64DataSize = 0;

        vendorsFull.forEach(vendor => {
            // Calculate optimized size (without base64 data)
            const optimizedDoc = { ...vendor.toObject() };
            if (optimizedDoc.certificate) delete optimizedDoc.certificate.data;
            if (optimizedDoc.operationsProfile) delete optimizedDoc.operationsProfile.data;
            delete optimizedDoc.organicSeedsRawData;

            totalOptimizedSize += JSON.stringify(optimizedDoc).length;
            totalFullSize += JSON.stringify(vendor.toObject()).length;

            // Count base64 files
            if (vendor.certificate && vendor.certificate.data) {
                base64FileCount++;
                base64DataSize += vendor.certificate.data.length;
            }
            if (vendor.operationsProfile && vendor.operationsProfile.data) {
                base64FileCount++;
                base64DataSize += vendor.operationsProfile.data.length;
            }
        });

        console.log('\n📊 Data Size Analysis:');
        console.log(`  Optimized Data: ${(totalOptimizedSize / 1024 / 1024).toFixed(2)} MB`);
        console.log(`  Full Data: ${(totalFullSize / 1024 / 1024).toFixed(2)} MB`);
        console.log(`  Base64 Files: ${base64FileCount}`);
        console.log(`  Base64 Size: ${(base64DataSize / 1024 / 1024).toFixed(2)} MB`);
        console.log(`  Data Reduction: ${((totalFullSize - totalOptimizedSize) / totalFullSize * 100).toFixed(1)}%`);

        // Test index usage
        console.log('\n🔍 Testing Index Performance:');

        const startIndex = Date.now();
        await OrganicVendor.find({ status: 'Active' }).sort({ vendorName: 1 });
        const indexTime = Date.now() - startIndex;
        console.log(`  Status Filter + Sort: ${indexTime}ms`);

        console.log('\n💡 Recommendations:');
        if (fullTime > 1000) {
            console.log(`  ⚠️  Full query is slow (${fullTime}ms) - optimization is critical`);
        }
        if (base64DataSize > 10 * 1024 * 1024) {
            console.log(`  📁 Consider moving ${(base64DataSize / 1024 / 1024).toFixed(1)}MB of files to external storage`);
        }
        if (totalCount > 100) {
            console.log(`  📄 Consider implementing pagination for ${totalCount} vendors`);
        }

        await mongoose.disconnect();
        console.log('\n✅ Performance analysis complete');

    } catch (error) {
        console.error('❌ Error:', error.message);
        await mongoose.disconnect();
    }
}

checkPerformance();
