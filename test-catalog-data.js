const mongoose = require('mongoose');
const SeedProduct = require('./models/SeedProduct');

mongoose.connect('mongodb://localhost:27017/ebmdb');

async function testCatalogData() {
    try {
        const products = await SeedProduct.find({ featured: true }).limit(3);
        
        console.log(`\n🔍 Testing Catalog Data\n${'='.repeat(60)}\n`);
        
        for (const product of products) {
            console.log(`📦 ${product.productName}`);
            console.log(`   Category: ${product.category}`);
            console.log(`   Images in database: ${product.images.length}`);
            
            if (product.primaryImage) {
                const isDataUri = product.primaryImage.startsWith('data:');
                const isSvg = product.primaryImage.includes('svg+xml');
                const isJpeg = product.primaryImage.includes('image/jpeg');
                
                console.log(`   Primary Image Type: ${isDataUri ? (isSvg ? '❌ SVG Placeholder' : '✅ Real JPEG Data URI') : '❌ File Path'}`);
                console.log(`   Preview: ${product.primaryImage.substring(0, 80)}...`);
            }
            console.log('');
        }
        
        // Check all products
        const allProducts = await SeedProduct.find({});
        const svgCount = allProducts.filter(p => p.primaryImage?.includes('svg+xml')).length;
        const jpegCount = allProducts.filter(p => p.primaryImage?.includes('image/jpeg')).length;
        
        console.log('='.repeat(60));
        console.log(`\n📊 Summary:`);
        console.log(`   Total products: ${allProducts.length}`);
        console.log(`   With SVG placeholders: ${svgCount}`);
        console.log(`   With real JPEG images: ${jpegCount}`);
        
        if (svgCount > 0) {
            console.log(`\n⚠️  WARNING: ${svgCount} products still have SVG placeholders!`);
        } else {
            console.log(`\n✅ All products have real JPEG images!`);
        }
        
    } catch (error) {
        console.error('Error:', error);
    } finally {
        mongoose.connection.close();
    }
}

testCatalogData();
