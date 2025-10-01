// Test CSV upload endpoint
const fs = require('fs');
const path = require('path');

async function testCSVUpload() {
    try {
        // Check if test file exists
        const csvPath = path.join(__dirname, 'test-dlf-only.csv');
        if (!fs.existsSync(csvPath)) {
            console.log('❌ Test CSV file not found:', csvPath);
            return;
        }

        console.log('✅ Found test CSV file:', csvPath);
        
        // Read and display file content
        const content = fs.readFileSync(csvPath, 'utf8');
        console.log('📄 File content:');
        console.log(content);
        console.log('📄 End of file content');

        console.log('🔍 Manual upload needed - use browser to upload this file to http://localhost:3002/upload');

    } catch (error) {
        console.error('❌ Error:', error.message);
    }
}

testCSVUpload();
