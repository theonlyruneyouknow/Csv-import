const express = require('express');
const router = express.Router();
const Announcement = require('../models/Announcement');

console.log('📢 Announcement routes module loaded!');

// Test route to verify the announcements routes are working
router.get('/test', (req, res) => {
    console.log('🧪 Announcement API test route hit!');
    res.json({ message: 'Announcement API routes are working!', timestamp: new Date() });
});

// Middleware to ensure user is authenticated (reuse existing auth)
const ensureAuthenticated = (req, res, next) => {
    if (req.isAuthenticated()) {
        return next();
    }
    return res.status(401).json({ error: 'Authentication required' });
};

// GET /api/announcements - Get announcements with filtering
router.get('/', async (req, res) => {
    console.log('📢 API: GET /api/announcements called with query:', req.query);
    
    try {
        const { 
            active = null, 
            category = null, 
            current = null,
            page = 1, 
            limit = 50 
        } = req.query;

        let query = {};
        
        // Filter by active status
        if (active !== null) {
            query.isActive = active === 'true';
        }
        
        // Filter by category
        if (category && category !== 'all') {
            query.category = category;
        }
        
        // Filter by current date range (currently active)
        if (current === 'true') {
            const now = new Date();
            query.startDate = { $lte: now };
            query.endDate = { $gte: now };
            query.isActive = true;
        }

        const skip = (parseInt(page) - 1) * parseInt(limit);
        
        const announcements = await Announcement.find(query)
            .sort({ priority: -1, createdAt: -1 })
            .skip(skip)
            .limit(parseInt(limit));

        const total = await Announcement.countDocuments(query);

        res.json({
            announcements,
            total,
            page: parseInt(page),
            pages: Math.ceil(total / parseInt(limit)),
            hasNext: skip + announcements.length < total,
            hasPrev: page > 1
        });
    } catch (error) {
        console.error('❌ Error fetching announcements:', error);
        res.status(500).json({ error: 'Error fetching announcements' });
    }
});

// GET /api/announcements/active - Get currently active announcements
router.get('/active', async (req, res) => {
    try {
        const { category } = req.query;
        const announcements = await Announcement.getActiveAnnouncements(category);
        
        console.log(`📢 Found ${announcements.length} active announcements`);
        res.json(announcements);
    } catch (error) {
        console.error('❌ Error fetching active announcements:', error);
        res.status(500).json({ error: 'Error fetching active announcements' });
    }
});

// GET /api/announcements/:id - Get specific announcement
router.get('/:id', async (req, res) => {
    try {
        const announcement = await Announcement.findById(req.params.id);
        if (!announcement) {
            return res.status(404).json({ error: 'Announcement not found' });
        }
        res.json(announcement);
    } catch (error) {
        console.error('❌ Error fetching announcement:', error);
        res.status(500).json({ error: 'Error fetching announcement' });
    }
});

// POST /api/announcements - Create new announcement
router.post('/', ensureAuthenticated, async (req, res) => {
    try {
        const {
            title,
            content,
            startDate,
            endDate,
            priority = 0,
            category = 'general',
            isActive = true
        } = req.body;

        // Validation
        if (!title || !content || !startDate || !endDate) {
            return res.status(400).json({ 
                error: 'Title, content, start date, and end date are required' 
            });
        }

        const start = new Date(startDate);
        const end = new Date(endDate);

        if (end <= start) {
            return res.status(400).json({ 
                error: 'End date must be after start date' 
            });
        }

        const announcement = new Announcement({
            title: title.trim(),
            content: content.trim(),
            startDate: start,
            endDate: end,
            priority: parseInt(priority),
            category,
            isActive,
            createdBy: req.user ? req.user.username : 'admin'
        });

        await announcement.save();
        
        console.log(`📢 Created new announcement: ${announcement.title}`);
        console.log(`📅 Active from ${start.toLocaleDateString()} to ${end.toLocaleDateString()}`);
        
        res.status(201).json(announcement);
    } catch (error) {
        console.error('❌ Error creating announcement:', error);
        
        if (error.name === 'ValidationError') {
            return res.status(400).json({ 
                error: 'Validation error', 
                details: error.message 
            });
        }
        
        res.status(500).json({ error: 'Error creating announcement' });
    }
});

