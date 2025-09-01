// Test logout functionality
console.log('🧪 Testing logout functionality...');

// Test 1: Access logout without being logged in
console.log('\n1. Testing logout without authentication...');
fetch('http://localhost:3001/auth/logout')
    .then(response => {
        console.log('   Status:', response.status);
        console.log('   Redirected to:', response.url);
        return response.text();
    })
    .then(html => {
        if (html.includes('You are already logged out')) {
            console.log('   ✅ Correct: Shows "already logged out" message');
        } else if (html.includes('logged out successfully')) {
            console.log('   ✅ Correct: Shows logout success message');
        } else {
            console.log('   ℹ️  Redirected to login page');
        }
    })
    .catch(err => {
        console.log('   ❌ Error:', err.message);
    });

// Test 2: Check if login page loads properly
setTimeout(() => {
    console.log('\n2. Testing login page...');
    fetch('http://localhost:3001/auth/login')
        .then(response => {
            console.log('   Status:', response.status);
            return response.text();
        })
        .then(html => {
            if (html.includes('Purchase Order System')) {
                console.log('   ✅ Login page loads correctly');
            } else {
                console.log('   ❌ Login page has issues');
            }
        })
        .catch(err => {
            console.log('   ❌ Error:', err.message);
        });
}, 1000);

// Test 3: Check server status
setTimeout(() => {
    console.log('\n3. Checking server status...');
    fetch('http://localhost:3001/status')
        .then(response => response.json())
        .then(data => {
            console.log('   Server:', data.server);
            console.log('   MongoDB:', data.mongodb);
            console.log('   Authenticated:', data.authenticated);
            console.log('   ✅ Server is running properly');
        })
        .catch(err => {
            console.log('   ❌ Error:', err.message);
        });
}, 2000);
