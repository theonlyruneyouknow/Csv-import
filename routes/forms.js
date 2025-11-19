// routes/forms.js
const express = require('express');
const router = express.Router();
const Form = require('../models/Form');
const Link = require('../models/Link');

// Render forms management page
router.get('/manage', (req, res) => {
    console.log('📝 Forms management route hit');
    console.log('📝 Attempting to render forms-management');
    try {
        res.render('forms-management');
    } catch (error) {
        console.error('❌ Error rendering forms-management:', error);
        res.status(500).send('Error loading forms management page');
    }
});

// Get all active forms
router.get('/api/forms', async (req, res) => {
    try {
        const forms = await Form.find({ isActive: true })
            .sort({ category: 1, order: 1 })
            .lean();
        res.json({ success: true, forms });
    } catch (error) {
        console.error('Error fetching forms:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// Get all forms (for management)
router.get('/api/forms/all', async (req, res) => {
    try {
        const forms = await Form.find()
            .sort({ category: 1, order: 1 })
            .lean();
        res.json({ success: true, forms });
    } catch (error) {
        console.error('Error fetching all forms:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// View a specific form (must be after /manage and /api routes)
router.get('/:id', async (req, res) => {
    try {
        const form = await Form.findById(req.params.id).lean();
        if (!form) {
            return res.status(404).send('Form not found');
        }
        res.render('form-view', { form });
    } catch (error) {
        console.error('Error loading form:', error);
        res.status(500).send('Error loading form');
    }
});

// Create new form
router.post('/api/forms', async (req, res) => {
    try {
        const { name, embedCode, description, category } = req.body;

        // Get the highest order number for this category
        const lastForm = await Form.findOne({ category })
            .sort({ order: -1 })
            .lean();

        const order = lastForm ? lastForm.order + 1 : 0;

        const form = new Form({
            name,
            embedCode,
            description,
            category,
            order
        });

        await form.save();

        res.json({ success: true, form });
    } catch (error) {
        console.error('Error creating form:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// Update form
router.put('/api/forms/:id', async (req, res) => {
    try {
        const { name, embedCode, description, category, isActive } = req.body;

        const form = await Form.findByIdAndUpdate(
            req.params.id,
            { name, embedCode, description, category, isActive },
            { new: true, runValidators: true }
        );

        if (!form) {
            return res.status(404).json({ success: false, error: 'Form not found' });
        }

        res.json({ success: true, form });
    } catch (error) {
        console.error('Error updating form:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// Delete form
router.delete('/api/forms/:id', async (req, res) => {
    try {
        const form = await Form.findByIdAndDelete(req.params.id);

        if (!form) {
            return res.status(404).json({ success: false, error: 'Form not found' });
        }

        res.json({ success: true, message: 'Form deleted successfully' });
    } catch (error) {
        console.error('Error deleting form:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// Reorder forms
router.post('/api/forms/reorder', async (req, res) => {
    try {
        const { formIds } = req.body; // Array of form IDs in new order

        // Update order for each form
        const updatePromises = formIds.map((id, index) =>
            Form.findByIdAndUpdate(id, { order: index })
        );

        await Promise.all(updatePromises);

        res.json({ success: true, message: 'Forms reordered successfully' });
    } catch (error) {
        console.error('Error reordering forms:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// ============= LINKS ROUTES =============

// Get all active links
router.get('/api/links', async (req, res) => {
    try {
        const links = await Link.find({ isActive: true })
            .sort({ category: 1, order: 1 })
            .lean();
        res.json({ success: true, links });
    } catch (error) {
        console.error('Error fetching links:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// Get all links (for management)
router.get('/api/links/all', async (req, res) => {
    try {
        const links = await Link.find()
            .sort({ category: 1, order: 1 })
            .lean();
        res.json({ success: true, links });
    } catch (error) {
        console.error('Error fetching all links:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// Create new link
router.post('/api/links', async (req, res) => {
    try {
        const { name, url, description, category, openInNewTab } = req.body;

        // Get the highest order number for this category
        const lastLink = await Link.findOne({ category })
            .sort({ order: -1 })
            .lean();

        const order = lastLink ? lastLink.order + 1 : 0;

        const link = new Link({
            name,
            url,
            description,
            category,
            openInNewTab: openInNewTab !== false, // default to true
            order
        });

        await link.save();

        res.json({ success: true, link });
    } catch (error) {
        console.error('Error creating link:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// Update link
router.put('/api/links/:id', async (req, res) => {
    try {
        const { name, url, description, category, isActive, openInNewTab } = req.body;

        const link = await Link.findByIdAndUpdate(
            req.params.id,
            { name, url, description, category, isActive, openInNewTab },
            { new: true, runValidators: true }
        );

        if (!link) {
            return res.status(404).json({ success: false, error: 'Link not found' });
        }

        res.json({ success: true, link });
    } catch (error) {
        console.error('Error updating link:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// Delete link
router.delete('/api/links/:id', async (req, res) => {
    try {
        const link = await Link.findByIdAndDelete(req.params.id);

        if (!link) {
            return res.status(404).json({ success: false, error: 'Link not found' });
        }

        res.json({ success: true, message: 'Link deleted successfully' });
    } catch (error) {
        console.error('Error deleting link:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// Reorder links
router.post('/api/links/reorder', async (req, res) => {
    try {
        const { linkIds } = req.body; // Array of link IDs in new order

        // Update order for each link
        const updatePromises = linkIds.map((id, index) =>
            Link.findByIdAndUpdate(id, { order: index })
        );

        await Promise.all(updatePromises);

        res.json({ success: true, message: 'Links reordered successfully' });
    } catch (error) {
        console.error('Error reordering links:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

module.exports = router;
