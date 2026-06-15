// import-wildwest-samples.js - Import sample Wild West Seed products
require('dotenv').config();
const mongoose = require('mongoose');
const SeedProduct = require('./models/SeedProduct');

mongoose.connect(process.env.MONGODB_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true
});

// Sample products from Wild West Seed website
const sampleProducts = [
    // Vegetables - Popular varieties
    {
        productName: 'Amsterdam Forcing Carrot',
        scientificName: 'Daucus carota',
        category: 'Vegetable',
        subcategory: 'Carrots',
        description: 'Early maturing carrot with sweet, crisp roots. Perfect for fresh eating and early season harvests.',
        variety: 'Heirloom',
        featured: true,
        inStock: true,
        specifications: { organic: false, nongmo: true }
    },
    {
        productName: 'Detroit Dark Red Beet',
        scientificName: 'Beta vulgaris',
        category: 'Vegetable',
        subcategory: 'Beets',
        description: 'Classic deep red beet with sweet flavor. Excellent for fresh eating, canning, or pickling.',
        variety: 'Heirloom',
        featured: true,
        inStock: true,
        specifications: { organic: true, nongmo: true }
    },
    {
        productName: 'Kentucky Wonder Pole Bean',
        scientificName: 'Phaseolus vulgaris',
        category: 'Vegetable',
        subcategory: 'Beans - Pole',
        description: 'Popular pole bean producing abundant 7-9 inch tender pods. Classic variety with excellent flavor.',
        variety: 'Heirloom',
        featured: true,
        inStock: true,
        specifications: { organic: false, nongmo: true }
    },
    {
        productName: 'Black Seeded Simpson Lettuce',
        scientificName: 'Lactuca sativa',
        category: 'Vegetable',
        subcategory: 'Lettuce - Leaf',
        description: 'Heat tolerant loose-leaf lettuce with crisp, light green leaves. Fast growing and slow to bolt.',
        variety: 'Heirloom',
        featured: true,
        inStock: true,
        specifications: { organic: true, nongmo: true }
    },
    {
        productName: 'Golden Acre Cabbage',
        scientificName: 'Brassica oleracea',
        category: 'Vegetable',
        subcategory: 'Cabbage',
        description: 'Compact heads ideal for small gardens. Sweet and tender, perfect for slaws and cooking.',
        variety: 'Heirloom',
        inStock: true,
        specifications: { organic: false, nongmo: true }
    },
    {
        productName: 'Marketmore 76 Cucumber',
        scientificName: 'Cucumis sativus',
        category: 'Vegetable',
        subcategory: 'Cucumbers - Slicing',
        description: 'Productive variety producing straight, dark green 8-9 inch fruits. Disease resistant.',
        variety: 'Hybrid',
        inStock: true,
        specifications: { organic: false, nongmo: false }
    },

    // Flowers - Popular varieties
    {
        productName: 'Autumn Beauty Sunflower',
        scientificName: 'Helianthus annuus',
        category: 'Flower',
        subcategory: 'Sunflowers',
        description: 'Stunning mix of colors including bronze, yellow, and mahogany. Grows 5-6 feet tall with multiple blooms.',
        variety: 'Open Pollinated',
        featured: true,
        inStock: true,
        specifications: { organic: true, nongmo: true }
    },
    {
        productName: 'Sensation Mix Cosmos',
        scientificName: 'Cosmos bipinnatus',
        category: 'Flower',
        subcategory: 'Cosmos',
        description: 'Large 3-4 inch flowers in pink, white, and carmine. Easy to grow, attracts butterflies.',
        variety: 'Open Pollinated',
        featured: true,
        inStock: true,
        specifications: { organic: false, nongmo: true }
    },
    {
        productName: 'Giant Imperial Larkspur',
        scientificName: 'Consolida ajacis',
        category: 'Flower',
        subcategory: 'Larkspur',
        description: 'Tall spikes of double flowers in mixed colors. Excellent for cutting gardens.',
        variety: 'Heirloom',
        featured: true,
        inStock: true,
        specifications: { organic: false, nongmo: true }
    },
    {
        productName: 'State Fair Mix Zinnia',
        scientificName: 'Zinnia elegans',
        category: 'Flower',
        subcategory: 'Zinnias',
        description: 'Large dahlia-type flowers up to 5 inches across. Heat and drought tolerant.',
        variety: 'Open Pollinated',
        featured: true,
        inStock: true,
        specifications: { organic: true, nongmo: true }
    },
    {
        productName: 'Double Choice Mix Hollyhock',
        scientificName: 'Alcea rosea',
        category: 'Flower',
        subcategory: 'Hollyhocks',
        description: 'Classic cottage garden flower with tall spires of double blooms. Perennial in zones 3-9.',
        variety: 'Heirloom',
        inStock: true,
        specifications: { organic: false, nongmo: true }
    },

    // Herbs - Popular varieties
    {
        productName: 'Genovese Basil',
        scientificName: 'Ocimum basilicum',
        category: 'Herb',
        subcategory: 'Basil',
        description: 'Classic Italian basil with large, aromatic leaves. Perfect for pesto and Italian cooking.',
        variety: 'Heirloom',
        featured: true,
        inStock: true,
        specifications: { organic: true, nongmo: true }
    },
    {
        productName: 'Italian Large Leaf Basil',
        scientificName: 'Ocimum basilicum',
        category: 'Herb',
        subcategory: 'Basil',
        description: 'Extra-large leaves with intense flavor. Vigorous plants produce abundant harvests.',
        variety: 'Open Pollinated',
        featured: true,
        inStock: true,
        specifications: { organic: false, nongmo: true }
    },
    {
        productName: 'Bouquet Dill',
        scientificName: 'Anethum graveolens',
        category: 'Herb',
        subcategory: 'Dill',
        description: 'Compact variety perfect for containers. Excellent for fresh use and pickling.',
        variety: 'Heirloom',
        inStock: true,
        specifications: { organic: true, nongmo: true }
    },
    {
        productName: 'Greek Oregano',
        scientificName: 'Origanum vulgare hirtum',
        category: 'Herb',
        subcategory: 'Oregano',
        description: 'True Greek oregano with intense flavor. Hardy perennial in zones 5-9.',
        variety: 'Heirloom',
        inStock: true,
        specifications: { organic: false, nongmo: true }
    },
    {
        productName: 'English Lavender',
        scientificName: 'Lavandula angustifolia',
        category: 'Herb',
        subcategory: 'Lavender',
        description: 'Fragrant purple flowers and aromatic foliage. Perennial zones 5-9.',
        variety: 'Open Pollinated',
        featured: true,
        inStock: true,
        specifications: { organic: true, nongmo: true }
    },

    // Wildflower Mixes - Popular blends
    {
        productName: 'Butterfly & Hummingbird Mix',
        category: 'Wildflower Mix',
        subcategory: 'Special Use',
        description: 'Specially selected flowers to attract butterflies and hummingbirds. Blooms spring through fall.',
        featured: true,
        inStock: true,
        specifications: { organic: false, nongmo: true },
        tags: ['pollinators', 'butterfly', 'hummingbird']
    },
    {
        productName: 'All Annual Wildflower Mix',
        category: 'Wildflower Mix',
        subcategory: 'Special Use',
        description: 'Fast-growing annual flowers for quick color. Blooms first season from seed.',
        featured: true,
        inStock: true,
        specifications: { organic: false, nongmo: true },
        tags: ['annual', 'fast-growing']
    },
    {
        productName: 'Texas Wildflower Mix',
        category: 'Wildflower Mix',
        subcategory: 'Regional',
        description: 'Native and adapted wildflowers for Texas conditions. Includes bluebonnets and Indian paintbrush.',
        featured: true,
        inStock: true,
        specifications: { organic: false, nongmo: true },
        tags: ['texas', 'native', 'regional']
    },
    {
        productName: 'Pacific Northwest Mix',
        category: 'Wildflower Mix',
        subcategory: 'Regional',
        description: 'Wildflowers adapted to cool, moist conditions of the Pacific Northwest.',
        inStock: true,
        specifications: { organic: false, nongmo: true },
        tags: ['regional', 'native']
    },
    {
        productName: 'Bee Mix Wildflowers',
        category: 'Wildflower Mix',
        subcategory: 'Special Use',
        description: 'Pollinator-friendly mix specifically chosen to support native bees and honeybees.',
        featured: true,
        inStock: true,
        specifications: { organic: true, nongmo: true },
        tags: ['pollinators', 'bees', 'organic']
    }
];

