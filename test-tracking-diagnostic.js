// Comprehensive diagnostic test
console.log('='.repeat(60));
console.log('🔍 TRACKING DASHBOARD DIAGNOSTIC TEST');
console.log('='.repeat(60));
console.log();

// 1. Check environment variables
console.log('1️⃣ Environment Variables Check:');
require('dotenv').config();
console.log('   FEDEX_CLIENT_ID:', process.env.FEDEX_CLIENT_ID ? `✅ SET (${process.env.FEDEX_CLIENT_ID.substring(0, 10)}...)` : '❌ MISSING');
console.log('   FEDEX_CLIENT_SECRET:', process.env.FEDEX_CLIENT_SECRET ? `✅ SET (${process.env.FEDEX_CLIENT_SECRET.length} chars)` : '❌ MISSING');
console.log('   FEDEX_API_URL:', process.env.FEDEX_API_URL || 'Using default: https://apis.fedex.com');
console.log();

// 2. Check FedEx service
console.log('2️⃣ FedEx Service Check:');
try {
    const fedexService = require('./services/fedexService');
    console.log('   Service loaded: ✅');
    console.log('   Is configured:', fedexService.isConfigured() ? '✅ YES' : '❌ NO');
    console.log();
    
    if (fedexService.isConfigured()) {
        // 3. Test OAuth
        console.log('3️⃣ Testing OAuth Token:');
        fedexService.getAccessToken()
            .then(token => {
                console.log('   ✅ Token obtained successfully');
                console.log('   Token length:', token.length);
                console.log();
                
                // 4. Test tracking
                console.log('4️⃣ Testing Tracking API:');
                return fedexService.trackPackage('884850643662');
            })
            .then(result => {
                console.log('   ✅ Tracking successful!');
                console.log('   Status:', result.status);
                console.log('   Description:', result.statusDescription);
                console.log('   Location:', result.lastLocation);
                console.log('   Last Update:', result.lastUpdate);
                console.log();
                console.log('5️⃣ Full Tracking Response:');
                console.log(JSON.stringify(result, null, 2));
                console.log();
                console.log('='.repeat(60));
                console.log('✅ ALL TESTS PASSED - FedEx API is working!');
                console.log('='.repeat(60));
            })
            .catch(error => {
                console.log('   ❌ ERROR:', error.message);
                if (error.response) {
                    console.log('   Response status:', error.response.status);
                    console.log('   Response data:', JSON.stringify(error.response.data, null, 2));
                }
                console.log();
                console.log('='.repeat(60));
                console.log('❌ TEST FAILED - Check error details above');
                console.log('='.repeat(60));
            });
    } else {
        console.log();
        console.log('='.repeat(60));
        console.log('❌ FEDEX API NOT CONFIGURED');
        console.log('Add these to your .env file:');
        console.log('FEDEX_CLIENT_ID=your_client_id_here');
        console.log('FEDEX_CLIENT_SECRET=your_client_secret_here');
        console.log('='.repeat(60));
    }
} catch (error) {
    console.log('   ❌ Error loading service:', error.message);
    console.log();
    console.log('='.repeat(60));
    console.log('❌ SERVICE LOAD FAILED');
    console.log('='.repeat(60));
}
