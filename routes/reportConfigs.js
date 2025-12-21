const express = require('express');
const router = express.Router();
const ReportConfig = require('../models/ReportConfig');
const { ensureAuthenticated, ensureApproved } = require('../middleware/auth');

// All routes require authentication
router.use(ensureAuthenticated);
router.use(ensureApproved);

// Get all accessible report configs for a specific report type
router.get('/:reportType', async (req, res) => {
    try {
        const { reportType } = req.params;
        const configs = await ReportConfig.getAccessibleConfigs(req.user, reportType);
        
        res.json({
            success: true,
            configs: configs.map(config => ({
                _id: config._id,
                name: config.name,
                reportType: config.reportType,
                config: config.config,
                isPublic: config.isPublic,
                createdBy: config.createdBy,
                createdByUsername: config.createdByUsername,
                description: config.description,
                usageCount: config.usageCount,
                lastUsed: config.lastUsed,
                createdAt: config.createdAt,
                canModify: config.canModify(req.user),
                isOwner: config.createdBy.toString() === req.user._id.toString()
            }))
        });
    } catch (error) {
        console.error('Error fetching report configs:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// Save a new report config
router.post('/', async (req, res) => {
    try {
        const { name, reportType, config, isPublic, description } = req.body;
        
        if (!name || !reportType || !config) {
            return res.status(400).json({ 
                success: false, 
                error: 'Name, reportType, and config are required' 
            });
        }
        
        // Check for duplicate name for this user and report type
        const existing = await ReportConfig.findOne({
            name,
            reportType,
            createdBy: req.user._id
        });
        
        if (existing) {
            return res.status(400).json({
                success: false,
                error: `You already have a saved config named "${name}" for this report`
            });
        }
        
        const reportConfig = new ReportConfig({
            name,
            reportType,
            config,
            isPublic: isPublic || false,
            description,
            createdBy: req.user._id,
            createdByUsername: req.user.username
        });
        
        await reportConfig.save();
        
        res.json({
            success: true,
            message: 'Report configuration saved successfully',
            config: {
                _id: reportConfig._id,
                name: reportConfig.name,
                reportType: reportConfig.reportType,
                config: reportConfig.config,
                isPublic: reportConfig.isPublic,
                description: reportConfig.description,
                canModify: true,
                isOwner: true
            }
        });
    } catch (error) {
        console.error('Error saving report config:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// Update an existing report config
router.put('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { name, config, isPublic, description } = req.body;
        
        const reportConfig = await ReportConfig.findById(id);
        
        if (!reportConfig) {
            return res.status(404).json({ success: false, error: 'Configuration not found' });
        }
        
        if (!reportConfig.canModify(req.user)) {
            return res.status(403).json({ 
                success: false, 
                error: 'You do not have permission to modify this configuration' 
            });
        }
        
        // Update fields
        if (name) reportConfig.name = name;
        if (config) reportConfig.config = config;
        if (typeof isPublic === 'boolean') reportConfig.isPublic = isPublic;
        if (description !== undefined) reportConfig.description = description;
        
        await reportConfig.save();
        
        res.json({
            success: true,
            message: 'Report configuration updated successfully',
            config: {
                _id: reportConfig._id,
                name: reportConfig.name,
                reportType: reportConfig.reportType,
                config: reportConfig.config,
                isPublic: reportConfig.isPublic,
                description: reportConfig.description,
                canModify: reportConfig.canModify(req.user),
                isOwner: reportConfig.createdBy.toString() === req.user._id.toString()
            }
        });
    } catch (error) {
        console.error('Error updating report config:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// Delete a report config
router.delete('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        
        const reportConfig = await ReportConfig.findById(id);
        
        if (!reportConfig) {
            return res.status(404).json({ success: false, error: 'Configuration not found' });
        }
        
        if (!reportConfig.canModify(req.user)) {
            return res.status(403).json({ 
                success: false, 
                error: 'You do not have permission to delete this configuration' 
            });
        }
        
        await reportConfig.deleteOne();
        
        res.json({
            success: true,
            message: 'Report configuration deleted successfully'
        });
    } catch (error) {
        console.error('Error deleting report config:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// Record usage of a config
router.post('/:id/use', async (req, res) => {
    try {
        const { id } = req.params;
        
        const reportConfig = await ReportConfig.findById(id);
        
        if (!reportConfig) {
            return res.status(404).json({ success: false, error: 'Configuration not found' });
        }
        
        if (!reportConfig.canAccess(req.user)) {
            return res.status(403).json({ 
                success: false, 
                error: 'You do not have permission to access this configuration' 
            });
        }
        
        await reportConfig.recordUsage();
        
        res.json({
            success: true,
            config: reportConfig.config
        });
    } catch (error) {
        console.error('Error recording config usage:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// Admin: Make a config public
router.post('/:id/make-public', async (req, res) => {
    try {
        if (req.user.role !== 'admin') {
            return res.status(403).json({ 
                success: false, 
                error: 'Only admins can make configurations public' 
            });
        }
        
        const { id } = req.params;
        const reportConfig = await ReportConfig.findById(id);
        
        if (!reportConfig) {
            return res.status(404).json({ success: false, error: 'Configuration not found' });
        }
        
        reportConfig.isPublic = true;
        await reportConfig.save();
        
        res.json({
            success: true,
            message: `Configuration "${reportConfig.name}" is now public`,
            config: {
                _id: reportConfig._id,
                name: reportConfig.name,
                isPublic: reportConfig.isPublic
            }
        });
    } catch (error) {
        console.error('Error making config public:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// Admin: Make a config private
router.post('/:id/make-private', async (req, res) => {
    try {
        if (req.user.role !== 'admin') {
            return res.status(403).json({ 
                success: false, 
                error: 'Only admins can make configurations private' 
            });
        }
        
        const { id } = req.params;
        const reportConfig = await ReportConfig.findById(id);
        
        if (!reportConfig) {
            return res.status(404).json({ success: false, error: 'Configuration not found' });
        }
        
        reportConfig.isPublic = false;
        await reportConfig.save();
        
        res.json({
            success: true,
            message: `Configuration "${reportConfig.name}" is now private`,
            config: {
                _id: reportConfig._id,
                name: reportConfig.name,
                isPublic: reportConfig.isPublic
            }
        });
    } catch (error) {
        console.error('Error making config private:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// Migrate localStorage data to database
router.post('/migrate-from-localstorage', async (req, res) => {
    try {
        const { reportType, favorites } = req.body;
        
        if (!reportType || !Array.isArray(favorites)) {
            return res.status(400).json({ 
                success: false, 
                error: 'reportType and favorites array are required' 
            });
        }
        
        const results = {
            success: 0,
            skipped: 0,
            errors: []
        };
        
        for (const fav of favorites) {
            try {
                // Check if already exists
                const existing = await ReportConfig.findOne({
                    name: fav.name,
                    reportType,
                    createdBy: req.user._id
                });
                
                if (existing) {
                    results.skipped++;
                    continue;
                }
                
                // Create new config
                const reportConfig = new ReportConfig({
                    name: fav.name,
                    reportType,
                    config: fav.config,
                    isPublic: false, // Default to private
                    createdBy: req.user._id,
                    createdByUsername: req.user.username
                });
                
                await reportConfig.save();
                results.success++;
            } catch (error) {
                results.errors.push({ name: fav.name, error: error.message });
            }
        }
        
        res.json({
            success: true,
            message: `Migration complete: ${results.success} saved, ${results.skipped} skipped`,
            results
        });
    } catch (error) {
        console.error('Error migrating localStorage data:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

module.exports = router;
