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

// Admin dashboard
router.get('/admin', ensureAuthenticated, ensureBulletinAccess, async (req, res) => {
    try {
        const currentBulletin = await Bulletin.getCurrentBulletin();
        const recentBulletins = await Bulletin.find({ isActive: true })
            .sort({ meetingDate: -1 })
            .limit(10)
            .populate('createdBy', 'firstName lastName')
            .populate('lastModifiedBy', 'firstName lastName');
        
        res.render('bulletin-admin', {
            user: req.user,
            currentBulletin,
            recentBulletins,
            title: 'Bulletin Administration'
        });
    } catch (error) {
        console.error('Error loading bulletin admin:', error);
        res.status(500).render('error', { message: 'Error loading bulletin administration' });
    }
});

// Create new bulletin
router.get('/new', ensureAuthenticated, ensureBulletinAccess, async (req, res) => {
    try {
        const targetDate = req.query.date ? new Date(req.query.date) : new Date();
        
        res.render('bulletin-form', {
            user: req.user,
            bulletin: null,
            targetDate,
            isEdit: false,
            title: 'Create New Bulletin'
        });
    } catch (error) {
        console.error('Error creating new bulletin:', error);
        res.status(500).render('error', { message: 'Error creating new bulletin' });
    }
});

// Display specific bulletin by ID
router.get('/:id', async (req, res) => {
    try {
        const bulletin = await Bulletin.findById(req.params.id)
            .populate('createdBy', 'firstName lastName')
            .populate('lastModifiedBy', 'firstName lastName');
        
        if (!bulletin) {
            return res.status(404).render('error', { 
                message: 'Bulletin not found' 
            });
        }
        
        res.render('bulletin-display', {
            user: req.user,
            bulletin,
            title: `Church Bulletin - ${bulletin.wardName || ''}`
        });
    } catch (error) {
        console.error('Error loading bulletin by ID:', error);
        res.status(500).render('error', { message: 'Error loading bulletin' });
    }
});

// Edit existing bulletin
router.get('/:id/edit', ensureAuthenticated, ensureBulletinAccess, async (req, res) => {
    try {
        const bulletin = await Bulletin.findById(req.params.id);
        
        if (!bulletin) {
            return res.status(404).render('error', { message: 'Bulletin not found' });
        }
        
        res.render('bulletin-form', {
            user: req.user,
            bulletin,
            targetDate: bulletin.meetingDate,
            isEdit: true,
            title: `Edit Bulletin - ${bulletin.formattedDate}`
        });
    } catch (error) {
        console.error('Error loading bulletin for edit:', error);
        res.status(500).render('error', { message: 'Error loading bulletin' });
    }
});

// Create bulletin
router.post('/', ensureAuthenticated, ensureBulletinAccess, async (req, res) => {
    try {
        console.log('📝 Creating new bulletin with data:', req.body);
        
        const bulletinData = {
            ...req.body,
            createdBy: req.user._id,
            lastModifiedBy: req.user._id
        };
        
        // Handle nested hymn objects properly
        if (req.body.openingHymn) {
            bulletinData.openingHymn = {
                number: req.body.openingHymn.number || '',
                title: req.body.openingHymn.title || ''
            };
        }
        
        if (req.body.sacramentHymn) {
            bulletinData.sacramentHymn = {
                number: req.body.sacramentHymn.number || '',
                title: req.body.sacramentHymn.title || ''
            };
        }
        
        if (req.body.closingHymn) {
            bulletinData.closingHymn = {
                number: req.body.closingHymn.number || '',
                title: req.body.closingHymn.title || ''
            };
        }
        
        // Handle speakers
        if (req.body.speakers) {
            bulletinData.speakers = {
                first: {
                    name: req.body.speakers.first?.name || '',
                    topic: req.body.speakers.first?.topic || ''
                },
                second: {
                    name: req.body.speakers.second?.name || '',
                    topic: req.body.speakers.second?.topic || ''
                }
            };
        }
        
        console.log('📝 Processed bulletin data:', bulletinData);
        
        const bulletin = new Bulletin(bulletinData);
        await bulletin.save();
        
        console.log('✅ Bulletin saved successfully:', bulletin._id);
        res.redirect(`/bulletin/${bulletin._id}`);
    } catch (error) {
        console.error('❌ Error creating bulletin:', error);
        res.status(500).render('error', { message: 'Error creating bulletin: ' + error.message });
    }
});

