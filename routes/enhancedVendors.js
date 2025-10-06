// routes/enhancedVendors.js
// Enhanced Vendors Dashboard - Comprehensive vendor management with ALL features
const express = require('express');
const router = express.Router();
const Vendor = require('../models/Vendor');
const OrganicVendor = require('../models/OrganicVendor');
const PurchaseOrder = require('../models/PurchaseOrder');
const LineItem = require('../models/LineItem');

// Enhanced Vendors Dashboard - Main route with ALL vendor data
router.get('/', async (req, res) => {
    try {
        console.log('🌟 Loading Enhanced Vendors Dashboard (COMPREHENSIVE VERSION)...');
        
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 20;
        const skip = (page - 1) * limit;
        
        // Get filter parameters
        const searchQuery = req.query.search || '';
        const statusFilter = req.query.status || 'all';
        const vendorTypeFilter = req.query.vendorType || 'all';
        const organicFilter = req.query.organic || 'all';
        const sortBy = req.query.sortBy || 'vendorName';
        const sortOrder = req.query.sortOrder || 'asc';
        
        // Build query for main Vendors
        let vendorQuery = {};
        
        if (searchQuery) {
            vendorQuery.$or = [
                { vendorName: { $regex: searchQuery, $options: 'i' } },
                { vendorCode: { $regex: searchQuery, $options: 'i' } },
                { mainEmail: { $regex: searchQuery, $options: 'i' } },
                { phone: { $regex: searchQuery, $options: 'i' } },
                { 'contactInfo.primaryContact.name': { $regex: searchQuery, $options: 'i' } },
                { 'contactInfo.primaryContact.email': { $regex: searchQuery, $options: 'i' } }
            ];
        }
        
        if (statusFilter !== 'all') {
            vendorQuery.status = statusFilter;
        }
        
        if (vendorTypeFilter !== 'all') {
            vendorQuery.vendorType = vendorTypeFilter;
        }
        
        // Get ALL vendors with complete data (NOT using .lean() to preserve virtuals like primaryContact)
        const vendors = await Vendor.find(vendorQuery)
            .sort({ [sortBy]: sortOrder === 'asc' ? 1 : -1 })
            .skip(skip)
            .limit(limit);
        
        const totalVendors = await Vendor.countDocuments(vendorQuery);
        const totalPages = Math.ceil(totalVendors / limit);
        
        // Get ALL organic vendors for cross-referencing
        const organicVendors = await OrganicVendor.find();
        const organicVendorMap = new Map();
        organicVendors.forEach(ov => {
            // Match by internalId OR vendorName
            organicVendorMap.set(ov.internalId, ov);
            organicVendorMap.set(ov.vendorName, ov);
        });
        
        // Enhance vendors with COMPLETE organic certification info
        const enhancedVendors = await Promise.all(vendors.map(async (vendor) => {
            // Find organic vendor by code or name
            let organicVendor = organicVendorMap.get(vendor.vendorCode) || 
                               organicVendorMap.get(vendor.vendorName);
            
            // Get PO statistics for this vendor
            const poCount = await PurchaseOrder.countDocuments({ 
                $or: [
                    { vendor: vendor.vendorName },
                    { vendor: new RegExp(vendor.vendorCode, 'i') }
                ]
            });
            
            // Convert to plain object but preserve virtuals
            const vendorObj = vendor.toObject({ virtuals: true });
            
            return {
                ...vendorObj,
                hasOrganicCertification: !!organicVendor,
                organicVendor: organicVendor || null,
                // Organic fields for easy access
                organicStatus: organicVendor?.status || null,
                lastCertificationDate: organicVendor?.lastOrganicCertificationDate || null,
                certificationExpiryDate: organicVendor?.organicCertificationExpiryDate || null,
                certificationAgency: organicVendor?.organicCertificationAgency || null,
                organicDatabaseUrl: organicVendor?.organicDatabaseUrl || null,
                organicSeeds: organicVendor?.organicSeeds || [],
                organicSeedsRawData: organicVendor?.organicSeedsRawData || '',
                certificate: organicVendor?.certificate || null,
                // Statistics
                poCount: poCount
            };
        }));
        
        // Apply organic filter after enhancement
        let filteredVendors = enhancedVendors;
        if (organicFilter === 'organic-only') {
            filteredVendors = enhancedVendors.filter(v => v.hasOrganicCertification);
        } else if (organicFilter === 'non-organic') {
            filteredVendors = enhancedVendors.filter(v => !v.hasOrganicCertification);
        }
        
        // Get comprehensive statistics
        const allVendorsForStats = await Vendor.find();
        const stats = {
            total: totalVendors,
            organic: enhancedVendors.filter(v => v.hasOrganicCertification).length,
            active: allVendorsForStats.filter(v => v.status === 'Active').length,
            inactive: allVendorsForStats.filter(v => v.status === 'Inactive').length,
            withContact: allVendorsForStats.filter(v => v.primaryContact || (v.contactInfo?.primaryContact?.email)).length,
            byType: {}
        };
        
        // Count by vendor type
        allVendorsForStats.forEach(v => {
            const type = v.vendorType || 'Standard';
            stats.byType[type] = (stats.byType[type] || 0) + 1;
        });
        
        console.log(`📊 Enhanced Dashboard: ${filteredVendors.length} vendors loaded`);
        console.log(`🌱 ${stats.organic} organic certified vendors`);
        console.log(`📧 ${stats.withContact} vendors with contact info`);
        
        res.render('enhanced-vendors-dashboard', {
            vendors: filteredVendors,
            stats,
            pagination: {
                currentPage: page,
                totalPages,
                totalVendors,
                limit,
                hasNextPage: page < totalPages,
                hasPrevPage: page > 1
            },
            filters: {
                search: searchQuery,
                status: statusFilter,
                vendorType: vendorTypeFilter,
                organic: organicFilter,
                sortBy,
                sortOrder
            },
            user: req.user
        });
        
    } catch (error) {
        console.error('❌ Enhanced vendors dashboard error:', error);
        res.status(500).send('Error loading enhanced vendors dashboard: ' + error.message);
    }
});

