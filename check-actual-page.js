const http = require('http');

http.get('http://localhost:3001/wildwest', (res) => {
    let data = '';
    res.on('data', chunk => data += chunk);
    res.on('end', () => {
        console.log('🔍 Checking actual webpage content...\n');
        
        // Find all img tags
        const imgMatches = data.match(/<img[^>]+src="([^"]+)"/g);
        
        if (imgMatches) {
            console.log(`Found ${imgMatches.length} images:\n`);
            imgMatches.slice(0, 5).forEach((match, i) => {
                const src = match.match(/src="([^"]+)"/)[1];
                console.log(`${i+1}. ${src}`);
                
                if (src.includes('svg')) {
                    console.log('   ❌ STILL SVG!');
                } else if (src.includes('/uploads/')) {
                    console.log('   ✅ Local file path');
                } else {
                    console.log('   ❓ Unknown type');
                }
            });
        }
        
        // Check for SVG content
        if (data.includes('data:image/svg+xml')) {
            console.log('\n❌ PAGE STILL CONTAINS SVG PLACEHOLDERS');
        } else if (data.includes('/uploads/wildwest-products/')) {
            console.log('\n✅ Page has local file paths');
        }
    });
}).on('error', err => console.error('Error:', err.message));
