const fs = require('fs');

const filePath = './views/dashboard.ejs';
let lines = fs.readFileSync(filePath, 'utf8').split('\n');

console.log('Total lines before:', lines.length);

// Remove lines 3058-3084 (0-indexed: 3057-3083) - that's 27 lines
const linesToRemove = 27;
const startLine = 3057; // 0-indexed

console.log('Removing lines', (startLine + 1), 'to', (startLine + linesToRemove));
console.log('\n=== LINES TO BE REMOVED ===');
for (let i = startLine; i < startLine + linesToRemove && i < lines.length; i++) {
    console.log(`${i + 1}: ${lines[i]}`);
}
console.log('===========================\n');

lines.splice(startLine, linesToRemove);

fs.writeFileSync(filePath, lines.join('\n'), 'utf8');
console.log('✅ Removed', linesToRemove, 'lines');
console.log('Total lines after:', lines.length);
