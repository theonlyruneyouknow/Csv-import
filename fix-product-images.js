// fix-product-images.js - Replace external images with reliable placeholders
require('dotenv').config();
const mongoose = require('mongoose');
const SeedProduct = require('./models/SeedProduct');

mongoose.connect(process.env.MONGODB_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true
});

// Using placeholder.com which has better CORS support
const imagePlaceholders = {
    // Vegetables - using placeholder with colors and text
    'Amsterdam Forcing Carrot': [
        'https://via.placeholder.com/800/FF8C42/FFFFFF?text=Carrot+1',
        'https://via.placeholder.com/800/FF8C42/FFFFFF?text=Carrot+2'
    ],
    'Detroit Dark Red Beet': [
        'https://via.placeholder.com/800/8B0000/FFFFFF?text=Beet+1',
        'https://via.placeholder.com/800/8B0000/FFFFFF?text=Beet+2'
    ],
    'Kentucky Wonder Pole Bean': [
        'https://via.placeholder.com/800/228B22/FFFFFF?text=Bean+1',
        'https://via.placeholder.com/800/228B22/FFFFFF?text=Bean+2'
    ],
    'Black Seeded Simpson Lettuce': [
        'https://via.placeholder.com/800/90EE90/333333?text=Lettuce+1',
        'https://via.placeholder.com/800/90EE90/333333?text=Lettuce+2'
    ],
    'Golden Acre Cabbage': [
        'https://via.placeholder.com/800/98FB98/333333?text=Cabbage+1',
        'https://via.placeholder.com/800/98FB98/333333?text=Cabbage+2'
    ],
    'Marketmore 76 Cucumber': [
        'https://via.placeholder.com/800/006400/FFFFFF?text=Cucumber+1',
        'https://via.placeholder.com/800/006400/FFFFFF?text=Cucumber+2'
    ],

    // Flowers - colorful placeholders
    'Autumn Beauty Sunflower': [
        'https://via.placeholder.com/800/FFD700/333333?text=Sunflower+1',
        'https://via.placeholder.com/800/FF8C00/333333?text=Sunflower+2',
        'https://via.placeholder.com/800/FFB347/333333?text=Sunflower+3'
    ],
    'Sensation Mix Cosmos': [
        'https://via.placeholder.com/800/FF69B4/FFFFFF?text=Cosmos+1',
        'https://via.placeholder.com/800/FFB6C1/333333?text=Cosmos+2'
    ],
    'Giant Imperial Larkspur': [
        'https://via.placeholder.com/800/6A5ACD/FFFFFF?text=Larkspur+1',
        'https://via.placeholder.com/800/9370DB/FFFFFF?text=Larkspur+2'
    ],
    'State Fair Mix Zinnia': [
        'https://via.placeholder.com/800/FF1493/FFFFFF?text=Zinnia+1',
        'https://via.placeholder.com/800/FF6347/FFFFFF?text=Zinnia+2',
        'https://via.placeholder.com/800/FF4500/FFFFFF?text=Zinnia+3'
    ],
    'Double Choice Mix Hollyhock': [
        'https://via.placeholder.com/800/DB7093/FFFFFF?text=Hollyhock+1',
        'https://via.placeholder.com/800/FFB6D9/333333?text=Hollyhock+2'
    ],

    // Herbs - green tones
    'Genovese Basil': [
        'https://via.placeholder.com/800/228B22/FFFFFF?text=Basil+1',
        'https://via.placeholder.com/800/32CD32/333333?text=Basil+2',
        'https://via.placeholder.com/800/00FF00/333333?text=Basil+3'
    ],
    'Italian Large Leaf Basil': [
        'https://via.placeholder.com/800/006400/FFFFFF?text=Large+Basil+1',
        'https://via.placeholder.com/800/2E8B57/FFFFFF?text=Large+Basil+2'
    ],
    'Bouquet Dill': [
        'https://via.placeholder.com/800/9ACD32/333333?text=Dill+1',
        'https://via.placeholder.com/800/ADFF2F/333333?text=Dill+2'
    ],
    'Greek Oregano': [
        'https://via.placeholder.com/800/556B2F/FFFFFF?text=Oregano+1',
        'https://via.placeholder.com/800/6B8E23/FFFFFF?text=Oregano+2'
    ],
    'English Lavender': [
        'https://via.placeholder.com/800/9370DB/FFFFFF?text=Lavender+1',
        'https://via.placeholder.com/800/8A2BE2/FFFFFF?text=Lavender+2',
        'https://via.placeholder.com/800/9932CC/FFFFFF?text=Lavender+3'
    ],

    // Wildflower Mixes - mixed colors
    'Butterfly & Hummingbird Mix': [
        'https://via.placeholder.com/800/FF69B4/FFFFFF?text=Butterfly+Mix+1',
        'https://via.placeholder.com/800/FF1493/FFFFFF?text=Butterfly+Mix+2',
        'https://via.placeholder.com/800/C71585/FFFFFF?text=Butterfly+Mix+3'
    ],
    'All Annual Wildflower Mix': [
        'https://via.placeholder.com/800/FF6347/FFFFFF?text=Annual+Mix+1',
        'https://via.placeholder.com/800/FFA500/333333?text=Annual+Mix+2',
        'https://via.placeholder.com/800/FFD700/333333?text=Annual+Mix+3'
    ],
    'Texas Wildflower Mix': [
        'https://via.placeholder.com/800/4169E1/FFFFFF?text=Texas+Mix+1',
        'https://via.placeholder.com/800/1E90FF/FFFFFF?text=Texas+Mix+2',
        'https://via.placeholder.com/800/00BFFF/333333?text=Texas+Mix+3'
    ],
    'Pacific Northwest Mix': [
        'https://via.placeholder.com/800/2F4F4F/FFFFFF?text=Northwest+Mix+1',
        'https://via.placeholder.com/800/708090/FFFFFF?text=Northwest+Mix+2',
        'https://via.placeholder.com/800/778899/FFFFFF?text=Northwest+Mix+3'
    ],
    'Bee Mix Wildflowers': [
        'https://via.placeholder.com/800/FFD700/333333?text=Bee+Mix+1',
        'https://via.placeholder.com/800/FFA500/333333?text=Bee+Mix+2',
        'https://via.placeholder.com/800/FF8C00/FFFFFF?text=Bee+Mix+3'
    ]
};