// Individual vendor detail page
router.get('/vendor/:id', async (req, res) => {
    try {
        console.log(`📄 Loading detail page for vendor: ${req.params.id}`);
        
        // Don't use .lean() to preserve virtual fields (primaryContact, billingContact, shippingContact)
        const vendor = await Vendor.findById(req.params.id);
        if (!vendor) {
            return res.status(404).send('Vendor not found');
        }
        
        // Convert to object with virtuals preserved
        const vendorObj = vendor.toObject({ virtuals: true });
        
        // Get organic certification data
        const organicVendor = await OrganicVendor.findOne({ 
            $or: [
                { internalId: vendorObj.vendorCode },
                { vendorName: vendorObj.vendorName }
            ]
        }).lean();
        
        // Get ALL purchase orders for this vendor (including hidden and billed)
        const purchaseOrders = await PurchaseOrder.find({
            $or: [
                { vendor: vendorObj.vendorName },
                { vendor: new RegExp(vendorObj.vendorCode, 'i') }
            ]
            // NO filter on isHidden or status - include ALL POs for this vendor
        })
        .sort({ poDate: -1 })
        .limit(50)
        .lean();
        
        // Collect all documents from POs
        const poDocuments = [];
        purchaseOrders.forEach(po => {
            if (po.attachments && po.attachments.length > 0) {
                po.attachments.forEach(attachment => {
                    const attachmentId = attachment._id ? attachment._id.toString() : null;
                    poDocuments.push({
                        ...attachment,
                        // Convert ObjectId to string for URL compatibility
                        attachmentId: attachmentId,
                        poNumber: po.poNumber,
                        poId: po._id ? po._id.toString() : null,
                        source: 'Purchase Order'
                    });
                    
                    // Log each document found
                    console.log(`  📎 Found: ${attachment.filename} (ID: ${attachmentId}) from ${po.poNumber}`);
                });
            }
        });
        
        // Collect organic documents
        const organicDocuments = [];
        if (organicVendor) {
            if (organicVendor.certificate) {
                organicDocuments.push({
                    type: 'certificate',
                    name: 'Organic Certificate',
                    filename: organicVendor.certificate.filename || 'certificate.pdf',
                    mimeType: organicVendor.certificate.mimeType || 'application/pdf',
                    uploadedAt: organicVendor.certificate.uploadedAt || organicVendor.updatedAt,
                    source: 'Organic Certification',
                    organicVendorId: organicVendor._id ? organicVendor._id.toString() : null
                });
            }
            if (organicVendor.operationsProfile) {
                organicDocuments.push({
                    type: 'operationsProfile',
                    name: 'Operations Profile',
                    filename: organicVendor.operationsProfile.filename || 'operations-profile.pdf',
                    mimeType: organicVendor.operationsProfile.mimeType || 'application/pdf',
                    uploadedAt: organicVendor.operationsProfile.uploadedAt || organicVendor.updatedAt,
                    source: 'Organic Certification',
                    organicVendorId: organicVendor._id ? organicVendor._id.toString() : null
                });
            }
        }
        
        // Combine all documents
        const allDocuments = [...organicDocuments, ...poDocuments].sort((a, b) => {
            return new Date(b.uploadedAt) - new Date(a.uploadedAt);
        });
        
        console.log(`📄 Document summary for ${vendorObj.vendorName}:`, {
            organicDocs: organicDocuments.length,
            poDocs: poDocuments.length,
            total: allDocuments.length,
            poDocSample: poDocuments.length > 0 ? {
                filename: poDocuments[0].filename,
                attachmentId: poDocuments[0].attachmentId,
                poNumber: poDocuments[0].poNumber,
                filePath: poDocuments[0].filePath
            } : 'none'
        });
        
        console.log('═══════════════════════════════════════════════════════════');
        console.log(`📊 VENDOR DOCUMENTS LOADED: ${vendorObj.vendorName}`);
        console.log('═══════════════════════════════════════════════════════════');
        if (poDocuments.length > 0) {
            console.log(`📄 Found ${poDocuments.length} PO attachment(s):`);
            poDocuments.forEach((doc, idx) => {
                console.log(`  ${idx + 1}. ${doc.filename}`);
                console.log(`     PO: ${doc.poNumber}`);
                console.log(`     ID: ${doc.attachmentId}`);
                console.log(`     Path: ${doc.filePath}`);
                console.log(`     View: http://localhost:3002/purchase-orders/view-attachment/${doc.attachmentId}`);
            });
        } else {
            console.log('📄 No PO attachments found');
        }
        if (organicDocuments.length > 0) {
            console.log(`🌱 Found ${organicDocuments.length} organic document(s)`);
        }
        console.log('═══════════════════════════════════════════════════════════');
        
        // Get line items for this vendor
        const lineItems = await LineItem.find({
            $or: [
                { vendor: vendorObj.vendorName },
                { vendor: new RegExp(vendorObj.vendorCode, 'i') }
            ]
        })
        .sort({ createdAt: -1 })
        .limit(100)
        .lean();
        
        // Calculate statistics
        const stats = {
            totalPOs: purchaseOrders.length,
            totalLineItems: lineItems.length,
            totalSpend: purchaseOrders.reduce((sum, po) => sum + (parseFloat(po.total) || 0), 0)
        };
        
        console.log(`✅ Loaded vendor: ${vendorObj.vendorName} with ${purchaseOrders.length} POs and ${allDocuments.length} documents`);
        
        res.render('vendor-detail-page', {
            vendor: vendorObj,
            hasOrganicCertification: !!organicVendor,
            organicVendor: organicVendor || null,
            purchaseOrders: purchaseOrders,
            lineItems: lineItems,
            stats: stats,
            allDocuments: allDocuments,
            user: req.user
        });
        
    } catch (error) {
        console.error('❌ Error loading vendor detail page:', error);
        res.status(500).send('Error loading vendor details: ' + error.message);
    }
});

