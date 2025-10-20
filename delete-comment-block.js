const fs = require('fs');

const filePath = './views/dashboard.ejs';
let content = fs.readFileSync(filePath, 'utf8');

console.log('Original file length:', content.length);

// Find the problematic comment block and remove it entirely
const startMarker = '// TEMPORARILY DISABLED - This was breaking all buttons';
const endMarker = '*/';

const startIdx = content.indexOf(startMarker);
if (startIdx === -1) {
    console.log('❌ Start marker not found!');
    process.exit(1);
}

console.log('Found start marker at position:', startIdx);

// Find the end of the comment block
const searchFrom = startIdx;
const endIdx = content.indexOf(endMarker, searchFrom);

if (endIdx === -1) {
    console.log('❌ End marker not found!');
    process.exit(1);
}

console.log('Found end marker at position:', endIdx);

// Show what we're removing
const removing = content.substring(startIdx, endIdx + 2);
console.log('\n=== REMOVING ===');
console.log(removing.substring(0, 200) + '...');
console.log('=================\n');

// Remove everything from the line before the comment to the line after */
// Find the newline before the comment
let lineStart = startIdx;
while (lineStart > 0 && content[lineStart - 1] !== '\n') {
    lineStart--;
}

// Find the newline after */
let lineEnd = endIdx + 2;
while (lineEnd < content.length && content[lineEnd] !== '\n') {
    lineEnd++;
}
if (content[lineEnd] === '\n') lineEnd++;

const before = content.substring(0, lineStart);
const after = content.substring(lineEnd);

content = before + after;

fs.writeFileSync(filePath, content, 'utf8');

console.log('✅ Successfully removed problematic comment block');
console.log('New file length:', content.length);
console.log('Characters removed:', removing.length);
