/**
 * Google Photos Album URL Parser
 * 
 * Helps convert Google Photos shareable album links to direct image URLs
 * Note: This works for public/unlisted shared albums only
 */

const axios = require('axios');
const cheerio = require('cheerio');

class GooglePhotosAlbumParser {
    /**
     * Extract image URLs from a Google Photos shared album link
     * @param {string} shareableUrl - The photos.app.goo.gl or photos.google.com/share URL
     * @returns {Promise<Array>} Array of {title, imageUrl, thumbnailUrl}
     */
    static async parseSharedAlbumUrl(shareableUrl) {
        try {
            console.log('🔍 Fetching album:', shareableUrl);
            
            // Fetch the album page
            const response = await axios.get(shareableUrl, {
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
                },
                maxRedirects: 5
            });
            
            const html = response.data;
            
            // Parse HTML to find image data
            // Google Photos embeds image data in <script> tags as JSON
            const $ = cheerio.load(html);
            
            // Look for JSON-LD structured data
            const jsonLdScripts = $('script[type="application/ld+json"]');
            let albumData = null;
            
            jsonLdScripts.each((i, elem) => {
                try {
                    const data = JSON.parse($(elem).html());
                    if (data['@type'] === 'ImageGallery' || data['@type'] === 'ImageObject') {
                        albumData = data;
                        return false; // break
                    }
                } catch (e) {
                    // Invalid JSON, continue
                }
            });
            
            const images = [];
            
            // Extract from JSON-LD if available
            if (albumData) {
                if (albumData.image) {
                    const imageArray = Array.isArray(albumData.image) ? albumData.image : [albumData.image];
                    imageArray.forEach((img, index) => {
                        if (typeof img === 'string') {
                            images.push({
                                title: albumData.name || `Photo ${index + 1}`,
                                imageUrl: img,
                                thumbnailUrl: img.includes('googleusercontent.com') ? img + '=w500-h500' : img
                            });
                        } else if (img.contentUrl || img.url) {
                            images.push({
                                title: img.name || albumData.name || `Photo ${index + 1}`,
                                imageUrl: img.contentUrl || img.url,
                                thumbnailUrl: (img.contentUrl || img.url) + '=w500-h500'
                            });
                        }
                    });
                }
            }
            
            // Fallback: Try to extract from og:image meta tags
            if (images.length === 0) {
                $('meta[property="og:image"]').each((i, elem) => {
                    const content = $(elem).attr('content');
                    if (content) {
                        images.push({
                            title: $('meta[property="og:title"]').attr('content') || `Photo ${i + 1}`,
                            imageUrl: content.includes('=') ? content.split('=')[0] + '=d' : content,
                            thumbnailUrl: content.includes('=') ? content.split('=')[0] + '=w500-h500' : content
                        });
                    }
                });
            }
            
            // Fallback: Search for image URLs in script tags
            if (images.length === 0) {
                const scripts = $('script:not([src])');
                scripts.each((i, elem) => {
                    const scriptContent = $(elem).html();
                    if (scriptContent && scriptContent.includes('googleusercontent.com')) {
                        // Extract URLs matching googleusercontent.com pattern
                        const matches = scriptContent.match(/https:\/\/[a-zA-Z0-9-]+\.googleusercontent\.com\/[^\s"']+/g);
                        if (matches) {
                            matches.forEach((url, index) => {
                                // Clean up the URL (remove trailing characters)
                                const cleanUrl = url.split('=')[0]; // Get base URL before parameters
                                if (!images.find(img => img.imageUrl.startsWith(cleanUrl))) {
                                    images.push({
                                        title: `Photo ${images.length + 1}`,
                                        imageUrl: cleanUrl + '=d',
                                        thumbnailUrl: cleanUrl + '=w500-h500'
                                    });
                                }
                            });
                        }
                    }
                });
            }
            
            console.log(`✅ Found ${images.length} image(s) in album`);
            return images;
            
        } catch (error) {
            console.error('❌ Error parsing Google Photos album:', error.message);
            throw new Error('Unable to parse Google Photos album. The link may be private or invalid.');
        }
    }
    
    /**
     * Check if a URL is a Google Photos shareable link
     */
    static isGooglePhotosShareableLink(url) {
        return url.includes('photos.app.goo.gl') || 
               url.includes('photos.google.com/share') ||
               (url.includes('photos.google.com') && url.includes('/album/'));
    }
}

module.exports = GooglePhotosAlbumParser;
