const mongoose = require('mongoose');
const SeedProduct = require('./models/SeedProduct');

mongoose.connect('mongodb://localhost:27017/ebmdb');

async function deepDiveAnalysis() {
    console.log('\n🔍 DEEP DIVE: Why are SVG placeholders showing?\n' + '='.repeat(80) + '\n');
    
    try {
        // 1. Check database contents
        console.log('📊 STEP 1: Database Contents Analysis\n');
        const allProducts = await SeedProduct.find({});
        console.log(`Total products in database: ${allProducts.length}\n`);
        
        if (allProducts.length === 0) {
            console.log('❌ DATABASE IS EMPTY! This is why you see SVG placeholders.');
            console.log('   The import script likely failed.\n');
            return;
        }
        
        // 2. Analyze each product's images
        console.log('📦 STEP 2: Analyzing each product\'s images:\n');
        
        let svgCount = 0;
        let jpegCount = 0;
        let otherCount = 0;
        
        for (const product of allProducts) {
            const primaryImg = product.primaryImage;
            
            if (!primaryImg) {
                console.log(`❓ ${product.productName}: NO PRIMARY IMAGE`);
                otherCount++;
                continue;
            }
            
            const isSvg = primaryImg.includes('svg+xml') || primaryImg.includes('<svg');
            const isJpeg = primaryImg.includes('data:image/jpeg');
            const length = primaryImg.length;
            const preview = primaryImg.substring(0, 100);
            
            if (isSvg) {
                console.log(`❌ ${product.productName}: SVG PLACEHOLDER (${Math.round(length/1024)} KB)`);
                console.log(`   Preview: ${preview}...`);
                svgCount++;
            } else if (isJpeg) {
                console.log(`✅ ${product.productName}: REAL JPEG (${Math.round(length/1024)} KB)`);
                jpegCount++;
            } else {
                console.log(`❓ ${product.productName}: UNKNOWN TYPE (${Math.round(length/1024)} KB)`);
                console.log(`   Preview: ${preview}...`);
                otherCount++;
            }
        }
        
        console.log('\n' + '-'.repeat(80));
        console.log(`\n📊 SUMMARY:`);
        console.log(`   SVG Placeholders: ${svgCount} ❌`);
        console.log(`   Real JPEG Images: ${jpegCount} ✅`);
        console.log(`   Unknown/Other: ${otherCount}`);
        
        if (svgCount > 0) {
            console.log(`\n⚠️  PROBLEM FOUND: ${svgCount} products have SVG placeholders in the database!`);
            console.log(`   This means the real images were NEVER imported successfully.\n`);
        } else if (jpegCount > 0) {
            console.log(`\n✅ Database has real JPEG images!`);
            console.log(`   The problem must be in rendering/display.\n`);
        }
        
        // 3. Test a specific product that should have real image
        console.log('\n📝 STEP 3: Detailed analysis of first product:\n');
        
        const firstProduct = allProducts[0];
        console.log(`Product: ${firstProduct.productName}`);
        console.log(`Category: ${firstProduct.category}`);
        console.log(`Images array length: ${firstProduct.images.length}`);
        
        if (firstProduct.images.length > 0) {
            firstProduct.images.forEach((img, i) => {
                const isSvg = img.url.includes('svg');
                const isJpeg = img.url.includes('jpeg');
                const size = Math.round(img.url.length / 1024);
                console.log(`  Image ${i + 1}: ${isSvg ? '❌ SVG' : isJpeg ? '✅ JPEG' : '❓ Unknown'} (${size} KB)`);
                if (i === 0) {
                    console.log(`    First 200 chars: ${img.url.substring(0, 200)}...`);
                }
            });
        }
        
        console.log(`\nPrimary Image field:`);
        const primaryIsSvg = firstProduct.primaryImage?.includes('svg');
        const primaryIsJpeg = firstProduct.primaryImage?.includes('jpeg');
        console.log(`  Type: ${primaryIsSvg ? '❌ SVG' : primaryIsJpeg ? '✅ JPEG' : '❓ Unknown'}`);
        console.log(`  Size: ${Math.round((firstProduct.primaryImage?.length || 0) / 1024)} KB`);
        console.log(`  First 200 chars: ${firstProduct.primaryImage?.substring(0, 200)}...`);
        
        // 4. Check featured products specifically (what shows on homepage)
        console.log('\n📌 STEP 4: Featured products (shown on main page):\n');
        
        const featuredProducts = await SeedProduct.find({ featured: true }).limit(6);
        console.log(`Featured products: ${featuredProducts.length}\n`);
        
        featuredProducts.forEach(product => {
            const isSvg = product.primaryImage?.includes('svg');
            const isJpeg = product.primaryImage?.includes('jpeg');
            const size = Math.round((product.primaryImage?.length || 0) / 1024);
            const icon = isSvg ? '❌' : isJpeg ? '✅' : '❓';
            console.log(`${icon} ${product.productName} - ${isSvg ? 'SVG' : isJpeg ? 'JPEG' : 'Unknown'} (${size} KB)`);
        });
        
        // 5. Check for category page
        console.log('\n🥬 STEP 5: Vegetable category products (what shows in screenshot):\n');
        
        const veggies = await SeedProduct.find({ category: 'Vegetable' });
        console.log(`Vegetable products: ${veggies.length}\n`);
        
        veggies.forEach(product => {
            const isSvg = product.primaryImage?.includes('svg');
            const isJpeg = product.primaryImage?.includes('jpeg');
            const size = Math.round((product.primaryImage?.length || 0) / 1024);
            const icon = isSvg ? '❌' : isJpeg ? '✅' : '❓';
            console.log(`${icon} ${product.productName} - ${isSvg ? 'SVG' : isJpeg ? 'JPEG' : 'Unknown'} (${size} KB)`);
        });
        
        console.log('\n' + '='.repeat(80));
        console.log('\n💡 DIAGNOSIS:\n');
        
        if (allProducts.length === 0) {
            console.log('❌ Database is empty - need to run import script');
        } else if (svgCount > 0) {
            console.log('❌ Database contains SVG placeholders instead of real images');
            console.log('   → Need to re-run import with working image downloads');
        } else if (jpegCount > 0) {
            console.log('✅ Database has real JPEG images');
            console.log('   → Problem is in the rendering (EJS templates or browser cache)');
            console.log('   → Try: Hard refresh (Ctrl+Shift+R), clear browser cache, or incognito mode');
        }
        console.log('');
        
    } catch (error) {
        console.error('❌ Error:', error);
    } finally {
        mongoose.connection.close();
    }
}

deepDiveAnalysis();
