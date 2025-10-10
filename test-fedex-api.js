// Test FedEx API Integration
// Run this file with: node test-fedex-api.js

require('dotenv').config();
const fedexService = require('./services/fedexService');

console.log('🚀 FedEx API Test Script');
console.log('═══════════════════════════════════════\n');

// Check if credentials are configured
console.log('1️⃣ Checking Configuration...');
console.log('   API URL:', process.env.FEDEX_API_URL || '❌ Not set');
console.log('   Client ID:', process.env.FEDEX_CLIENT_ID ? '✅ Set' : '❌ Not set');
console.log('   Client Secret:', process.env.FEDEX_CLIENT_SECRET ? '✅ Set' : '❌ Not set');
console.log('   Account Number:', process.env.FEDEX_ACCOUNT_NUMBER || '❌ Not set');
console.log('   Is Configured:', fedexService.isConfigured() ? '✅ Yes' : '❌ No');
console.log('');

if (!fedexService.isConfigured()) {
    console.log('❌ FedEx API is not configured!');
    console.log('   Please add your credentials to the .env file.');
    console.log('   See .env.example or FEDEX_API_SETUP.md for instructions.');
    process.exit(1);
}

// Test OAuth authentication
async function testAuthentication() {
    console.log('2️⃣ Testing OAuth Authentication...');
    try {
        const token = await fedexService.getAccessToken();
        console.log('   ✅ Successfully authenticated with FedEx API');
        console.log('   Token:', token.substring(0, 20) + '...');
        console.log('');
        return true;
    } catch (error) {
        console.log('   ❌ Authentication failed:', error.message);
        console.log('');
        return false;
    }
}

// Test tracking with a sample FedEx tracking number
async function testTracking() {
    console.log('3️⃣ Testing Package Tracking...');
    console.log('   Using FedEx test tracking number: 449044304137821');
    console.log('   (This is a FedEx-provided test number for sandbox)\n');
    
    try {
        const trackingData = await fedexService.trackPackage('449044304137821');
        
        if (trackingData.success) {
            console.log('   ✅ Tracking data retrieved successfully!');
            console.log('');
            console.log('   📦 Tracking Details:');
            console.log('   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
            console.log('   Tracking #:', trackingData.trackingNumber);
            console.log('   Carrier:', trackingData.carrier);
            console.log('   Status:', trackingData.status);
            console.log('   Description:', trackingData.statusDescription);
            if (trackingData.lastLocation) {
                console.log('   Location:', trackingData.lastLocation);
            }
            if (trackingData.lastUpdate) {
                console.log('   Last Update:', trackingData.lastUpdate);
            }
            if (trackingData.estimatedDelivery) {
                console.log('   Est. Delivery:', trackingData.estimatedDelivery);
            }
            console.log('');
            
            if (trackingData.history && trackingData.history.length > 0) {
                console.log('   📋 Tracking History:');
                console.log('   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
                trackingData.history.slice(0, 3).forEach((event, index) => {
                    console.log(`   ${index + 1}. ${event.status}`);
                    if (event.location) console.log(`      Location: ${event.location}`);
                    if (event.timestamp) console.log(`      Time: ${event.timestamp}`);
                    console.log('');
                });
                if (trackingData.history.length > 3) {
                    console.log(`   ... and ${trackingData.history.length - 3} more events`);
                }
            }
            return true;
        } else {
            console.log('   ⚠️ Tracking returned no data:', trackingData.error);
            console.log('');
            return false;
        }
    } catch (error) {
        console.log('   ❌ Tracking failed:', error.message);
        console.log('');
        return false;
    }
}

// Run all tests
async function runTests() {
    try {
        const authSuccess = await testAuthentication();
        
        if (authSuccess) {
            await testTracking();
        }
        
        console.log('═══════════════════════════════════════');
        console.log('✅ Test Complete!');
        console.log('');
        console.log('📌 Next Steps:');
        console.log('   1. Restart your application: node app.js');
        console.log('   2. Go to a Purchase Order with a FedEx tracking number');
        console.log('   3. Click the tracking number');
        console.log('   4. Click "🔄 Refresh from FedEx API" button');
        console.log('');
        console.log('💡 You\'re now using FedEx TEST environment.');
        console.log('   When ready for production, update FEDEX_API_URL in .env');
        console.log('');
        
    } catch (error) {
        console.log('═══════════════════════════════════════');
        console.log('❌ Test failed with error:', error.message);
        console.log('');
        console.log('📝 Troubleshooting:');
        console.log('   1. Verify credentials are correct in .env');
        console.log('   2. Check your internet connection');
        console.log('   3. Verify FedEx Developer account is active');
        console.log('');
    }
}

// Execute tests
runTests();
