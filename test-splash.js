// Test splash page functionality
console.log('🧪 Testing Splash Page Functionality...');

const baseUrl = 'http://localhost:3001';

async function testSplashPage() {
    try {
        console.log('\n1. Testing root route (/) - should show splash page...');
        const rootResponse = await fetch(baseUrl);
        console.log(`   Status: ${rootResponse.status}`);
        console.log(`   URL: ${rootResponse.url}`);
        
        const rootHtml = await rootResponse.text();
        if (rootHtml.includes('Purchase Order Management') && rootHtml.includes('Streamline Your Business Operations')) {
            console.log('   ✅ Root route shows splash page correctly');
        } else {
            console.log('   ❌ Root route does not show splash page');
        }

        console.log('\n2. Testing direct splash route (/splash)...');
        const splashResponse = await fetch(`${baseUrl}/splash`);
        console.log(`   Status: ${splashResponse.status}`);
        
        const splashHtml = await splashResponse.text();
        if (splashHtml.includes('TSC Management System') && splashHtml.includes('Sign In')) {
            console.log('   ✅ Splash page loads with correct content');
        } else {
            console.log('   ❌ Splash page missing key content');
        }

        console.log('\n3. Testing welcome route (/welcome)...');
        const welcomeResponse = await fetch(`${baseUrl}/welcome`, { redirect: 'manual' });
        console.log(`   Status: ${welcomeResponse.status}`);
        if (welcomeResponse.status === 302) {
            console.log('   ✅ Welcome route redirects correctly');
        } else {
            console.log('   ❌ Welcome route does not redirect');
        }

        console.log('\n4. Testing 404 handling...');
        const notFoundResponse = await fetch(`${baseUrl}/this-page-does-not-exist`, { redirect: 'manual' });
        console.log(`   Status: ${notFoundResponse.status}`);
        if (notFoundResponse.status === 302) {
            console.log('   ✅ 404 pages redirect to splash');
        } else {
            console.log('   ❌ 404 handling not working');
        }

        console.log('\n5. Testing logout redirect...');
        const logoutResponse = await fetch(`${baseUrl}/auth/logout`, { redirect: 'manual' });
        console.log(`   Status: ${logoutResponse.status}`);
        if (logoutResponse.status === 302) {
            console.log('   ✅ Logout redirects correctly');
        } else {
            console.log('   ❌ Logout redirect not working');
        }

        console.log('\n🎉 Splash page functionality test completed!');
        
    } catch (error) {
        console.error('❌ Test failed:', error.message);
    }
}

testSplashPage();
