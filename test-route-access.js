// Test accessing the seed-partners route to see actual error
const http = require('http');

const options = {
    hostname: 'localhost',
    port: 3001,
    path: '/seed-partners',
    method: 'GET',
    headers: {
        'Cookie': 'connect.sid=test' // Dummy cookie, might need auth
    }
};

console.log('🔍 Testing /seed-partners route...\n');

const req = http.request(options, (res) => {
    console.log(`Status Code: ${res.statusCode}`);
    console.log(`Headers:`, res.headers);
    
    let data = '';
    res.on('data', (chunk) => {
        data += chunk;
    });
    
    res.on('end', () => {
        if (res.statusCode === 200) {
            console.log('\n✅ Route loaded successfully!');
            console.log('Page length:', data.length, 'bytes');
        } else if (res.statusCode === 302) {
            console.log('\n🔐 Redirect (likely to login):', res.headers.location);
        } else {
            console.log('\n❌ Error response:');
            console.log(data.substring(0, 500));
        }
        process.exit(0);
    });
});

req.on('error', (error) => {
    console.error('❌ Request failed:', error.message);
    process.exit(1);
});

req.end();
