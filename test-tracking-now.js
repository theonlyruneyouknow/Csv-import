// Quick test of FedEx tracking API with current configuration
require('dotenv').config();
const axios = require('axios');

async function testTracking() {
    console.log('🔍 Testing FedEx Tracking API...\n');
    
    // Check environment variables
    console.log('📋 Environment Configuration:');
    console.log(`   API URL: ${process.env.FEDEX_API_URL}`);
    console.log(`   Client ID: ${process.env.FEDEX_CLIENT_ID?.substring(0, 15)}...`);
    console.log(`   Account: ${process.env.FEDEX_ACCOUNT_NUMBER}\n`);
    
    // Test the live endpoint
    const trackingNumber = '884850643662';
    const url = `http://localhost:3002/purchase-orders/tracking/${trackingNumber}/live?carrier=FedEx&_=${Date.now()}`;
    
    console.log(`🌐 Calling: ${url}\n`);
    
    try {
        const response = await axios.get(url);
        console.log('✅ API Response:');
        console.log(JSON.stringify(response.data, null, 2));
        
        if (response.data.success) {
            console.log('\n🎉 SUCCESS! Tracking data retrieved from FedEx API');
            console.log(`   Status: ${response.data.trackingInfo?.status || 'Unknown'}`);
            console.log(`   Location: ${response.data.trackingInfo?.lastLocation || 'Unknown'}`);
            console.log(`   Last Update: ${response.data.trackingInfo?.lastUpdate || 'Unknown'}`);
        } else {
            console.log('\n⚠️ API returned success=false');
            console.log(`   Error: ${response.data.error || 'Unknown'}`);
        }
    } catch (error) {
        console.error('\n❌ ERROR:', error.message);
        if (error.response) {
            console.error('Response data:', error.response.data);
        }
    }
}

testTracking();
