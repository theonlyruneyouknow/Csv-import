const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const GreatestJoyMedia = require('../models/GreatestJoyMedia');
const FamilyCircle = require('../models/FamilyCircle');
const { ensureAuthenticated } = require('../middleware/auth');
const GooglePhotosAlbumParser = require('../lib/googlePhotosAlbumParser');

// Middleware to check if user can access media
async function canAccessMedia(userId, media) {
    try {
        // 1. Uploader always has access
        if (media.uploadedBy.toString() === userId.toString()) {
            return true;
        }
        
        // 2. Public media is accessible to all
        if (media.visibility === 'public') {
            return true;
        }
        
        // 3. Private media only accessible by uploader
        if (media.visibility === 'private') {
            return false;
        }
        
        // 4. Circle/Family visibility - check if user is in any of the circles
        if (media.visibility === 'circle' || media.visibility === 'family') {
            if (!media.circles || media.circles.length === 0) {
                // No circles specified, but marked as circle visibility - allow all authenticated users
                return true;
            }
            
            // Check if user is a member of any of the media's circles
            const userCircles = await FamilyCircle.find({
                _id: { $in: media.circles },
                'members.user': userId
            });
            
            return userCircles.length > 0;
        }
        
        return false;
    } catch (error) {
        console.error('Error checking media access:', error);
        return false;
    }
}

// Configure multer for file uploads
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        const uploadDir = path.join(__dirname, '../public/uploads/greatestjoy');
        if (!fs.existsSync(uploadDir)) {
            fs.mkdirSync(uploadDir, { recursive: true });
        }
        cb(null, uploadDir);
    },
    filename: function (req, file, cb) {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, uniqueSuffix + path.extname(file.originalname));
    }
});

const upload = multer({ 
    storage: storage,
    limits: { fileSize: 100 * 1024 * 1024 }, // 100MB limit
    fileFilter: function (req, file, cb) {
        const allowedTypes = /jpeg|jpg|png|gif|mp4|mov|avi|webm|mp3|wav|m4a/;
        const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
        const mimetype = allowedTypes.test(file.mimetype);
        
        if (mimetype && extname) {
            return cb(null, true);
        } else {
            cb(new Error('Invalid file type'));
        }
    }
});

// Dashboard - view all media
router.get('/dashboard', ensureAuthenticated, async (req, res) => {
    try {
        // Get user's Family Circles
        const userCircles = await FamilyCircle.find({
            'members.user': req.user._id
        }).select('_id');
        
        const circleIds = userCircles.map(c => c._id);
        
        // Find media that user can access:
        // 1. Public media
        // 2. Media they uploaded
        // 3. Media in their Family Circles (with circle/family visibility)
        const allMedia = await GreatestJoyMedia.find({
            $or: [
                { visibility: 'public' },
                { uploadedBy: req.user._id },
                {
                    visibility: { $in: ['circle', 'family'] },
                    circles: { $in: circleIds }
                },
                // Media marked as circle/family but no specific circles (accessible to all)
                {
                    visibility: { $in: ['circle', 'family'] },
                    $or: [
                        { circles: { $exists: false } },
                        { circles: { $size: 0 } }
                    ]
                }
            ]
        })
            .populate('uploadedBy', 'firstName lastName')
            .sort({ captureDate: -1 })
            .limit(50);
        
        // Get unique children for filtering
        const children = await GreatestJoyMedia.distinct('child.name');
        
        // Get unique albums
        const albums = await GreatestJoyMedia.distinct('album');
        
        res.render('greatestjoy-dashboard', {
            title: 'Greatest Joy - Our Grandchildren',
            user: req.user,
            media: allMedia,
            children,
            albums
        });
    } catch (err) {
        console.error(err);
        res.status(500).send('Server Error');
    }
});

// Get media by child
router.get('/child/:name', ensureAuthenticated, async (req, res) => {
    try {
        const media = await GreatestJoyMedia.find({ 'child.name': req.params.name })
            .populate('uploadedBy', 'firstName lastName')
            .sort({ captureDate: -1 });
        
        res.render('greatestjoy-child', {
            title: `${req.params.name} - Greatest Joy`,
            user: req.user,
            childName: req.params.name,
            media
        });
    } catch (err) {
        console.error(err);
        res.status(500).send('Server Error');
    }
});

