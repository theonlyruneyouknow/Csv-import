// Quick Direct API Test
const axios = require('axios');

async function quickTest() {
    console.log('🔍 Testing FedEx API directly...\n');
    
    const trackingNumber = '884850643662';
    const url = `http://localhost:3002/purchase-orders/tracking/${trackingNumber}/live?carrier=FedEx&_=${Date.now()}`;
    
    try {
        console.log(`Calling: ${url}\n`);
        const response = await axios.get(url);
        
        console.log('✅ SUCCESS! API Response:');
        console.log(JSON.stringify(response.data, null, 2));
        
        if (response.data.trackingInfo) {
            const info = response.data.trackingInfo;
            console.log('\n📦 Quick Summary:');
            console.log(`   Status: ${info.status}`);
            console.log(`   Location: ${info.lastLocation || info.location}`);
            console.log(`   Last Update: ${info.lastUpdate}`);
            
            // Check if data is from October 2025
            if (info.lastUpdate) {
                const updateDate = new Date(info.lastUpdate);
                if (updateDate.getMonth() >= 9 && updateDate.getFullYear() === 2025) {
                    console.log('\n✅ ✅ ✅ DATA IS FRESH (OCTOBER 2025)! ✅ ✅ ✅');
                } else {
                    console.log(`\n❌ DATA IS STALE - Last update: ${updateDate.toLocaleDateString()}`);
                }
            }
        }
    } catch (error) {
        console.error('❌ ERROR:', error.message);
        if (error.response) {
            console.error('Response:', error.response.data);
        }
    }
}

quickTest();
