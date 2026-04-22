require('dotenv').config();
const mongoose = require('mongoose');

// Production Partners Schema
const seedPartnerSchema = new mongoose.Schema({
    companyName: String,
    partnerCode: String,
    isDomestic: Boolean,
    country: String,
    state: String,
    stateCode: String
}, { collection: 'seedpartners', strict: false });

const SeedPartner = mongoose.model('SeedPartner', seedPartnerSchema);

async function fixDomesticFlags() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('✅ Connected to MongoDB\n');

        // Find all US partners with incorrect isDomestic flag
        const usPartnersNotFlagged = await SeedPartner.find({
            country: 'United States',
            $or: [
                { isDomestic: { $ne: true } },
                { isDomestic: { $exists: false } }
            ]
        });

        console.log('🔍 CURRENT STATUS:');
        const totalPartners = await SeedPartner.countDocuments();
        const domesticBefore = await SeedPartner.countDocuments({ isDomestic: true });
        const usCountry = await SeedPartner.countDocuments({ country: 'United States' });

        console.log(`   Total Partners: ${totalPartners}`);
        console.log(`   Flagged as Domestic (isDomestic=true): ${domesticBefore}`);
        console.log(`   Partners with country="United States": ${usCountry}`);
        console.log(`   Mismatch: ${usCountry - domesticBefore} US partners not flagged as domestic\n`);

        if (usPartnersNotFlagged.length === 0) {
            console.log('✅ All US partners are correctly flagged as domestic!');
            await mongoose.connection.close();
            process.exit(0);
            return;
        }

        console.log(`🔧 FIXING ${usPartnersNotFlagged.length} US PARTNERS:\n`);

        let fixedCount = 0;
        for (const partner of usPartnersNotFlagged) {
            try {
                await SeedPartner.updateOne(
                    { _id: partner._id },
                    {
                        $set: { isDomestic: true },
                        $setOnInsert: { updatedAt: new Date() }
                    }
                );
                console.log(`   ✅ ${partner.companyName} (${partner.partnerCode}) → isDomestic: true`);
                fixedCount++;
            } catch (error) {
                console.error(`   ❌ Error fixing ${partner.companyName}:`, error.message);
            }
        }

        console.log('\n' + '='.repeat(60));
        console.log('📊 UPDATE SUMMARY');
        console.log('='.repeat(60));
        console.log(`✅ Updated: ${fixedCount}`);
        console.log(`❌ Errors: ${usPartnersNotFlagged.length - fixedCount}`);

        // Verify after update
        const domesticAfter = await SeedPartner.countDocuments({ isDomestic: true });
        console.log('\n🎯 UPDATED STATUS:');
        console.log(`   Total Partners: ${totalPartners}`);
        console.log(`   Domestic Partners: ${domesticAfter}`);
        console.log(`   International Partners: ${totalPartners - domesticAfter}`);

        // Show domestic partners by state
        console.log('\n📍 DOMESTIC PARTNERS BY STATE:');
        const domesticByState = await SeedPartner.aggregate([
            { $match: { isDomestic: true } },
            {
                $group: {
                    _id: '$stateCode',
                    count: { $sum: 1 },
                    companies: { $push: '$companyName' }
                }
            },
            { $sort: { _id: 1 } }
        ]);

        domesticByState.forEach(state => {
            console.log(`\n   ${state._id || 'No State'}: ${state.count}`);
            state.companies.forEach(company => {
                console.log(`      • ${company}`);
            });
        });

        console.log('\n👋 Update complete!');
        await mongoose.connection.close();
        process.exit(0);

    } catch (error) {
        console.error('❌ Fatal error:', error);
        await mongoose.connection.close();
        process.exit(1);
    }
}

fixDomesticFlags();
