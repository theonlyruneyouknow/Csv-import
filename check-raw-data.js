const mongoose = require('mongoose');
const SeedProduct = require('./models/SeedProduct');

mongoose.connect('mongodb://localhost:27017/ebmdb');

async function checkActualData() {
    try {
        const product = await SeedProduct.findOne({ productName: 'Detroit Dark Red Beet' });
        
        if (!product) {
            console.log('Product not found');
            return;
        }
        
        console.log('\n🔍 Checking Detroit Dark Red Beet (flagged as SVG)\n' + '='.repeat(60) + '\n');
        
        const img = product.primaryImage;
        console.log(`Length: ${img.length} characters (${Math.round(img.length/1024)} KB)`);
        console.log(`\nFirst 500 characters:`);
        console.log(img.substring(0, 500));
        console.log('\n...\n');
        console.log(`\nLast 100 characters:`);
        console.log(img.substring(img.length - 100));
        
        console.log(`\n\nChecks:`);
        console.log(`  Starts with 'data:': ${img.startsWith('data:')}`);
        console.log(`  Contains 'image/jpeg': ${img.includes('image/jpeg')}`);
        console.log(`  Contains 'svg': ${img.includes('svg')}`);
        console.log(`  Contains 'svg+xml': ${img.includes('svg+xml')}`);
        console.log(`  Contains '<svg': ${img.includes('<svg')}`);
        
        // Check if 'svg' appears as part of base64 data
        const dataStart = img.indexOf('base64,');
        if (dataStart > 0) {
            const base64Part = img.substring(dataStart + 7, dataStart + 200);
            console.log(`\n  Base64 data preview: ${base64Part}...`);
            console.log(`  'svg' in base64?: ${base64Part.includes('svg')}`);
        }
        
        // Actually decode a small part to see if it's valid JPEG
        const base64Data = img.split(',')[1];
        if (base64Data) {
            const buffer = Buffer.from(base64Data.substring(0, 100), 'base64');
            const hex = buffer.toString('hex');
            console.log(`\n  Decoded hex (first 50 bytes): ${hex.substring(0, 100)}`);
            console.log(`  Is JPEG (starts with FFD8FF): ${hex.startsWith('ffd8ff')}`);
            console.log(`  Is SVG (contains '<svg'): ${buffer.toString().includes('<svg')}`);
        }
        
    } catch (error) {
        console.error('Error:', error);
    } finally {
        mongoose.connection.close();
    }
}

checkActualData();
