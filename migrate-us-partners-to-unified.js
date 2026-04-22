// migrate-us-partners-to-unified.js
// Migrates US Seed Partners to the unified SeedPartner collection

const mongoose = require('mongoose');
require('dotenv').config();

// Connection string
const mongoURI = process.env.MONGODB_URI || 'mongodb://localhost:27017/tsc-purchasing';

async function migrateUSPartners() {
    try {
        console.log('🚀 Starting US Partners Migration to Unified Collection...\n');

        // Connect to MongoDB
        await mongoose.connect(mongoURI);
        console.log('✅ Connected to MongoDB\n');

        // Get raw collections
        const db = mongoose.connection.db;
        const usPartnersCollection = db.collection('usseedpartners');
        const seedPartnersCollection = db.collection('seedpartners');

        // Count existing partners
        const usPartnerCount = await usPartnersCollection.countDocuments();
        const existingSeedPartnerCount = await seedPartnersCollection.countDocuments();

        console.log(`📊 Current Status:`);
        console.log(`   - US Partners (to migrate): ${usPartnerCount}`);
        console.log(`   - Existing Seed Partners: ${existingSeedPartnerCount}\n`);

        if (usPartnerCount === 0) {
            console.log('⚠️  No US partners found to migrate.');
            return;
        }

        // Fetch all US partners
        const usPartners = await usPartnersCollection.find({}).toArray();
        console.log(`📦 Fetched ${usPartners.length} US partners\n`);

        // Transform and prepare for insertion
        let migratedCount = 0;
        let skippedCount = 0;
        let errors = [];

        for (const usPartner of usPartners) {
            try {
                // Check if partner already exists in unified collection
                const exists = await seedPartnersCollection.findOne({
                    $or: [
                        { companyName: usPartner.companyName },
                        { partnerCode: usPartner.partnerCode }
                    ]
                });

                if (exists) {
                    console.log(`⏭️  Skipping ${usPartner.companyName} - already exists in unified collection`);
                    skippedCount++;
                    continue;
                }

                // Transform to unified schema
                const unifiedPartner = {
                    // Copy all existing fields
                    ...usPartner,

                    // Remove _id to let MongoDB generate new one
                    _id: undefined,

                    // Set domestic flag
                    isDomestic: true,

                    // Ensure country is set to USA
                    country: 'United States',

                    // Map US region to region (keep the same)
                    // region already exists with US values

                    // Keep state, stateCode, city as-is (optional fields in unified)

                    // Convert status if needed (Non-Alternative might be in exclusionGroups)
                    exclusionGroups: usPartner.status === 'Non-Alternative'
                        ? ['Non-Alternative']
                        : [],

                    // Preserve all other fields
                    // seedOfferings, certifications, primaryContact, etc. are compatible
                };

                // Insert into unified collection
                await seedPartnersCollection.insertOne(unifiedPartner);
                console.log(`✅ Migrated: ${usPartner.companyName} (${usPartner.state})`);
                migratedCount++;

            } catch (error) {
                console.error(`❌ Error migrating ${usPartner.companyName}:`, error.message);
                errors.push({
                    partner: usPartner.companyName,
                    error: error.message
                });
            }
        }

        console.log(`\n📈 Migration Summary:`);
        console.log(`   ✅ Successfully migrated: ${migratedCount}`);
        console.log(`   ⏭️  Skipped (already exist): ${skippedCount}`);
        console.log(`   ❌ Errors: ${errors.length}`);

        if (errors.length > 0) {
            console.log(`\n⚠️  Errors encountered:`);
            errors.forEach(err => {
                console.log(`   - ${err.partner}: ${err.error}`);
            });
        }

        // Verify migration
        const finalCount = await seedPartnersCollection.countDocuments({ isDomestic: true });
        console.log(`\n🔍 Verification:`);
        console.log(`   - Total domestic partners in unified collection: ${finalCount}`);

        console.log(`\n✅ Migration completed successfully!`);
        console.log(`\n💡 Next steps:`);
        console.log(`   1. Verify the migrated data at http://localhost:3001/seed-partners`);
        console.log(`   2. Test filtering by domestic/international`);
        console.log(`   3. Once confirmed, you can archive the old usseedpartners collection`);
        console.log(`      (We recommend keeping it as backup for a while)`);

    } catch (error) {
        console.error('❌ Migration error:', error);
    } finally {
        await mongoose.connection.close();
        console.log('\n🔌 Database connection closed');
    }
}

// Run migration
console.log('═══════════════════════════════════════════════════════');
console.log('   US SEED PARTNERS → UNIFIED COLLECTION MIGRATION    ');
console.log('═══════════════════════════════════════════════════════\n');

migrateUSPartners();
