const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const Vendor = require('../models/Vendor');
const PurchaseOrder = require('../models/PurchaseOrder');
const LineItem = require('../models/LineItem');

const router = express.Router();

// Configure multer for file uploads
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const uploadDir = path.join(__dirname, '../uploads/vendors');
        // Create directory if it doesn't exist
        if (!fs.existsSync(uploadDir)) {
            fs.mkdirSync(uploadDir, { recursive: true });
        }
        cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
        // Generate unique filename with timestamp
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
    }
});

const upload = multer({
    storage: storage,
    limits: {
        fileSize: 10 * 1024 * 1024 // 10MB limit
    },
    fileFilter: (req, file, cb) => {
        // Allow common document types
        const allowedTypes = [
            'application/pdf',
            'application/msword',
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            'application/vnd.ms-excel',
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            'image/jpeg',
            'image/png',
            'image/jpg',
            'text/plain',
            'text/csv'
        ];
        if (allowedTypes.includes(file.mimetype)) {
            cb(null, true);
        } else {
            cb(new Error('Invalid file type. Only PDF, DOC, DOCX, XLS, XLSX, JPG, PNG, TXT, and CSV files are allowed.'));
        }
    }
});

// ======================================
// VENDORS DASHBOARD - Main Page
// ======================================
router.get('/', async (req, res) => {
    try {
        console.log('🏢 Loading Vendors Dashboard...');

        const {
            sortBy = 'vendorName',
            sortOrder = 'asc',
            status = 'all',
            vendorType = 'all',
            search = '',
            page = 1,
            limit = 20
        } = req.query;

        // Build filter object
        let filter = {};
        if (status !== 'all') {
            filter.status = status;
        }
        if (vendorType !== 'all') {
            filter.vendorType = vendorType;
        }
        if (search) {
            filter.$or = [
                { vendorName: { $regex: search, $options: 'i' } },
                { vendorCode: { $regex: search, $options: 'i' } },
                { 'contactInfo.primaryContact.name': { $regex: search, $options: 'i' } },
                { 'contactInfo.primaryContact.email': { $regex: search, $options: 'i' } }
            ];
        }

        // Calculate pagination
        const skip = (parseInt(page) - 1) * parseInt(limit);
        const sortObj = {};
        sortObj[sortBy] = sortOrder === 'asc' ? 1 : -1;

        // Get vendors with pagination
        const vendors = await Vendor.find(filter)
            .sort(sortObj)
            .skip(skip)
            .limit(parseInt(limit));

        const totalVendors = await Vendor.countDocuments(filter);
        const totalPages = Math.ceil(totalVendors / limit);

        // Get summary statistics
        const stats = await Vendor.aggregate([
            {
                $group: {
                    _id: null,
                    totalVendors: { $sum: 1 },
                    activeVendors: {
                        $sum: { $cond: [{ $eq: ['$status', 'Active'] }, 1, 0] }
                    },
                    totalSpent: { $sum: '$performance.totalSpent' },
                    avgOrderValue: { $avg: '$performance.averageOrderValue' }
                }
            }
        ]);

        // Get vendor type breakdown
        const vendorTypeStats = await Vendor.aggregate([
            {
                $group: {
                    _id: '$vendorType',
                    count: { $sum: 1 },
                    totalSpent: { $sum: '$performance.totalSpent' }
                }
            },
            { $sort: { count: -1 } }
        ]);

        // Get vendors with expiring certifications
        const expiringCerts = await Vendor.aggregate([
            { $unwind: '$certifications' },
            {
                $match: {
                    'certifications.expirationDate': {
                        $lte: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 days from now
                    },
                    'certifications.status': 'Active'
                }
            },
            {
                $project: {
                    vendorName: 1,
                    vendorCode: 1,
                    certification: '$certifications'
                }
            }
        ]);

        // Get recent activity (vendors updated in last 30 days)
        const recentActivity = await Vendor.find({
            updatedAt: { $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) }
        })
            .sort({ updatedAt: -1 })
            .limit(10)
            .select('vendorName vendorCode status updatedAt lastUpdatedBy')
            .lean();

        res.render('vendors-dashboard', {
            vendors,
            pagination: {
                currentPage: parseInt(page),
                totalPages,
                totalVendors,
                hasNext: page < totalPages,
                hasPrev: page > 1,
                limit: parseInt(limit)
            },
            filters: { sortBy, sortOrder, status, vendorType, search },
            currentPage: 'vendors',
            stats: stats[0] || {
                totalVendors: 0,
                activeVendors: 0,
                totalSpent: 0,
                avgOrderValue: 0
            },
            vendorTypeStats,
            expiringCerts,
            recentActivity,
            title: 'Vendors Dashboard'
        });

    } catch (error) {
        console.error('❌ Error loading vendors dashboard:', error);
        res.status(500).render('error', {
            message: 'Error loading vendors dashboard',
            error: error
        });
    }
});