async function fixImages() {
    try {
        console.log('🔧 Starting image URL fix...\n');

        let updated = 0;
        let skipped = 0;

        const products = await SeedProduct.find({});
        console.log(`Found ${products.length} products to check\n`);

        for (const product of products) {
            const newImageUrls = imagePlaceholders[product.productName];

            if (!newImageUrls) {
                console.log(`⏭️  Skipped: ${product.productName} (no placeholder mapping)`);
                skipped++;
                continue;
            }

            // Check if images need updating (if they're from unsplash)
            const needsUpdate = product.images && product.images.length > 0 && 
                               product.images.some(img => img.url.includes('unsplash'));

            if (!needsUpdate) {
                console.log(`⏭️  Skipped: ${product.productName} (images already updated)`);
                skipped++;
                continue;
            }

            // Update images with new placeholders
            product.images = newImageUrls.map((url, index) => ({
                url: url,
                caption: `${product.productName} - Image ${index + 1}`,
                isPrimary: index === 0,
                order: index
            }));

            await product.save();
            console.log(`✅ Updated ${newImageUrls.length} images for: ${product.productName}`);
            updated++;
        }

        console.log(`\n📊 Fix Summary:`);
        console.log(`   ✅ Updated: ${updated} products`);
        console.log(`   ⏭️  Skipped: ${skipped} products`);

        console.log('\n✅ Image URL fix completed!');
        console.log('🌐 Refresh catalog to see working images: http://localhost:3001/wildwest\n');

    } catch (error) {
        console.error('❌ Error fixing images:', error);
    } finally {
        await mongoose.connection.close();
        console.log('📴 Database connection closed');
    }
}

// Run the fix
fixImages();
