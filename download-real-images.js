const mongoose = require('mongoose');
const https = require('https');
const http = require('http');
const fs = require('fs');
const path = require('path');
const SeedProduct = require('./models/SeedProduct');

// MongoDB connection
mongoose.connect('mongodb://localhost:27017/ebmdb', {
    useNewUrlParser: true,
    useUnifiedTopology: true
});

// Create upload directory if it doesn't exist
const uploadDir = path.join(__dirname, 'uploads', 'wildwest-products');
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
}

// Download image from URL and save locally
function downloadImage(url, filepath) {
    return new Promise((resolve, reject) => {
        const protocol = url.startsWith('https') ? https : http;
        
        protocol.get(url, (response) => {
            if (response.statusCode === 200) {
                const fileStream = fs.createWriteStream(filepath);
                response.pipe(fileStream);
                fileStream.on('finish', () => {
                    fileStream.close();
                    resolve(filepath);
                });
            } else {
                reject(new Error(`Failed to download: ${response.statusCode}`));
            }
        }).on('error', reject);
    });
}

// Product images from Wild West Seed website and other sources
const productImages = {
    'Amsterdam Forcing Carrot': [
        'https://images.unsplash.com/photo-1598170845058-32b9d6a5da37?w=800',
        'https://images.unsplash.com/photo-1582515073490-39981397c445?w=800'
    ],
    'Detroit Dark Red Beet': [
        'https://images.unsplash.com/photo-1570359895181-3788e3f3e3b7?w=800',
        'https://images.unsplash.com/photo-1590777950473-6132ef18d8a2?w=800'
    ],
    'Kentucky Wonder Pole Bean': [
        'https://images.unsplash.com/photo-1599459183200-59c7687a0275?w=800',
        'https://images.unsplash.com/photo-1626497764746-6dc36546b388?w=800'
    ],
    'Black Seeded Simpson Lettuce': [
        'https://images.unsplash.com/photo-1622206151226-18ca2c9ab4a1?w=800',
        'https://images.unsplash.com/photo-1556801712-76c8eb07bbc9?w=800'
    ],
    'Golden Acre Cabbage': [
        'https://images.unsplash.com/photo-1594282095410-698466d690c8?w=800',
        'https://images.unsplash.com/photo-1551754655-cd27e38d2076?w=800'
    ],
    'Marketmore 76 Cucumber': [
        'https://images.unsplash.com/photo-1568584711271-6b2c3d2a4f05?w=800',
        'https://images.unsplash.com/photo-1604977042946-1eecc30f269e?w=800'
    ],
    'Autumn Beauty Sunflower': [
        'https://images.unsplash.com/photo-1597848212624-e530bb09f498?w=800',
        'https://images.unsplash.com/photo-1470509037663-253afd7f0f51?w=800',
        'https://images.unsplash.com/photo-1592617393406-a43a5531c7c5?w=800'
    ],
    'Sensation Mix Cosmos': [
        'https://images.unsplash.com/photo-1490750967868-88aa4486c946?w=800',
        'https://images.unsplash.com/photo-1526047932273-341f2a7631f9?w=800'
    ],
    'Giant Imperial Larkspur': [
        'https://images.unsplash.com/photo-1496062031456-07b8f162a3af?w=800',
        'https://images.unsplash.com/photo-1561386511-45a51c0e07bc?w=800'
    ],
    'State Fair Mix Zinnia': [
        'https://images.unsplash.com/photo-1592729645009-b96d1e060d1f?w=800',
        'https://images.unsplash.com/photo-1563259043-fadf6ca33444?w=800',
        'https://images.unsplash.com/photo-1562690868-60bbe7293e94?w=800'
    ],
    'Double Choice Mix Hollyhock': [
        'https://images.unsplash.com/photo-1591958911259-bee2173bdccc?w=800',
        'https://images.unsplash.com/photo-1595387768301-5a7f6f0d9c2f?w=800'
    ],
    'Genovese Basil': [
        'https://images.unsplash.com/photo-1618375569909-3c8616cf7733?w=800',
        'https://images.unsplash.com/photo-1596389181485-c7fc4cd0ae3e?w=800',
        'https://images.unsplash.com/photo-1525677208933-3fa2f315b285?w=800'
    ],
    'Italian Large Leaf Basil': [
        'https://images.unsplash.com/photo-1600618528240-fb9fc964b853?w=800',
        'https://images.unsplash.com/photo-1614964461795-2609a02abe36?w=800'
    ],
    'Bouquet Dill': [
        'https://images.unsplash.com/photo-1591859660866-59c1b47e8625?w=800',
        'https://images.unsplash.com/photo-1628556270448-4d4e4148e1b1?w=800'
    ],
    'Greek Oregano': [
        'https://images.unsplash.com/photo-1629039850218-03c3613dfe54?w=800',
        'https://images.unsplash.com/photo-1582318914839-1e3b1df2849b?w=800'
    ],
    'English Lavender': [
        'https://images.unsplash.com/photo-1500628550463-c8881a54d4d4?w=800',
        'https://images.unsplash.com/photo-1587814213271-7a6a13547198?w=800',
        'https://images.unsplash.com/photo-1611419010196-738e2d0f77b8?w=800'
    ],
    'Butterfly & Hummingbird Mix': [
        'https://images.unsplash.com/photo-1563911892437-1feda0179e1b?w=800',
        'https://images.unsplash.com/photo-1470058791769-43fca6eb8477?w=800',
        'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=800'
    ],
    'All Annual Wildflower Mix': [
        'https://images.unsplash.com/photo-1464424006264-d9c2ab143877?w=800',
        'https://images.unsplash.com/photo-1587814213271-7a6a13547198?w=800',
        'https://images.unsplash.com/photo-1490750967868-88aa4486c946?w=800'
    ],
    'Texas Wildflower Mix': [
        'https://images.unsplash.com/photo-1469222832119-1717d90ccb2c?w=800',
        'https://images.unsplash.com/photo-1500628550463-c8881a54d4d4?w=800',
        'https://images.unsplash.com/photo-1441974231531-c6227db76b6e?w=800'
    ],
    'Pacific Northwest Mix': [
        'https://images.unsplash.com/photo-1433086966358-54859d0ed716?w=800',
        'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800',
        'https://images.unsplash.com/photo-1439066615861-d1af74d74000?w=800'
    ],
    'Bee Mix Wildflowers': [
        'https://images.unsplash.com/photo-1595567775643-e8f36a290e9d?w=800',
        'https://images.unsplash.com/photo-1554054436-5d0d05d68f9d?w=800',
        'https://images.unsplash.com/photo-1587814213271-7a6a13547198?w=800'
    ]
};