// ======================================
// VENDOR DEFAULT PO TYPES PAGE
// ======================================
router.get('/manage-po-types', async (req, res) => {
    try {
        console.log('🏷️🏷️🏷️ MANAGE-PO-TYPES ROUTE HIT! This is the correct route!');
        res.render('vendor-po-types', {
            user: req.user,
            title: 'Manage Vendor Default PO Types'
        });
    } catch (error) {
        console.error('❌ Error loading vendor PO types page:', error);
        res.status(500).send('Error loading page');
    }
});

// API: Get all vendors with their default PO types
router.get('/api/po-types', async (req, res) => {
    try {
        const vendors = await Vendor.find({})
            .select('vendorName vendorCode internalId defaultPoType status')
            .sort({ vendorName: 1 });
        
        res.json({ success: true, vendors });
    } catch (error) {
        console.error('❌ Error fetching vendors:', error);
        res.status(500).json({ success: false, error: 'Failed to fetch vendors' });
    }
});

// API: Update vendor default PO type
router.post('/api/po-types/:vendorId', async (req, res) => {
    try {
        const { vendorId } = req.params;
        const { defaultPoType } = req.body;

        const vendor = await Vendor.findByIdAndUpdate(
            vendorId,
            { defaultPoType },
            { new: true }
        );

        if (!vendor) {
            return res.status(404).json({ success: false, error: 'Vendor not found' });
        }

        res.json({ success: true, vendor });
    } catch (error) {
        console.error('❌ Error updating vendor PO type:', error);
        res.status(500).json({ success: false, error: 'Failed to update vendor' });
    }
});

// ======================================
// CREATE NEW VENDOR
// ======================================
router.get('/new', (req, res) => {
    res.render('vendor-form', {
        vendor: null,
        isEdit: false,
        title: 'Add New Vendor'
    });
});

router.post('/new', async (req, res) => {
    try {
        console.log('🆕 Creating new vendor:', req.body.vendorName);

        // Process contacts array
        const contacts = [];
        if (req.body.contacts) {
            for (let i = 0; req.body.contacts[i]; i++) {
                const contact = req.body.contacts[i];
                if (contact.name || contact.email || contact.phone) { // Only add if has some data
                    contacts.push({
                        name: contact.name,
                        title: contact.title,
                        email: contact.email,
                        phone: contact.phone,
                        mobile: contact.mobile,
                        department: contact.department,
                        isPrimary: contact.isPrimary === 'on' || contact.isPrimary === true,
                        notes: contact.notes
                    });
                }
            }
        }

        const vendorData = {
            vendorName: req.body.vendorName,
            vendorCode: req.body.vendorCode,
            vendorType: req.body.vendorType,
            mainPhone: req.body.mainPhone,
            mainEmail: req.body.mainEmail,
            contacts: contacts,
            // Keep legacy contactInfo for backward compatibility
            contactInfo: {
                primaryContact: {
                    name: req.body.primaryContactName,
                    title: req.body.primaryContactTitle,
                    email: req.body.primaryContactEmail,
                    phone: req.body.primaryContactPhone,
                    mobile: req.body.primaryContactMobile
                }
            },
            address: {
                street: req.body.street,
                city: req.body.city,
                state: req.body.state,
                zipCode: req.body.zipCode,
                country: req.body.country || 'United States'
            },
            businessInfo: {
                website: req.body.website,
                taxId: req.body.taxId,
                businessType: req.body.businessType
            },
            paymentTerms: {
                terms: req.body.paymentTerms,
                customTerms: req.body.customTerms
            },
            status: req.body.status || 'Active',
            notes: req.body.notes,
            createdBy: req.user ? req.user.username : 'System'
        };

        const vendor = new Vendor(vendorData);
        await vendor.save();

        console.log(`✅ Created vendor: ${vendor.vendorName} (${vendor.vendorCode})`);
        res.redirect(`/vendors/${vendor._id}?success=created`);

    } catch (error) {
        console.error('❌ Error creating vendor:', error);
        if (error.code === 11000) {
            // Duplicate key error
            const field = Object.keys(error.keyPattern)[0];
            const message = `A vendor with this ${field} already exists.`;
            res.render('vendor-form', {
                vendor: req.body,
                isEdit: false,
                error: message,
                title: 'Add New Vendor'
            });
        } else {
            res.status(500).render('error', {
                message: 'Error creating vendor',
                error: error
            });
        }
    }
});

