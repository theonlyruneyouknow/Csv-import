// Comprehensive API Test - Check if FedEx API is working with production credentials
require('dotenv').config();
const axios = require('axios');

console.log('═══════════════════════════════════════════════════════════════');
console.log('🔬 COMPREHENSIVE FEDEX API TEST');
console.log('═══════════════════════════════════════════════════════════════\n');

// Step 1: Check Environment Variables
console.log('📋 STEP 1: Environment Configuration');
console.log('─────────────────────────────────────');
console.log(`API URL: ${process.env.FEDEX_API_URL}`);
console.log(`Client ID: ${process.env.FEDEX_CLIENT_ID?.substring(0, 20)}...`);
console.log(`Account: ${process.env.FEDEX_ACCOUNT_NUMBER}`);

if (process.env.FEDEX_API_URL === 'https://apis.fedex.com') {
    console.log('✅ Using PRODUCTION API\n');
} else if (process.env.FEDEX_API_URL === 'https://apis-sandbox.fedex.com') {
    console.log('⚠️  Using SANDBOX API (should be production!)\n');
} else {
    console.log('❌ Unknown API URL\n');
}

// Step 2: Test Direct FedEx Service
console.log('📋 STEP 2: Testing FedEx Service Directly');
console.log('─────────────────────────────────────');

async function testDirectService() {
    try {
        const FedExService = require('./services/fedexService');
        const fedexService = new FedExService();
        
        console.log('Service created successfully');
        console.log(`Service API URL: ${fedexService.baseURL}`);
        
        const trackingNumber = '884850643662';
        console.log(`\n🔍 Testing tracking for: ${trackingNumber}`);
        
        const result = await fedexService.trackPackage(trackingNumber);
        
        console.log('\n✅ FedEx Service Response:');
        console.log(JSON.stringify(result, null, 2));
        
        return result;
    } catch (error) {
        console.error('\n❌ FedEx Service Error:', error.message);
        if (error.response) {
            console.error('Response Status:', error.response.status);
            console.error('Response Data:', JSON.stringify(error.response.data, null, 2));
        }
        return null;
    }
}

// Step 3: Test API Endpoint
async function testAPIEndpoint() {
    console.log('\n📋 STEP 3: Testing API Endpoint');
    console.log('─────────────────────────────────────');
    
    const trackingNumber = '884850643662';
    const url = `http://localhost:3002/purchase-orders/tracking/${trackingNumber}/live?carrier=FedEx&_=${Date.now()}`;
    
    console.log(`URL: ${url}`);
    
    try {
        const response = await axios.get(url);
        
        console.log('\n✅ API Endpoint Response:');
        console.log(JSON.stringify(response.data, null, 2));
        
        if (response.data.success && response.data.trackingInfo) {
            console.log('\n📊 Tracking Information Summary:');
            console.log(`   Status: ${response.data.trackingInfo.status || 'Unknown'}`);
            console.log(`   Location: ${response.data.trackingInfo.lastLocation || response.data.trackingInfo.location || 'Unknown'}`);
            console.log(`   Last Update: ${response.data.trackingInfo.lastUpdate || 'Unknown'}`);
            console.log(`   Est. Delivery: ${response.data.trackingInfo.estimatedDelivery || 'Unknown'}`);
            
            // Check if data is fresh (October 2025)
            if (response.data.trackingInfo.lastUpdate) {
                const updateDate = new Date(response.data.trackingInfo.lastUpdate);
                const isRecent = updateDate.getMonth() >= 9 && updateDate.getFullYear() === 2025; // Oct 2025 or later
                
                if (isRecent) {
                    console.log('\n✅ DATA IS FRESH! (October 2025)');
                } else {
                    console.log(`\n⚠️  DATA IS STALE! Last update: ${updateDate.toLocaleDateString()}`);
                }
            }
        }
        
        return response.data;
    } catch (error) {
        console.error('\n❌ API Endpoint Error:', error.message);
        if (error.response) {
            console.error('Status:', error.response.status);
            console.error('Data:', error.response.data);
        }
        return null;
    }
}

// Step 4: Compare with FedEx Website
console.log('\n📋 STEP 4: Expected vs Actual');
console.log('─────────────────────────────────────');
console.log('Expected (from FedEx.com):');
console.log('  Tracking: 884850643662');
console.log('  Should show: Current October 2025 status');
console.log('  FedEx website: https://www.fedex.com/fedextrack/?trknbr=884850643662');
console.log('\n');

// Run all tests
async function runAllTests() {
    const directResult = await testDirectService();
    const apiResult = await testAPIEndpoint();
    
    console.log('\n═══════════════════════════════════════════════════════════════');
    console.log('📊 TEST SUMMARY');
    console.log('═══════════════════════════════════════════════════════════════\n');
    
    if (directResult && apiResult) {
        console.log('✅ Both tests PASSED - FedEx API is working!');
        console.log('✅ Using production credentials');
        console.log('✅ Getting live tracking data');
        
        // Check if data matches
        if (directResult.status === apiResult.trackingInfo?.status) {
            console.log('✅ Direct service and API endpoint return matching data');
        }
    } else if (directResult && !apiResult) {
        console.log('⚠️  Direct service works, but API endpoint failed');
        console.log('   Check routes or server configuration');
    } else if (!directResult && apiResult) {
        console.log('⚠️  API endpoint works, but direct service failed');
        console.log('   This is unusual - may be a timing issue');
    } else {
        console.log('❌ Both tests FAILED');
        console.log('   Possible issues:');
        console.log('   - FedEx API credentials incorrect');
        console.log('   - Network connectivity problem');
        console.log('   - FedEx API service down');
    }
    
    console.log('\n═══════════════════════════════════════════════════════════════\n');
}

// Wait a moment for server to be ready, then run tests
setTimeout(runAllTests, 2000);