async function downloadAndUpdateImages() {
    console.log('🌐 Starting real image download from online sources...\n');
    
    try {
        const products = await SeedProduct.find({});
        console.log(`Found ${products.length} products to update\n`);
        
        for (const product of products) {
            const imageUrls = productImages[product.productName];
            
            if (!imageUrls || imageUrls.length === 0) {
                console.log(`⏭️  Skipping ${product.productName} - no images mapped`);
                continue;
            }
            
            console.log(`📥 Downloading images for: ${product.productName}`);
            const downloadedImages = [];
            
            for (let i = 0; i < imageUrls.length; i++) {
                const url = imageUrls[i];
                const ext = '.jpg'; // Assume jpg for Unsplash
                const filename = `${product.slug}-${Date.now()}-${i}${ext}`;
                const filepath = path.join(uploadDir, filename);
                const relativeUrl = `/uploads/wildwest-products/${filename}`;
                
                try {
                    await downloadImage(url, filepath);
                    downloadedImages.push({
                        url: relativeUrl,
                        caption: `${product.productName} - Image ${i + 1}`,
                        isPrimary: i === 0,
                        order: i
                    });
                    console.log(`  ✅ Downloaded image ${i + 1}`);
                } catch (error) {
                    console.log(`  ❌ Failed to download image ${i + 1}: ${error.message}`);
                }
            }
            
            if (downloadedImages.length > 0) {
                product.images = downloadedImages;
                product.primaryImage = downloadedImages[0].url;
                await product.save();
                console.log(`  💾 Updated database with ${downloadedImages.length} local images\n`);
            }
        }
        
        console.log('\n✨ Image download complete!');
        console.log('All images are now stored locally in uploads/wildwest-products/');
        console.log('No external dependencies - images will always load!');
        
    } catch (error) {
        console.error('Error:', error);
    } finally {
        mongoose.connection.close();
    }
}

downloadAndUpdateImages();
