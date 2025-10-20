const fs = require('fs');

const filePath = './views/dashboard.ejs';
let content = fs.readFileSync(filePath, 'utf8');

console.log('Original length:', content.length);

// Find the orphaned code by looking for text that should only appear once
const searchText = 'if (navigationContainer && navigationContainer.contains(event.target))';
const idx = content.indexOf(searchText);

if (idx === -1) {
    console.log('❌ Orphaned code not found - may already be fixed!');
    process.exit(0);
}

console.log('Found orphaned code at position:', idx);

// Find the end of this block - look for the closing brace and blank line
const startSearch = content.lastIndexOf('\n', idx) + 1; // Start of line
let endSearch = content.indexOf('}', idx) + 1; // Find closing brace
// Skip to end of line after closing brace
while (endSearch < content.length && content[endSearch] !== '\n') {
    endSearch++;
}
// Skip one more newline if present
if (content[endSearch] === '\n') endSearch++;
if (content[endSearch] === '\n') endSearch++; // Skip blank line too

const removing = content.substring(startSearch, endSearch);
console.log('\n=== REMOVING THIS ===');
console.log(removing);
console.log('=====================\n');

// Remove it
content = content.substring(0, startSearch) + content.substring(endSearch);

fs.writeFileSync(filePath, content, 'utf8');
console.log('✅ Successfully removed orphaned JavaScript!');
console.log('New length:', content.length);
console.log('Removed:', removing.length, 'characters');