// ======================================
// VENDOR DETAIL PAGE
// ======================================
router.get('/:vendorId', async (req, res) => {
    try {
        const { vendorId } = req.params;
        console.log(`🔍🔍🔍 VENDOR DETAIL ROUTE HIT with ID: ${vendorId}`);

        // Get vendor details
        const vendor = await Vendor.findById(vendorId);
        if (!vendor) {
            return res.status(404).render('error', {
                message: 'Vendor not found'
            });
        }

        // Get Purchase Orders for this vendor
        const purchaseOrders = await PurchaseOrder.find({
            $or: [
                { vendor: vendor.vendorName },
                { vendor: vendor.vendorCode },
                { vendor: { $regex: vendor.vendorName, $options: 'i' } }
            ],
            isHidden: { $ne: true } // Don't show hidden POs
        })
            .sort({ poDate: -1 })
            .limit(50)
            .lean();

        // Get Line Items for this vendor
        const lineItems = await LineItem.find({
            $or: [
                { vendor: vendor.vendorName },
                { vendor: vendor.vendorCode },
                { vendor: { $regex: vendor.vendorName, $options: 'i' } }
            ],
            isHidden: { $ne: true } // Don't show hidden line items
        })
            .sort({ createdAt: -1 })
            .limit(100)
            .lean();

        // Calculate PO statistics
        const poStats = {
            totalPOs: purchaseOrders.length,
            totalValue: purchaseOrders.reduce((sum, po) => sum + (po.totalAmount || 0), 0),
            avgValue: 0,
            completedPOs: purchaseOrders.filter(po => po.status === 'Completed').length,
            pendingPOs: purchaseOrders.filter(po => po.status === 'Pending').length,
            latestPO: purchaseOrders[0] || null
        };
        poStats.avgValue = poStats.totalPOs > 0 ? poStats.totalValue / poStats.totalPOs : 0;

        // Get tracking information
        let trackingData = [];
        try {
            // Get tracking numbers from purchase orders
            const trackingNumbers = purchaseOrders
                .filter(po => po.trackingNumber)
                .map(po => ({
                    poNumber: po.poNumber,
                    trackingNumber: po.trackingNumber,
                    carrier: po.carrier || 'Unknown',
                    shipDate: po.shipDate,
                    status: po.trackingStatus || 'Unknown'
                }));
            trackingData = trackingNumbers;
        } catch (trackingError) {
            console.log('⚠️ Could not fetch tracking data:', trackingError.message);
        }

        // Group line items by category/type
        const itemCategories = {};
        lineItems.forEach(item => {
            const category = item.category || 'Uncategorized';
            if (!itemCategories[category]) {
                itemCategories[category] = [];
            }
            itemCategories[category].push(item);
        });

        res.render('vendor-detail', {
            vendor,
            purchaseOrders,
            lineItems,
            poStats,
            trackingData,
            itemCategories,
            title: `${vendor.vendorName} - Vendor Details`
        });

    } catch (error) {
        console.error('❌ Error loading vendor details:', error);
        res.status(500).render('error', {
            message: 'Error loading vendor details',
            error: error
        });
    }
});

// ======================================
// EDIT VENDOR
// ======================================
router.get('/:vendorId/edit', async (req, res) => {
    try {
        const vendor = await Vendor.findById(req.params.vendorId);
        if (!vendor) {
            return res.status(404).render('error', {
                message: 'Vendor not found'
            });
        }

        res.render('vendor-form', {
            vendor: vendor.toObject(),
            isEdit: true,
            title: `Edit ${vendor.vendorName}`
        });

    } catch (error) {
        console.error('❌ Error loading vendor for edit:', error);
        res.status(500).render('error', {
            message: 'Error loading vendor',
            error: error
        });
    }
});