// Get media by album
router.get('/album/:name', ensureAuthenticated, async (req, res) => {
    try {
        const media = await GreatestJoyMedia.find({ album: req.params.name })
            .populate('uploadedBy', 'firstName lastName')
            .sort({ captureDate: -1 });
        
        res.render('greatestjoy-album', {
            title: `${req.params.name} - Greatest Joy`,
            user: req.user,
            albumName: req.params.name,
            media
        });
    } catch (err) {
        console.error(err);
        res.status(500).send('Server Error');
    }
});

// Upload form
router.get('/upload', ensureAuthenticated, async (req, res) => {
    try {
        const children = await GreatestJoyMedia.distinct('child.name');
        const albums = await GreatestJoyMedia.distinct('album');
        
        // Get family circles the user belongs to
        const circles = await FamilyCircle.find({
            'members.user': req.user._id
        }).select('name members');
        
        res.render('greatestjoy-upload', {
            title: 'Upload - Greatest Joy',
            user: req.user,
            media: null,
            children,
            albums,
            circles
        });
    } catch (err) {
        console.error(err);
        res.status(500).send('Server Error');
    }
});

// Upload media POST
router.post('/upload', ensureAuthenticated, async (req, res) => {
    try {
        const {
            title,
            description,
            mediaType,
            url,
            thumbnailUrl,
            childName,
            childBirthDate,
            relationship,
            peopleData, // JSON string of people array
            circles, // Array of circle IDs
            captureDate,
            tags,
            location,
            visibility,
            album
        } = req.body;

        // Parse people data
        let people = [];
        if (peopleData) {
            try {
                people = JSON.parse(peopleData);
            } catch (e) {
                console.error('Error parsing people data:', e);
            }
        }

        // Legacy: if no people data but childName exists, add as person
        if (people.length === 0 && childName) {
            people.push({
                name: childName,
                relationship: relationship || 'grandchild',
                birthDate: childBirthDate
            });
        }

        const newMedia = new GreatestJoyMedia({
            title,
            description,
            mediaType,
            url,
            thumbnailUrl,
            sourceType: url.startsWith('/uploads/') ? 'local' : 'url',
            child: childName ? {
                name: childName,
                birthDate: childBirthDate,
                relationship: relationship || 'grandchild'
            } : undefined,
            people,
            circles: circles || [],
            uploadedBy: req.user._id,
            captureDate: captureDate || Date.now(),
            tags: tags ? tags.split(',').map(t => t.trim()) : [],
            location,
            visibility: visibility || 'circle',
            album
        });

        await newMedia.save();
        res.redirect('/greatestjoy/dashboard');
    } catch (err) {
        console.error(err);
        res.status(500).send('Server Error');
    }
});

// View single media
router.get('/media/:id', ensureAuthenticated, async (req, res) => {
    try {
        const media = await GreatestJoyMedia.findById(req.params.id)
            .populate('uploadedBy', 'firstName lastName')
            .populate('comments.user', 'firstName lastName')
            .populate('circles', 'name');
        
        if (!media) {
            return res.status(404).send('Media not found');
        }
        
        // Check if user has access to this media
        const hasAccess = await canAccessMedia(req.user._id, media);
        
        if (!hasAccess) {
            return res.status(403).render('error', {
                message: 'Access Denied',
                error: {
                    status: 403,
                    stack: 'You do not have permission to view this media. It may be private or shared with a Family Circle you are not a member of.'
                },
                user: req.user
            });
        }

        res.render('greatestjoy-media-detail', {
            title: media.title,
            user: req.user,
            media
        });
    } catch (err) {
        console.error(err);
        res.status(500).send('Server Error');
    }
});

