// routes/seedPartners.js
const express = require('express');
const router = express.Router();
const SeedPartner = require('../models/SeedPartner');
const { ensureAuthenticated } = require('../middleware/auth');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Configure multer for document uploads
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        const uploadDir = 'uploads/seed-partners';
        if (!fs.existsSync(uploadDir)) {
            fs.mkdirSync(uploadDir, { recursive: true });
        }
        cb(null, uploadDir);
    },
    filename: function (req, file, cb) {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, uniqueSuffix + '-' + file.originalname);
    }
});

const upload = multer({ 
    storage: storage,
    limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
    fileFilter: function (req, file, cb) {
        // Accept documents and images
        const filetypes = /jpeg|jpg|png|pdf|doc|docx|xls|xlsx/;
        const mimetype = filetypes.test(file.mimetype);
        const extname = filetypes.test(path.extname(file.originalname).toLowerCase());
        
        if (mimetype && extname) {
            return cb(null, true);
        }
        cb(new Error('Invalid file type. Only JPEG, PNG, PDF, DOC, DOCX, XLS, and XLSX files are allowed.'));
    }
});

// ============================================
// DASHBOARD ROUTE - Main Partnership Overview
// ============================================
router.get('/', ensureAuthenticated, async (req, res) => {
    try {
        console.log('🌍 Loading Global Seed Partnership Dashboard...');
        
        // Get filter parameters
        const statusFilter = req.query.status;
        const typeFilter = req.query.type;
        const regionFilter = req.query.region;
        const countryFilter = req.query.country;
        const searchTerm = req.query.search;
        
        // Build query
        let query = { isActive: true };
        
        if (statusFilter && statusFilter !== 'all') {
            query.status = statusFilter;
        }
        if (typeFilter && typeFilter !== 'all') {
            query.partnershipType = typeFilter;
        }
        if (regionFilter && regionFilter !== 'all') {
            query.region = regionFilter;
        }
        if (countryFilter && countryFilter !== 'all') {
            query.country = countryFilter;
        }
        if (searchTerm) {
            query.$or = [
                { companyName: { $regex: searchTerm, $options: 'i' } },
                { partnerCode: { $regex: searchTerm, $options: 'i' } },
                { country: { $regex: searchTerm, $options: 'i' } },
                { tags: { $regex: searchTerm, $options: 'i' } }
            ];
        }
        
        // Fetch partners
        const partners = await SeedPartner.find(query)
            .populate('assignedTo')
            .sort({ priority: 1, companyName: 1 });
        
        // Calculate statistics
        const stats = {
            total: partners.length,
            international: partners.filter(p => p.partnershipType === 'International Supplier' || p.partnershipType === 'International Client').length,
            domestic: partners.filter(p => p.partnershipType === 'Domestic Supplier' || p.partnershipType === 'Domestic Client').length,
            active: partners.filter(p => p.status === 'Active').length,
            prospective: partners.filter(p => p.status === 'Prospective').length,
            onHold: partners.filter(p => p.status === 'On Hold').length,
            totalOrderValue: partners.reduce((sum, p) => sum + (p.totalOrderValue || 0), 0),
            byRegion: {},
            byCountry: {},
            bySeedType: {}
        };
        
        // Group by region
        partners.forEach(partner => {
            stats.byRegion[partner.region] = (stats.byRegion[partner.region] || 0) + 1;
            stats.byCountry[partner.country] = (stats.byCountry[partner.country] || 0) + 1;
            
            // Count seed types
            if (partner.seedTypes && partner.seedTypes.length > 0) {
                partner.seedTypes.forEach(seedType => {
                    stats.bySeedType[seedType] = (stats.bySeedType[seedType] || 0) + 1;
                });
            }
        });
        
        // Get unique values for filters
        const uniqueStatuses = ['Prospective', 'Active', 'On Hold', 'Inactive', 'Terminated', 'Non-Alternative'];
        const uniqueTypes = ['International Supplier', 'Domestic Supplier', 'International Client', 'Domestic Client', 'Both Supplier & Client'];
        const uniqueRegions = [...new Set(partners.map(p => p.region))].sort();
        const uniqueCountries = [...new Set(partners.map(p => p.country))].sort();
        
        console.log(`✅ Loaded ${partners.length} seed partners`);
        
        res.render('seed-partnership-dashboard', {
            partners,
            stats,
            uniqueStatuses,
            uniqueTypes,
            uniqueRegions,
            uniqueCountries,
            currentFilters: {
                status: statusFilter || 'all',
                type: typeFilter || 'all',
                region: regionFilter || 'all',
                country: countryFilter || 'all',
                search: searchTerm || ''
            },
            user: req.user
        });
        
    } catch (error) {
        console.error('❌ Error loading seed partnership dashboard:', error);
        res.status(500).send('Error loading dashboard: ' + error.message);
    }
});