// PUT /api/announcements/:id - Update announcement
router.put('/:id', ensureAuthenticated, async (req, res) => {
    try {
        const {
            title,
            content,
            startDate,
            endDate,
            priority,
            category,
            isActive
        } = req.body;

        const announcement = await Announcement.findById(req.params.id);
        if (!announcement) {
            return res.status(404).json({ error: 'Announcement not found' });
        }

        // Update fields if provided
        if (title !== undefined) announcement.title = title.trim();
        if (content !== undefined) announcement.content = content.trim();
        if (startDate !== undefined) announcement.startDate = new Date(startDate);
        if (endDate !== undefined) announcement.endDate = new Date(endDate);
        if (priority !== undefined) announcement.priority = parseInt(priority);
        if (category !== undefined) announcement.category = category;
        if (isActive !== undefined) announcement.isActive = isActive;

        // Validate dates
        if (announcement.endDate <= announcement.startDate) {
            return res.status(400).json({ 
                error: 'End date must be after start date' 
            });
        }

        await announcement.save();
        
        console.log(`📢 Updated announcement: ${announcement.title}`);
        res.json(announcement);
    } catch (error) {
        console.error('❌ Error updating announcement:', error);
        
        if (error.name === 'ValidationError') {
            return res.status(400).json({ 
                error: 'Validation error', 
                details: error.message 
            });
        }
        
        res.status(500).json({ error: 'Error updating announcement' });
    }
});

// PATCH /api/announcements/:id/deactivate - Deactivate announcement
router.patch('/:id/deactivate', ensureAuthenticated, async (req, res) => {
    try {
        const announcement = await Announcement.findById(req.params.id);
        if (!announcement) {
            return res.status(404).json({ error: 'Announcement not found' });
        }

        await announcement.deactivate();
        
        console.log(`📢 Deactivated announcement: ${announcement.title}`);
        res.json(announcement);
    } catch (error) {
        console.error('❌ Error deactivating announcement:', error);
        res.status(500).json({ error: 'Error deactivating announcement' });
    }
});

// DELETE /api/announcements/:id - Delete announcement
router.delete('/:id', ensureAuthenticated, async (req, res) => {
    try {
        const announcement = await Announcement.findById(req.params.id);
        if (!announcement) {
            return res.status(404).json({ error: 'Announcement not found' });
        }

        await Announcement.findByIdAndDelete(req.params.id);
        
        console.log(`📢 Deleted announcement: ${announcement.title}`);
        res.json({ message: 'Announcement deleted successfully' });
    } catch (error) {
        console.error('❌ Error deleting announcement:', error);
        res.status(500).json({ error: 'Error deleting announcement' });
    }
});

// POST /api/announcements/cleanup - Clean up expired announcements
router.post('/cleanup', ensureAuthenticated, async (req, res) => {
    try {
        const result = await Announcement.cleanupExpired();
        
        console.log('📢 Cleanup completed:', result);
        res.json({ 
            message: 'Cleanup completed successfully',
            result 
        });
    } catch (error) {
        console.error('❌ Error during cleanup:', error);
        res.status(500).json({ error: 'Error during cleanup' });
    }
});

// GET /api/announcements/stats/summary - Get announcement statistics
router.get('/stats/summary', async (req, res) => {
    console.log('📊 API: GET /api/announcements/stats/summary called');
    
    try {
        const now = new Date();
        
        const [total, active, current, expired] = await Promise.all([
            Announcement.countDocuments(),
            Announcement.countDocuments({ isActive: true }),
            Announcement.countDocuments({
                isActive: true,
                startDate: { $lte: now },
                endDate: { $gte: now }
            }),
            Announcement.countDocuments({
                isActive: true,
                endDate: { $lt: now }
            })
        ]);

        const stats = {
            total,
            active,
            current,
            expired,
            inactive: total - active
        };

        console.log('📢 Announcement stats:', stats);
        res.json(stats);
    } catch (error) {
        console.error('❌ Error fetching announcement stats:', error);
        res.status(500).json({ error: 'Error fetching statistics' });
    }
});

module.exports = router;
