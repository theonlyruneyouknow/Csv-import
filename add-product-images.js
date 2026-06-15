// add-product-images.js - Add placeholder images to sample products
require('dotenv').config();
const mongoose = require('mongoose');
const SeedProduct = require('./models/SeedProduct');

mongoose.connect(process.env.MONGODB_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true
});

// Free image URLs from Unsplash (royalty-free, attribution not required for this use)
const imageMapping = {
    // Vegetables
    'Amsterdam Forcing Carrot': [
        'https://images.unsplash.com/photo-1598170845058-32b9d6a5da37?w=800',  // Carrots
        'https://images.unsplash.com/photo-1447175008436-054170c2e979?w=800'   // Carrot bunch
    ],
    'Detroit Dark Red Beet': [
        'https://images.unsplash.com/photo-1590165482129-1b8b27698780?w=800',  // Beets
        'https://images.unsplash.com/photo-1570096577339-9e99d0e5200e?w=800'   // Red beets
    ],
    'Kentucky Wonder Pole Bean': [
        'https://images.unsplash.com/photo-1591868655482-f5b89850be6d?w=800',  // Green beans
        'https://images.unsplash.com/photo-1610076004943-92612ff56250?w=800'   // Bean harvest
    ],
    'Black Seeded Simpson Lettuce': [
        'https://images.unsplash.com/photo-1622206151226-18ca2c9ab4a1?w=800',  // Lettuce
        'https://images.unsplash.com/photo-1556801712-76c8eb07bbc9?w=800'      // Green lettuce
    ],
    'Golden Acre Cabbage': [
        'https://images.unsplash.com/photo-1594282486552-05b4d80fbb9f?w=800',  // Cabbage
        'https://images.unsplash.com/photo-1553395681-6d0d67548d3d?w=800'      // Cabbage head
    ],
    'Marketmore 76 Cucumber': [
        'https://images.unsplash.com/photo-1568584711271-6b2c9d5e4147?w=800',  // Cucumbers
        'https://images.unsplash.com/photo-1604977042946-1eecc30f269e?w=800'   // Cucumber plant
    ],

    // Flowers
    'Autumn Beauty Sunflower': [
        'https://images.unsplash.com/photo-1597848212624-e530bb7f5df1?w=800',  // Sunflower mix
        'https://images.unsplash.com/photo-1470509037663-253afd7f0f51?w=800',  // Sunflower close
        'https://images.unsplash.com/photo-1533638522308-ec2d1f932172?w=800'   // Sunflower field
    ],
    'Sensation Mix Cosmos': [
        'https://images.unsplash.com/photo-1631880422834-f0b88c47c7ce?w=800',  // Cosmos flowers
        'https://images.unsplash.com/photo-1595430274681-0370e33c66cc?w=800'   // Pink cosmos
    ],
    'Giant Imperial Larkspur': [
        'https://images.unsplash.com/photo-1597958601089-48f29748da1a?w=800',  // Larkspur purple
        'https://images.unsplash.com/photo-1490750967868-88aa4486c946?w=800'   // Delphinium mix
    ],
    'State Fair Mix Zinnia': [
        'https://images.unsplash.com/photo-1592420146732-c8e83d4ebb45?w=800',  // Zinnia pink
        'https://images.unsplash.com/photo-1595935830649-20181c3a94d6?w=800',  // Zinnia red
        'https://images.unsplash.com/photo-1597958601089-48f29748da1a?w=800'   // Zinnia mix
    ],
    'Double Choice Mix Hollyhock': [
        'https://images.unsplash.com/photo-1597439619323-4803bfbfa6a9?w=800',  // Hollyhock
        'https://images.unsplash.com/photo-1594834842322-1946acc21d07?w=800'   // Pink hollyhock
    ],

    // Herbs
    'Genovese Basil': [
        'https://images.unsplash.com/photo-1618375569909-3c8616cf7542?w=800',  // Basil plant
        'https://images.unsplash.com/photo-1618164436241-4473940d1f5c?w=800',  // Basil leaves
        'https://images.unsplash.com/photo-1588423771073-b727b88ff049?w=800'   // Fresh basil
    ],
    'Italian Large Leaf Basil': [
        'https://images.unsplash.com/photo-1610937751193-6e8293efa82e?w=800',  // Large basil
        'https://images.unsplash.com/photo-1614777735430-2e11dd6d34da?w=800'   // Basil garden
    ],
    'Bouquet Dill': [
        'https://images.unsplash.com/photo-1628556899095-bb087897a670?w=800',  // Dill plant
        'https://images.unsplash.com/photo-1629190701171-7b87f57f68d3?w=800'   // Dill flowers
    ],
    'Greek Oregano': [
        'https://images.unsplash.com/photo-1598023696416-0193a0bcd302?w=800',  // Oregano
        'https://images.unsplash.com/photo-1607538376080-8acb1e9b6c7d?w=800'   // Oregano plant
    ],
    'English Lavender': [
        'https://images.unsplash.com/photo-1565011523534-747a8601f10a?w=800',  // Lavender field
        'https://images.unsplash.com/photo-1561835491-ed2567d96913?w=800',    // Lavender close
        'https://images.unsplash.com/photo-1499002238440-d264edd596ec?w=800'   // Purple lavender
    ],

    // Wildflower Mixes
    'Butterfly & Hummingbird Mix': [
        'https://images.unsplash.com/photo-1469259943454-aa100abba749?w=800',  // Butterfly on flower
        'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=800',    // Wildflower meadow
        'https://images.unsplash.com/photo-1464226184884-fa280b87c399?w=800'   // Mixed wildflowers
    ],
    'All Annual Wildflower Mix': [
        'https://images.unsplash.com/photo-1490750967868-88aa4486c946?w=800',  // Mixed flowers
        'https://images.unsplash.com/photo-1563670423530-1af345999cfc?w=800',  // Colorful garden
        'https://images.unsplash.com/photo-1582794543139-8ac9cb0f7b11?w=800'   // Annual flowers
    ],
    'Texas Wildflower Mix': [
        'https://images.unsplash.com/photo-1461354464878-ad92f492a5a0?w=800',  // Texas bluebonnets
        'https://images.unsplash.com/photo-1490750967868-88aa4486c946?w=800',  // Wild mix
        'https://images.unsplash.com/photo-1582794543139-8ac9cb0f7b11?w=800'   // Meadow flowers
    ],
    'Pacific Northwest Mix': [
        'https://images.unsplash.com/photo-1563670423530-1af345999cfc?w=800',  // Forest flowers
        'https://images.unsplash.com/photo-1470058869958-2a77ade41c02?w=800',  // Mountain wildflowers
        'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800'   // Northwest landscape
    ],
    'Bee Mix Wildflowers': [
        'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=800',    // Bee on flower
        'https://images.unsplash.com/photo-1535083783855-76ae62b2914e?w=800',  // Pollinator garden
        'https://images.unsplash.com/photo-1490750967868-88aa4486c946?w=800'   // Bee-friendly flowers
    ]
};