async function importProducts() {
    try {
        console.log('🌱 Starting Wild West Seed product import...\n');

        // Clear existing products (optional - comment out if you want to keep existing data)
        // await SeedProduct.deleteMany({});
        // console.log('✅ Cleared existing products\n');

        let imported = 0;
        let skipped = 0;

        for (const productData of sampleProducts) {
            // Check if product already exists
            const existing = await SeedProduct.findOne({
                productName: productData.productName,
                category: productData.category
            });

            if (existing) {
                console.log(`⏭️  Skipped: ${productData.productName} (already exists)`);
                skipped++;
                continue;
            }

            const product = new SeedProduct(productData);
            await product.save();
            console.log(`✅ Imported: ${productData.productName} (${productData.category})`);
            imported++;
        }

        console.log(`\n📊 Import Summary:`);
        console.log(`   ✅ Imported: ${imported} products`);
        console.log(`   ⏭️  Skipped: ${skipped} products (already exist)`);
        console.log(`   📦 Total: ${await SeedProduct.countDocuments()} products in database`);

        // Show category breakdown
        const categories = await SeedProduct.aggregate([
            { $match: { isActive: true } },
            { $group: { _id: '$category', count: { $sum: 1 } } },
            { $sort: { _id: 1 } }
        ]);

        console.log(`\n📈 Category Breakdown:`);
        categories.forEach(cat => {
            console.log(`   ${cat._id}: ${cat.count} products`);
        });

        console.log('\n✅ Import completed successfully!');
        console.log('\n🌐 View your catalog at: http://localhost:3001/wildwest');
        console.log('🔧 Admin panel at: http://localhost:3001/wildwest/admin\n');

    } catch (error) {
        console.error('❌ Error importing products:', error);
    } finally {
        await mongoose.connection.close();
        console.log('📴 Database connection closed');
    }
}

// Run the import
importProducts();
