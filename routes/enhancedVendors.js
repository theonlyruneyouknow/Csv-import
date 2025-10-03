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
        
        // Get ALL vendors with complete data
        const vendors = await Vendor.find(vendorQuery)
            .sort({ [sortBy]: sortOrder === 'asc' ? 1 : -1 })
            .skip(skip)
            .limit(limit)
            .lean(); // Use lean() for better performance
        
        const totalVendors = await Vendor.countDocuments(vendorQuery);
        const totalPages = Math.ceil(totalVendors / limit);
        
        // Get ALL organic vendors for cross-referencing
        const organicVendors = await OrganicVendor.find().lean();
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
            
            return {
                ...vendor,
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
        const allVendorsForStats = await Vendor.find().lean();
        const stats = {
            total: totalVendors,
            organic: enhancedVendors.filter(v => v.hasOrganicCertification).length,
            active: allVendorsForStats.filter(v => v.status === 'Active').length,
            inactive: allVendorsForStats.filter(v => v.status === 'Inactive').length,
            withContact: allVendorsForStats.filter(v => v.contactInfo?.primaryContact?.email).length,
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
        
        const vendor = await Vendor.findById(req.params.id).lean();
        if (!vendor) {
            return res.status(404).send('Vendor not found');
        }
        
        // Get organic certification data
        const organicVendor = await OrganicVendor.findOne({ 
            $or: [
                { internalId: vendor.vendorCode },
                { vendorName: vendor.vendorName }
            ]
        }).lean();
        
        // Get purchase orders for this vendor
        const purchaseOrders = await PurchaseOrder.find({
            $or: [
                { vendor: vendor.vendorName },
                { vendor: new RegExp(vendor.vendorCode, 'i') }
            ]
        })
        .sort({ poDate: -1 })
        .limit(50)
        .lean();
        
        // Get line items for this vendor
        const lineItems = await LineItem.find({
            $or: [
                { vendor: vendor.vendorName },
                { vendor: new RegExp(vendor.vendorCode, 'i') }
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
        
        console.log(`✅ Loaded vendor: ${vendor.vendorName} with ${purchaseOrders.length} POs`);
        
        res.render('vendor-detail-page', {
            vendor: vendor,
            hasOrganicCertification: !!organicVendor,
            organicVendor: organicVendor || null,
            purchaseOrders: purchaseOrders,
            lineItems: lineItems,
            stats: stats,
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
