const express = require('express');
const multer = require('multer');
const OrganicVendor = require('../models/OrganicVendor');

const router = express.Router();

// Configure multer for file uploads (in memory storage for certificates and profiles)
const upload = multer({
    storage: multer.memoryStorage(),
    limits: {
        fileSize: 10 * 1024 * 1024 // 10MB limit
    },
    fileFilter: (req, file, cb) => {
        // Allow PDF, DOC, DOCX, JPG, PNG files
        const allowedTypes = ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'image/jpeg', 'image/png', 'image/jpg'];
        if (allowedTypes.includes(file.mimetype)) {
            cb(null, true);
        } else {
            cb(new Error('Invalid file type. Only PDF, DOC, DOCX, JPG, and PNG files are allowed.'));
        }
    }
});

// Organic Vendors Dashboard - Main page
router.get('/', async (req, res) => {
    try {
        console.log('🌱 Loading Organic Vendors Dashboard...');

        // Get organic vendors with sorting and optional pagination
        const {
            sortBy = 'vendorName',
            sortOrder = 'asc',
            status = 'all',
            certificationStatus = 'all',
            country = 'all',
            page = 1,
            limit = 50, // Default to 50 vendors per page for larger datasets
            defaultExpiringSoonThreshold = 35 // Global default setting
        } = req.query;

        let filter = {};
        if (status !== 'all') {
            filter.status = status;
        }
        
        if (country !== 'all') {
            filter['address.country'] = country;
        }

        const skip = (parseInt(page) - 1) * parseInt(limit);

        // Performance optimization: Exclude heavy data fields from initial load
        const vendors = await OrganicVendor.find(filter, {
            // Exclude large base64 certificate and profile data from initial load
            'certificate.data': 0,
            'operationsProfile.data': 0,
            // Also exclude large raw text data that can be fetched on-demand
            'organicSeedsRawData': 0
        })
            .sort({ [sortBy]: sortOrder === 'desc' ? -1 : 1 })
            .skip(skip)
            .limit(parseInt(limit));

        // Filter by certification status (done in memory since it's a virtual field)
        let filteredVendors = vendors;
        if (certificationStatus !== 'all') {
            filteredVendors = vendors.filter(vendor => vendor.certificationStatus === certificationStatus);
        }

        // Calculate summary statistics (for all vendors, not just current page)
        const totalVendors = await OrganicVendor.countDocuments(filter);
        const allVendorStats = await OrganicVendor.aggregate([
            { $match: filter },
            {
                $group: {
                    _id: null,
                    total: { $sum: 1 },
                    active: { $sum: { $cond: [{ $eq: ['$status', 'Active'] }, 1, 0] } }
                }
            }
        ]);

        // Calculate certification status stats using virtual fields
        const currentPageStats = {
            expired: vendors.filter(v => v.certificationStatus === 'Expired').length,
            expiringSoon: vendors.filter(v => v.certificationStatus === 'Expiring Soon').length,
            current: vendors.filter(v => v.certificationStatus === 'Current').length
        };

        // Get unique statuses and countries for filter dropdowns
        const uniqueStatuses = await OrganicVendor.distinct('status');
        const uniqueCountries = await OrganicVendor.distinct('address.country');

        console.log(`📊 Found ${totalVendors} organic vendors (page ${page}/${Math.ceil(totalVendors / limit)})`);

        res.render('organic-vendors-dashboard', {
            vendors: filteredVendors,
            stats: {
                total: totalVendors,
                active: allVendorStats[0] ? allVendorStats[0].active : 0,
                expired: currentPageStats.expired,
                expiringSoon: currentPageStats.expiringSoon,
                current: currentPageStats.current
            },
            uniqueStatuses,
            uniqueCountries: uniqueCountries.filter(country => country), // Remove null/empty values
            currentFilters: { sortBy, sortOrder, status, certificationStatus, country, page, limit, defaultExpiringSoonThreshold },
            pagination: {
                currentPage: parseInt(page),
                totalPages: Math.ceil(totalVendors / limit),
                totalVendors: totalVendors,
                hasNextPage: parseInt(page) < Math.ceil(totalVendors / limit),
                hasPrevPage: parseInt(page) > 1
            },
            defaultExpiringSoonThreshold: parseInt(defaultExpiringSoonThreshold)
        });

    } catch (error) {
        console.error('Organic vendors dashboard error:', error);
        res.status(500).json({ error: error.message });
    }
});

// Get individual vendor data for editing
router.get('/:id/edit', async (req, res) => {
    try {
        const vendor = await OrganicVendor.findById(req.params.id);
        if (!vendor) {
            return res.status(404).json({ error: 'Vendor not found' });
        }
        res.json(vendor);
    } catch (error) {
        console.error('Get vendor error:', error);
        res.status(500).json({ error: error.message });
    }
});

