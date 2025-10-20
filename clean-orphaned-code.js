const fs = require('fs');

const filePath = './views/dashboard.ejs';
let content = fs.readFileSync(filePath, 'utf8');

console.log('Before:', content.length, 'chars');

// Use regex to remove everything between </head> and <body>
const regex = /<\/head>\s*[\s\S]*?<body>/;
const match = content.match(regex);

if (match) {
    console.log('Found orphaned code:');
    console.log(match[0]);
    
    content = content.replace(regex, '</head>\n\n<body>');
    
    fs.writeFileSync(filePath, content, 'utf8');
    console.log('\nAfter:', content.length, 'chars');
    console.log('✅ Cleaned up orphaned JavaScript');
} else {
    console.log('❌ No orphaned code found');
}
