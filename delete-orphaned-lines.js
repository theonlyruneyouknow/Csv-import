const fs = require('fs');

const filePath = './views/dashboard.ejs';
let lines = fs.readFileSync(filePath, 'utf8').split('\n');

console.log('Lines 3059-3066:');
for (let i = 3058; i < 3066; i++) {
    console.log(`Line ${i + 1}: "${lines[i]}"`);
    console.log(`  Length: ${lines[i].length}`);
    console.log(`  Bytes:`, Buffer.from(lines[i]).toString('hex').substring(0, 100));
}

// Now delete lines 3061-3065 (the orphaned JavaScript - 0-indexed: 3060-3064)
console.log('\nDeleting lines 3061-3065 (indices 3060-3064)');
lines.splice(3060, 5);

fs.writeFileSync(filePath, lines.join('\n'), 'utf8');
console.log('✅ Removed 5 lines of orphaned code');
