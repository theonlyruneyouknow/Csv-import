const mongoose = require('mongoose');
const SeedProduct = require('./models/SeedProduct');

mongoose.connect('mongodb://localhost:27017/ebmdb');

async function showAll() {
    console.log('📊 SHOWING ALL PRODUCTS IN DATABASE\n');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    
    const all = await SeedProduct.find().sort({ productName: 1 });
    
    console.log(`Total products: ${all.length}\n`);
    
    all.forEach((p, i) => {
        const imageType = p.primaryImage?.includes('svg') ? '❌ SVG' : 
                         p.primaryImage?.includes('/uploads/') ? '✅ Local' : '❓ Other';
        console.log(`${i+1}. ${p.productName}`);
        console.log(`   Featured: ${p.featured ? '⭐ YES' : 'NO'}`);
        console.log(`   Image: ${imageType}`);
        console.log(`   Preview: ${p.primaryImage?.substring(0, 100)}`);
        console.log(`   Created: ${p.created}`);
        console.log(`   Updated: ${p.updated}\n`);
    });
    
    mongoose.connection.close();
}

showAll().catch(console.error);
