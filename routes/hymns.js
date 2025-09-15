const express = require('express');
const router = express.Router();
const Hymn = require('../models/Hymn');

// Search hymns by number or title
router.get('/search', async (req, res) => {
    try {
        const { query } = req.query;
        console.log('🎵 Hymn search request received:', query);
        console.log('🎵 Full request query params:', req.query);
        
        if (!query) {
            console.log('🎵 No query provided, returning empty array');
            return res.json([]);
        }

        let hymns = [];

        // Check if query is a number
        if (!isNaN(query)) {
            const number = parseInt(query);
            console.log('🎵 Searching by number:', number);
            hymns = await Hymn.find({ number: number }).limit(10);
            console.log('🎵 Number search results:', hymns);
        } else {
            // Search by title (case insensitive)
            console.log('🎵 Searching by title:', query);
            hymns = await Hymn.find({
                title: { $regex: query, $options: 'i' }
            }).limit(10);
            console.log('🎵 Title search results:', hymns);
        }

        console.log('🎵 Returning hymns count:', hymns.length);
        res.json(hymns);
    } catch (error) {
        console.error('❌ Error searching hymns:', error);
        res.status(500).json({ error: 'Error searching hymns' });
    }
});

// Get all hymns (paginated)
router.get('/', async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 50;
        const skip = (page - 1) * limit;

        const hymns = await Hymn.find()
            .sort({ number: 1 })
            .skip(skip)
            .limit(limit);

        const total = await Hymn.countDocuments();

        res.json({
            hymns,
            total,
            page,
            pages: Math.ceil(total / limit)
        });
    } catch (error) {
        console.error('Error fetching hymns:', error);
        res.status(500).json({ error: 'Error fetching hymns' });
    }
});

// Get hymn by ID
router.get('/:id', async (req, res) => {
    try {
        const hymn = await Hymn.findById(req.params.id);
        if (!hymn) {
            return res.status(404).json({ error: 'Hymn not found' });
        }
        res.json(hymn);
    } catch (error) {
        console.error('Error fetching hymn:', error);
        res.status(500).json({ error: 'Error fetching hymn' });
    }
});

module.exports = router;
