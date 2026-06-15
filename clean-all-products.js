const mongoose = require('mongoose');
const SeedProduct = require('./models/SeedProduct');

mongoose.connect('mongodb://localhost:27017/ebmdb');

async function cleanDatabase() {
    console.log('🗑️  DELETING ALL SEED PRODUCTS...\n');
    
    // Show what we're deleting
    const all = await SeedProduct.find();
    console.log(`Found ${all.length} products:\n`);
    
    all.forEach(p => {
        const type = p.primaryImage?.includes('svg') ? '❌ SVG' : 
                     p.primaryImage?.includes('/uploads/') ? '✅ Local' : '❓ Unknown';
        console.log(`  ${p.productName} - ${type}`);
    });
    
    // Delete ALL
    const result = await SeedProduct.deleteMany({});
    console.log(`\n✅ Deleted ${result.deletedCount} products`);
    console.log('💾 Database is now completely empty\n');
    
    mongoose.connection.close();
}

cleanDatabase().catch(console.error);
