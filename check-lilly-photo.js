/**
 * Diagnostic script to check the "Lilly at uni" photo data
 */

require('dotenv').config();
const mongoose = require('mongoose');
const GreatestJoyMedia = require('./models/GreatestJoyMedia');
const FamilyCircle = require('./models/FamilyCircle');
const User = require('./models/User');

async function checkLillyPhoto() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('✅ Connected to MongoDB\n');
        
        // Find the "Lilly at uni" photo
        const media = await GreatestJoyMedia.findOne({
            title: /lilly at uni/i
        }).populate('circles', 'name').populate('uploadedBy', 'firstName lastName');
        
        if (!media) {
            console.log('❌ Photo "Lilly at uni" not found in database');
            console.log('\n📋 Searching for similar titles...');
            
            const similar = await GreatestJoyMedia.find({
                title: /lilly/i
            }).select('title captureDate').limit(5);
            
            if (similar.length > 0) {
                console.log('\nFound similar entries:');
                similar.forEach(m => {
                    console.log(`  - "${m.title}" (${new Date(m.captureDate).toLocaleDateString()})`);
                });
            } else {
                console.log('No entries found with "Lilly" in the title');
            }
            
            return;
        }
        
        console.log('📸 Found Photo!\n');
        console.log('═══════════════════════════════════════════════════════');
        console.log('BASIC INFO:');
        console.log('═══════════════════════════════════════════════════════');
        console.log('Title:', media.title);
        console.log('Media Type:', media.mediaType);
        console.log('Uploaded By:', media.uploadedBy ? `${media.uploadedBy.firstName} ${media.uploadedBy.lastName}` : 'Unknown');
        console.log('Capture Date:', new Date(media.captureDate).toLocaleDateString());
        console.log('Upload Date:', new Date(media.uploadDate).toLocaleDateString());
        
        console.log('\n═══════════════════════════════════════════════════════');
        console.log('URL INFORMATION:');
        console.log('═══════════════════════════════════════════════════════');
        console.log('Main URL:', media.url);
        console.log('Thumbnail URL:', media.thumbnailUrl || 'None');
        console.log('Source Type:', media.sourceType);
        console.log('Source URL:', media.sourceUrl || 'None');
        
        console.log('\n═══════════════════════════════════════════════════════');
        console.log('GOOGLE PHOTOS DATA:');
        console.log('═══════════════════════════════════════════════════════');
        if (media.googlePhotos) {
            console.log('Media Item ID:', media.googlePhotos.mediaItemId || 'None');
            console.log('Shared Album ID:', media.googlePhotos.sharedAlbumId || 'None');
            console.log('Shareable URL:', media.googlePhotos.shareableUrl || 'None');
            console.log('Base URL:', media.googlePhotos.baseUrl || 'None');
            console.log('Created Time:', media.googlePhotos.createdTime ? new Date(media.googlePhotos.createdTime).toLocaleString() : 'None');
        } else {
            console.log('No Google Photos data');
        }
        
        console.log('\n═══════════════════════════════════════════════════════');
        console.log('SHARING & ACCESS:');
        console.log('═══════════════════════════════════════════════════════');
        console.log('Visibility:', media.visibility);
        console.log('Album:', media.album || 'None');
        console.log('Family Circles:', media.circles && media.circles.length > 0 
            ? media.circles.map(c => c.name).join(', ') 
            : 'None');
        
        console.log('\n═══════════════════════════════════════════════════════');
        console.log('PEOPLE TAGGED:');
        console.log('═══════════════════════════════════════════════════════');
        if (media.people && media.people.length > 0) {
            media.people.forEach(p => {
                console.log(`  - ${p.name} (${p.relationship})`);
            });
        } else if (media.child && media.child.name) {
            console.log(`  - ${media.child.name} (${media.child.relationship}) [Legacy field]`);
        } else {
            console.log('No people tagged');
        }
        
        console.log('\n═══════════════════════════════════════════════════════');
        console.log('DIAGNOSIS:');
        console.log('═══════════════════════════════════════════════════════');
        
        // Diagnose issues
        const issues = [];
        const recommendations = [];
        
        // Check URL format
        if (media.url.includes('photos.app.goo.gl') || media.url.includes('photos.google.com/share')) {
            issues.push('❌ URL is an album shareable link (web page), not a direct image URL');
            if (media.googlePhotos && media.googlePhotos.baseUrl) {
                recommendations.push(`Fix: Set url to "${media.googlePhotos.baseUrl}=d"`);
            } else {
                recommendations.push('⚠️  No baseUrl found - cannot auto-fix. Need to re-import from Google Photos');
            }
        } else if (media.url.includes('googleusercontent.com') || media.url.includes('=d') || media.url.includes('=w')) {
            console.log('✅ URL appears to be a direct Google image URL (correct format)');
        } else if (media.sourceType === 'local' && media.url.startsWith('/uploads/')) {
            console.log('✅ URL is a local upload path (correct format)');
        } else {
            console.log('⚠️  URL format unknown - may or may not work');
        }
        
        // Check if URL is expired
        if (media.sourceType.includes('google-photos')) {
            const uploadedMinutesAgo = (Date.now() - new Date(media.uploadDate).getTime()) / 1000 / 60;
            if (uploadedMinutesAgo > 60) {
                issues.push(`⚠️  Photo was uploaded ${Math.round(uploadedMinutesAgo)} minutes ago - Google Photos URLs expire after ~60 minutes`);
                recommendations.push('Solution: Use Google Photos Shared Albums feature (already implemented) or download photos to local storage');
            }
        }
        
        // Check if shared album is set up properly
        if (media.sourceType === 'google-photos-shared') {
            if (!media.googlePhotos || !media.googlePhotos.shareableUrl) {
                issues.push('❌ Marked as shared album but no shareableUrl found');
                recommendations.push('Re-import using Cloud Import with Family Circle sharing');
            } else {
                console.log('✅ Shared album URL available for fallback viewing');
            }
        }
        
        if (issues.length > 0) {
            console.log('\n🔴 ISSUES FOUND:');
            issues.forEach(issue => console.log('   ' + issue));
        } else {
            console.log('\n✅ No obvious issues detected');
        }
        
        if (recommendations.length > 0) {
            console.log('\n💡 RECOMMENDATIONS:');
            recommendations.forEach(rec => console.log('   ' + rec));
        }
        
        console.log('\n═══════════════════════════════════════════════════════\n');
        
    } catch (error) {
        console.error('❌ Error:', error);
    } finally {
        await mongoose.connection.close();
        console.log('👋 Disconnected from MongoDB');
    }
}

// Run the diagnostic
checkLillyPhoto();
