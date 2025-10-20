const fs = require('fs');

const filePath = './views/dashboard.ejs';
let content = fs.readFileSync(filePath, 'utf8');

console.log('Original file size:', content.length);

// Find the section
const before = content.indexOf('clickedInteractiveElement');
console.log('Found clickedInteractiveElement at position:', before);

if (before === -1) {
    console.log('❌ clickedInteractiveElement not found!');
    process.exit(1);
}

// Show context
console.log('\nContext before fix:');
console.log(content.substring(before - 100, before + 200));

// Remove the entire if block for clickedInteractiveElement
// Match the pattern with proper multiline handling
const pattern = /\s+if \(clickedInteractiveElement[^}]+}\s*/;
const match = content.match(pattern);

if (match) {
    console.log('\nFound pattern to remove:');
    console.log(match[0]);
    
    content = content.replace(pattern, '\n                ');
    
    fs.writeFileSync(filePath, content, 'utf8');
    console.log('\n✅ Successfully removed clickedInteractiveElement block');
    console.log('New file size:', content.length);
} else {
    console.log('❌ Pattern not matched');
}
