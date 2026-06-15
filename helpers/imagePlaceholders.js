// Helper function to create SVG placeholder data URIs
// Add this to your views or create as a helper function

function createErrorPlaceholder(width, height, text = 'No Image') {
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
        <rect fill="#cccccc" width="${width}" height="${height}"/>
        <text fill="#666666" font-family="Arial, sans-serif" font-size="20" text-anchor="middle" x="50%" y="50%" dy=".3em">${text}</text>
    </svg>`;
    return 'data:image/svg+xml;base64,' + Buffer.from(svg).toString('base64');
}

// Placeholders for different sizes
module.exports = {
    error60: createErrorPlaceholder(60, 60, '❌'),
    error80: createErrorPlaceholder(80, 80, '❌'),
    error200: createErrorPlaceholder(200, 200, 'No Image'),
    error250: createErrorPlaceholder(250, 250, 'No Image'),
    error500: createErrorPlaceholder(500, 500, 'No Image'),
    noImage250: createErrorPlaceholder(250, 250, '🖼️ No Image'),
    noImage500: createErrorPlaceholder(500, 500, '🖼️ No Image')
};
