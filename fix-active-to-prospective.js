require('dotenv').config();
const mongoose = require('mongoose');

const seedPartnerSchema = new mongoose.Schema({
    companyName: String,
    partnerCode: String,
    status: String,
    country: String
}, { collection: 'seedpartners', strict: false });

const SeedPartner = mongoose.model('SeedPartner', seedPartnerSchema);

async function fixActiveToProspective() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('✅ Connected to MongoDB\n');

        // Find all US partners with Active status
        const activePartners = await SeedPartner.find({
            country: 'United States',
            status: 'Active'
        }).select('companyName partnerCode status');

        console.log('='.repeat(80));
        console.log('🔧 FIXING INCORRECT "ACTIVE" STATUS');
        console.log('='.repeat(80));

        if (activePartners.length === 0) {
            console.log('\n✅ No partners with "Active" status found. All good!');
            await mongoose.connection.close();
            process.exit(0);
            return;
        }

        console.log(`\n📋 Found ${activePartners.length} US partners marked as "Active"\n`);
        console.log('These are newly researched potential partners.');
        console.log('They should be "Prospective" (not yet contacted).\n');
        console.log('Changing status from "Active" → "Prospective":\n');

        let fixedCount = 0;
        let errorCount = 0;

        for (const partner of activePartners) {
            try {
                await SeedPartner.updateOne(
                    { _id: partner._id },
                    {
                        $set: {
                            status: 'Prospective',
                            updatedAt: new Date()
                        }
                    }
                );
                console.log(`   ✅ ${partner.companyName.padEnd(50)} (${partner.partnerCode})`);
                fixedCount++;
            } catch (error) {
                console.error(`   ❌ ${partner.companyName}: ${error.message}`);
                errorCount++;
            }
        }

        console.log('\n' + '='.repeat(80));
        console.log('📊 UPDATE SUMMARY');
        console.log('='.repeat(80));
        console.log(`✅ Updated: ${fixedCount}`);
        console.log(`❌ Errors: ${errorCount}`);

        // Verify the fix
        const statusCounts = await SeedPartner.aggregate([
            { $match: { country: 'United States' } },
            {
                $group: {
                    _id: '$status',
                    count: { $sum: 1 }
                }
            },
            { $sort: { _id: 1 } }
        ]);

        console.log('\n🎯 UPDATED STATUS DISTRIBUTION:');
        statusCounts.forEach(status => {
            const label = status._id || 'NOT SET';
            console.log(`   ${label}: ${status.count} partners`);
        });

        console.log('\n' + '='.repeat(80));
        console.log('✅ CORRECTION COMPLETE!');
        console.log('='.repeat(80));
        console.log('All US domestic partners are now correctly marked as "Prospective".');
        console.log('This indicates they are potential partners that have been researched');
        console.log('but not yet contacted for partnership discussions.');
        console.log('\nWhen you begin outreach and establish relationships, you can');
        console.log('update their status to "Active" at that time.');

        await mongoose.connection.close();
        process.exit(0);

    } catch (error) {
        console.error('❌ Fatal error:', error);
        await mongoose.connection.close();
        process.exit(1);
    }
}

fixActiveToProspective();
