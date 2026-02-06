// routes/excelFiles.js
const express = require('express');
const router = express.Router();
const ExcelFile = require('../models/ExcelFile');

// Render Excel files management page
router.get('/manage', (req, res) => {
    console.log('📊 Excel files management route hit');
    try {
        res.render('excel-management');
    } catch (error) {
        console.error('❌ Error rendering excel-management:', error);
        res.status(500).send('Error loading Excel files management page');
    }
});

// Get all active Excel files
router.get('/api/files', async (req, res) => {
    try {
        const files = await ExcelFile.find({ isActive: true })
            .sort({ category: 1, order: 1 })
            .lean();
        res.json({ success: true, files });
    } catch (error) {
        console.error('Error fetching Excel files:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// Get all Excel files (for management)
router.get('/api/files/all', async (req, res) => {
    try {
        const files = await ExcelFile.find()
            .sort({ category: 1, order: 1 })
            .lean();
        res.json({ success: true, files });
    } catch (error) {
        console.error('Error fetching all Excel files:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// View a specific Excel file
router.get('/:id', async (req, res) => {
    try {
        const file = await ExcelFile.findById(req.params.id);
        if (!file) {
            return res.status(404).send('Excel file not found');
        }
        
        // Update last accessed time
        file.lastAccessed = new Date();
        await file.save();
        
        res.render('excel-view', { file });
    } catch (error) {
        console.error('Error loading Excel file:', error);
        res.status(500).send('Error loading Excel file');
    }
});

// Create new Excel file
router.post('/api/files', async (req, res) => {
    try {
        const { name, sharePointUrl, embedUrl, description, category, allowDirectAccess } = req.body;

        // Get the highest order number for this category
        const lastFile = await ExcelFile.findOne({ category })
            .sort({ order: -1 })
            .lean();

        const order = lastFile ? lastFile.order + 1 : 0;

        const file = new ExcelFile({
            name,
            sharePointUrl,
            embedUrl: embedUrl || sharePointUrl, // Use embedUrl if provided, otherwise use sharePointUrl
            description,
            category,
            order,
            allowDirectAccess: allowDirectAccess !== false,
            createdBy: req.user?.username || 'admin'
        });

        await file.save();
        res.json({ success: true, file });
    } catch (error) {
        console.error('Error creating Excel file:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// Update Excel file
router.put('/api/files/:id', async (req, res) => {
    try {
        const { name, sharePointUrl, embedUrl, description, category, isActive, allowDirectAccess } = req.body;

        const file = await ExcelFile.findByIdAndUpdate(
            req.params.id,
            { name, sharePointUrl, embedUrl, description, category, isActive, allowDirectAccess },
            { new: true, runValidators: true }
        );

        if (!file) {
            return res.status(404).json({ success: false, error: 'Excel file not found' });
        }

        res.json({ success: true, file });
    } catch (error) {
        console.error('Error updating Excel file:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// Delete Excel file
router.delete('/api/files/:id', async (req, res) => {
    try {
        const file = await ExcelFile.findByIdAndDelete(req.params.id);

        if (!file) {
            return res.status(404).json({ success: false, error: 'Excel file not found' });
        }

        res.json({ success: true, message: 'Excel file deleted successfully' });
    } catch (error) {
        console.error('Error deleting Excel file:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// Reorder Excel files
router.post('/api/files/reorder', async (req, res) => {
    try {
        const { fileIds } = req.body; // Array of file IDs in new order

        // Update the order field for each file
        const updatePromises = fileIds.map((id, index) => 
            ExcelFile.findByIdAndUpdate(id, { order: index })
        );

        await Promise.all(updatePromises);
        res.json({ success: true, message: 'Excel files reordered successfully' });
    } catch (error) {
        console.error('Error reordering Excel files:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

module.exports = router;