// ============================================
// API ENDPOINTS
// ============================================

// Get all partners (API)
router.get('/api/partners', ensureAuthenticated, async (req, res) => {
    try {
        const partners = await SeedPartner.find({ isActive: true })
            .populate('assignedTo')
            .sort({ companyName: 1 });
        res.json({ success: true, partners });
    } catch (error) {
        console.error('API Error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// Get single partner (API)
router.get('/api/partners/:id', ensureAuthenticated, async (req, res) => {
    try {
        const partner = await SeedPartner.findById(req.params.id).populate('assignedTo');
        if (!partner) {
            return res.status(404).json({ success: false, error: 'Partner not found' });
        }
        res.json({ success: true, partner });
    } catch (error) {
        console.error('API Error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// ============================================
// SEED CATALOG SEARCH - Browse by crop type
// ============================================
router.get('/catalog', ensureAuthenticated, async (req, res) => {
    try {
        console.log('🌱 Loading Seed Catalog search page...');
        
        // Get all partners with seed offerings
        const partners = await SeedPartner.find({ isActive: true });
        
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
                            country: partner.country,
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
                            country: partner.country,
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
                            country: partner.country,
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
        
        // Stats
        const stats = {
            totalVegetables: sortedCatalog.vegetables.length,
            totalFlowers: sortedCatalog.flowers.length,
            totalHerbs: sortedCatalog.herbs.length,
            totalPartners: partners.length
        };
        
        res.render('seed-catalog', {
            catalog: catalog,
            sortedCatalog: sortedCatalog,
            stats: stats,
            user: req.user
        });
        
    } catch (error) {
        console.error('Error loading seed catalog:', error);
        res.status(500).send('Error loading catalog: ' + error.message);
    }
});

// ============================================
// CREATE NEW PARTNER
// ============================================

// New partner form
router.get('/new', ensureAuthenticated, async (req, res) => {
    try {
        res.render('seed-partner-form', {
            partner: null,
            isEdit: false,
            user: req.user
        });
    } catch (error) {
        console.error('Error loading new partner form:', error);
        res.status(500).send('Error loading form: ' + error.message);
    }
});

// Create new partner
router.post('/new', ensureAuthenticated, async (req, res) => {
    try {
        console.log('Creating new seed partner:', req.body.companyName);
        
        const partnerData = {
            companyName: req.body.companyName,
            partnerCode: req.body.partnerCode,
            partnershipType: req.body.partnershipType,
            status: req.body.status || 'Prospective',
            country: req.body.country,
            region: req.body.region,
            seedTypes: req.body.seedTypes || [],
            primaryContact: {
                name: req.body.primaryContactName,
                title: req.body.primaryContactTitle,
                email: req.body.primaryContactEmail,
                phone: req.body.primaryContactPhone,
                mobile: req.body.primaryContactMobile,
                whatsapp: req.body.primaryContactWhatsapp,
                preferredLanguage: req.body.primaryContactLanguage || 'English'
            },
            address: {
                street: req.body.addressStreet,
                street2: req.body.addressStreet2,
                city: req.body.addressCity,
                state: req.body.addressState,
                postalCode: req.body.addressPostalCode,
                country: req.body.country
            },
            businessDetails: {
                website: req.body.website,
                companyProfile: req.body.companyProfile,
                yearEstablished: req.body.yearEstablished,
                numberOfEmployees: req.body.numberOfEmployees
            },
            financialTerms: {
                currency: req.body.currency || 'USD',
                ...(req.body.paymentTerms && { paymentTerms: req.body.paymentTerms }),
                ...(req.body.preferredPaymentMethod && { preferredPaymentMethod: req.body.preferredPaymentMethod })
            },
            tradeDetails: {
                ...(req.body.preferredShippingMethod && { preferredShippingMethod: req.body.preferredShippingMethod }),
                ...(req.body.incoterms && { incoterms: req.body.incoterms }),
                averageLeadTime: req.body.averageLeadTime,
                minimumOrderQuantity: req.body.minimumOrderQuantity
            },
            notes: req.body.notes || '',
            tags: req.body.tags ? req.body.tags.split(',').map(t => t.trim()) : [],
            priority: req.body.priority || 3,
            personalNotes: req.body.personalNotes || '',
            createdBy: req.user ? req.user.email : 'system',
            lastUpdatedBy: req.user ? req.user.email : 'system'
        };
        
        const newPartner = new SeedPartner(partnerData);
        await newPartner.save();
        
        console.log('✅ Created new seed partner:', newPartner.companyName);
        res.redirect('/seed-partners/' + newPartner._id);
        
    } catch (error) {
        console.error('❌ Error creating seed partner:', error);
        res.status(500).send('Error creating partner: ' + error.message);
    }
});

// ============================================
// PARTNER DETAIL PAGE
// ============================================

router.get('/:id', ensureAuthenticated, async (req, res) => {
    try {
        const partner = await SeedPartner.findById(req.params.id).populate('assignedTo');
        
        if (!partner) {
            return res.status(404).send('Partner not found');
        }
        
        // Calculate additional metrics
        const daysSinceLastOrder = partner.daysSinceLastOrder();
        const expiringCertifications = partner.getExpiringCertifications();
        
        res.render('seed-partner-detail', {
            partner,
            daysSinceLastOrder,
            expiringCertifications,
            user: req.user
        });
        
    } catch (error) {
        console.error('Error loading partner detail:', error);
        res.status(500).send('Error loading partner: ' + error.message);
    }
});

// ============================================
// EDIT PARTNER
// ============================================

router.get('/:id/edit', ensureAuthenticated, async (req, res) => {
    try {
        const partner = await SeedPartner.findById(req.params.id);
        
        if (!partner) {
            return res.status(404).send('Partner not found');
        }
        
        res.render('seed-partner-form', {
            partner,
            isEdit: true,
            user: req.user
        });
        
    } catch (error) {
        console.error('Error loading edit form:', error);
        res.status(500).send('Error loading form: ' + error.message);
    }
});

// ============================================
// QUICK UPDATE ROUTE - Inline editing from dashboard
// ============================================
router.post('/:id/quick-update', ensureAuthenticated, async (req, res) => {
    try {
        const partner = await SeedPartner.findById(req.params.id);
        
        if (!partner) {
            return res.status(404).json({ success: false, message: 'Partner not found' });
        }

        // Update only the fields that can be quick-edited
        const { legalName, website, yearEstablished, priority, status, personalNotes } = req.body;
        
        if (legalName !== undefined) partner.legalName = legalName;
        if (website !== undefined) {
            if (!partner.businessDetails) partner.businessDetails = {};
            partner.businessDetails.website = website;
        }
        if (yearEstablished !== undefined) {
            if (!partner.businessDetails) partner.businessDetails = {};
            partner.businessDetails.yearEstablished = yearEstablished;
        }
        if (priority !== undefined) partner.priority = priority;
        if (status !== undefined) partner.status = status;
        if (personalNotes !== undefined) partner.personalNotes = personalNotes;

        await partner.save();
        
        console.log(`✅ Quick update successful for partner: ${partner.companyName}`);
        res.json({ success: true, message: 'Partner updated successfully' });
        
    } catch (error) {
        console.error('Error in quick update:', error);
        res.status(500).json({ success: false, message: error.message });
    }
});

// Update partner
router.post('/:id/edit', ensureAuthenticated, async (req, res) => {
    try {
        const partner = await SeedPartner.findById(req.params.id);
        
        if (!partner) {
            return res.status(404).json({ success: false, error: 'Partner not found' });
        }
        
        // Update fields
        partner.companyName = req.body.companyName;
        partner.partnerCode = req.body.partnerCode;
        partner.partnershipType = req.body.partnershipType;
        partner.status = req.body.status;
        partner.country = req.body.country;
        partner.region = req.body.region;
        partner.seedTypes = req.body.seedTypes || [];
        
        partner.primaryContact = {
            name: req.body.primaryContactName,
            title: req.body.primaryContactTitle,
            email: req.body.primaryContactEmail,
            phone: req.body.primaryContactPhone,
            mobile: req.body.primaryContactMobile,
            whatsapp: req.body.primaryContactWhatsapp,
            preferredLanguage: req.body.primaryContactLanguage || 'English'
        };
        
        partner.address = {
            street: req.body.addressStreet,
            street2: req.body.addressStreet2,
            city: req.body.addressCity,
            state: req.body.addressState,
            postalCode: req.body.addressPostalCode,
            country: req.body.country
        };
        
        partner.businessDetails = {
            website: req.body.website,
            companyProfile: req.body.companyProfile,
            yearEstablished: req.body.yearEstablished,
            numberOfEmployees: req.body.numberOfEmployees
        };
        
        partner.financialTerms = {
            currency: req.body.currency || 'USD',
            ...(req.body.paymentTerms && { paymentTerms: req.body.paymentTerms }),
            ...(req.body.preferredPaymentMethod && { preferredPaymentMethod: req.body.preferredPaymentMethod })
        };
        
        partner.tradeDetails = {
            ...(req.body.preferredShippingMethod && { preferredShippingMethod: req.body.preferredShippingMethod }),
            ...(req.body.incoterms && { incoterms: req.body.incoterms }),
            averageLeadTime: req.body.averageLeadTime,
            minimumOrderQuantity: req.body.minimumOrderQuantity
        };
        
        partner.notes = req.body.notes || '';
        partner.tags = req.body.tags ? req.body.tags.split(',').map(t => t.trim()) : [];
        partner.priority = req.body.priority || 3;
        partner.personalNotes = req.body.personalNotes || '';
        partner.lastUpdatedBy = req.user ? req.user.email : 'system';
        
        await partner.save();
        
        console.log('✅ Updated seed partner:', partner.companyName);
        res.redirect('/seed-partners/' + partner._id);
        
    } catch (error) {
        console.error('❌ Error updating seed partner:', error);
        res.status(500).send('Error updating partner: ' + error.message);
    }
});

// ============================================
// DELETE PARTNER (Soft Delete)
// ============================================

router.post('/:id/delete', ensureAuthenticated, async (req, res) => {
    try {
        const partner = await SeedPartner.findById(req.params.id);
        
        if (!partner) {
            return res.status(404).json({ success: false, error: 'Partner not found' });
        }
        
        partner.isActive = false;
        partner.lastUpdatedBy = req.user ? req.user.email : 'system';
        await partner.save();
        
        console.log('✅ Deactivated seed partner:', partner.companyName);
        res.json({ success: true });
        
    } catch (error) {
        console.error('❌ Error deleting seed partner:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// ============================================
// COMMUNICATION LOG
// ============================================

// Add communication log entry
router.post('/:id/communication', ensureAuthenticated, async (req, res) => {
    try {
        const partner = await SeedPartner.findById(req.params.id);
        
        if (!partner) {
            return res.status(404).json({ success: false, error: 'Partner not found' });
        }
        
        partner.communicationLog.push({
            date: new Date(),
            contactPerson: req.body.contactPerson,
            method: req.body.method,
            subject: req.body.subject,
            summary: req.body.summary,
            followUpRequired: req.body.followUpRequired === 'true',
            followUpDate: req.body.followUpDate ? new Date(req.body.followUpDate) : null,
            loggedBy: req.user ? req.user.email : 'system'
        });
        
        await partner.save();
        
        console.log('✅ Added communication log to:', partner.companyName);
        res.json({ success: true });
        
    } catch (error) {
        console.error('❌ Error adding communication log:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// ============================================
// DOCUMENT UPLOADS
// ============================================

router.post('/:id/documents', ensureAuthenticated, upload.single('document'), async (req, res) => {
    try {
        const partner = await SeedPartner.findById(req.params.id);
        
        if (!partner) {
            return res.status(404).json({ success: false, error: 'Partner not found' });
        }
        
        if (!req.file) {
            return res.status(400).json({ success: false, error: 'No file uploaded' });
        }
        
        partner.documents.push({
            documentType: req.body.documentType,
            fileName: req.file.originalname,
            filePath: req.file.path,
            uploadDate: new Date(),
            expiryDate: req.body.expiryDate ? new Date(req.body.expiryDate) : null,
            notes: req.body.documentNotes || ''
        });
        
        await partner.save();
        
        console.log('✅ Uploaded document to:', partner.companyName);
        res.json({ success: true, document: partner.documents[partner.documents.length - 1] });
        
    } catch (error) {
        console.error('❌ Error uploading document:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// ============================================
// CERTIFICATIONS
// ============================================

// Add certification
router.post('/:id/certifications', ensureAuthenticated, async (req, res) => {
    try {
        const partner = await SeedPartner.findById(req.params.id);
        
        if (!partner) {
            return res.status(404).json({ success: false, error: 'Partner not found' });
        }
        
        partner.certifications.push({
            certificationType: req.body.certificationType,
            certificateNumber: req.body.certificateNumber,
            issuingAuthority: req.body.issuingAuthority,
            issueDate: req.body.issueDate ? new Date(req.body.issueDate) : null,
            expiryDate: req.body.expiryDate ? new Date(req.body.expiryDate) : null,
            documentUrl: req.body.documentUrl || '',
            verified: req.body.verified === 'true'
        });
        
        await partner.save();
        
        console.log('✅ Added certification to:', partner.companyName);
        res.json({ success: true });
        
    } catch (error) {
        console.error('❌ Error adding certification:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// ============================================
// QUICK ACTIONS
// ============================================

// Update status
router.post('/:id/update-status', ensureAuthenticated, async (req, res) => {
    try {
        const partner = await SeedPartner.findById(req.params.id);
        
        if (!partner) {
            return res.status(404).json({ success: false, error: 'Partner not found' });
        }
        
        partner.status = req.body.status;
        partner.lastUpdatedBy = req.user ? req.user.email : 'system';
        await partner.save();
        
        res.json({ success: true });
        
    } catch (error) {
        console.error('❌ Error updating status:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// Update priority
router.post('/:id/update-priority', ensureAuthenticated, async (req, res) => {
    try {
        const partner = await SeedPartner.findById(req.params.id);
        
        if (!partner) {
            return res.status(404).json({ success: false, error: 'Partner not found' });
        }
        
        partner.priority = req.body.priority;
        partner.lastUpdatedBy = req.user ? req.user.email : 'system';
        await partner.save();
        
        res.json({ success: true });
        
    } catch (error) {
        console.error('❌ Error updating priority:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

module.exports = router;
