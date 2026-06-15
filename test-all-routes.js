const http = require('http');

function testRoute(path, description) {
    return new Promise((resolve) => {
        console.log(`\n🔍 Testing: ${description}`);
        console.log(`   URL: http://localhost:3001${path}`);
        
        http.get(`http://localhost:3001${path}`, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                const status = res.statusCode;
                const length = data.length;
                const hasError = data.toLowerCase().includes('error');
                const hasProducts = data.includes('product');
                
                console.log(`   Status: ${status}`);
                console.log(`   Length: ${length} bytes`);
                console.log(`   Has products: ${hasProducts ? '✅' : '❌'}`);
                console.log(`   Has errors: ${hasError ? '❌ YES' : '✅ No'}`);
                
                if (hasError) {
                    const errorMatch = data.match(/error[^<]+/i);
                    if (errorMatch) {
                        console.log(`   Error text: ${errorMatch[0]}`);
                    }
                }
                
                resolve({ status, length, hasProducts, hasError, data });
            });
        }).on('error', (err) => {
            console.log(`   ❌ Failed: ${err.message}`);
            resolve({ error: err.message });
        });
    });
}

async function comprehensiveTest() {
    console.log('\n' + '='.repeat(80));
    console.log('🔬 COMPREHENSIVE SERVER DIAGNOSTICS');
    console.log('='.repeat(80));
    
    const tests = [
        { path: '/wildwest', desc: 'Main catalog home' },
        { path: '/wildwest/category/vegetable', desc: 'Vegetable category (from screenshot)' },
        { path: '/wildwest/category/Vegetable', desc: 'Vegetable category (capital V)' },
        { path: '/', desc: 'Root page' },
    ];
    
    for (const test of tests) {
        await testRoute(test.path, test.desc);
        await new Promise(r => setTimeout(r, 500));
    }
    
    console.log('\n' + '='.repeat(80));
    console.log('📊 TEST SUMMARY');
    console.log('='.repeat(80) + '\n');
    
   console.log('Next steps:');
    console.log('1. Open http://localhost:3002/test-raw-image to test database images');
    console.log('2. Check server logs at terminal for errors');
    console.log('3. Verify main server is running on port 3001\n');
}

comprehensiveTest();