// Serve certificate file for viewing in iframe
router.get('/:id/certificate', async (req, res) => {
    try {
        console.log(`📄 Certificate request for vendor ID: ${req.params.id}`);
        
        const vendor = await OrganicVendor.findById(req.params.id);
        if (!vendor) {
            console.log(`❌ Vendor not found: ${req.params.id}`);
            return res.status(404).send('Vendor not found');
        }
        
        console.log(`📋 Vendor found: ${vendor.vendorName}`);
        console.log(`📄 Certificate data check:`, {
            hasCertificate: !!vendor.certificate,
            hasData: !!(vendor.certificate && vendor.certificate.data),
            filename: vendor.certificate?.filename,
            mimeType: vendor.certificate?.mimeType,
            dataLength: vendor.certificate?.data?.length
        });
        
        if (!vendor.certificate || !vendor.certificate.data) {
            console.log(`❌ Certificate not found for ${vendor.vendorName}`);
            return res.status(404).send('Certificate not found');
        }
        
        // Convert base64 to buffer
        const buffer = Buffer.from(vendor.certificate.data, 'base64');
        console.log(`📤 Serving certificate: ${vendor.certificate.filename} (${buffer.length} bytes)`);
        
        // Set headers for PDF viewing in iframe
        res.setHeader('Content-Type', vendor.certificate.mimeType || 'application/pdf');
        res.setHeader('Content-Length', buffer.length);
        res.setHeader('Content-Disposition', `inline; filename="${vendor.certificate.filename}"`);
        
        res.end(buffer);
    } catch (error) {
        console.error('Certificate viewing error:', error);
        res.status(500).send('Error loading certificate');
    }
});

// Serve operations profile file for viewing in iframe
router.get('/:id/operations-profile', async (req, res) => {
    try {
        console.log(`📋 Operations profile request for vendor ID: ${req.params.id}`);
        
        const vendor = await OrganicVendor.findById(req.params.id);
        if (!vendor) {
            console.log(`❌ Vendor not found: ${req.params.id}`);
            return res.status(404).send('Vendor not found');
        }
        
        console.log(`📋 Vendor found: ${vendor.vendorName}`);
        console.log(`📄 Operations profile data check:`, {
            hasOperationsProfile: !!vendor.operationsProfile,
            hasData: !!(vendor.operationsProfile && vendor.operationsProfile.data),
            filename: vendor.operationsProfile?.filename,
            mimeType: vendor.operationsProfile?.mimeType,
            dataLength: vendor.operationsProfile?.data?.length
        });
        
        if (!vendor.operationsProfile || !vendor.operationsProfile.data) {
            console.log(`❌ Operations profile not found for ${vendor.vendorName}`);
            return res.status(404).send('Operations profile not found');
        }
        
        // Convert base64 to buffer
        const buffer = Buffer.from(vendor.operationsProfile.data, 'base64');
        console.log(`📤 Serving operations profile: ${vendor.operationsProfile.filename} (${buffer.length} bytes)`);
        
        // Set headers for PDF viewing in iframe
        res.setHeader('Content-Type', vendor.operationsProfile.mimeType || 'application/pdf');
        res.setHeader('Content-Length', buffer.length);
        res.setHeader('Content-Disposition', `inline; filename="${vendor.operationsProfile.filename}"`);
        
        res.end(buffer);
    } catch (error) {
        console.error('Operations profile viewing error:', error);
        res.status(500).send('Error loading operations profile');
    }
});

