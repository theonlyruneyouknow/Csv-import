const express = require('express');
const router = express.Router();
const Bulletin = require('../models/Bulletin');
const { ensureAuthenticated } = require('../middleware/auth');

// Middleware to check if user has access to bulletin management
const ensureBulletinAccess = (req, res, next) => {
    if (!req.user.permissions.accessBulletinManagement && 
        req.user.role !== 'admin' && 
        req.user.role !== 'manager') {
        return res.status(403).render('error', { 
            message: 'Access denied. You do not have permission to access Bulletin Management.' 
        });
    }
    next();
};

// Display current bulletin (public view)
router.get('/', async (req, res) => {
    try {
        let bulletin = await Bulletin.getCurrentBulletin();
        
        if (!bulletin) {
            // Create default bulletin for this Sunday if none exists
            const today = new Date();
            const sunday = new Date(today);
            sunday.setDate(today.getDate() - today.getDay());
            
            if (req.user && (req.user.permissions.accessBulletinManagement || 
                req.user.role === 'admin' || req.user.role === 'manager')) {
                bulletin = await Bulletin.createDefaultBulletin(sunday, req.user._id);
            } else {
                // Show empty bulletin template for non-authenticated users
                bulletin = new Bulletin({ meetingDate: sunday });
            }
        }
        
        res.render('bulletin-display', {
            user: req.user,
            bulletin,
            title: 'Church Bulletin'
        });
    } catch (error) {
        console.error('Error loading bulletin:', error);
        res.status(500).render('error', { message: 'Error loading bulletin' });
    }
});

// New bulletin form
router.get('/new', ensureAuthenticated, ensureBulletinAccess, async (req, res) => {
    try {
        res.render('bulletin-form', {
            user: req.user,
            bulletin: null,
            title: 'Create New Bulletin'
        });
    } catch (error) {
        console.error('Error loading new bulletin form:', error);
        res.status(500).render('error', { message: 'Error loading bulletin form' });
    }
});

// Create bulletin
router.post('/', ensureAuthenticated, ensureBulletinAccess, async (req, res) => {
    try {
        console.log('📝 Creating new bulletin with data:', req.body);
        
        // Simple approach - use the body data directly but handle hymns and speakers properly
        const bulletinData = { ...req.body };
        bulletinData.createdBy = req.user._id;
        bulletinData.lastModifiedBy = req.user._id;
        
        console.log('📝 Processed bulletin data for create');
        
        const bulletin = new Bulletin(bulletinData);
        await bulletin.save();
        
        console.log('✅ Bulletin saved successfully:', bulletin._id);
        res.redirect(`/bulletin/${bulletin._id}`);
    } catch (error) {
        console.error('❌ Error creating bulletin:', error);
        res.status(500).render('error', { message: 'Error creating bulletin: ' + error.message });
    }
});

// Edit bulletin form
router.get('/:id/edit', ensureAuthenticated, ensureBulletinAccess, async (req, res) => {
    try {
        const bulletin = await Bulletin.findById(req.params.id);
        
        if (!bulletin) {
            return res.status(404).render('error', { message: 'Bulletin not found' });
        }
        
        res.render('bulletin-form', {
            user: req.user,
            bulletin,
            title: 'Edit Bulletin'
        });
    } catch (error) {
        console.error('Error loading bulletin for edit:', error);
        res.status(500).render('error', { message: 'Error loading bulletin' });
    }
});

// Update bulletin
router.post('/:id', ensureAuthenticated, ensureBulletinAccess, async (req, res) => {
    try {
        console.log('📝 Updating bulletin with data:', req.body);
        
        const bulletin = await Bulletin.findById(req.params.id);
        
        if (!bulletin) {
            return res.status(404).render('error', { message: 'Bulletin not found' });
        }
        
        // Simple update - copy all the data
        Object.assign(bulletin, req.body);
        bulletin.lastModifiedBy = req.user._id;
        bulletin.updatedAt = new Date();
        
        await bulletin.save();
        console.log('✅ Bulletin updated successfully');
        res.redirect(`/bulletin/${bulletin._id}`);
    } catch (error) {
        console.error('❌ Error updating bulletin:', error);
        res.status(500).render('error', { message: 'Error updating bulletin: ' + error.message });
    }
});

// View specific bulletin
router.get('/:id', async (req, res) => {
    try {
        const bulletin = await Bulletin.findById(req.params.id);
        
        if (!bulletin) {
            return res.status(404).render('error', { message: 'Bulletin not found' });
        }
        
        res.render('bulletin-display', {
            user: req.user,
            bulletin,
            title: 'Church Bulletin'
        });
    } catch (error) {
        console.error('Error loading bulletin:', error);
        res.status(500).render('error', { message: 'Error loading bulletin' });
    }
});

module.exports = router;