router.post('/:vendorId/edit', async (req, res) => {
    try {
        const { vendorId } = req.params;
        console.log(`✏️ Updating vendor: ${vendorId}`);

        // Process contacts array
        const contacts = [];
        if (req.body.contacts) {
            for (let i = 0; req.body.contacts[i]; i++) {
                const contact = req.body.contacts[i];
                if (contact.name || contact.email || contact.phone) { // Only add if has some data
                    contacts.push({
                        name: contact.name,
                        title: contact.title,
                        email: contact.email,
                        phone: contact.phone,
                        mobile: contact.mobile,
                        department: contact.department,
                        isPrimary: contact.isPrimary === 'on' || contact.isPrimary === true,
                        notes: contact.notes
                    });
                }
            }
        }

        const updateData = {
            vendorName: req.body.vendorName,
            vendorCode: req.body.vendorCode,
            vendorType: req.body.vendorType,
            mainPhone: req.body.mainPhone,
            mainEmail: req.body.mainEmail,
            contacts: contacts,
            // Update legacy contactInfo as well for backward compatibility
            'contactInfo.primaryContact.name': req.body.primaryContactName,
            'contactInfo.primaryContact.title': req.body.primaryContactTitle,
            'contactInfo.primaryContact.email': req.body.primaryContactEmail,
            'contactInfo.primaryContact.phone': req.body.primaryContactPhone,
            'contactInfo.primaryContact.mobile': req.body.primaryContactMobile,
            'address.street': req.body.street,
            'address.city': req.body.city,
            'address.state': req.body.state,
            'address.zipCode': req.body.zipCode,
            'address.country': req.body.country,
            'businessInfo.website': req.body.website,
            'businessInfo.taxId': req.body.taxId,
            'businessInfo.businessType': req.body.businessType,
            'paymentTerms.terms': req.body.paymentTerms,
            'paymentTerms.customTerms': req.body.customTerms,
            status: req.body.status,
            notes: req.body.notes,
            lastUpdatedBy: req.user ? req.user.username : 'System'
        };

        const vendor = await Vendor.findByIdAndUpdate(vendorId, updateData, { new: true });
        if (!vendor) {
            return res.status(404).render('error', {
                message: 'Vendor not found'
            });
        }

        console.log(`✅ Updated vendor: ${vendor.vendorName}`);
        res.redirect(`/vendors/${vendor._id}?success=updated`);

    } catch (error) {
        console.error('❌ Error updating vendor:', error);
        res.status(500).render('error', {
            message: 'Error updating vendor',
            error: error
        });
    }
});

// ======================================
// UPLOAD DOCUMENTS
// ======================================
router.post('/:vendorId/upload', upload.single('document'), async (req, res) => {
    try {
        const { vendorId } = req.params;
        const { category, description, expirationDate } = req.body;

        if (!req.file) {
            return res.status(400).json({ error: 'No file uploaded' });
        }

        const vendor = await Vendor.findById(vendorId);
        if (!vendor) {
            return res.status(404).json({ error: 'Vendor not found' });
        }

        // Create document object
        const document = {
            filename: req.file.filename,
            originalName: req.file.originalname,
            mimeType: req.file.mimetype,
            size: req.file.size,
            category: category || 'Other',
            description: description || '',
            uploadedBy: req.user ? req.user.username : 'System',
            expirationDate: expirationDate ? new Date(expirationDate) : null
        };

        vendor.documents.push(document);
        await vendor.save();

        console.log(`📄 Uploaded document for vendor ${vendor.vendorName}: ${req.file.originalname}`);
        
        // Always return JSON for AJAX upload requests
        res.json({ success: true, document: document });

    } catch (error) {
        console.error('❌ Error uploading document:', error);
        res.status(500).json({ success: false, error: error.message || 'Error uploading document' });
    }
});

// ======================================
// DOWNLOAD DOCUMENT
// ======================================
router.get('/:vendorId/documents/:documentId/download', async (req, res) => {
    try {
        const { vendorId, documentId } = req.params;
        
        console.log(`📥 Download request - Vendor: ${vendorId}, Document: ${documentId}`);

        const vendor = await Vendor.findById(vendorId);
        if (!vendor) {
            console.error(`❌ Vendor not found: ${vendorId}`);
            return res.status(404).send('Vendor not found');
        }

        console.log(`✅ Vendor found: ${vendor.vendorName}`);
        console.log(`📄 Documents count: ${vendor.documents ? vendor.documents.length : 0}`);

        const document = vendor.documents.id(documentId);
        if (!document) {
            console.error(`❌ Document not found in vendor: ${documentId}`);
            console.log(`📋 Available document IDs: ${vendor.documents.map(d => d._id).join(', ')}`);
            return res.status(404).send('Document not found');
        }

        console.log(`✅ Document found: ${document.originalName} (filename: ${document.filename})`);

        const filePath = path.join(__dirname, '../uploads/vendors', document.filename);
        console.log(`📂 File path: ${filePath}`);
        
        // Check if file exists
        if (!fs.existsSync(filePath)) {
            console.error(`❌ File not found on disk: ${filePath}`);
            return res.status(404).send('File not found on server');
        }

        console.log(`✅ File exists, sending download...`);

        // Set headers for download
        res.setHeader('Content-Disposition', `attachment; filename="${document.originalName}"`);
        res.setHeader('Content-Type', document.mimeType || 'application/octet-stream');

        // Send the file
        res.sendFile(filePath, (err) => {
            if (err) {
                console.error('❌ Error sending file:', err);
                if (!res.headersSent) {
                    res.status(500).send('Error downloading file');
                }
            } else {
                console.log(`✅ File sent successfully: ${document.originalName}`);
            }
        });

    } catch (error) {
        console.error('❌ Error downloading document:', error);
        if (!res.headersSent) {
            res.status(500).send('Error downloading document');
        }
    }
});

