const fs = require('fs');

const filePath = './views/dashboard.ejs';
let content = fs.readFileSync(filePath, 'utf8');

console.log('File length before:', content.length);

// Find the first </head>
const firstHeadEnd = content.indexOf('</head>');
console.log('First </head> at:', firstHeadEnd);

// Find the second </head> after the first
const secondHeadEnd = content.indexOf('</head>', firstHeadEnd + 7);
console.log('Second </head> at:', secondHeadEnd);

if (firstHeadEnd === -1 || secondHeadEnd === -1 || firstHeadEnd === secondHeadEnd) {
    console.log('❌ Could not find two separate </head> tags');
    process.exit(1);
}

// Remove everything between first </head> and second </head> (inclusive of second)
const before = content.substring(0, firstHeadEnd + 7); // Include first </head>
const after = content.substring(secondHeadEnd + 7); // Skip second </head>

content = before + '\n\n' + after;

fs.writeFileSync(filePath, content, 'utf8');

console.log('File length after:', content.length);
console.log('✅ Removed orphaned code between duplicate </head> tags');
