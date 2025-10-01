const fs = require('fs');
const FormData = require('form-data');
const axios = require('axios');

async function testCsvUpload() {
    try {
        console.log('🚀 Testing CSV upload with DLF vendor...');
        
        const form = new FormData();
        form.append('csvFile', fs.createReadStream('./test-dlf-vendor.csv'), 'test-dlf-vendor.csv');
        
        console.log('📤 Sending CSV upload request...');
        const response = await axios.post('http://localhost:3002/test-upload/upload', form, {
            headers: {
                ...form.getHeaders(),
                'User-Agent': 'csv-test-upload'
            },
            timeout: 30000
        });
        
        console.log('✅ Upload successful!');
        console.log('📝 Response status:', response.status);
        console.log('📝 Response data:', response.data);
        
    } catch (error) {
        console.error('❌ CSV upload failed:');
        if (error.response) {
            console.error('Status:', error.response.status);
            console.error('Data:', error.response.data);
        } else if (error.request) {
            console.error('No response received:', error.message);
        } else {
            console.error('Error:', error.message);
        }
    }
}

testCsvUpload();
