// routes/stagedPartners.js - Routes for partner staging and approval workflow
const express = require('express');
const router = express.Router();
const StagedPartner = require('../models/StagedPartner');
const SeedPartner = require('../models/SeedPartner');

// GET staging review dashboard (authentication handled by app.js middleware)
router.get('/review', async (req, res) => {
    try {
        const status = req.query.status || 'pending';

        const staged = await StagedPartner.find({ reviewStatus: status })
            .sort({ submittedAt: -1 });

        const counts = {
            pending: await StagedPartner.countDocuments({ reviewStatus: 'pending' }),
            needs_info: await StagedPartner.countDocuments({ reviewStatus: 'needs_info' }),
            approved: await StagedPartner.countDocuments({ reviewStatus: 'approved' }),
            rejected: await StagedPartner.countDocuments({ reviewStatus: 'rejected' })
        };

        res.render('staged-partners-review', {
            title: 'Review Staged Partners',
            stagedPartners: staged,
            currentStatus: status,
            counts: counts,
            user: req.user
        });
    } catch (error) {
        console.error('Error loading staged partners:', error);
        res.status(500).send('Error loading review dashboard');
    }
});

// POST approve a staged partner (move to production)
router.post('/approve/:id', async (req, res) => {
    try {
        const staged = await StagedPartner.findById(req.params.id);

        if (!staged) {
            return res.status(404).json({ success: false, error: 'Staged partner not found' });
        }

        // Create partner code if not exists
        if (!staged.partnerCode) {
            const countryCode = staged.country === 'United States' ? 'US' : staged.country.substring(0, 2).toUpperCase();
            const stateCode = staged.stateCode || (staged.region ? staged.region.substring(0, 2).toUpperCase() : 'XX');
            const count = await SeedPartner.countDocuments({
                country: staged.country,
                state: staged.state
            });
            staged.partnerCode = `${countryCode}-${stateCode}-${String(count + 1).padStart(3, '0')}`;
        }

        // Create new SeedPartner from staged data
        const newPartner = new SeedPartner({
            companyName: staged.companyName,
            partnerCode: staged.partnerCode,
            isDomestic: staged.isDomestic,
            country: staged.country,
            region: staged.region,
            state: staged.state,
            stateCode: staged.stateCode,
            city: staged.city,
            partnershipType: staged.partnershipType || 'Domestic Supplier',
            status: staged.status,
            seedTypes: staged.seedTypes || [],
            businessDetails: staged.businessDetails || {},
            primaryContact: staged.primaryContact || {},
            isActive: true
        });

        await newPartner.save();

        // Update staged record
        staged.reviewStatus = 'approved';
        staged.reviewedBy = req.user.username;
        staged.reviewedAt = new Date();
        await staged.save();

        res.json({
            success: true,
            message: `${staged.companyName} approved and added to database`,
            partnerId: newPartner._id
        });

    } catch (error) {
        console.error('Error approving partner:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// POST reject a staged partner
router.post('/reject/:id', async (req, res) => {
    try {
        const staged = await StagedPartner.findById(req.params.id);

        if (!staged) {
            return res.status(404).json({ success: false, error: 'Staged partner not found' });
        }

        staged.reviewStatus = 'rejected';
        staged.reviewedBy = req.user.username;
        staged.reviewedAt = new Date();
        staged.reviewNotes = req.body.notes || '';
        await staged.save();

        res.json({
            success: true,
            message: `${staged.companyName} rejected`
        });

    } catch (error) {
        console.error('Error rejecting partner:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// POST request more info for a staged partner
router.post('/request-info/:id', async (req, res) => {
    try {
        const staged = await StagedPartner.findById(req.params.id);

        if (!staged) {
            return res.status(404).json({ success: false, error: 'Staged partner not found' });
        }

        staged.reviewStatus = 'needs_info';
        staged.reviewedBy = req.user.username;
        staged.reviewedAt = new Date();
        staged.reviewNotes = req.body.notes || 'More information requested';
        await staged.save();

        res.json({
            success: true,
            message: `More information requested for ${staged.companyName}`
        });

    } catch (error) {
        console.error('Error requesting info:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// POST add research notes to staged partner
router.post('/add-notes/:id', async (req, res) => {
    try {
        const staged = await StagedPartner.findById(req.params.id);

        if (!staged) {
            return res.status(404).json({ success: false, error: 'Staged partner not found' });
        }

        staged.researchNotes = req.body.notes || '';
        await staged.save();

        res.json({
            success: true,
            message: 'Research notes updated'
        });

    } catch (error) {
        console.error('Error adding notes:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// DELETE permanently delete a staged partner
router.delete('/delete/:id', async (req, res) => {
    try {
        const result = await StagedPartner.findByIdAndDelete(req.params.id);

        if (!result) {
            return res.status(404).json({ success: false, error: 'Staged partner not found' });
        }

        res.json({
            success: true,
            message: `${result.companyName} permanently deleted from staging`
        });

    } catch (error) {
        console.error('Error deleting staged partner:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

module.exports = router;
