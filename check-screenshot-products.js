const mongoose = require('mongoose');
const SeedProduct = require('./models/SeedProduct');

mongoose.connect('mongodb://localhost:27017/ebmdb');

async function checkSpecificProducts() {
    try {
        // Check the exact products shown in the screenshot
        const productNames = [
            'Amsterdam Forcing Carrot',
            'Black Seeded Simpson Lettuce', 
            'Detroit Dark Red Beet'
        ];
        
        console.log('\n🔍 Checking Products from Screenshot\n' + '='.repeat(60) + '\n');
        
        for (const name of productNames) {
            const product = await SeedProduct.findOne({ productName: name });
            
            if (!product) {
                console.log(`❌ ${name} - NOT FOUND IN DATABASE\n`);
                continue;
            }
            
            console.log(`📦 ${name}`);
            console.log(`   ID: ${product._id}`);
            console.log(`   Category: ${product.category}`);
            console.log(`   Images array length: ${product.images.length}`);
            
            if (product.primaryImage) {
                const isSvg = product.primaryImage.includes('svg');
                const isJpeg = product.primaryImage.includes('jpeg');
                const length = product.primaryImage.length;
                const preview = product.primaryImage.substring(0, 150);
                
                console.log(`   Primary Image:`);
                console.log(`     Type: ${isSvg ? '❌ SVG' : (isJpeg ? '✅ JPEG' : '❓ Unknown')}`);
                console.log(`     Size: ${Math.round(length / 1024)} KB`);
                console.log(`     Starts with: ${preview}...`);
                
                // Check all images in array
                product.images.forEach((img, i) => {
                    const imgIsSvg = img.url.includes('svg');
                    const imgIsJpeg = img.url.includes('jpeg');
                    console.log(`     Image ${i + 1}: ${imgIsSvg ? '❌ SVG' : (imgIsJpeg ? '✅ JPEG' : '❓ Unknown')} (${Math.round(img.url.length / 1024)} KB)`);
                });
            } else {
                console.log(`   ❌ No primaryImage field!`);
            }
            console.log('');
        }
        
        // Also check if there are any products with SVG
        const allProducts = await SeedProduct.find({});
        console.log('='.repeat(60));
        console.log(`\nDatabase Summary:`);
        console.log(`Total products: ${allProducts.length}`);
        
        const withSvg = allProducts.filter(p => p.primaryImage?.includes('svg+xml'));
        const withJpeg = allProducts.filter(p => p.primaryImage?.includes('jpeg'));
        const withOther = allProducts.filter(p => p.primaryImage && !p.primaryImage.includes('svg') && !p.primaryImage.includes('jpeg'));
        
        console.log(`Products with SVG: ${withSvg.length}`);
        console.log(`Products with JPEG: ${withJpeg.length}`);
        console.log(`Products with other: ${withOther.length}`);
        
        if (withSvg.length > 0) {
            console.log(`\n⚠️ Products with SVG placeholders:`);
            withSvg.forEach(p => console.log(`  - ${p.productName}`));
        }
        
    } catch (error) {
        console.error('Error:', error);
    } finally {
        mongoose.connection.close();
    }
}

checkSpecificProducts();
