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
            page = 1,
            limit = 50 // Default to 50 vendors per page for larger datasets
        } = req.query;

        let filter = {};
        if (status !== 'all') {
            filter.status = status;
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
            expiringSoon: vendors.filter(v => v.certificationStatus === 'Expiring Soon').length
        };

        // Get unique statuses for filter dropdown
        const uniqueStatuses = await OrganicVendor.distinct('status');

        console.log(`📊 Found ${totalVendors} organic vendors (page ${page}/${Math.ceil(totalVendors / limit)})`);

        res.render('organic-vendors-dashboard', {
            vendors,
            stats: {
                total: totalVendors,
                active: allVendorStats[0] ? allVendorStats[0].active : 0,
                expired: currentPageStats.expired,
                expiringSoon: currentPageStats.expiringSoon
            },
            uniqueStatuses,
            currentFilters: { sortBy, sortOrder, status, page, limit },
            pagination: {
                currentPage: parseInt(page),
                totalPages: Math.ceil(totalVendors / limit),
                totalVendors: totalVendors,
                hasNextPage: parseInt(page) < Math.ceil(totalVendors / limit),
                hasPrevPage: parseInt(page) > 1
            }
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

// Get organic seeds data for a specific vendor (on-demand loading)
router.get('/:id/seeds-data', async (req, res) => {
    try {
        const vendor = await OrganicVendor.findById(req.params.id, {
            organicSeedsRawData: 1,
            organicProducts: 1,
            organicSeeds: 1,
            vendorName: 1
        });

        if (!vendor) {
            return res.status(404).json({ error: 'Vendor not found' });
        }

        res.json({
            vendorName: vendor.vendorName,
            organicSeedsRawData: vendor.organicSeedsRawData,
            organicProducts: vendor.organicProducts,
            organicSeeds: vendor.organicSeeds
        });
    } catch (error) {
        console.error('Get seeds data error:', error);
        res.status(500).json({ error: error.message });
    }
});

// Create new organic vendor
router.post('/', upload.fields([
    { name: 'certificate', maxCount: 1 },
    { name: 'operationsProfile', maxCount: 1 }
]), async (req, res) => {
    try {
        console.log('🌱 Creating new organic vendor...');

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

        // Handle address
        if (req.body.street || req.body.city || req.body.state || req.body.zipCode || req.body.country) {
            vendorData.address = {
                street: req.body.street || '',
                city: req.body.city || '',
                state: req.body.state || '',
                zipCode: req.body.zipCode || '',
                country: req.body.country || ''
            };
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
        const vendor = await OrganicVendor.findById(req.params.id);
        if (!vendor) {
            return res.status(404).json({ error: 'Organic vendor not found' });
        }

        // Update basic fields
        const updateData = {
            vendorName: req.body.vendorName || vendor.vendorName,
            internalId: req.body.internalId || vendor.internalId,
            tscItem: req.body.tscItem || vendor.tscItem,
            tscDescription: req.body.tscDescription || vendor.tscDescription,
            organicDatabaseId: req.body.organicDatabaseId || vendor.organicDatabaseId,
            organicDatabaseUrl: req.body.organicDatabaseUrl || vendor.organicDatabaseUrl,
            manualUSDALink: req.body.manualUSDALink || vendor.manualUSDALink,
            organicSeedsRawData: req.body.organicSeedsRawData || vendor.organicSeedsRawData,
            contactPerson: req.body.contactPerson || vendor.contactPerson,
            email: req.body.email || vendor.email,
            phone: req.body.phone || vendor.phone,
            status: req.body.status || vendor.status,
            notes: req.body.notes || vendor.notes,
            updatedAt: new Date()
        };

        if (req.body.lastOrganicCertificationDate) {
            updateData.lastOrganicCertificationDate = new Date(req.body.lastOrganicCertificationDate);
        }

        // Handle address updates
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

// Delete organic vendor
router.delete('/:id', async (req, res) => {
    try {
        console.log(`🗑️ DELETE request received for vendor ID: ${req.params.id}`);

        const vendor = await OrganicVendor.findById(req.params.id);
        if (!vendor) {
            console.log(`❌ Vendor not found with ID: ${req.params.id}`);
            return res.status(404).json({ error: 'Organic vendor not found' });
        }

        console.log(`🗑️ Found vendor to delete: ${vendor.vendorName}`);
        await OrganicVendor.findByIdAndDelete(req.params.id);
        console.log(`✅ Successfully deleted organic vendor: ${vendor.vendorName}`);
        res.json({ success: true });
    } catch (error) {
        console.error('❌ Organic vendor deletion error:', error);
        res.status(500).json({ error: error.message });
    }
});

// Get single vendor details
router.get('/:id', async (req, res) => {
    try {
        const vendor = await OrganicVendor.findById(req.params.id);
        if (!vendor) {
            return res.status(404).json({ error: 'Organic vendor not found' });
        }

        res.json(vendor);
    } catch (error) {
        console.error('Get vendor error:', error);
        res.status(500).json({ error: error.message });
    }
});

// Download certificate
router.get('/:id/certificate', async (req, res) => {
    try {
        const vendor = await OrganicVendor.findById(req.params.id);
        if (!vendor || !vendor.certificate) {
            return res.status(404).json({ error: 'Certificate not found' });
        }

        const buffer = Buffer.from(vendor.certificate.data, 'base64');

        res.setHeader('Content-Type', vendor.certificate.mimeType);
        res.setHeader('Content-Disposition', `inline; filename="${vendor.certificate.filename}"`);
        res.send(buffer);
    } catch (error) {
        console.error('Certificate download error:', error);
        res.status(500).json({ error: error.message });
    }
});

// Download operations profile
router.get('/:id/operations-profile', async (req, res) => {
    try {
        const vendor = await OrganicVendor.findById(req.params.id);
        if (!vendor || !vendor.operationsProfile) {
            return res.status(404).json({ error: 'Operations profile not found' });
        }

        const buffer = Buffer.from(vendor.operationsProfile.data, 'base64');

        res.setHeader('Content-Type', vendor.operationsProfile.mimeType);
        res.setHeader('Content-Disposition', `inline; filename="${vendor.operationsProfile.filename}"`);
        res.send(buffer);
    } catch (error) {
        console.error('Operations profile download error:', error);
        res.status(500).json({ error: error.message });
    }
});

// API endpoint for AJAX requests
router.get('/api/vendors', async (req, res) => {
    try {
        const { search, status, sortBy = 'vendorName', sortOrder = 'asc' } = req.query;

        let filter = {};
        if (status && status !== 'all') {
            filter.status = status;
        }
        if (search) {
            filter.$or = [
                { vendorName: new RegExp(search, 'i') },
                { internalId: new RegExp(search, 'i') },
                { tscItem: new RegExp(search, 'i') },
                { tscDescription: new RegExp(search, 'i') }
            ];
        }

        const vendors = await OrganicVendor.find(filter)
            .sort({ [sortBy]: sortOrder === 'desc' ? -1 : 1 });

        res.json(vendors);
    } catch (error) {
        console.error('API vendors error:', error);
        res.status(500).json({ error: error.message });
    }
});

// USDA Integration Routes

// Fetch USDA documents for a vendor
router.post('/:id/fetch-usda-documents', async (req, res) => {
    try {
        const vendor = await OrganicVendor.findById(req.params.id);
        if (!vendor) {
            return res.status(404).json({ error: 'Vendor not found' });
        }

        if (!vendor.organicDatabaseId) {
            return res.status(400).json({ error: 'Vendor does not have an organic database ID' });
        }

        const axios = require('axios');
        const results = { success: false, message: '', documents: {} };

        try {
            // Generate USDA URLs
            const baseUrl = 'https://organic.ams.usda.gov/integrity/CP/OPP';
            const certificateUrl = `${baseUrl}/PrintCertificate?cid=45&nopid=${vendor.organicDatabaseId}`;
            const operationalProfileUrl = `${baseUrl}/ExportToPDF?cid=45&nopid=${vendor.organicDatabaseId}`;

            console.log(`📥 Fetching USDA documents for ${vendor.vendorName}...`);

            // Download certificate
            try {
                const certResponse = await axios.get(certificateUrl, {
                    responseType: 'arraybuffer',
                    timeout: 30000,
                    headers: {
                        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
                    }
                });

                if (certResponse.data && certResponse.data.length > 1000) { // Valid PDF should be larger than 1KB
                    const certificateBuffer = Buffer.from(certResponse.data);
                    vendor.certificate = {
                        filename: `${vendor.vendorName.replace(/[^a-zA-Z0-9]/g, '_')}_certificate_${Date.now()}.pdf`,
                        data: certificateBuffer.toString('base64'),
                        mimeType: 'application/pdf',
                        uploadDate: new Date(),
                        source: 'USDA Organic Database'
                    };
                    results.documents.certificate = true;
                    console.log(`✅ Certificate downloaded for ${vendor.vendorName}`);
                }
            } catch (certError) {
                console.log(`⚠️ Could not download certificate: ${certError.message}`);
            }

            // Download operational profile
            try {
                const profileResponse = await axios.get(operationalProfileUrl, {
                    responseType: 'arraybuffer',
                    timeout: 30000,
                    headers: {
                        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
                    }
                });

                if (profileResponse.data && profileResponse.data.length > 1000) { // Valid PDF should be larger than 1KB
                    const profileBuffer = Buffer.from(profileResponse.data);
                    vendor.operationsProfile = {
                        filename: `${vendor.vendorName.replace(/[^a-zA-Z0-9]/g, '_')}_profile_${Date.now()}.pdf`,
                        data: profileBuffer.toString('base64'),
                        mimeType: 'application/pdf',
                        uploadDate: new Date(),
                        source: 'USDA Organic Database'
                    };
                    results.documents.operationalProfile = true;
                    console.log(`✅ Operational profile downloaded for ${vendor.vendorName}`);
                }
            } catch (profileError) {
                console.log(`⚠️ Could not download operational profile: ${profileError.message}`);
            }

            // Update vendor record
            vendor.lastUSDASync = new Date();
            vendor.organicDatabaseUrl = `https://organic.ams.usda.gov/integrity/CP/OPP?cid=45&nopid=${vendor.organicDatabaseId}&ret=Home&retName=Home`;

            await vendor.save();

            const documentsCount = Object.keys(results.documents).length;
            if (documentsCount > 0) {
                results.success = true;
                results.message = `Successfully downloaded ${documentsCount} document(s) from USDA database`;
            } else {
                results.message = 'Could not download documents from USDA database. The documents may not be available or there may be network issues.';
            }

        } catch (fetchError) {
            results.message = `Error fetching from USDA: ${fetchError.message}`;
        }

        res.json(results);

    } catch (error) {
        console.error('USDA fetch error:', error);
        res.status(500).json({ error: error.message });
    }
});

// Get USDA search URL for a vendor
router.get('/:id/usda-url', async (req, res) => {
    try {
        const vendor = await OrganicVendor.findById(req.params.id);
        if (!vendor) {
            return res.status(404).json({ error: 'Vendor not found' });
        }

        let searchUrl = 'https://organic.ams.usda.gov/integrity/Home';

        if (vendor.organicDatabaseId) {
            searchUrl = `https://organic.ams.usda.gov/integrity/CP/OPP?cid=45&nopid=${vendor.organicDatabaseId}&ret=Home&retName=Home`;
        }

        res.json({
            searchUrl,
            hasOrganicId: !!vendor.organicDatabaseId,
            organicDatabaseId: vendor.organicDatabaseId
        });

    } catch (error) {
        console.error('USDA URL error:', error);
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;
