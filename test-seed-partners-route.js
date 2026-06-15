// test-seed-partners-route.js
// Quick test to verify seed-partners route functionality
require('dotenv').config();
const mongoose = require('mongoose');

async function testRoute() {
    try {
        console.log('🔗 Connecting to MongoDB...');
        const mongoURI = process.env.MONGODB_URI || 'mongodb://localhost:27017/csv-import-test';
        await mongoose.connect(mongoURI);
        console.log('✅ Connected to MongoDB');

        const SeedPartner = require('./models/SeedPartner');
        
        console.log('\n📊 Testing query...');
        const query = { isActive: true };
        
        const partners = await SeedPartner.find(query)
            .sort({ priority: 1, companyName: 1 })
            .limit(5);
            
        console.log(`✅ Found ${partners.length} partners (showing first 5)`);
        
        if (partners.length > 0) {
            console.log('\n📋 Sample partner:');
            console.log('Company:', partners[0].companyName);
            console.log('Partner Code:', partners[0].partnerCode);
            console.log('Status:', partners[0].status);
            console.log('Country:', partners[0].country);
            console.log('isDomestic:', partners[0].isDomestic);
        }
        
        // Test statistics calculation
        const allPartnersCount = await SeedPartner.countDocuments({ isActive: true });
        const domesticCount = await SeedPartner.countDocuments({ isActive: true, isDomestic: true });
        const internationalCount = await SeedPartner.countDocuments({ isActive: true, isDomestic: { $ne: true } });
        
        console.log('\n📈 Statistics:');
        console.log('Total active partners:', allPartnersCount);
        console.log('Domestic partners:', domesticCount);
        console.log('International partners:', internationalCount);
        
        console.log('\n✅ Route logic test passed!');
        
    } catch (error) {
        console.error('\n❌ Error:', error);
        console.error('Stack:', error.stack);
    } finally {
        await mongoose.connection.close();
        console.log('\n🔌 Disconnected from MongoDB');
    }
}

testRoute();
