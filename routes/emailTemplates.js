const express = require('express');
const EmailTemplate = require('../models/EmailTemplate');
const router = express.Router();

// Get all email templates
router.get('/', async (req, res) => {
    try {
        const { category, isActive } = req.query;
        
        let filter = {};
        if (category && category !== 'all') {
            filter.category = category;
        }
        if (isActive !== undefined) {
            filter.isActive = isActive === 'true';
        }

        const templates = await EmailTemplate.find(filter)
            .sort({ isDefault: -1, 'usage.count': -1, name: 1 });

        res.json({
            success: true,
            templates,
            count: templates.length
        });
    } catch (error) {
        console.error('Error fetching email templates:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// Get a specific template by ID
router.get('/:id', async (req, res) => {
    try {
        const template = await EmailTemplate.findById(req.params.id);
        
        if (!template) {
            return res.status(404).json({
                success: false,
                error: 'Template not found'
            });
        }

        res.json({
            success: true,
            template
        });
    } catch (error) {
        console.error('Error fetching email template:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// Create a new email template
router.post('/', async (req, res) => {
    try {
        const {
            name,
            description,
            category,
            subject,
            bodyTemplate,
            variables,
            isDefault
        } = req.body;

        // If setting as default, unset other defaults in the same category
        if (isDefault) {
            await EmailTemplate.updateMany(
                { category, isDefault: true },
                { isDefault: false }
            );
        }

        const template = new EmailTemplate({
            name,
            description,
            category,
            subject,
            bodyTemplate,
            variables: variables || [],
            isDefault: isDefault || false,
            createdBy: req.user ? req.user.username : 'anonymous'
        });

        await template.save();

        res.status(201).json({
            success: true,
            template,
            message: 'Template created successfully'
        });
    } catch (error) {
        console.error('Error creating email template:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// Update an email template
router.put('/:id', async (req, res) => {
    try {
        const {
            name,
            description,
            category,
            subject,
            bodyTemplate,
            variables,
            isDefault,
            isActive
        } = req.body;

        // If setting as default, unset other defaults in the same category
        if (isDefault) {
            await EmailTemplate.updateMany(
                { category, isDefault: true, _id: { $ne: req.params.id } },
                { isDefault: false }
            );
        }

        const template = await EmailTemplate.findByIdAndUpdate(
            req.params.id,
            {
                name,
                description,
                category,
                subject,
                bodyTemplate,
                variables: variables || [],
                isDefault: isDefault !== undefined ? isDefault : false,
                isActive: isActive !== undefined ? isActive : true,
                updatedBy: req.user ? req.user.username : 'anonymous',
                updatedAt: Date.now()
            },
            { new: true, runValidators: true }
        );

        if (!template) {
            return res.status(404).json({
                success: false,
                error: 'Template not found'
            });
        }

        res.json({
            success: true,
            template,
            message: 'Template updated successfully'
        });
    } catch (error) {
        console.error('Error updating email template:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// Delete an email template
router.delete('/:id', async (req, res) => {
    try {
        const template = await EmailTemplate.findByIdAndDelete(req.params.id);
        
        if (!template) {
            return res.status(404).json({
                success: false,
                error: 'Template not found'
            });
        }

        res.json({
            success: true,
            message: 'Template deleted successfully'
        });
    } catch (error) {
        console.error('Error deleting email template:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// Record template usage
router.post('/:id/use', async (req, res) => {
    try {
        const template = await EmailTemplate.findByIdAndUpdate(
            req.params.id,
            {
                $inc: { 'usage.count': 1 },
                'usage.lastUsed': Date.now()
            },
            { new: true }
        );

        if (!template) {
            return res.status(404).json({
                success: false,
                error: 'Template not found'
            });
        }

        res.json({
            success: true,
            message: 'Template usage recorded'
        });
    } catch (error) {
        console.error('Error recording template usage:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// Generate email content using template
router.post('/:id/generate', async (req, res) => {
    try {
        const template = await EmailTemplate.findById(req.params.id);
        
        if (!template) {
            return res.status(404).json({
                success: false,
                error: 'Template not found'
            });
        }

        const { data } = req.body;
        
        // Simple template variable substitution
        let subject = template.subject;
        let body = template.bodyTemplate;

        // Replace simple variables like {{variable}}
        for (const [key, value] of Object.entries(data || {})) {
            const regex = new RegExp(`{{${key}}}`, 'g');
            subject = subject.replace(regex, value || '');
            body = body.replace(regex, value || '');
        }

        // Handle conditional blocks (basic implementation)
        // {{#if condition}}...{{/if}}
        body = body.replace(/{{#if\s+(\w+)}}([\s\S]*?){{\/if}}/g, (match, condition, content) => {
            return data[condition] && data[condition].length > 0 ? content : '';
        });

        // Handle loops (basic implementation)
        // {{#each array}}...{{/each}}
        body = body.replace(/{{#each\s+(\w+)}}([\s\S]*?){{\/each}}/g, (match, arrayName, content) => {
            const array = data[arrayName];
            if (!Array.isArray(array)) return '';
            
            return array.map(item => {
                let itemContent = content;
                for (const [key, value] of Object.entries(item)) {
                    const regex = new RegExp(`{{${key}}}`, 'g');
                    itemContent = itemContent.replace(regex, value || '');
                }
                return itemContent;
            }).join('');
        });

        // Record usage
        await EmailTemplate.findByIdAndUpdate(
            req.params.id,
            {
                $inc: { 'usage.count': 1 },
                'usage.lastUsed': Date.now()
            }
        );

        res.json({
            success: true,
            email: {
                subject: subject.trim(),
                body: body.trim(),
                templateUsed: template.name
            }
        });
    } catch (error) {
        console.error('Error generating email from template:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// Initialize default templates
router.post('/initialize', async (req, res) => {
    try {
        await EmailTemplate.createDefaultTemplates();
        res.json({
            success: true,
            message: 'Default templates initialized successfully'
        });
    } catch (error) {
        console.error('Error initializing default templates:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

module.exports = router;
