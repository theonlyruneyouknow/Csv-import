/**
 * Quick fix script for "Lilly at uni" photo
 * Updates the Google Photos album URL to a placeholder or prompts for manual URL
 */

require('dotenv').config();
const mongoose = require('mongoose');
const GreatestJoyMedia = require('./models/GreatestJoyMedia');
const FamilyCircle = require('./models/FamilyCircle');
const User = require('./models/User');

async function fixLillyPhoto() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('✅ Connected to MongoDB\n');
        
        // Find the "Lilly at uni" photo
        const media = await GreatestJoyMedia.findOne({
            title: /lilly at uni/i
        });
        
        if (!media) {
            console.log('❌ Photo "Lilly at uni" not found');
            return;
        }
        
        console.log('📸 Found: Lilly at uni');
        console.log('Current URL:', media.url);
        console.log('Source Type:', media.sourceType);
        
        // Provide solutions
        console.log('\n🔧 FIX OPTIONS:\n');
        console.log('Option 1: Delete this entry and re-upload using Cloud Import');
        console.log('  → Go to Greatest Joy → Cloud Import');
        console.log('  → Connect Google Photos');
        console.log('  → Select the photo from your library');
        console.log('  → Choose Family Circle and import');
        console.log('');
        console.log('Option 2: Replace with a direct image URL');
        console.log('  → Upload the photo file to the app');
        console.log('  → Or find a direct image URL (not an album link)');
        console.log('');
        console.log('Option 3: Automatic fix (requires Google Photos OAuth - not available in scripts)');
        console.log('  → Use the web interface Cloud Import feature');
        console.log('');
        
        // Option: Mark as broken so it shows a helpful message
        console.log('💡 I can mark this entry to show a helpful  error message in the UI.');
        console.log('   This will tell users to re-import via Cloud Import.');
        console.log('');
        console.log('Would you like to mark it? (This is safe and reversible)');
        console.log('   To proceed: Uncomment the code below and run again.\n');
        
        /* UNCOMMENT TO MARK AS BROKEN:
        
        media.url = 'broken://google-photos-album-link';
        media.description = (media.description || '') + '\n\n⚠️ This photo needs to be re-imported using Cloud Import for proper display.';
        await media.save();
        console.log('✅ Photo marked. Users will see a helpful error message.');
        
        */
        
        console.log('\n📋 SUMMARY:');
        console.log('   The "Lilly at uni" photo has a Google Photos album shareable link');
        console.log('   instead of a direct image URL. Album links are web pages, not images.');
        console.log('');
        console.log('   Best solution: Delete and re-import via Cloud Import');
        console.log('   Quick solution: Edit the photo and paste a direct image URL');
        
    } catch (error) {
        console.error('❌ Error:', error);
    } finally {
        await mongoose.connection.close();
        console.log('\n👋 Disconnected from MongoDB');
    }
}

// Run the fix
fixLillyPhoto();