// Add comment
router.post('/media/:id/comment', ensureAuthenticated, async (req, res) => {
    try {
        const media = await GreatestJoyMedia.findById(req.params.id);
        
        if (!media) {
            return res.status(404).json({ error: 'Media not found' });
        }

        media.comments.push({
            user: req.user._id,
            text: req.body.text
        });

        await media.save();
        res.json({ success: true });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server Error' });
    }
});

// Toggle favorite
router.post('/media/:id/favorite', ensureAuthenticated, async (req, res) => {
    try {
        const media = await GreatestJoyMedia.findById(req.params.id);
        
        if (!media) {
            return res.status(404).json({ error: 'Media not found' });
        }

        const index = media.favorites.indexOf(req.user._id);
        if (index > -1) {
            media.favorites.splice(index, 1);
        } else {
            media.favorites.push(req.user._id);
        }

        await media.save();
        res.json({ success: true, isFavorite: index === -1 });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server Error' });
    }
});

// Delete media
router.delete('/media/:id', ensureAuthenticated, async (req, res) => {
    try {
        const media = await GreatestJoyMedia.findById(req.params.id);
        
        if (!media) {
            return res.status(404).json({ error: 'Media not found' });
        }

        // Check if user is admin or the uploader
        if (req.user.role !== 'admin' && media.uploadedBy.toString() !== req.user._id.toString()) {
            return res.status(403).json({ error: 'Not authorized' });
        }

        await media.deleteOne();
        res.json({ success: true });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server Error' });
    }
});

// Edit media
router.get('/media/:id/edit', ensureAuthenticated, async (req, res) => {
    try {
        const media = await GreatestJoyMedia.findById(req.params.id);
        
        if (!media) {
            return res.status(404).send('Media not found');
        }

        // Check if user is admin or the uploader
        if (req.user.role !== 'admin' && media.uploadedBy.toString() !== req.user._id.toString()) {
            return res.status(403).send('Not authorized');
        }

        const children = await GreatestJoyMedia.distinct('child.name');
        const albums = await GreatestJoyMedia.distinct('album');
        const circles = await FamilyCircle.find({ 
            $or: [
                { members: req.user._id }, 
                { createdBy: req.user._id }
            ] 
        });

        res.render('greatestjoy-upload', {
            title: 'Edit - Greatest Joy',
            user: req.user,
            media,
            children,
            albums,
            circles
        });
    } catch (err) {
        console.error(err);
        res.status(500).send('Server Error');
    }
});

// Update media
router.put('/media/:id', ensureAuthenticated, async (req, res) => {
    try {
        const media = await GreatestJoyMedia.findById(req.params.id);
        
        if (!media) {
            return res.status(404).json({ error: 'Media not found' });
        }

        // Check if user is admin or the uploader
        if (req.user.role !== 'admin' && media.uploadedBy.toString() !== req.user._id.toString()) {
            return res.status(403).json({ error: 'Not authorized' });
        }

        const {
            title,
            description,
            url,
            childName,
            childBirthDate,
            relationship,
            peopleData,
            captureDate,
            tags,
            location,
            visibility,
            circles,
            album
        } = req.body;
        
        // Parse people data
        let people = [];
        if (peopleData) {
            try {
                people = JSON.parse(peopleData);
            } catch (e) {
                console.error('Error parsing people data:', e);
            }
        }

        media.title = title;
        media.description = description;
        
        // Allow URL update for non-local media
        if (url && media.sourceType !== 'local') {
            media.url = url;
            // Update source type if URL changed
            media.sourceType = url.startsWith('/uploads/') ? 'local' : 'url';
        }
        
        // Update child (legacy field)
        if (childName) {
            media.child = {
                name: childName,
                birthDate: childBirthDate,
                relationship: relationship || 'grandchild'
            };
        }
        
        // Update people
        if (people.length > 0) {
            media.people = people;
        }
        
        media.captureDate = captureDate;
        media.tags = tags ? tags.split(',').map(t => t.trim()) : [];
        media.location = location;
        media.visibility = visibility;
        media.circles = circles || [];
        media.album = album;

        await media.save();
        res.json({ success: true });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server Error' });
    }
});

// ========== NEW: BULK UPLOAD & STORIES/RECORDINGS ==========

