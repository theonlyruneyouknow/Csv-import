const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs').promises;
const MusicBox = require('../models/MusicBox');

// Ensure upload directory exists
const uploadDir = path.join(__dirname, '../uploads/musicbox');
fs.mkdir(uploadDir, { recursive: true }).catch(console.error);

// Configure multer for file uploads
const storage = multer.diskStorage({
    destination: async (req, file, cb) => {
        try {
            await fs.mkdir(uploadDir, { recursive: true });
            cb(null, uploadDir);
        } catch (error) {
            cb(error);
        }
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        const ext = path.extname(file.originalname);
        cb(null, 'media-' + uniqueSuffix + ext);
    }
});

const fileFilter = (req, file, cb) => {
    // Accept audio and video files
    const allowedMimeTypes = [
        'audio/mpeg', 'audio/mp3', 'audio/wav', 'audio/ogg', 'audio/aac', 'audio/flac',
        'video/mp4', 'video/mpeg', 'video/quicktime', 'video/x-msvideo', 'video/webm'
    ];
    
    if (allowedMimeTypes.includes(file.mimetype)) {
        cb(null, true);
    } else {
        cb(new Error('Invalid file type. Only audio and video files are allowed.'), false);
    }
};

const upload = multer({
    storage: storage,
    fileFilter: fileFilter,
    limits: {
        fileSize: 500 * 1024 * 1024 // 500MB limit
    }
});

// Main page - view all media
router.get('/', async (req, res) => {
    try {
        const { type, search, sortBy = 'uploadedAt', sortOrder = 'desc' } = req.query;
        
        let query = {};
        
        // Filter by file type
        if (type && ['audio', 'video'].includes(type)) {
            query.fileType = type;
        }
        
        // Search functionality
        if (search) {
            query.$or = [
                { songName: new RegExp(search, 'i') },
                { artist: new RegExp(search, 'i') },
                { composer: new RegExp(search, 'i') },
                { description: new RegExp(search, 'i') }
            ];
        }
        
        // Build sort object
        const sort = {};
        sort[sortBy] = sortOrder === 'desc' ? -1 : 1;
        
        const mediaItems = await MusicBox.find(query).sort(sort);
        
        res.render('musicbox', {
            user: req.user,
            mediaItems,
            filters: { type, search, sortBy, sortOrder }
        });
    } catch (error) {
        console.error('Error loading musicbox:', error);
        res.status(500).send('Error loading musicbox');
    }
});

// Upload page
router.get('/upload', (req, res) => {
    res.render('musicbox-upload', {
        user: req.user
    });
});

// Handle file upload
router.post('/upload', upload.single('mediaFile'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'No file uploaded' });
        }
        
        const {
            songName,
            artist,
            composer,
            description,
            recordingDate,
            location,
            genre,
            tags
        } = req.body;
        
        // Validate required fields
        if (!songName || !artist) {
            // Delete uploaded file if validation fails
            await fs.unlink(req.file.path).catch(console.error);
            return res.status(400).json({ error: 'Song name and artist are required' });
        }
        
        // Determine file type
        const fileType = req.file.mimetype.startsWith('audio/') ? 'audio' : 'video';
        
        // Parse tags if provided
        const tagArray = tags ? tags.split(',').map(tag => tag.trim()).filter(tag => tag) : [];
        
        // Create database entry
        const musicBoxEntry = new MusicBox({
            filename: req.file.filename,
            originalFilename: req.file.originalname,
            filePath: req.file.path,
            fileType: fileType,
            mimeType: req.file.mimetype,
            fileSize: req.file.size,
            songName: songName.trim(),
            artist: artist.trim(),
            composer: composer?.trim() || '',
            description: description?.trim() || '',
            recordingDate: recordingDate || null,
            location: location?.trim() || '',
            genre: genre?.trim() || '',
            tags: tagArray,
            uploadedBy: req.user.username
        });
        
        await musicBoxEntry.save();
        
        res.json({
            success: true,
            message: 'Media uploaded successfully',
            mediaId: musicBoxEntry._id
        });
    } catch (error) {
        console.error('Upload error:', error);
        
        // Clean up uploaded file on error
        if (req.file) {
            await fs.unlink(req.file.path).catch(console.error);
        }
        
        res.status(500).json({ error: error.message || 'Error uploading media' });
    }
});

// Get single media item details
router.get('/media/:id', async (req, res) => {
    try {
        const mediaItem = await MusicBox.findById(req.params.id);
        
        if (!mediaItem) {
            return res.status(404).json({ error: 'Media not found' });
        }
        
        res.json({ success: true, mediaItem });
    } catch (error) {
        console.error('Error fetching media:', error);
        res.status(500).json({ error: 'Error fetching media details' });
    }
});

