const express = require('express');
const router = express.Router();
const GreatestJoyMedia = require('../models/GreatestJoyMedia');
const { ensureAuthenticated } = require('../middleware/auth');

// Dashboard - view all media
router.get('/dashboard', ensureAuthenticated, async (req, res) => {
    try {
        const media = await GreatestJoyMedia.find()
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
            media,
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
            .populate('comments.user', 'firstName lastName');
        
        if (!media) {
            return res.status(404).send('Media not found');
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

        res.render('greatestjoy-upload', {
            title: 'Edit - Greatest Joy',
            user: req.user,
            media,
            children,
            albums
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
            childName,
            childBirthDate,
            relationship,
            captureDate,
            tags,
            location,
            visibility,
            album
        } = req.body;

        media.title = title;
        media.description = description;
        media.child.name = childName;
        media.child.birthDate = childBirthDate;
        media.child.relationship = relationship;
        media.captureDate = captureDate;
        media.tags = tags ? tags.split(',').map(t => t.trim()) : [];
        media.location = location;
        media.visibility = visibility;
        media.album = album;

        await media.save();
        res.json({ success: true });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server Error' });
    }
});

module.exports = router;
