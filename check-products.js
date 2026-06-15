const mongoose = require('mongoose');
const SeedProduct = require('./models/SeedProduct');

mongoose.connect('mongodb://localhost:27017/ebmdb');

async function checkProducts() {
    try {
        const count = await SeedProduct.countDocuments();
        console.log(`Total products in database: ${count}\n`);
        
        const products = await SeedProduct.find({}).select('productName images').limit(5);
        
        for (const product of products) {
            console.log(`Product: ${product.productName}`);
            console.log(`  Images: ${product.images.length}`);
            if (product.images.length > 0) {
                console.log(`  First image: ${product.images[0].url.substring(0, 80)}...`);
            }
            console.log('');
        }
        
    } catch (error) {
        console.error('Error:', error);
    } finally {
        mongoose.connection.close();
    }
}

checkProducts();
