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
        console.log('📝 Creating new bulletin with data:', JSON.stringify(req.body, null, 2));
        
        // Process the form data to handle special cases
        const bulletinData = { ...req.body };
        
        // Handle announcements - if it's an array, join it into a string
        if (Array.isArray(bulletinData.announcements)) {
            bulletinData.announcements = bulletinData.announcements.join('\n\n');
        }
        
        // Handle specialMusic - ensure it's a proper object
        if (typeof bulletinData.specialMusic === 'string') {
            try {
                bulletinData.specialMusic = JSON.parse(bulletinData.specialMusic);
            } catch (e) {
                // If parsing fails, create default structure
                bulletinData.specialMusic = {
                    performer: '',
                    selection: ''
                };
            }
        }
        
        // Ensure specialMusic has proper structure
        if (!bulletinData.specialMusic || typeof bulletinData.specialMusic !== 'object') {
            bulletinData.specialMusic = {
                performer: '',
                selection: ''
            };
        }
        
        bulletinData.createdBy = req.user._id;
        bulletinData.lastModifiedBy = req.user._id;
        
        console.log('📝 Processed bulletin data for create:', JSON.stringify(bulletinData, null, 2));
        
        const bulletin = new Bulletin(bulletinData);
        await bulletin.save();
        
        console.log('✅ Bulletin saved successfully:', bulletin._id);
        res.redirect(`/bulletin/${bulletin._id}`);
    } catch (error) {
        console.error('❌ Error creating bulletin:', error);
        console.error('❌ Full error details:', error.message);
        console.error('❌ Error stack:', error.stack);
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
        console.log('📝 Updating bulletin with data:', JSON.stringify(req.body, null, 2));
        
        const bulletin = await Bulletin.findById(req.params.id);
        
        if (!bulletin) {
            return res.status(404).render('error', { message: 'Bulletin not found' });
        }
        
        // Process the form data to handle special cases
        const updateData = { ...req.body };
        
        // Handle announcements - if it's an array, join it into a string
        if (Array.isArray(updateData.announcements)) {
            updateData.announcements = updateData.announcements.join('\n\n');
        }
        
        // Handle specialMusic - ensure it's a proper object
        if (typeof updateData.specialMusic === 'string') {
            try {
                updateData.specialMusic = JSON.parse(updateData.specialMusic);
            } catch (e) {
                // If parsing fails, create default structure
                updateData.specialMusic = {
                    performer: '',
                    selection: ''
                };
            }
        }
        
        // Ensure specialMusic has proper structure
        if (!updateData.specialMusic || typeof updateData.specialMusic !== 'object') {
            updateData.specialMusic = {
                performer: '',
                selection: ''
            };
        }
        
        // Update the bulletin
        Object.assign(bulletin, updateData);
        bulletin.lastModifiedBy = req.user._id;
        bulletin.updatedAt = new Date();
        
        console.log('📝 Processed bulletin data for update:', JSON.stringify(bulletin.toObject(), null, 2));
        
        await bulletin.save();
        console.log('✅ Bulletin updated successfully');
        res.redirect(`/bulletin/${bulletin._id}`);
    } catch (error) {
        console.error('❌ Error updating bulletin:', error);
        console.error('❌ Full error details:', error.message);
        console.error('❌ Error stack:', error.stack);
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
