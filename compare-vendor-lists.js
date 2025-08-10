// Check which vendors are in the database vs original list
require('dotenv').config();
const mongoose = require('mongoose');
const OrganicVendor = require('./models/OrganicVendor');

// Original list you provided
const originalVendorList = [
    "A P WHALEY LLC",
    "ALBERT LEA SEED HOUSE",
    "AMERICAN TAKII",
    "AURORA ORGANIC FARMS",
    "BAKER CREEK HEIRLOOM SEEDS",
    "BLUE RIVER ORGANIC SEED",
    "BURPEE SEEDS",
    "EDEN BROTHERS",
    "FEDCO SEEDS",
    "FOXY GARDENS",
    "FRANK MORTON WILD GARDEN SEED",
    "GOURMET GOLD",
    "HIGH MOWING ORGANIC SEEDS",
    "JOHNNY SEEDS",
    "KITAZAWA SEED CO",
    "LARGE SMALL FARM",
    "LIVING SEED COMPANY",
    "MCKENZIE SEEDS LTD",
    "MOUNTAIN VALLEY SEED COMPANY",
    "MYRTLE CREEK FARM LLC",
    "OMEGA SEED INC",
    "OREGON STATE UNIVERSITY",
    "OSBORNE SEED COMPANY",
    "PAN AMERICAN",
    "PEACEFUL VALLEY FARM SUPPLY",
    "PRAYING MANTIS FARM",
    "PURE LINE SEEDS INC",
    "SEED DYNAMICS INC",
    "SEEDS BY DESIGN",
    "SEEDS OF CHANGE",
    "SOUTHERN EXPOSURE SEED EXCHANGE",
    "STOKES SEEDS",
    "TERRA ORGANICS",
    "Territorial Seed Company",
    "TOZER SEEDS AMERICA LLC",
    "WHISTLING DUCK"
];

async function compareVendorLists() {
    try {
        console.log('🔗 Connecting to MongoDB...');
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('✅ Connected to MongoDB');

        // Get all vendors from database
        const dbVendors = await OrganicVendor.find({}, 'vendorName').lean();
        const dbVendorNames = dbVendors.map(v => v.vendorName.toUpperCase().trim());

        console.log(`\n📊 COMPARISON RESULTS:`);
        console.log(`   Original list: ${originalVendorList.length} vendors`);
        console.log(`   Database: ${dbVendorNames.length} vendors`);

        // Normalize original list for comparison
        const normalizedOriginal = originalVendorList.map(name => name.toUpperCase().trim());

        // Find vendors in database but NOT in original list
        const extraInDB = dbVendorNames.filter(dbName => !normalizedOriginal.includes(dbName));

        // Find vendors in original list but NOT in database
        const missingFromDB = normalizedOriginal.filter(origName => !dbVendorNames.includes(origName));

        // Find vendors that match
        const matching = dbVendorNames.filter(dbName => normalizedOriginal.includes(dbName));

        console.log(`\n✅ VENDORS THAT MATCH (${matching.length}):`);
        matching.sort().forEach(name => {
            console.log(`   ✓ ${name}`);
        });

        if (extraInDB.length > 0) {
            console.log(`\n⚠️  EXTRA VENDORS IN DATABASE (${extraInDB.length}):`);
            console.log('   (These are in your database but were NOT in your original list)');
            extraInDB.sort().forEach(name => {
                console.log(`   + ${name}`);
            });
        }

        if (missingFromDB.length > 0) {
            console.log(`\n❌ MISSING FROM DATABASE (${missingFromDB.length}):`);
            console.log('   (These were in your original list but are NOT in database)');
            missingFromDB.sort().forEach(name => {
                console.log(`   - ${name}`);
            });
        }

        console.log(`\n📈 SUMMARY:`);
        console.log(`   Matching vendors: ${matching.length}`);
        console.log(`   Extra in DB: ${extraInDB.length}`);
        console.log(`   Missing from DB: ${missingFromDB.length}`);

        if (extraInDB.length === 0 && missingFromDB.length === 0) {
            console.log(`   🎉 Perfect match! All vendors align.`);
        }

    } catch (error) {
        console.error('❌ Error comparing vendor lists:', error);
    } finally {
        await mongoose.disconnect();
        console.log('\n🔌 Disconnected from MongoDB');
    }
}

// Run the comparison
compareVendorLists();
