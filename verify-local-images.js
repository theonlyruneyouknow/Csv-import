const mongoose = require('mongoose');
const SeedProduct = require('./models/SeedProduct');

mongoose.connect('mongodb://localhost:27017/ebmdb');

async function verify() {
    console.log('🔍 Checking current image storage format...\n');
    
    const products = await SeedProduct.find().limit(3);
    
    products.forEach(product => {
        console.log(`📦 ${product.productName}`);
        console.log(`   Primary Image: ${product.primaryImage}`);
        console.log(`   Image Type: ${product.primaryImage.startsWith('/uploads') ? '✅ Local File' : '❌ Not Local'}`);
        console.log(`   Total Images: ${product.images.length}\n`);
    });
    
    const svgCount = await SeedProduct.countDocuments({ primaryImage: /svg/ });
    const localCount = await SeedProduct.countDocuments({ primaryImage: /^\/uploads/ });
    const base64Count = await SeedProduct.countDocuments({ primaryImage: /^data:image/ });
    
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📊 STORAGE FORMAT SUMMARY:');
    console.log(`   Local Files: ${localCount} ✅`);
    console.log(`   SVG Placeholders: ${svgCount} ${svgCount > 0 ? '❌' : '✅'}`);
    console.log(`   Base64 Embedded: ${base64Count} ${base64Count > 0 ? '❌' : '✅'}`);
    
    mongoose.connection.close();
}

verify().catch(console.error);