// Stream media file
router.get('/stream/:id', async (req, res) => {
    try {
        const mediaItem = await MusicBox.findById(req.params.id);
        
        if (!mediaItem) {
            return res.status(404).send('Media not found');
        }
        
        // Increment play count
        mediaItem.playCount += 1;
        await mediaItem.save();
        
        const filePath = mediaItem.filePath;
        const stat = await fs.stat(filePath);
        const fileSize = stat.size;
        const range = req.headers.range;
        
        if (range) {
            // Handle range requests for seeking
            const parts = range.replace(/bytes=/, '').split('-');
            const start = parseInt(parts[0], 10);
            const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;
            const chunksize = (end - start) + 1;
            
            const file = require('fs').createReadStream(filePath, { start, end });
            const head = {
                'Content-Range': `bytes ${start}-${end}/${fileSize}`,
                'Accept-Ranges': 'bytes',
                'Content-Length': chunksize,
                'Content-Type': mediaItem.mimeType,
            };
            
            res.writeHead(206, head);
            file.pipe(res);
        } else {
            // Stream entire file
            const head = {
                'Content-Length': fileSize,
                'Content-Type': mediaItem.mimeType,
            };
            
            res.writeHead(200, head);
            require('fs').createReadStream(filePath).pipe(res);
        }
    } catch (error) {
        console.error('Error streaming media:', error);
        res.status(500).send('Error streaming media');
    }
});

// Update media item
router.put('/media/:id', async (req, res) => {
    try {
        const {
            songName,
            artist,
            composer,
            description,
            recordingDate,
            location,
            genre,
            tags
        } = req.body;
        
        const updateData = {
            songName: songName?.trim(),
            artist: artist?.trim(),
            composer: composer?.trim() || '',
            description: description?.trim() || '',
            recordingDate: recordingDate || null,
            location: location?.trim() || '',
            genre: genre?.trim() || ''
        };
        
        // Parse tags if provided
        if (tags) {
            updateData.tags = tags.split(',').map(tag => tag.trim()).filter(tag => tag);
        }
        
        const mediaItem = await MusicBox.findByIdAndUpdate(
            req.params.id,
            updateData,
            { new: true, runValidators: true }
        );
        
        if (!mediaItem) {
            return res.status(404).json({ error: 'Media not found' });
        }
        
        res.json({ success: true, mediaItem });
    } catch (error) {
        console.error('Error updating media:', error);
        res.status(500).json({ error: 'Error updating media' });
    }
});

// Toggle favorite
router.post('/media/:id/favorite', async (req, res) => {
    try {
        const mediaItem = await MusicBox.findById(req.params.id);
        
        if (!mediaItem) {
            return res.status(404).json({ error: 'Media not found' });
        }
        
        mediaItem.isFavorite = !mediaItem.isFavorite;
        await mediaItem.save();
        
        res.json({ success: true, isFavorite: mediaItem.isFavorite });
    } catch (error) {
        console.error('Error toggling favorite:', error);
        res.status(500).json({ error: 'Error toggling favorite' });
    }
});

// Delete media item
router.delete('/media/:id', async (req, res) => {
    try {
        const mediaItem = await MusicBox.findById(req.params.id);
        
        if (!mediaItem) {
            return res.status(404).json({ error: 'Media not found' });
        }
        
        // Delete file from filesystem
        await fs.unlink(mediaItem.filePath).catch(console.error);
        
        // Delete database entry
        await MusicBox.findByIdAndDelete(req.params.id);
        
        res.json({ success: true, message: 'Media deleted successfully' });
    } catch (error) {
        console.error('Error deleting media:', error);
        res.status(500).json({ error: 'Error deleting media' });
    }
});

// Get statistics
router.get('/api/stats', async (req, res) => {
    try {
        const totalMedia = await MusicBox.countDocuments();
        const totalAudio = await MusicBox.countDocuments({ fileType: 'audio' });
        const totalVideo = await MusicBox.countDocuments({ fileType: 'video' });
        const totalPlays = await MusicBox.aggregate([
            { $group: { _id: null, total: { $sum: '$playCount' } } }
        ]);
        
        res.json({
            success: true,
            stats: {
                totalMedia,
                totalAudio,
                totalVideo,
                totalPlays: totalPlays[0]?.total || 0
            }
        });
    } catch (error) {
        console.error('Error fetching stats:', error);
        res.status(500).json({ error: 'Error fetching statistics' });
    }
});

module.exports = router;
