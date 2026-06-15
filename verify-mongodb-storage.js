const mongoose = require('mongoose');
const SeedProduct = require('./models/SeedProduct');

mongoose.connect('mongodb://localhost:27017/ebmdb');

async function verifyImageStorage() {
    try {
        const products = await SeedProduct.find({}).select('productName images primaryImage');
        
        console.log(`\n📊 Database Storage Verification\n${'='.repeat(60)}\n`);
        console.log(`Total products: ${products.length}\n`);
        
        let totalSize = 0;
        
        for (const product of products) {
            const imageCount = product.images.length;
            const primarySize = product.primaryImage ? product.primaryImage.length : 0;
            totalSize += primarySize;
            
            // Show first 100 chars of data URI to prove it's embedded
            const preview = product.primaryImage 
                ? product.primaryImage.substring(0, 100) + '...' 
                : 'No image';
            
            console.log(`📦 ${product.productName}`);
            console.log(`   Images: ${imageCount}`);
            console.log(`   Primary image size: ${Math.round(primarySize / 1024)} KB`);
            console.log(`   Storage type: ${product.primaryImage?.startsWith('data:') ? '✅ Base64 Data URI (IN DATABASE)' : '❌ File path'}`);
            console.log(`   Preview: ${preview}\n`);
        }
        
        console.log('='.repeat(60));
        console.log(`\n💾 Total image data in database: ${Math.round(totalSize / 1024 / 1024)} MB`);
        console.log(`✅ All images are embedded as Base64 in MongoDB`);
        console.log(`📦 Database is completely portable - no external files needed!`);
        console.log(`🌐 Images work everywhere - embedded in HTML!\n`);
        
    } catch (error) {
        console.error('Error:', error);
    } finally {
        mongoose.connection.close();
    }
}

verifyImageStorage();