// Update bulletin (POST method for form submission)
router.post('/:id', ensureAuthenticated, ensureBulletinAccess, async (req, res) => {
    try {
        console.log('📝 Updating bulletin with data:', req.body);
        
        const bulletin = await Bulletin.findById(req.params.id);
        
        if (!bulletin) {
            return res.status(404).render('error', { message: 'Bulletin not found' });
        }
        
        // Simple update - copy all fields except special ones
        const allowedFields = ['wardName', 'wardLocation', 'meetingDate', 'meetingTime', 'meetingType', 'presiding', 'conducting', 'organist', 'chorister'];
        allowedFields.forEach(field => {
            if (req.body[field] !== undefined) {
                bulletin[field] = req.body[field];
            }
        });
        
        // Handle hymns
        if (req.body.openingHymn) {
            bulletin.openingHymn = req.body.openingHymn;
        }
        if (req.body.sacramentHymn) {
            bulletin.sacramentHymn = req.body.sacramentHymn;
        }
        if (req.body.closingHymn) {
            bulletin.closingHymn = req.body.closingHymn;
        }
        
        // Handle speakers
        if (req.body.speakers) {
            bulletin.speakers = req.body.speakers;
        }
        
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
                key !== 'openingHymnNumber' && key !== 'openingHymnTitle' &&
                key !== 'sacramentHymnNumber' && key !== 'sacramentHymnTitle' &&
                key !== 'closingHymnNumber' && key !== 'closingHymnTitle' &&
                key !== 'firstSpeakerName' && key !== 'firstSpeakerTopic' &&
                key !== 'secondSpeakerName' && key !== 'secondSpeakerTopic' &&
                key !== 'specialMusic' && key !== 'specialMusicPerformer' && key !== 'specialMusicSelection' &&
                key !== 'quoteText' && key !== 'quoteReference' &&
                key !== 'comeFollowMeCurrentWeekDate' && key !== 'comeFollowMeCurrentWeekScripture' && key !== 'comeFollowMeCurrentWeekTitle' &&
                key !== 'comeFollowMeNextWeekDate' && key !== 'comeFollowMeNextWeekScripture' && key !== 'comeFollowMeNextWeekTitle' &&
                key !== 'comeFollowMeThirdWeekDate' && key !== 'comeFollowMeThirdWeekScripture' && key !== 'comeFollowMeThirdWeekTitle') {
                bulletin[key] = req.body[key];
            }
        });
        
        // Handle nested objects
        if (req.body.openingHymnNumber !== undefined || req.body.openingHymnTitle !== undefined) {
            bulletin.openingHymn = {
                number: req.body.openingHymnNumber || '',
                title: req.body.openingHymnTitle || ''
            };
        }
        
        if (req.body.sacramentHymnNumber !== undefined || req.body.sacramentHymnTitle !== undefined) {
            bulletin.sacramentHymn = {
                number: req.body.sacramentHymnNumber || '',
                title: req.body.sacramentHymnTitle || ''
            };
        }
        
        if (req.body.closingHymnNumber !== undefined || req.body.closingHymnTitle !== undefined) {
            bulletin.closingHymn = {
                number: req.body.closingHymnNumber || '',
                title: req.body.closingHymnTitle || ''
            };
        }
        
        if (req.body.firstSpeakerName || req.body.firstSpeakerTopic || req.body.secondSpeakerName || req.body.secondSpeakerTopic) {
            bulletin.speakers = {
                first: {
                    name: req.body.firstSpeakerName || '',
                    topic: req.body.firstSpeakerTopic || ''
                },
                second: {
                    name: req.body.secondSpeakerName || '',
                    topic: req.body.secondSpeakerTopic || ''
                }
            };
        }
        
        // Handle specialMusic - check for both single field and separate fields
        if (req.body.specialMusic) {
            // If it's sent as a single string, treat it as the performer
            bulletin.specialMusic = {
                performer: req.body.specialMusic || '',
                selection: ''
            };
        } else if (req.body.specialMusicPerformer || req.body.specialMusicSelection) {
            bulletin.specialMusic = {
                performer: req.body.specialMusicPerformer || '',
                selection: req.body.specialMusicSelection || ''
            };
        }
        
        if (req.body.quoteText || req.body.quoteReference) {
            bulletin.quote = {
                text: req.body.quoteText || '',
                reference: req.body.quoteReference || ''
            };
        }
        
        // Handle Come Follow Me section
        if (req.body.comeFollowMeCurrentWeekDate || req.body.comeFollowMeCurrentWeekScripture || req.body.comeFollowMeCurrentWeekTitle ||
            req.body.comeFollowMeNextWeekDate || req.body.comeFollowMeNextWeekScripture || req.body.comeFollowMeNextWeekTitle ||
            req.body.comeFollowMeThirdWeekDate || req.body.comeFollowMeThirdWeekScripture || req.body.comeFollowMeThirdWeekTitle) {
            bulletin.comeFollowMe = {
                currentWeek: {
                    date: req.body.comeFollowMeCurrentWeekDate || '',
                    scripture: req.body.comeFollowMeCurrentWeekScripture || '',
                    title: req.body.comeFollowMeCurrentWeekTitle || ''
                },
                nextWeek: {
                    date: req.body.comeFollowMeNextWeekDate || '',
                    scripture: req.body.comeFollowMeNextWeekScripture || '',
                    title: req.body.comeFollowMeNextWeekTitle || ''
                },
                thirdWeek: {
                    date: req.body.comeFollowMeThirdWeekDate || '',
                    scripture: req.body.comeFollowMeThirdWeekScripture || '',
                    title: req.body.comeFollowMeThirdWeekTitle || ''
                }
            };
        }
        
        bulletin.lastModifiedBy = req.user._id;
        await bulletin.save();
        
        res.redirect(`/bulletin/${bulletin._id}`);
    } catch (error) {
        console.error('Error updating bulletin:', error);
        res.status(500).render('error', { message: 'Error updating bulletin' });
    }
});

