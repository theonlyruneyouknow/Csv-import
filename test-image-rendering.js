const mongoose = require('mongoose');
const SeedProduct = require('./models/SeedProduct');
const fs = require('fs');
const path = require('path');

mongoose.connect('mongodb://localhost:27017/ebmdb');

async function testImageRendering() {
    try {
        const product = await SeedProduct.findOne({ productName: 'Amsterdam Forcing Carrot' });
        
        if (!product) {
            console.log('❌ Product not found');
            return;
        }
        
        console.log('\n📦 Testing Image Rendering\n' + '='.repeat(60) + '\n');
        console.log(`Product: ${product.productName}`);
        console.log(`Images in DB: ${product.images.length}`);
        console.log(`Primary image length: ${product.primaryImage?.length || 0} characters`);
        console.log(`Primary image size: ${Math.round((product.primaryImage?.length || 0) / 1024)} KB`);
        
        // Check if it's a valid data URI
        const isDataUri = product.primaryImage?.startsWith('data:');
        const isJpeg = product.primaryImage?.includes('image/jpeg');
        
        console.log(`\nValidation:`);
        console.log(`  Is data URI: ${isDataUri ? '✅' : '❌'}`);
        console.log(`  Is JPEG: ${isJpeg ? '✅' : '❌'}`);
        console.log(`  Preview: ${product.primaryImage?.substring(0, 80)}...`);
        
        // Create a test HTML file to verify rendering
        const htmlContent = `<!DOCTYPE html>
<html>
<head>
    <title>Image Test</title>
    <style>
        body { font-family: Arial; padding: 20px; }
        img { max-width: 500px; border: 2px solid #333; }
        .info { background: #f0f0f0; padding: 10px; margin: 10px 0; }
    </style>
</head>
<body>
    <h1>Image Rendering Test</h1>
    
    <div class="info">
        <strong>Product:</strong> ${product.productName}<br>
        <strong>Image Type:</strong> ${isDataUri ? 'Base64 Data URI' : 'Unknown'}<br>
        <strong>Image Size:</strong> ${Math.round((product.primaryImage?.length || 0) / 1024)} KB<br>
        <strong>Is JPEG:</strong> ${isJpeg ? 'Yes' : 'No'}
    </div>
    
    <h2>Primary Image:</h2>
    <img src="${product.primaryImage}" alt="${product.productName}" 
         onerror="this.style.border='3px solid red'; this.alt='FAILED TO LOAD';">
    
    <h2>All Images:</h2>
    ${product.images.map((img, i) => `
        <h3>Image ${i + 1} (${Math.round(img.url.length / 1024)} KB)</h3>
        <img src="${img.url}" alt="Image ${i + 1}"
             onerror="this.style.border='3px solid red'; this.alt='FAILED';"
             style="max-width: 300px;">
    `).join('')}
    
    <script>
        console.log('Page loaded');
        const imgs = document.querySelectorAll('img');
        imgs.forEach((img, i) => {
            img.addEventListener('load', () => {
                console.log('Image ' + (i + 1) + ' loaded successfully');
                img.style.border = '3px solid green';
            });
            img.addEventListener('error', (e) => {
                console.error('Image ' + (i + 1) + ' FAILED to load', e);
                img.style.border = '3px solid red';
            });
        });
    </script>
</body>
</html>`;
        
        const testFile = path.join(__dirname, 'test-image-render.html');
        fs.writeFileSync(testFile, htmlContent);
        
        console.log(`\n✅ Test HTML created: ${testFile}`);
        console.log(`\n📂 Open this file in your browser to test image rendering`);
        console.log(`   If images show with GREEN border = Working ✅`);
        console.log(`   If images show with RED border = Broken ❌\n`);
        
    } catch (error) {
        console.error('Error:', error);
    } finally {
        mongoose.connection.close();
    }
}

testImageRendering();
