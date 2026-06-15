require('dotenv').config();
const mongoose = require('mongoose');
const https = require('https');
const fs = require('fs');
const path = require('path');
const SeedProduct = require('./models/SeedProduct');

// Use the same database connection as the main app
const mongoURI = process.env.MONGODB_URI || 'mongodb://localhost:27017/csv-import-test';
console.log(`🔗 Connecting to: ${mongoURI.replace(/\/\/([^:]+):([^@]+)@/, '//$1:****@')}\n`);
mongoose.connect(mongoURI);

// Create upload directory
const uploadDir = path.join(__dirname, 'uploads', 'wildwest-products');
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
    console.log('📁 Created uploads directory\n');
}

// Download image from URL
function downloadImage(url, filepath) {
    return new Promise((resolve, reject) => {
        https.get(url, (response) => {
            if (response.statusCode === 200) {
                const fileStream = fs.createWriteStream(filepath);
                response.pipe(fileStream);
                fileStream.on('finish', () => {
                    fileStream.close();
                    resolve(filepath);
                });
                fileStream.on('error', reject);
            } else if (response.statusCode === 301 || response.statusCode === 302) {
                // Follow redirect
                downloadImage(response.headers.location, filepath).then(resolve).catch(reject);
            } else {
                reject(new Error(`HTTP ${response.statusCode}`));
            }
        }).on('error', reject);
    });
}

