const axios = require('axios');
const FormData = require('form-data');
const fs = require('fs');

async function testPharmacyImport() {
    console.log('🧪 Testing Pharmacy Import Web Interface...\n');
    
    try {
        // Create form data with the CSV file
        const form = new FormData();
        const csvPath = 'sample-walgreens.csv';
        
        if (!fs.existsSync(csvPath)) {
            throw new Error(`Test CSV file not found: ${csvPath}`);
        }
        
        form.append('csvFile', fs.createReadStream(csvPath));
        
        console.log('📤 Uploading pharmacy CSV file...');
        
        // Make the request to the test import endpoint (no auth required)
        const response = await axios.post('http://localhost:3001/medicine/import-test', form, {
            headers: {
                ...form.getHeaders()
            },
            maxContentLength: Infinity,
            maxBodyLength: Infinity
        });
        
        console.log('✅ Upload successful!');
        console.log('📊 Import Results:');
        console.log(JSON.stringify(response.data, null, 2));
        
    } catch (error) {
        if (error.response) {
            console.log('❌ Server responded with error:');
            console.log(`Status: ${error.response.status}`);
            console.log(`Data:`, error.response.data);
        } else if (error.request) {
            console.log('❌ No response received:');
            console.log('Request config:', error.config);
            console.log('Error message:', error.message);
            console.log('Error code:', error.code);
        } else {
            console.log('❌ Error:', error.message);
        }
        
        console.log('\n🔧 Full error object:');
        console.log(error);
    }
}

testPharmacyImport();