// ======================================
// DELETE DOCUMENT
// ======================================
router.delete('/:vendorId/documents/:documentId', async (req, res) => {
    try {
        const { vendorId, documentId } = req.params;

        const vendor = await Vendor.findById(vendorId);
        if (!vendor) {
            return res.status(404).json({ error: 'Vendor not found' });
        }

        const document = vendor.documents.id(documentId);
        if (!document) {
            return res.status(404).json({ error: 'Document not found' });
        }

        // Delete physical file
        const filePath = path.join(__dirname, '../uploads/vendors', document.filename);
        if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
        }

        // Remove from database
        document.deleteOne();
        await vendor.save();

        console.log(`🗑️ Deleted document for vendor ${vendor.vendorName}: ${document.originalName}`);
        res.json({ success: true });

    } catch (error) {
        console.error('❌ Error deleting document:', error);
        res.status(500).json({ error: 'Error deleting document' });
    }
});

// ======================================
// ADD ITEM/PRODUCT
// ======================================
router.post('/:vendorId/items', async (req, res) => {
    try {
        const { vendorId } = req.params;
        const {
            itemCode,
            itemName,
            description,
            category,
            variety,
            unitOfMeasure,
            currentPrice,
            minimumOrder,
            leadTime,
            availability,
            notes
        } = req.body;

        const vendor = await Vendor.findById(vendorId);
        if (!vendor) {
            return res.status(404).json({ error: 'Vendor not found' });
        }

        const item = {
            itemCode,
            itemName,
            description,
            category,
            variety,
            unitOfMeasure,
            currentPrice: parseFloat(currentPrice) || 0,
            priceEffectiveDate: new Date(),
            minimumOrder: parseInt(minimumOrder) || 1,
            leadTime,
            availability: availability || 'In Stock',
            notes
        };

        vendor.items.push(item);
        await vendor.save();

        console.log(`🛒 Added item for vendor ${vendor.vendorName}: ${itemName}`);
        
        if (req.xhr || req.headers.accept.indexOf('json') > -1) {
            res.json({ success: true, item: item });
        } else {
            res.redirect(`/vendors/${vendorId}?success=item-added`);
        }

    } catch (error) {
        console.error('❌ Error adding item:', error);
        if (req.xhr || req.headers.accept.indexOf('json') > -1) {
            res.status(500).json({ error: 'Error adding item' });
        } else {
            res.redirect(`/vendors/${req.params.vendorId}?error=item-failed`);
        }
    }
});

// ======================================
// API ENDPOINTS
// ======================================

// Get vendor search suggestions
router.get('/api/search', async (req, res) => {
    try {
        const { q } = req.query;
        const vendors = await Vendor.find({
            $or: [
                { vendorName: { $regex: q, $options: 'i' } },
                { vendorCode: { $regex: q, $options: 'i' } }
            ]
        })
            .limit(10)
            .select('vendorName vendorCode vendorType status')
            .lean();

        res.json(vendors);
    } catch (error) {
        console.error('❌ Error searching vendors:', error);
        res.status(500).json({ error: 'Search failed' });
    }
});

// Get vendor statistics
router.get('/api/stats', async (req, res) => {
    try {
        const stats = await Vendor.aggregate([
            {
                $group: {
                    _id: null,
                    totalVendors: { $sum: 1 },
                    activeVendors: { $sum: { $cond: [{ $eq: ['$status', 'Active'] }, 1, 0] } },
                    totalSpent: { $sum: '$performance.totalSpent' },
                    avgOrderValue: { $avg: '$performance.averageOrderValue' }
                }
            }
        ]);

        res.json(stats[0] || {
            totalVendors: 0,
            activeVendors: 0,
            totalSpent: 0,
            avgOrderValue: 0
        });
    } catch (error) {
        console.error('❌ Error getting vendor stats:', error);
        res.status(500).json({ error: 'Failed to get statistics' });
    }
});

module.exports = router;