// Create new organic vendor
router.post('/', upload.fields([
    { name: 'certificate', maxCount: 1 },
    { name: 'operationsProfile', maxCount: 1 }
]), async (req, res) => {
    try {
        console.log('🌱 Creating new organic vendor...');
        console.log('📋 Request body keys:', Object.keys(req.body));

        const vendorData = {
            vendorName: req.body.vendorName,
            internalId: req.body.internalId,
            lastOrganicCertificationDate: new Date(req.body.lastOrganicCertificationDate),
            tscItem: req.body.tscItem || '',
            tscDescription: req.body.tscDescription || '',
            organicDatabaseId: req.body.organicDatabaseId || '',
            organicDatabaseUrl: req.body.organicDatabaseUrl || '',
            manualUSDALink: req.body.manualUSDALink || '',
            organicSeedsRawData: req.body.organicSeedsRawData || '',
            contactPerson: req.body.contactPerson || '',
            email: req.body.email || '',
            phone: req.body.phone || '',
            status: req.body.status || 'Active',
            notes: req.body.notes || ''
        };

        // Handle address using flat field names
        if (req.body.street || req.body.city || req.body.state || req.body.zipCode || req.body.country) {
            vendorData.address = {
                street: req.body.street || '',
                city: req.body.city || '',
                state: req.body.state || '',
                zipCode: req.body.zipCode || '',
                country: req.body.country || ''
            };
        }
        
        // Handle custom expiring soon threshold
        if (req.body.expiringSoonThreshold) {
            vendorData.expiringSoonThreshold = parseInt(req.body.expiringSoonThreshold);
        }

        // Handle organic seeds (JSON array)
        if (req.body.organicSeeds) {
            try {
                vendorData.organicSeeds = JSON.parse(req.body.organicSeeds);
            } catch (e) {
                console.log('Could not parse organic seeds JSON, skipping...');
            }
        }

        // Handle file uploads
        if (req.files) {
            if (req.files.certificate && req.files.certificate[0]) {
                const cert = req.files.certificate[0];
                vendorData.certificate = {
                    filename: cert.originalname,
                    data: cert.buffer.toString('base64'),
                    mimeType: cert.mimetype,
                    uploadDate: new Date()
                };
            }

            if (req.files.operationsProfile && req.files.operationsProfile[0]) {
                const profile = req.files.operationsProfile[0];
                vendorData.operationsProfile = {
                    filename: profile.originalname,
                    data: profile.buffer.toString('base64'),
                    mimeType: profile.mimetype,
                    uploadDate: new Date()
                };
            }
        }

        const vendor = await OrganicVendor.create(vendorData);
        console.log(`✅ Created organic vendor: ${vendor.vendorName} (${vendor.internalId})`);

        res.json({ success: true, vendor });
    } catch (error) {
        console.error('Organic vendor creation error:', error);
        if (error.code === 11000) {
            res.status(400).json({ error: 'Internal ID already exists' });
        } else {
            res.status(500).json({ error: error.message });
        }
    }
});

// Update organic vendor
router.put('/:id', upload.fields([
    { name: 'certificate', maxCount: 1 },
    { name: 'operationsProfile', maxCount: 1 }
]), async (req, res) => {
    try {
        console.log(`🔄 Updating organic vendor: ${req.params.id}`);
        console.log('📋 Request body keys:', Object.keys(req.body));
        console.log('🏠 Address data received:', {
            street: req.body.street,
            city: req.body.city, 
            state: req.body.state,
            zipCode: req.body.zipCode,
            country: req.body.country
        });

        const vendor = await OrganicVendor.findById(req.params.id);
        if (!vendor) {
            return res.status(404).json({ error: 'Vendor not found' });
        }

        const updateData = { ...req.body };

        // Handle address fields using flat field names
        if (req.body.street !== undefined || req.body.city !== undefined ||
            req.body.state !== undefined || req.body.zipCode !== undefined ||
            req.body.country !== undefined) {
            updateData.address = {
                street: req.body.street || (vendor.address?.street || ''),
                city: req.body.city || (vendor.address?.city || ''),
                state: req.body.state || (vendor.address?.state || ''),
                zipCode: req.body.zipCode || (vendor.address?.zipCode || ''),
                country: req.body.country || (vendor.address?.country || '')
            };
        }
        
        // Handle contact fields
        if (req.body.contactPerson !== undefined) updateData.contactPerson = req.body.contactPerson;
        if (req.body.email !== undefined) updateData.email = req.body.email;
        if (req.body.phone !== undefined) updateData.phone = req.body.phone;
        
        // Handle custom expiring soon threshold
        if (req.body.expiringSoonThreshold !== undefined) {
            updateData.expiringSoonThreshold = req.body.expiringSoonThreshold ? parseInt(req.body.expiringSoonThreshold) : null;
        }

        // Handle organic seeds updates
        if (req.body.organicSeeds) {
            try {
                updateData.organicSeeds = JSON.parse(req.body.organicSeeds);
            } catch (e) {
                console.log('Could not parse organic seeds JSON for update');
            }
        }

        // Handle file uploads
        if (req.files) {
            if (req.files.certificate && req.files.certificate[0]) {
                const cert = req.files.certificate[0];
                updateData.certificate = {
                    filename: cert.originalname,
                    data: cert.buffer.toString('base64'),
                    mimeType: cert.mimetype,
                    uploadDate: new Date()
                };
            }

            if (req.files.operationsProfile && req.files.operationsProfile[0]) {
                const profile = req.files.operationsProfile[0];
                updateData.operationsProfile = {
                    filename: profile.originalname,
                    data: profile.buffer.toString('base64'),
                    mimeType: profile.mimetype,
                    uploadDate: new Date()
                };
            }
        }

        const updatedVendor = await OrganicVendor.findByIdAndUpdate(
            req.params.id,
            updateData,
            { new: true }
        );

        console.log(`✅ Updated organic vendor: ${updatedVendor.vendorName}`);
        res.json({ success: true, vendor: updatedVendor });

    } catch (error) {
        console.error('Organic vendor update error:', error);
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;
