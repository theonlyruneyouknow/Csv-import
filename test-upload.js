const fs = require('fs');
const FormData = require('form-data');
const axios = require('axios');

async function testUpload() {
  try {
    console.log('Testing file upload to PO11350...');
    
    const form = new FormData();
    form.append('attachment', fs.createReadStream('test-attachment.txt'));
    form.append('poId', '68a73a804b826c8720e8e855');
    form.append('documentType', 'Other');
    form.append('description', 'Test upload');

    console.log('Sending request to upload-attachment...');
    
    const response = await axios.post('http://localhost:3001/purchase-orders/upload-attachment', form, {
      headers: {
        ...form.getHeaders(),
        'User-Agent': 'test-upload'
      },
      timeout: 10000
    });

    console.log('Upload successful:', response.data);
  } catch (error) {
    console.error('Upload failed:');
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

testUpload();