// Bulk upload page
router.get('/bulk-upload', ensureAuthenticated, async (req, res) => {
    try {
        res.render('greatestjoy-bulk-upload', {
            title: 'Bulk Upload - Greatest Joy',
            user: req.user
        });
    } catch (err) {
        console.error(err);
        res.status(500).send('Server Error');
    }
});

// Handle file upload from bulk upload
router.post('/upload-file', ensureAuthenticated, upload.single('file'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'No file uploaded' });
        }

        const { title, album, location, captureDate } = req.body;
        const isVideo = req.file.mimetype.startsWith('video/');
        
        // Create the media entry with the uploaded file URL
        const newMedia = new GreatestJoyMedia({
            title: title || req.file.originalname.replace(/\.[^/.]+$/, ""),
            mediaType: isVideo ? 'video' : 'photo',
            url: `/uploads/greatestjoy/${req.file.filename}`,
            sourceType: 'local',
            uploadedBy: req.user._id,
            album: album || '',
            location: location || '',
            captureDate: captureDate || Date.now(),
            visibility: 'circle'
        });

        await newMedia.save();
        res.json({ success: true, mediaId: newMedia._id });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: err.message });
    }
});

// Add voice recording to existing media
router.post('/media/:id/add-recording', ensureAuthenticated, upload.single('audio'), async (req, res) => {
    try {
        const media = await GreatestJoyMedia.findById(req.params.id);
        
        if (!media) {
            return res.status(404).json({ error: 'Media not found' });
        }

        if (!req.file) {
            return res.status(400).json({ error: 'No audio file provided' });
        }

        const { title, transcript } = req.body;

        // Add the recording to the media
        media.voiceRecordings.push({
            audioUrl: `/uploads/greatestjoy/${req.file.filename}`,
            duration: null, // Could be calculated from file metadata
            recordedBy: req.user._id,
            recordedDate: new Date(),
            title: title || 'Voice Recording',
            transcript: transcript ? {
                text: transcript,
                language: 'en',
                generatedDate: new Date()
            } : null
        });

        await media.save();
        res.json({ success: true });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: err.message });
    }
});

// Add written story to existing media
router.post('/media/:id/add-story', ensureAuthenticated, async (req, res) => {
    try {
        const media = await GreatestJoyMedia.findById(req.params.id);
        
        if (!media) {
            return res.status(404).json({ error: 'Media not found' });
        }

        const { title, content } = req.body;

        if (!content || !content.trim()) {
            return res.status(400).json({ error: 'Story content is required' });
        }

        // Add the story to the media
        media.stories.push({
            title: title || 'Untitled Story',
            content: content,
            author: req.user._id,
            writtenDate: new Date()
        });

        await media.save();
        res.json({ success: true });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: err.message });
    }
});

// Parse Google Photos album URL to get direct image URLs
router.post('/parse-album-url', ensureAuthenticated, async (req, res) => {
    try {
        const { url } = req.body;
        
        if (!url) {
            return res.status(400).json({ error: 'URL is required' });
        }
        
        // Check if it's a Google Photos shareable link
        if (!GooglePhotosAlbumParser.isGooglePhotosShareableLink(url)) {
            return res.status(400).json({ 
                error: 'Not a Google Photos shareable link',
                suggestion: 'This appears to be a regular URL. You can use it as-is or try Cloud Import for Google Photos integration.'
            });
        }
        
        // Parse the album to extract images
        const images = await GooglePhotosAlbumParser.parseSharedAlbumUrl(url);
        
        if (images.length === 0) {
            return res.status(404).json({ 
                error: 'No images found in album',
                suggestion: 'The album may be empty or private. Try using Cloud Import with OAuth for authenticated access.'
            });
        }
        
        res.json({ 
            success: true, 
            images,
            albumUrl: url,
            count: images.length 
        });
    } catch (err) {
        console.error('Album parse error:', err);
        res.status(500).json({ 
            error: err.message,
            suggestion: 'Unable to access this album. Try Cloud Import for authenticated Google Photos access.'
        });
    }
});

module.exports = router;