// Sample products with real image URLs
const sampleProducts = [
    {
        productName: 'Amsterdam Forcing Carrot',
        scientificName: 'Daucus carota',
        category: 'Vegetable',
        subcategory: 'Root Vegetables',
        description: 'Early maturing, cylindrical carrots with excellent flavor. Perfect for fresh eating and juicing.',
        specifications: { organic: true, nongmo: true },
        growingInfo: { daysToMaturity: 55, sunRequirement: 'Full Sun', soilType: 'Loamy, well-drained' },
        featured: true,
        inStock: true,
        imageUrls: [
            'https://images.unsplash.com/photo-1598170845058-32b9d6a5da37?w=800&q=80',
            'https://images.unsplash.com/photo-1582515073490-39981397c445?w=800&q=80'
        ]
    },
    {
        productName: 'Detroit Dark Red Beet',
        scientificName: 'Beta vulgaris',
        category: 'Vegetable',
        subcategory: 'Root Vegetables',
        description: 'Classic dark red beets with sweet flavor. Great for roasting, pickling, or fresh salads.',
        specifications: { organic: true, nongmo: true },
        growingInfo: { daysToMaturity: 60, sunRequirement: 'Full Sun', soilType: 'Rich, loose soil' },
        featured: true,
        inStock: true,
        imageUrls: [
            'https://images.unsplash.com/photo-1570359895181-3788e3f3e3b7?w=800&q=80',
            'https://images.unsplash.com/photo-1590777950473-6132ef18d8a2?w=800&q=80'
        ]
    },
    {
        productName: 'Kentucky Wonder Pole Bean',
        scientificName: 'Phaseolus vulgaris',
        category: 'Vegetable',
        subcategory: 'Beans',
        description: 'Vigorous climbing beans producing abundant harvests. Excellent fresh or preserved.',
        specifications: { organic: false, nongmo: true },
        growingInfo: { daysToMaturity: 70, sunRequirement: 'Full Sun', soilType: 'Well-drained' },
        featured: false,
        inStock: true,
        imageUrls: [
            'https://images.unsplash.com/photo-1599459183200-59c7687a0275?w=800&q=80',
            'https://images.unsplash.com/photo-1626497764746-6dc36546b388?w=800&q=80'
        ]
    },
    {
        productName: 'Black Seeded Simpson Lettuce',
        scientificName: 'Lactuca sativa',
        category: 'Vegetable',
        subcategory: 'Leafy Greens',
        description: 'Crisp, tender leaves perfect for salads. Heat tolerant and slow to bolt.',
        specifications: { organic: true, nongmo: true },
        growingInfo: { daysToMaturity: 45, sunRequirement: 'Partial Sun', soilType: 'Rich, moist' },
        featured: true,
        inStock: true,
        imageUrls: [
            'https://images.unsplash.com/photo-1622206151226-18ca2c9ab4a1?w=800&q=80',
            'https://images.unsplash.com/photo-1556801712-76c8eb07bbc9?w=800&q=80'
        ]
    },
    {
        productName: 'Golden Acre Cabbage',
        scientificName: 'Brassica oleracea',
        category: 'Vegetable',
        subcategory: 'Brassicas',
        description: 'Compact heads of sweet, tender cabbage. Excellent for small gardens.',
        specifications: { organic: false, nongmo: true },
        growingInfo: { daysToMaturity: 70, sunRequirement: 'Full Sun', soilType: 'Rich, moist' },
        featured: false,
        inStock: true,
        imageUrls: [
            'https://images.unsplash.com/photo-1594282095410-698466d690c8?w=800&q=80',
            'https://images.unsplash.com/photo-1551754655-cd27e38d2076?w=800&q=80'
        ]
    },
    {
        productName: 'Marketmore 76 Cucumber',
        scientificName: 'Cucumis sativus',
        category: 'Vegetable',
        subcategory: 'Cucurbits',
        description: 'Disease-resistant slicing cucumber with excellent flavor and production.',
        specifications: { organic: true, nongmo: true },
        growingInfo: { daysToMaturity: 65, sunRequirement: 'Full Sun', soilType: 'Rich, well-drained' },
        featured: true,
        inStock: true,
        imageUrls: [
            'https://images.unsplash.com/photo-1568584711271-6b2c3d2a4f05?w=800&q=80',
            'https://images.unsplash.com/photo-1604977042946-1eecc30f269e?w=800&q=80'
        ]
    },
    {
        productName: 'Autumn Beauty Sunflower',
        scientificName: 'Helianthus annuus',
        category: 'Flower',
        subcategory: 'Annual Flowers',
        description: 'Stunning mix of warm colors - burgundy, bronze, yellow, and bi-colors. Grows 5-7 feet tall.',
        specifications: { organic: true, nongmo: true },
        growingInfo: { daysToMaturity: 70, sunRequirement: 'Full Sun', soilType: 'Well-drained' },
        featured: true,
        inStock: true,
        imageUrls: [
            'https://images.unsplash.com/photo-1597848212624-e530bb09f498?w=800&q=80',
            'https://images.unsplash.com/photo-1470509037663-253afd7f0f51?w=800&q=80',
            'https://images.unsplash.com/photo-1592617393406-a43a5531c7c5?w=800&q=80'
        ]
    },
    {
        productName: 'Sensation Mix Cosmos',
        scientificName: 'Cosmos bipinnatus',
        category: 'Flower',
        subcategory: 'Annual Flowers',
        description: 'Large 3-4 inch blooms in pink, white, and rose. Easy to grow and attracts butterflies.',
        specifications: { organic: false, nongmo: true },
        growingInfo: { daysToMaturity: 85, sunRequirement: 'Full Sun', soilType: 'Average, well-drained' },
        featured: true,
        inStock: true,
        imageUrls: [
            'https://images.unsplash.com/photo-1490750967868-88aa4486c946?w=800&q=80',
            'https://images.unsplash.com/photo-1526047932273-341f2a7631f9?w=800&q=80'
        ]
    },
    {
        productName: 'State Fair Mix Zinnia',
        scientificName: 'Zinnia elegans',
        category: 'Flower',
        subcategory: 'Annual Flowers',
        description: 'Giant dahlia-type blooms up to 5 inches across in brilliant colors. Excellent cut flowers.',
        specifications: { organic: true, nongmo: true },
        growingInfo: { daysToMaturity: 85, sunRequirement: 'Full Sun', soilType: 'Rich, well-drained' },
        featured: true,
        inStock: true,
        imageUrls: [
            'https://images.unsplash.com/photo-1592729645009-b96d1e060d1f?w=800&q=80',
            'https://images.unsplash.com/photo-1563259043-fadf6ca33444?w=800&q=80',
            'https://images.unsplash.com/photo-1562690868-60bbe7293e94?w=800&q=80'
        ]
    },
    {
        productName: 'Genovese Basil',
        scientificName: 'Ocimum basilicum',
        category: 'Herb',
        subcategory: 'Culinary Herbs',
        description: 'Classic Italian basil with large, aromatic leaves. Essential for pesto and Mediterranean cooking.',
        specifications: { organic: true, nongmo: true },
        growingInfo: { daysToMaturity: 75, sunRequirement: 'Full Sun', soilType: 'Rich, moist' },
        featured: true,
        inStock: true,
        imageUrls: [
            'https://images.unsplash.com/photo-1618375569909-3c8616cf7733?w=800&q=80',
            'https://images.unsplash.com/photo-1596389181485-c7fc4cd0ae3e?w=800&q=80',
            'https://images.unsplash.com/photo-1525677208933-3fa2f315b285?w=800&q=80'
        ]
    },
    {
        productName: 'English Lavender',
        scientificName: 'Lavandula angustifolia',
        category: 'Herb',
        subcategory: 'Medicinal Herbs',
        description: 'Fragrant purple flowers perfect for sachets, crafts, and culinary use. Perennial zones 5-9.',
        specifications: { organic: true, nongmo: true },
        growingInfo: { daysToMaturity: 110, sunRequirement: 'Full Sun', soilType: 'Well-drained, lean' },
        featured: true,
        inStock: true,
        imageUrls: [
            'https://images.unsplash.com/photo-1500628550463-c8881a54d4d4?w=800&q=80',
            'https://images.unsplash.com/photo-1587814213271-7a6a13547198?w=800&q=80',
            'https://images.unsplash.com/photo-1611419010196-738e2d0f77b8?w=800&q=80'
        ]
    },
    {
        productName: 'Butterfly & Hummingbird Mix',
        scientificName: 'Mixed species',
        category: 'Wildflower Mix',
        subcategory: 'Pollinator Mixes',
        description: 'Specially formulated blend to attract butterflies and hummingbirds. 15+ species.',
        specifications: { organic: false, nongmo: true },
        growingInfo: { sunRequirement: 'Full Sun', soilType: 'Average' },
        featured: true,
        inStock: true,
        imageUrls: [
            'https://images.unsplash.com/photo-1563911892437-1feda0179e1b?w=800&q=80',
            'https://images.unsplash.com/photo-1470058791769-43fca6eb8477?w=800&q=80',
            'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=800&q=80'
        ]
    }
];

