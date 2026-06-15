const mongoose = require('mongoose');
const SeedProduct = require('./models/SeedProduct');

mongoose.connect('mongodb://localhost:27017/ebmdb');

async function findAllProducts() {
    console.log('🔍 FINDING ALL PRODUCTS IN DATABASE\n');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    
    const all = await SeedProduct.find({}).sort({ featured: -1, productName: 1 });
    
    console.log(`📊 Total products found: ${all.length}\n`);
    
    const svg = all.filter(p => p.primaryImage?.includes('svg'));
    const local = all.filter(p => p.primaryImage?.includes('/uploads/'));
    
    console.log(`❌ Products with SVG: ${svg.length}`);
    console.log(`✅ Products with local files: ${local.length}\n`);
    
    console.log('━━━ SVG PRODUCTS (NEED TO DELETE): ━━━\n');
    svg.forEach((p, i) => {
        console.log(`${i+1}. ${p.productName}`);
        console.log(`   Featured: ${p.featured ? '⭐ YES' : 'NO'}`);
        console.log(`   Image preview: ${p.primaryImage.substring(0, 80)}...`);
        console.log(`   MongoDB ID: ${p._id}\n`);
    });
    
    console.log('\n━━━ LOCAL FILE PRODUCTS (GOOD): ━━━\n');
    local.forEach((p, i) => {
        console.log(`${i+1}. ${p.productName} - Featured: ${p.featured ? '⭐' : 'NO'}`);
    });
    
    mongoose.connection.close();
}

findAllProducts().catch(console.error);
