const fs = require('fs');

const filePath = './views/dashboard.ejs';
let content = fs.readFileSync(filePath, 'utf8');

// Remove the problematic clickedInteractiveElement lines
const oldPattern = /if \(clickedInteractiveElement && !navigationContainer\.contains\(clickedInteractiveElement\)\) \{\s+console\.log\([^)]+\);\s+return;\s+\}\s+/g;

content = content.replace(oldPattern, '');

fs.writeFileSync(filePath, content, 'utf8');
console.log('✅ Fixed dashboard click handler');