async function importWithRealImages() {
    console.log('🌱 Starting import with REAL downloaded images...\n');
    
    try {
        // Clear existing products
        await SeedProduct.deleteMany({});
        console.log('✨ Cleared existing products\n');
        
        let successCount = 0;
        let failCount = 0;
        
        for (const productData of sampleProducts) {
            console.log(`📦 Processing: ${productData.productName}`);
            
            const downloadedImages = [];
            
            // Download each image
            for (let i = 0; i < productData.imageUrls.length; i++) {
                const url = productData.imageUrls[i];
                const slug = productData.productName.toLowerCase()
                    .replace(/[^a-z0-9]+/g, '-')
                    .replace(/^-+|-+$/g, '');
                const filename = `${slug}-${i + 1}.jpg`;
                const filepath = path.join(uploadDir, filename);
                const relativeUrl = `/uploads/wildwest-products/${filename}`;
                
                try {
                    console.log(`  📥 Downloading image ${i + 1}...`);
                    await downloadImage(url, filepath);
                    downloadedImages.push({
                        url: relativeUrl,
                        caption: `${productData.productName} - Photo ${i + 1}`,
                        isPrimary: i === 0,
                        order: i
                    });
                    console.log(`  ✅ Saved: ${filename}`);
                } catch (error) {
                    console.log(`  ❌ Failed: ${error.message}`);
                }
            }
            
            // Create product with downloaded images
            if (downloadedImages.length > 0) {
                const product = new SeedProduct({
                    ...productData,
                    images: downloadedImages,
                    primaryImage: downloadedImages[0].url,
                    isActive: true
                });
                delete product.imageUrls;
                
                await product.save();
                successCount++;
                console.log(`  💾 Saved product with ${downloadedImages.length} local images\n`);
            } else {
                failCount++;
                console.log(`  ⚠️  Skipped product - no images downloaded\n`);
            }
        }
        
        console.log('━'.repeat(60));
        console.log(`\n✨ Import Complete!`);
        console.log(`✅ Successfully imported: ${successCount} products`);
        console.log(`❌ Failed: ${failCount} products`);
        console.log(`\n📁 All images saved to: uploads/wildwest-products/`);
        console.log(`🌐 Images are now local - no external dependencies!`);
        console.log(`\n🚀 View at: http://localhost:3001/wildwest\n`);
        
    } catch (error) {
        console.error('❌ Error:', error);
    } finally {
        mongoose.connection.close();
    }
}

importWithRealImages();