async function addImages() {
    try {
        console.log('🖼️  Starting image addition process...\n');

        let updated = 0;
        let skipped = 0;
        let notFound = 0;

        const products = await SeedProduct.find({});
        console.log(`Found ${products.length} products to process\n`);

        for (const product of products) {
            const imageUrls = imageMapping[product.productName];

            if (!imageUrls) {
                console.log(`⚠️  No images mapped for: ${product.productName}`);
                notFound++;
                continue;
            }

            if (product.images && product.images.length > 0) {
                console.log(`⏭️  Skipped: ${product.productName} (already has ${product.images.length} images)`);
                skipped++;
                continue;
            }

            // Add images to product
            product.images = imageUrls.map((url, index) => ({
                url: url,
                caption: `${product.productName} - Image ${index + 1}`,
                isPrimary: index === 0,  // First image is primary
                order: index
            }));

            await product.save();
            console.log(`✅ Added ${imageUrls.length} images to: ${product.productName}`);
            updated++;
        }

        console.log(`\n📊 Image Addition Summary:`);
        console.log(`   ✅ Updated: ${updated} products`);
        console.log(`   ⏭️  Skipped: ${skipped} products (already have images)`);
        console.log(`   ⚠️  Not Found: ${notFound} products (no image mapping)`);

        // Show sample results
        console.log(`\n📸 Sample Results:`);
        const samplesWithImages = await SeedProduct.find({ 'images.0': { $exists: true } }).limit(5);
        for (const sample of samplesWithImages) {
            console.log(`   ${sample.productName}: ${sample.images.length} images`);
            console.log(`      Primary: ${sample.primaryImage}`);
        }

        console.log('\n✅ Image addition completed successfully!');
        console.log('\n🌐 View your catalog with images at: http://localhost:3001/wildwest\n');

    } catch (error) {
        console.error('❌ Error adding images:', error);
    } finally {
        await mongoose.connection.close();
        console.log('📴 Database connection closed');
    }
}

// Run the image addition
addImages();
