// routes/usSeedPartners.js
const express = require('express');
const router = express.Router();
const USSeedPartner = require('../models/USSeedPartner');
const { ensureAuthenticated } = require('../middleware/auth');

// ============================================
// DASHBOARD ROUTE - US State-by-State Seed Partners
// ============================================
router.get('/', ensureAuthenticated, async (req, res) => {
    try {
        console.log('🇺🇸 Loading US Seed Partnership Dashboard...');

        // Get filter parameters
        const statusFilter = req.query.status;
        const typeFilter = req.query.type;
        const regionFilter = req.query.region;
        const stateFilter = req.query.state;

        // Build query
        let query = {};
        if (statusFilter) query.status = statusFilter;
        if (typeFilter) query.partnershipType = typeFilter;
        if (regionFilter) query.region = regionFilter;
        if (stateFilter) query.state = stateFilter;

        // Get all partners
        const allPartners = await USSeedPartner.find(query).sort({ state: 1 });

        console.log(`🔍 Query: ${JSON.stringify(query)}`);
        console.log(`📊 Database returned: ${allPartners.length} partners`);
        if (allPartners.length > 0) {
            console.log(`📝 First partner: ${allPartners[0].companyName} (${allPartners[0].state})`);
        }

        // Calculate statistics
        const stats = {
            total: allPartners.length,
            active: allPartners.filter(p => p.status === 'Active').length,
            prospective: allPartners.filter(p => p.status === 'Prospective').length,
            onHold: allPartners.filter(p => p.status === 'On Hold').length,
            highPriority: allPartners.filter(p => p.priority >= 4).length,
            withWebsites: allPartners.filter(p => p.businessDetails?.website).length
        };

        // Group by region
        const byRegion = {
            'Northeast': allPartners.filter(p => p.region === 'Northeast').length,
            'Southeast': allPartners.filter(p => p.region === 'Southeast').length,
            'Midwest': allPartners.filter(p => p.region === 'Midwest').length,
            'Southwest': allPartners.filter(p => p.region === 'Southwest').length,
            'West': allPartners.filter(p => p.region === 'West').length,
            'Pacific': allPartners.filter(p => p.region === 'Pacific').length,
            'Mountain': allPartners.filter(p => p.region === 'Mountain').length
        };

        console.log(`✅ Found ${stats.total} US partners`);
        console.log(`📊 Stats: Active=${stats.active}, Prospective=${stats.prospective}, HighPriority=${stats.highPriority}`);

        res.render('us-seed-partnership-dashboard', {
            partners: allPartners,
            stats: stats,
            byRegion: byRegion,
            filters: {
                status: statusFilter,
                type: typeFilter,
                region: regionFilter,
                state: stateFilter
            },
            user: req.user
        });

    } catch (error) {
        console.error('Error loading US seed partners dashboard:', error);
        res.status(500).send('Error loading dashboard: ' + error.message);
    }
});

// ============================================
// SEED CATALOG SEARCH - Browse by crop type (US)
// ============================================
router.get('/catalog', ensureAuthenticated, async (req, res) => {
    try {
        console.log('🌱 Loading US Seed Catalog search page...');

        // Get all US partners with seed offerings (Active and Prospective)
        const partners = await USSeedPartner.find({});

        console.log(`📊 Found ${partners.length} US partners for catalog`);

        // Build comprehensive catalog
        const catalog = {
            vegetables: {},
            flowers: {},
            herbs: {}
        };

        // Aggregate all offerings
        partners.forEach(partner => {
            if (partner.seedOfferings) {
                // Vegetables
                if (partner.seedOfferings.vegetables) {
                    partner.seedOfferings.vegetables.forEach(veg => {
                        if (!catalog.vegetables[veg]) {
                            catalog.vegetables[veg] = [];
                        }
                        catalog.vegetables[veg].push({
                            _id: partner._id,
                            companyName: partner.companyName,
                            partnerCode: partner.partnerCode,
                            state: partner.state,
                            stateCode: partner.stateCode,
                            status: partner.status,
                            website: partner.businessDetails?.website,
                            priority: partner.priority
                        });
                    });
                }

                // Flowers
                if (partner.seedOfferings.flowers) {
                    partner.seedOfferings.flowers.forEach(flower => {
                        if (!catalog.flowers[flower]) {
                            catalog.flowers[flower] = [];
                        }
                        catalog.flowers[flower].push({
                            _id: partner._id,
                            companyName: partner.companyName,
                            partnerCode: partner.partnerCode,
                            state: partner.state,
                            stateCode: partner.stateCode,
                            status: partner.status,
                            website: partner.businessDetails?.website,
                            priority: partner.priority
                        });
                    });
                }

                // Herbs
                if (partner.seedOfferings.herbs) {
                    partner.seedOfferings.herbs.forEach(herb => {
                        if (!catalog.herbs[herb]) {
                            catalog.herbs[herb] = [];
                        }
                        catalog.herbs[herb].push({
                            _id: partner._id,
                            companyName: partner.companyName,
                            partnerCode: partner.partnerCode,
                            state: partner.state,
                            stateCode: partner.stateCode,
                            status: partner.status,
                            website: partner.businessDetails?.website,
                            priority: partner.priority
                        });
                    });
                }
            }
        });

        // Sort crop types alphabetically
        const sortedCatalog = {
            vegetables: Object.keys(catalog.vegetables).sort(),
            flowers: Object.keys(catalog.flowers).sort(),
            herbs: Object.keys(catalog.herbs).sort()
        };

        console.log(`🌱 Catalog built: ${sortedCatalog.vegetables.length} vegetables, ${sortedCatalog.flowers.length} flowers, ${sortedCatalog.herbs.length} herbs`);

        // Stats
        const stats = {
            totalVegetables: sortedCatalog.vegetables.length,
            totalFlowers: sortedCatalog.flowers.length,
            totalHerbs: sortedCatalog.herbs.length,
            totalPartners: partners.length
        };

        res.render('us-seed-catalog', {
            catalog: catalog,
            sortedCatalog: sortedCatalog,
            stats: stats,
            user: req.user
        });

    } catch (error) {
        console.error('Error loading US seed catalog:', error);
        res.status(500).send('Error loading catalog: ' + error.message);
    }
});

