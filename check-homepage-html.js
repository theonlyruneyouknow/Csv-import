const http = require('http');

http.get('http://localhost:3001/wildwest', (res) => {
    let data = '';
    res.on('data', chunk => data += chunk);
    res.on('end', () => {
        console.log('\n📄 HOMEPAGE HTML ANALYSIS\n' + '='.repeat(80) + '\n');
        
        // Find all img tags and their src
        const imgRegex = /<img[^>]+src="([^"]{0,200})[^"]*"[^>]*>/g;
        let match;
        let imgCount = 0;
        
        while ((match = imgRegex.exec(data)) !== null) {
            imgCount++;
            const src = match[1];
            const isSvg = src.includes('svg');
            const isJpeg = src.includes('jpeg');
            const isData = src.startsWith('data:');
            
            if (imgCount <= 10) {  // Show first 10 images
                console.log(`Image ${imgCount}:`);
                console.log(`  Type: ${isSvg ? '❌ SVG' : isJpeg ? '✅ JPEG' : isData ? '❓ Data URI' : '🔗 File'}`);
                console.log(`  Preview: ${src.substring(0, 100)}...`);
                console.log('');
            }
        }
        
        console.log(`Total images found: ${imgCount}\n`);
        console.log('='.repeat(80) + '\n');
        
        // Check product cards
        const hasDataJpeg = data.includes('data:image/jpeg');
        const hasSvgXml = data.includes('svg+xml');
        
        console.log('📊 DIAGNOSIS:\n');
        console.log(`  Contains "data:image/jpeg": ${hasDataJpeg ? '✅ YES' : '❌ NO'}`);
        console.log(`  Contains "svg+xml": ${hasSvgXml ? '❌ YES (bad)' : '✅ NO'}`);
        
        if (hasDataJpeg) {
            console.log('\n✅ Real JPEG images ARE in the HTML!');
            console.log('   Problem: Your browser is showing cached version.');
            console.log('   Solution: Hard refresh (Ctrl+Shift+R) or clear cache.\n');
        } else if (hasSvgXml) {
            console.log('\n❌ HTML contains SVG placeholders!');
            console.log('   Problem: Server is generating wrong HTML.\n');
        }
        
        // Save sample to file for inspection
        const fs = require('fs');
        fs.writeFileSync('wildwest-homepage-source.html', data);
        console.log('📁 Full HTML saved to: wildwest-homepage-source.html\n');
    });
}).on('error', err => console.error('Error:', err.message));