// Get vendor details for modal/editing (AJAX endpoint)
router.get('/:id', async (req, res) => {
    try {
        const vendor = await Vendor.findById(req.params.id);
        if (!vendor) {
            return res.status(404).json({ error: 'Vendor not found' });
        }
        
        // Check for organic certification
        const organicVendor = await OrganicVendor.findOne({ internalId: vendor.vendorCode });
        
        res.json({
            ...vendor.toObject(),
            organicVendor: organicVendor || null,
            hasOrganicCertification: !!organicVendor
        });
        
    } catch (error) {
        console.error('❌ Error fetching vendor:', error);
        res.status(500).json({ error: 'Error fetching vendor details' });
    }
});

// Update vendor
router.put('/:id', async (req, res) => {
    try {
        const vendor = await Vendor.findByIdAndUpdate(
            req.params.id,
            req.body,
            { new: true, runValidators: true }
        );
        
        if (!vendor) {
            return res.status(404).json({ error: 'Vendor not found' });
        }
        
        res.json({ success: true, vendor });
        
    } catch (error) {
        console.error('❌ Error updating vendor:', error);
        res.status(500).json({ error: 'Error updating vendor' });
    }
});

// Add organic certification to a vendor
router.post('/:id/organic-certification', async (req, res) => {
    try {
        const vendor = await Vendor.findById(req.params.id);
        if (!vendor) {
            return res.status(404).json({ error: 'Vendor not found' });
        }
        
        // Check if organic vendor already exists
        let organicVendor = await OrganicVendor.findOne({ internalId: vendor.vendorCode });
        
        if (organicVendor) {
            // Update existing
            Object.assign(organicVendor, req.body);
            await organicVendor.save();
        } else {
            // Create new organic vendor record
            organicVendor = new OrganicVendor({
                vendorName: vendor.vendorName,
                internalId: vendor.vendorCode,
                lastOrganicCertificationDate: req.body.lastOrganicCertificationDate,
                organicCertificationExpiryDate: req.body.organicCertificationExpiryDate,
                organicCertificationAgency: req.body.organicCertificationAgency,
                status: req.body.status || 'Pending Review'
            });
            await organicVendor.save();
        }
        
        res.json({ success: true, organicVendor });
        
    } catch (error) {
        console.error('❌ Error adding organic certification:', error);
        res.status(500).json({ error: 'Error adding organic certification' });
    }
});

// Remove organic certification
router.delete('/:id/organic-certification', async (req, res) => {
    try {
        const vendor = await Vendor.findById(req.params.id);
        if (!vendor) {
            return res.status(404).json({ error: 'Vendor not found' });
        }
        
        await OrganicVendor.deleteOne({ internalId: vendor.vendorCode });
        
        res.json({ success: true, message: 'Organic certification removed' });
        
    } catch (error) {
        console.error('❌ Error removing organic certification:', error);
        res.status(500).json({ error: 'Error removing organic certification' });
    }
});

module.exports = router;