// ============================================
// VIEW PARTNER DETAILS
// ============================================
router.get('/:id', ensureAuthenticated, async (req, res) => {
    try {
        const partner = await USSeedPartner.findById(req.params.id);

        if (!partner) {
            return res.status(404).send('US Partner not found');
        }

        res.render('us-seed-partner-detail', {
            partner: partner,
            user: req.user
        });

    } catch (error) {
        console.error('Error loading US partner details:', error);
        res.status(500).send('Error loading partner: ' + error.message);
    }
});

// ============================================
// QUICK UPDATE (Inline Edit from Dashboard)
// ============================================
router.post('/:id/quick-update', ensureAuthenticated, async (req, res) => {
    try {
        const {
            companyName,
            primaryContactName,
            primaryContactEmail,
            primaryContactPhone,
            website,
            status,
            priority,
            personalNotes
        } = req.body;

        const updateData = {
            companyName,
            status,
            priority: parseInt(priority) || 3,
            personalNotes,
            lastUpdatedBy: req.user.username,
            updatedAt: new Date()
        };

        // Update nested fields
        if (primaryContactName || primaryContactEmail || primaryContactPhone) {
            updateData.primaryContact = {};
            if (primaryContactName) updateData.primaryContact.name = primaryContactName;
            if (primaryContactEmail) updateData.primaryContact.email = primaryContactEmail;
            if (primaryContactPhone) updateData.primaryContact.phone = primaryContactPhone;
        }

        if (website) {
            updateData.businessDetails = { website };
        }

        const partner = await USSeedPartner.findByIdAndUpdate(
            req.params.id,
            updateData,
            { new: true, runValidators: true }
        );

        res.json({
            success: true,
            message: 'Partner updated successfully',
            partner: partner
        });

    } catch (error) {
        console.error('Error updating US partner:', error);
        res.status(500).json({
            success: false,
            message: 'Error updating partner: ' + error.message
        });
    }
});

// ============================================
// UPDATE STATUS
// ============================================
router.post('/:id/update-status', ensureAuthenticated, async (req, res) => {
    try {
        const { status } = req.body;

        const partner = await USSeedPartner.findByIdAndUpdate(
            req.params.id,
            {
                status: status,
                lastUpdatedBy: req.user.username,
                updatedAt: new Date()
            },
            { new: true }
        );

        res.json({
            success: true,
            message: 'Status updated successfully',
            partner: partner
        });

    } catch (error) {
        console.error('Error updating status:', error);
        res.status(500).json({
            success: false,
            message: 'Error updating status: ' + error.message
        });
    }
});

// ============================================
// UPDATE PRIORITY
// ============================================
router.post('/:id/update-priority', ensureAuthenticated, async (req, res) => {
    try {
        const { priority } = req.body;

        const partner = await USSeedPartner.findByIdAndUpdate(
            req.params.id,
            {
                priority: parseInt(priority),
                lastUpdatedBy: req.user.username,
                updatedAt: new Date()
            },
            { new: true }
        );

        res.json({
            success: true,
            message: 'Priority updated successfully',
            partner: partner
        });

    } catch (error) {
        console.error('Error updating priority:', error);
        res.status(500).json({
            success: false,
            message: 'Error updating priority: ' + error.message
        });
    }
});

module.exports = router;
