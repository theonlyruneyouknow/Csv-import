/**
 * Migration script to fix Google Photos shared album URLs
 * 
 * Problem: Some media entries have album shareable URLs (e.g., photos.app.goo.gl)
 * stored in the 'url' field instead of direct image URLs.
 * 
 * Solution: Use the baseUrl stored in googlePhotos.baseUrl to reconstruct
 * the proper direct image URL.
 * 
 * Run with: node fix-google-photos-urls.js
 */

require('dotenv').config();
const mongoose = require('mongoose');
const GreatestJoyMedia = require('./models/GreatestJoyMedia');

async function fixGooglePhotosUrls() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('✅ Connected to MongoDB');
        
        // Find all media with Google Photos shared albums
        const mediaToFix = await GreatestJoyMedia.find({
            sourceType: 'google-photos-shared',
            'googlePhotos.baseUrl': { $exists: true }
        });
        
        console.log(`\n📸 Found ${mediaToFix.length} Google Photos shared album entries`);
        
        let fixed = 0;
        let skipped = 0;
        
        for (const media of mediaToFix) {
            // Check if URL needs fixing (if it's an album URL instead of direct image URL)
            if (media.url.includes('photos.app.goo.gl') || 
                media.url.includes('photos.google.com/share') ||
                !media.url.includes('googleusercontent.com')) {
                
                console.log(`\n🔧 Fixing: ${media.title}`);
                console.log(`   Old URL: ${media.url}`);
                
                // Construct proper direct image URL from baseUrl
                const directUrl = media.googlePhotos.baseUrl + '=d';
                const thumbnailUrl = media.googlePhotos.baseUrl + '=w500-h500';
                
                console.log(`   New URL: ${directUrl}`);
                
                // Update the media entry
                media.url = directUrl;
                media.thumbnailUrl = thumbnailUrl;
                
                await media.save();
                fixed++;
            } else {
                console.log(`✓ Already correct: ${media.title}`);
                skipped++;
            }
        }
        
        console.log(`\n✅ Migration complete!`);
        console.log(`   Fixed: ${fixed} entries`);
        console.log(`   Skipped: ${skipped} entries (already correct)`);
        
    } catch (error) {
        console.error('❌ Error:', error);
    } finally {
        await mongoose.connection.close();
        console.log('\n👋 Disconnected from MongoDB');
    }
}

// Run the migration
fixGooglePhotosUrls();
