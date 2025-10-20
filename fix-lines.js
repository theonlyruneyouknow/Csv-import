const fs = require('fs');

const filePath = './views/dashboard.ejs';
let lines = fs.readFileSync(filePath, 'utf8').split('\n');

// Remove lines 3079-3081 (0-indexed: 3078-3080) - the clickedInteractiveElement block
lines.splice(3078, 3);

fs.writeFileSync(filePath, lines.join('\n'), 'utf8');
console.log('✅ Removed clickedInteractiveElement lines');
