const fs = require('fs');

const filePath = './views/dashboard.ejs';
let content = fs.readFileSync(filePath, 'utf8');

console.log('Original file size:', content.length);

// Find and remove the ENTIRE DOMContentLoaded block that's breaking buttons
const startMarker = "// Wait for DOM to be ready before adding event listeners";
const endMarker = "});";

const startIdx = content.indexOf(startMarker);
if (startIdx === -1) {
    console.log('❌ Start marker not found!');
    process.exit(1);
}

console.log('Found start marker at:', startIdx);

// Find the matching closing - need to find the addEventListener('DOMContentLoaded' closing
// Look for the pattern more carefully
const domContentLoadedStart = content.indexOf("document.addEventListener('DOMContentLoaded'", startIdx);
if (domContentLoadedStart === -1) {
    console.log('❌ DOMContentLoaded not found!');
    process.exit(1);
}

// Find the end - look for the closing }); after the DOMContentLoaded block
// We need to count braces to find the right closing
let braceCount = 0;
let inBlock = false;
let endIdx = domContentLoadedStart;

for (let i = domContentLoadedStart; i < content.length; i++) {
    if (content[i] === '{') {
        braceCount++;
        inBlock = true;
    } else if (content[i] === '}') {
        braceCount--;
        if (inBlock && braceCount === 0) {
            // Found the closing brace, now look for );
            if (content.substring(i, i + 3) === '});') {
                endIdx = i + 3;
                break;
            }
        }
    }
}

console.log('Found end at:', endIdx);

// Show what we're removing
console.log('\n=== REMOVING THIS CODE ===');
console.log(content.substring(startIdx - 20, endIdx + 20));
console.log('=========================\n');

// Remove the entire block including the comment and surrounding whitespace
const before = content.substring(0, startIdx).trimEnd();
const after = content.substring(endIdx).trimStart();

content = before + '\n    </script>\n</head>\n\n' + after.substring(after.indexOf('<body>'));

fs.writeFileSync(filePath, content, 'utf8');
console.log('✅ REMOVED navigation event listener block');
console.log('New file size:', content.length);
console.log('\n🎯 Buttons should work now!');
