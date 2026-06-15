const https = require('http');

console.log('\n🔍 Fetching actual HTML from main server...\n');

https.get('http://localhost:3001/wildwest/category/vegetable', (res) => {
    let data = '';
    
    res.on('data', chunk => data += chunk);
    
    res.on('end', () => {
        console.log('✅ Response received\n');
        console.log('='.repeat(80));
        console.log('📄 ANALYZING HTML SOURCE FROM MAIN SERVER');
        console.log('='.repeat(80) + '\n');
        
        // Search for image tags
        const imgRegex = /<img[^>]+src="([^"]+)"[^>]*>/g;
        let matches = [];
        let match;
        
        while ((match = imgRegex.exec(data)) !== null) {
            matches.push(match[1]);
        }
        
        console.log(`Found ${matches.length} <img> tags\n`);
        
        matches.forEach((src, i) => {
            const isSvg = src.includes('svg');
            const isDataUri = src.startsWith('data:');
            const isJpeg = src.includes('image/jpeg');
            const length = src.length;
            const preview = src.substring(0, 100);
            
            console.log(`Image ${i + 1}:`);
            console.log(`  Type: ${isSvg ? '❌ SVG' : isJpeg ? '✅ JPEG' : isDataUri ? '❓ Data URI' : '🔗 URL'}`);
            console.log(`  Length: ${length} chars (${Math.round(length/1024)} KB)`);
            console.log(`  Preview: ${preview}${length > 100 ? '...' : ''}`);
            console.log('');
        });
        
        // Check if EJS escaped the data
        if (data.includes('&lt;') || data.includes('&gt;') || data.includes('&amp;')) {
            console.log('⚠️  WARNING: HTML entities found - EJS may be escaping the data URIs!');
        }
        
        // Look for specific products
        console.log('\n' + '='.repeat(80));
        console.log('🔍 Looking for specific products in HTML...\n');
        
        const products = ['Amsterdam Forcing Carrot', 'Detroit Dark Red Beet', 'Black Seeded Simpson Lettuce'];
        
        products.forEach(productName => {
            if (data.includes(productName)) {
                console.log(`✅ Found: ${productName}`);
                
                // Find the img tag near this product name
                const nameIndex = data.indexOf(productName);
                const before = data.substring(Math.max(0, nameIndex - 500), nameIndex);
                const imgMatch = before.match(/<img[^>]+src="([^"]+)"/);
                
                if (imgMatch) {
                    const src = imgMatch[1];
                    const isSvg = src.includes('svg');
                    const isJpeg = src.includes('jpeg');
                    console.log(`   Image src type: ${isSvg ? '❌ SVG' : isJpeg ? '✅ JPEG' : '❓ Other'}`);
                    console.log(`   Image src preview: ${src.substring(0, 80)}...`);
                }
            } else {
                console.log(`❌ Not found: ${productName}`);
            }
        });
        
        console.log('\n' + '='.repeat(80));
        console.log('\n💡 DIAGNOSIS:\n');
        
        const hasDataJpeg = data.includes('data:image/jpeg');
        const hasSvgXml = data.includes('svg+xml');
        const hasEscapedEntities = data.includes('&lt;') || data.includes('&amp;');
        
        if (hasDataJpeg) {
            console.log('✅ HTML contains "data:image/jpeg" - Real images are being sent!');
        } else {
            console.log('❌ HTML does NOT contain "data:image/jpeg" - Images not in output');
        }
        
        if (hasSvgXml) {
            console.log('❌ HTML contains "svg+xml" - SVG placeholders present');
        }
        
        if (hasEscapedEntities) {
            console.log('❌ HTML contains escaped entities - EJS is escaping output (use <%- instead of <%=)');
        }
        
        console.log('');
    });
    
}).on('error', (err) => {
    console.error('❌ Error fetching page:', err.message);
    console.log('\nIs the main server running on port 3001?');
});