// Update bulletin
router.put('/:id', ensureAuthenticated, ensureBulletinAccess, async (req, res) => {
    try {
        const bulletin = await Bulletin.findById(req.params.id);
        
        if (!bulletin) {
            return res.status(404).json({ message: 'Bulletin not found' });
        }
        
        // Update fields
        Object.keys(req.body).forEach(key => {
            if (key !== '_id' && key !== 'createdBy') {
                bulletin[key] = req.body[key];
            }
        });
        
        // Handle nested objects
        if (req.body.openingHymnNumber !== undefined || req.body.openingHymnTitle !== undefined) {
            bulletin.openingHymn = {
                number: req.body.openingHymnNumber || bulletin.openingHymn.number,
                title: req.body.openingHymnTitle || bulletin.openingHymn.title
            };
        }
        
        if (req.body.sacramentHymnNumber !== undefined || req.body.sacramentHymnTitle !== undefined) {
            bulletin.sacramentHymn = {
                number: req.body.sacramentHymnNumber || bulletin.sacramentHymn.number,
                title: req.body.sacramentHymnTitle || bulletin.sacramentHymn.title
            };
        }
        
        if (req.body.closingHymnNumber !== undefined || req.body.closingHymnTitle !== undefined) {
            bulletin.closingHymn = {
                number: req.body.closingHymnNumber || bulletin.closingHymn.number,
                title: req.body.closingHymnTitle || bulletin.closingHymn.title
            };
        }
        
        bulletin.lastModifiedBy = req.user._id;
        await bulletin.save();
        
        res.json({ success: true, bulletin });
    } catch (error) {
        console.error('Error updating bulletin:', error);
        res.status(500).json({ message: 'Error updating bulletin' });
    }
});

// Quick update for specific fields (AJAX endpoint)
router.patch('/:id/quick-update', ensureAuthenticated, ensureBulletinAccess, async (req, res) => {
    try {
        const { field, value } = req.body;
        const bulletin = await Bulletin.findById(req.params.id);
        
        if (!bulletin) {
            return res.status(404).json({ message: 'Bulletin not found' });
        }
        
        // Update specific field
        if (field.includes('.')) {
            // Handle nested fields like 'speakers.first.name'
            const keys = field.split('.');
            let current = bulletin;
            for (let i = 0; i < keys.length - 1; i++) {
                current = current[keys[i]];
            }
            current[keys[keys.length - 1]] = value;
        } else {
            bulletin[field] = value;
        }
        
        bulletin.lastModifiedBy = req.user._id;
        await bulletin.save();
        
        res.json({ success: true, message: 'Updated successfully' });
    } catch (error) {
        console.error('Error updating bulletin field:', error);
        res.status(500).json({ message: 'Error updating bulletin' });
    }
});

// Delete bulletin
router.delete('/:id', ensureAuthenticated, ensureBulletinAccess, async (req, res) => {
    try {
        const bulletin = await Bulletin.findById(req.params.id);
        
        if (!bulletin) {
            return res.status(404).json({ message: 'Bulletin not found' });
        }
        
        bulletin.isActive = false;
        bulletin.lastModifiedBy = req.user._id;
        await bulletin.save();
        
        res.json({ success: true, message: 'Bulletin archived successfully' });
    } catch (error) {
        console.error('Error archiving bulletin:', error);
        res.status(500).json({ message: 'Error archiving bulletin' });
    }
});

module.exports = router;
