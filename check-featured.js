const mongoose = require('mongoose');
const SeedProduct = require('./models/SeedProduct');

mongoose.connect('mongodb://localhost:27017/ebmdb');

async function checkFeatured() {
    console.log('🔍 Checking featured products in database...\n');
    
    const featured = await SeedProduct.find({ featured: true }).sort({ updated: -1 });
    
    console.log(`Found ${featured.length} featured products:\n`);
    
    featured.forEach((p, i) => {
        const imageType = p.primaryImage?.includes('svg') ? '❌ SVG' : 
                         p.primaryImage?.includes('/uploads/') ? '✅ Local File' : '❓ Unknown';
        console.log(`${i+1}. ${p.productName}`);
        console.log(`   Featured: ${p.featured}`);
        console.log(`   Image: ${imageType}`);
        console.log(`   Path: ${p.primaryImage?.substring(0, 80)}...\n`);
    });
    
    // Check all products
    const all = await SeedProduct.find().sort({ updated: -1 });
    console.log(`\n━━━━━━━━━━━━━━━━━━━━━━━`);
    console.log(`Total products: ${all.length}`);
    console.log(`Featured: ${featured.length}`);
    
    mongoose.connection.close();
}

checkFeatured().catch(console.error);
