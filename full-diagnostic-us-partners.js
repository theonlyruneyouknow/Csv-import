// Comprehensive diagnostic test for US Seed Partners
const mongoose = require('mongoose');
require('dotenv').config();

async function runDiagnostics() {
    try {
        console.log('🔍 Starting comprehensive US Seed Partners diagnostics...\n');

        // Connect to MongoDB
        await mongoose.connect(process.env.MONGODB_URI, {
            useNewUrlParser: true,
            useUnifiedTopology: true
        });
        console.log('✅ Connected to MongoDB\n');

        // Load the model
        const USSeedPartner = require('./models/USSeedPartner');
        console.log('✅ USSeedPartner model loaded\n');

        // Test 1: Direct count
        const count = await USSeedPartner.countDocuments();
        console.log(`📊 Test 1 - Total partners in database: ${count}`);

        // Test 2: Get all partners
        const allPartners = await USSeedPartner.find({}).sort({ state: 1 });
        console.log(`📊 Test 2 - Partners returned by find(): ${allPartners.length}`);

        if (allPartners.length > 0) {
            console.log(`   First 5 partners:`);
            allPartners.slice(0, 5).forEach((p, i) => {
                console.log(`   ${i + 1}. ${p.companyName} (${p.stateCode}) - ${p.status}`);
            });
        }

        // Test 3: Statistics
        const stats = {
            total: allPartners.length,
            active: allPartners.filter(p => p.status === 'Active').length,
            prospective: allPartners.filter(p => p.status === 'Prospective').length,
            withWebsites: allPartners.filter(p => p.businessDetails?.website).length,
            withVegetables: allPartners.filter(p => p.seedOfferings?.vegetables?.length > 0).length,
            withFlowers: allPartners.filter(p => p.seedOfferings?.flowers?.length > 0).length,
            withHerbs: allPartners.filter(p => p.seedOfferings?.herbs?.length > 0).length
        };

        console.log(`\n📊 Test 3 - Statistics:`);
        console.log(`   Total: ${stats.total}`);
        console.log(`   Active: ${stats.active}`);
        console.log(`   Prospective: ${stats.prospective}`);
        console.log(`   With Websites: ${stats.withWebsites}`);
        console.log(`   With Vegetables: ${stats.withVegetables}`);
        console.log(`   With Flowers: ${stats.withFlowers}`);
        console.log(`   With Herbs: ${stats.withHerbs}`);

        // Test 4: Check specific states
        const testStates = ['Alabama', 'California', 'Texas', 'New York', 'Florida'];
        console.log(`\n📊 Test 4 - Checking specific states:`);
        for (const state of testStates) {
            const partner = await USSeedPartner.findOne({ state: state });
            if (partner) {
                console.log(`   ✅ ${state}: ${partner.companyName}`);
            } else {
                console.log(`   ❌ ${state}: NOT FOUND`);
            }
        }

        // Test 5: Sample partner detail
        if (allPartners.length > 0) {
            const sample = allPartners[0];
            console.log(`\n📊 Test 5 - Sample partner detail (${sample.state}):`);
            console.log(`   Company: ${sample.companyName}`);
            console.log(`   State Code: ${sample.stateCode}`);
            console.log(`   Region: ${sample.region}`);
            console.log(`   Status: ${sample.status}`);
            console.log(`   Website: ${sample.businessDetails?.website || 'N/A'}`);
            console.log(`   Vegetables: ${sample.seedOfferings?.vegetables?.length || 0}`);
            console.log(`   Flowers: ${sample.seedOfferings?.flowers?.length || 0}`);
            console.log(`   Herbs: ${sample.seedOfferings?.herbs?.length || 0}`);
        }

        console.log('\n✅ All diagnostics complete!');

    } catch (error) {
        console.error('❌ Error during diagnostics:', error);
    } finally {
        await mongoose.disconnect();
        console.log('\n🔌 Disconnected from MongoDB');
    }
}

runDiagnostics();
