/**
 * Migration script to update existing Purchase Orders with split vendor data
 * 
 * This script will:
 * 1. Find all PO records that have vendor data but missing vendorNumber/vendorName
 * 2. Split the vendor field using the vendorUtils
 * 3. Update the records with the new fields
 * 4. Report on the migration results
 */

const mongoose = require('mongoose');
require('dotenv').config();

// Import models and utilities
const PurchaseOrder = require('./models/PurchaseOrder');
const { splitVendorData, batchSplitVendors } = require('./lib/vendorUtils');

async function migrateVendorData() {
    try {
        console.log('🔄 Connecting to MongoDB...');
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('✅ Connected to MongoDB');

        console.log('🔍 Finding Purchase Orders that need vendor data migration...');

        // Find POs that have vendor data but are missing the split fields
        const posToMigrate = await PurchaseOrder.find({
            vendor: { $exists: true, $ne: null, $ne: "" },
            $or: [
                { vendorNumber: { $exists: false } },
                { vendorName: { $exists: false } },
                { vendorNumber: "" },
                { vendorName: "" }
            ]
        }).lean();

        console.log(`📊 Found ${posToMigrate.length} Purchase Orders that need migration`);

        if (posToMigrate.length === 0) {
            console.log('✅ No migration needed - all records already have split vendor data');
            return;
        }

        // Show sample of what will be migrated
        console.log(`\n📋 Sample of vendor data to be split:`);
        posToMigrate.slice(0, 10).forEach((po, index) => {
            const split = splitVendorData(po.vendor);
            console.log(`   ${index + 1}. "${po.vendor}" → Number: "${split.vendorNumber}", Name: "${split.vendorName}"`);
        });

        console.log(`\n🔄 Starting migration of ${posToMigrate.length} records...`);

        let migratedCount = 0;
        let errorCount = 0;
        const batchSize = 100;

        // Process in batches for better performance
        for (let i = 0; i < posToMigrate.length; i += batchSize) {
            const batch = posToMigrate.slice(i, i + batchSize);
            console.log(`📦 Processing batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(posToMigrate.length / batchSize)} (${batch.length} records)`);

            const bulkOps = [];

            batch.forEach(po => {
                try {
                    const vendorData = splitVendorData(po.vendor);
                    
                    bulkOps.push({
                        updateOne: {
                            filter: { _id: po._id },
                            update: {
                                $set: {
                                    vendorNumber: vendorData.vendorNumber || '',
                                    vendorName: vendorData.vendorName || ''
                                }
                            }
                        }
                    });
                } catch (error) {
                    console.log(`❌ Error processing PO ${po.poNumber}: ${error.message}`);
                    errorCount++;
                }
            });

            if (bulkOps.length > 0) {
                try {
                    const result = await PurchaseOrder.bulkWrite(bulkOps);
                    migratedCount += result.modifiedCount;
                    console.log(`   ✅ Updated ${result.modifiedCount} records in this batch`);
                } catch (error) {
                    console.log(`❌ Batch update error: ${error.message}`);
                    errorCount += batch.length;
                }
            }
        }

        console.log(`\n🎉 Migration completed!`);
        console.log(`   ✅ Successfully migrated: ${migratedCount} records`);
        console.log(`   ❌ Errors encountered: ${errorCount} records`);

        // Verify the migration with some sample results
        console.log(`\n🔍 Verification - Sample of migrated records:`);
        const migratedSamples = await PurchaseOrder.find({
            vendor: { $exists: true, $ne: null, $ne: "" },
            vendorNumber: { $exists: true },
            vendorName: { $exists: true }
        }).limit(10).lean();

        migratedSamples.forEach((po, index) => {
            console.log(`   ${index + 1}. PO: ${po.poNumber}`);
            console.log(`      Original: "${po.vendor}"`);
            console.log(`      Split: Number="${po.vendorNumber}", Name="${po.vendorName}"`);
        });

        // Generate statistics
        const totalPOs = await PurchaseOrder.countDocuments();
        const posWithSplitData = await PurchaseOrder.countDocuments({
            vendorNumber: { $exists: true, $ne: "" }
        });
        const posWithVendorData = await PurchaseOrder.countDocuments({
            vendor: { $exists: true, $ne: null, $ne: "" }
        });

        console.log(`\n📊 Final Statistics:`);
        console.log(`   Total Purchase Orders: ${totalPOs}`);
        console.log(`   POs with vendor data: ${posWithVendorData}`);
        console.log(`   POs with split vendor data: ${posWithSplitData}`);
        console.log(`   Migration coverage: ${((posWithSplitData / posWithVendorData) * 100).toFixed(1)}%`);

        // Show unique vendor patterns found
        const uniqueVendorNumbers = await PurchaseOrder.distinct('vendorNumber', {
            vendorNumber: { $ne: "" }
        });
        console.log(`\n🔢 Found ${uniqueVendorNumbers.length} unique vendor numbers:`);
        console.log(`   Sample: ${uniqueVendorNumbers.slice(0, 10).join(', ')}`);

    } catch (error) {
        console.error('❌ Migration error:', error);
    } finally {
        await mongoose.disconnect();
        console.log('🔌 Disconnected from MongoDB');
        process.exit(0);
    }
}

// Run the migration
console.log('🚀 Starting vendor data migration...');
migrateVendorData();
