// routes/shipments.js
// Shipment tracking and management routes

const express = require('express');
const router = express.Router();
const Shipment = require('../models/Shipment');
const PurchaseOrder = require('../models/PurchaseOrder');
const LineItem = require('../models/LineItem');
const Vendor = require('../models/Vendor');
const trackingService = require('../services/trackingService');

// ============================================
// RENDER DASHBOARD VIEW
// ============================================

/**
 * Render shipments dashboard
 * GET /shipments/dashboard
 */
router.get('/dashboard', async (req, res) => {
    try {
        res.render('shipments', {
            title: 'Shipment Management',
            user: req.user
        });
    } catch (error) {
        console.error('Error rendering shipments dashboard:', error);
        res.status(500).send('Error loading shipments dashboard');
    }
});

// ============================================
// SHIPMENT CRUD OPERATIONS
// ============================================

/**
 * Get all shipments with filtering
 * GET /shipments
 */
router.get('/', async (req, res) => {
    try {
        const { vendor, po, status, carrier, priority, hasIssues, overdue } = req.query;
        
        let query = {};
        
        if (vendor) query.vendorName = new RegExp(vendor, 'i');
        if (po) query.poNumber = po;
        if (status) query.status = status;
        if (carrier) query.carrier = carrier;
        if (priority) query.priority = priority;
        if (hasIssues === 'true') query.hasIssues = true;
        
        let shipments = await Shipment.find(query)
            .populate('purchaseOrderId', 'poNumber vendor date')
            .sort({ createdAt: -1 })
            .limit(500);
        
        // Filter for overdue if requested
        if (overdue === 'true') {
            const now = new Date();
            shipments = shipments.filter(s => 
                s.estimatedDelivery && 
                s.estimatedDelivery < now && 
                s.status !== 'Delivered'
            );
        }
        
        res.json({
            success: true,
            count: shipments.length,
            shipments
        });
    } catch (error) {
        console.error('❌ Error fetching shipments:', error);
        res.status(500).json({ error: error.message });
    }
});

/**
 * Get shipment by ID
 * GET /shipments/:id
 */
router.get('/:id', async (req, res) => {
    try {
        const shipment = await Shipment.findById(req.params.id)
            .populate('purchaseOrderId')
            .populate('lineItems.lineItemId');
        
        if (!shipment) {
            return res.status(404).json({ error: 'Shipment not found' });
        }
        
        res.json({
            success: true,
            shipment
        });
    } catch (error) {
        console.error('❌ Error fetching shipment:', error);
        res.status(500).json({ error: error.message });
    }
});

/**
 * Create new shipment
 * POST /shipments
 */
router.post('/', async (req, res) => {
    try {
        const {
            trackingNumber,
            carrier,
            poNumber,
            vendorName,
            lineItemIds,
            shipDate,
            estimatedDelivery,
            notes,
            priority
        } = req.body;
        
        const username = req.user ? req.user.username : 'System';
        
        // Validate required fields
        if (!trackingNumber || !carrier || !poNumber) {
            return res.status(400).json({ 
                error: 'Tracking number, carrier, and PO number are required' 
            });
        }
        
        // Find the purchase order
        const po = await PurchaseOrder.findOne({ poNumber: poNumber });
        if (!po) {
            return res.status(404).json({ error: 'Purchase order not found' });
        }
        
        // Auto-detect carrier if needed
        let detectedCarrier = carrier;
        if (carrier === 'Auto') {
            detectedCarrier = trackingService.detectCarrier(trackingNumber);
        }
        
        // Generate tracking URL
        const trackingURL = trackingService.getTrackingURL(trackingNumber, detectedCarrier);
        
        // Generate unique shipment number
        const shipmentNumber = `SH${Date.now().toString().slice(-10)}`;
        
        // Get vendor name from PO if not provided
        const finalVendorName = vendorName || po.vendor || 'Unknown';
        
        // Process line items
        const shipmentLineItems = [];
        if (lineItemIds && lineItemIds.length > 0) {
            const lineItems = await LineItem.find({ _id: { $in: lineItemIds } });
            
            for (const item of lineItems) {
                shipmentLineItems.push({
                    lineItemId: item._id,
                    sku: item.sku,
                    description: item.memo,
                    quantity: item.quantityExpected || 1,
                    received: item.received || false
                });
                
                // Update line item with tracking info
                item.trackingNumber = trackingNumber;
                item.trackingCarrier = detectedCarrier;
                item.trackingURL = trackingURL;
                await item.save();
            }
        }
        
        // Create shipment
        const shipment = new Shipment({
            shipmentNumber,
            trackingNumber,
            carrier: detectedCarrier,
            trackingURL,
            purchaseOrderId: po._id,
            poNumber: po.poNumber,
            vendorName: finalVendorName,
            lineItems: shipmentLineItems,
            shipDate: shipDate || new Date(),
            estimatedDelivery,
            status: 'Label Created',
            notes: notes || '',
            priority: priority || 'Normal',
            createdBy: username
        });
        
        // Add initial tracking event
        shipment.addTrackingEvent('Label Created', '', 'Shipment created', username);
        
        await shipment.save();
        
        // Update PO with tracking info
        po.shippingTracking = trackingNumber;
        po.shippingCarrier = detectedCarrier;
        await po.save();
        
        console.log(`✅ Created shipment ${shipmentNumber} for PO ${poNumber}`);
        
        res.json({
            success: true,
            message: 'Shipment created successfully',
            shipment
        });
        
    } catch (error) {
        console.error('❌ Error creating shipment:', error);
        res.status(500).json({ error: error.message });
    }
});

/**
 * Update shipment
 * PUT /shipments/:id
 */
router.put('/:id', async (req, res) => {
    try {
        const {
            status,
            location,
            description,
            estimatedDelivery,
            notes,
            priority,
            shippingCost,
            signedBy
        } = req.body;
        
        const username = req.user ? req.user.username : 'System';
        
        const shipment = await Shipment.findById(req.params.id);
        if (!shipment) {
            return res.status(404).json({ error: 'Shipment not found' });
        }
        
        // Update fields
        if (status) {
            shipment.addTrackingEvent(status, location, description, username);
        }
        if (estimatedDelivery) shipment.estimatedDelivery = new Date(estimatedDelivery);
        if (notes) shipment.notes = notes;
        if (priority) shipment.priority = priority;
        if (shippingCost !== undefined) shipment.shippingCost = shippingCost;
        if (signedBy) shipment.signedBy = signedBy;
        
        shipment.updatedBy = username;
        await shipment.save();
        
        console.log(`✅ Updated shipment ${shipment.shipmentNumber}`);
        
        res.json({
            success: true,
            message: 'Shipment updated successfully',
            shipment
        });
        
    } catch (error) {
        console.error('❌ Error updating shipment:', error);
        res.status(500).json({ error: error.message });
    }
});

/**
 * Delete shipment
 * DELETE /shipments/:id
 */
router.delete('/:id', async (req, res) => {
    try {
        const shipment = await Shipment.findByIdAndDelete(req.params.id);
        
        if (!shipment) {
            return res.status(404).json({ error: 'Shipment not found' });
        }
        
        console.log(`✅ Deleted shipment ${shipment.shipmentNumber}`);
        
        res.json({
            success: true,
            message: 'Shipment deleted successfully'
        });
        
    } catch (error) {
        console.error('❌ Error deleting shipment:', error);
        res.status(500).json({ error: error.message });
    }
});

// ============================================
// TRACKING OPERATIONS
// ============================================

/**
 * Update tracking status
 * POST /shipments/:id/tracking
 */
router.post('/:id/tracking', async (req, res) => {
    try {
        const { status, location, description } = req.body;
        const username = req.user ? req.user.username : 'System';
        
        const shipment = await Shipment.findById(req.params.id);
        if (!shipment) {
            return res.status(404).json({ error: 'Shipment not found' });
        }
        
        shipment.addTrackingEvent(status, location, description, username);
        shipment.updatedBy = username;
        await shipment.save();
        
        console.log(`✅ Added tracking event to shipment ${shipment.shipmentNumber}: ${status}`);
        
        res.json({
            success: true,
            message: 'Tracking event added',
            shipment
        });
        
    } catch (error) {
        console.error('❌ Error adding tracking event:', error);
        res.status(500).json({ error: error.message });
    }
});

/**
 * Mark shipment as received
 * POST /shipments/:id/receive
 */
router.post('/:id/receive', async (req, res) => {
    try {
        const { receivedBy, receivingNotes, signedBy } = req.body;
        const username = req.user ? req.user.username : 'System';
        
        const shipment = await Shipment.findById(req.params.id);
        if (!shipment) {
            return res.status(404).json({ error: 'Shipment not found' });
        }
        
        shipment.status = 'Delivered';
        shipment.actualDelivery = new Date();
        shipment.receivedBy = receivedBy || username;
        shipment.receivedDate = new Date();
        shipment.receivingNotes = receivingNotes || '';
        shipment.signedBy = signedBy || receivedBy || username;
        
        shipment.addTrackingEvent('Delivered', '', `Received by ${receivedBy || username}`, username);
        
        // Update all line items as received
        for (const item of shipment.lineItems) {
            item.received = true;
            
            // Update the actual LineItem document
            const lineItem = await LineItem.findById(item.lineItemId);
            if (lineItem) {
                lineItem.received = true;
                lineItem.receivedDate = new Date();
                lineItem.receivedBy = receivedBy || username;
                await lineItem.save();
            }
        }
        
        shipment.updatedBy = username;
        await shipment.save();
        
        console.log(`✅ Marked shipment ${shipment.shipmentNumber} as received`);
        
        res.json({
            success: true,
            message: 'Shipment marked as received',
            shipment
        });
        
    } catch (error) {
        console.error('❌ Error receiving shipment:', error);
        res.status(500).json({ error: error.message });
    }
});

// ============================================
// ISSUE MANAGEMENT
// ============================================

/**
 * Report an issue
 * POST /shipments/:id/issues
 */
router.post('/:id/issues', async (req, res) => {
    try {
        const { type, description } = req.body;
        
        const shipment = await Shipment.findById(req.params.id);
        if (!shipment) {
            return res.status(404).json({ error: 'Shipment not found' });
        }
        
        shipment.addIssue(type, description);
        await shipment.save();
        
        console.log(`✅ Added issue to shipment ${shipment.shipmentNumber}: ${type}`);
        
        res.json({
            success: true,
            message: 'Issue reported',
            shipment
        });
        
    } catch (error) {
        console.error('❌ Error reporting issue:', error);
        res.status(500).json({ error: error.message });
    }
});

/**
 * Resolve an issue
 * PUT /shipments/:id/issues/:issueId
 */
router.put('/:id/issues/:issueId', async (req, res) => {
    try {
        const { resolution } = req.body;
        
        const shipment = await Shipment.findById(req.params.id);
        if (!shipment) {
            return res.status(404).json({ error: 'Shipment not found' });
        }
        
        shipment.resolveIssue(req.params.issueId, resolution);
        await shipment.save();
        
        console.log(`✅ Resolved issue on shipment ${shipment.shipmentNumber}`);
        
        res.json({
            success: true,
            message: 'Issue resolved',
            shipment
        });
        
    } catch (error) {
        console.error('❌ Error resolving issue:', error);
        res.status(500).json({ error: error.message });
    }
});

// ============================================
// REPORTING AND ANALYTICS
// ============================================

/**
 * Get shipments by vendor
 * GET /shipments/by-vendor/:vendorName
 */
router.get('/by-vendor/:vendorName', async (req, res) => {
    try {
        const shipments = await Shipment.findByVendor(req.params.vendorName)
            .populate('purchaseOrderId', 'poNumber date');
        
        res.json({
            success: true,
            vendor: req.params.vendorName,
            count: shipments.length,
            shipments
        });
    } catch (error) {
        console.error('❌ Error fetching vendor shipments:', error);
        res.status(500).json({ error: error.message });
    }
});

/**
 * Get shipments by PO
 * GET /shipments/by-po/:poNumber
 */
router.get('/by-po/:poNumber', async (req, res) => {
    try {
        const shipments = await Shipment.findByPO(req.params.poNumber)
            .populate('purchaseOrderId', 'poNumber vendor date');
        
        res.json({
            success: true,
            poNumber: req.params.poNumber,
            count: shipments.length,
            shipments
        });
    } catch (error) {
        console.error('❌ Error fetching PO shipments:', error);
        res.status(500).json({ error: error.message });
    }
});

/**
 * Get active shipments
 * GET /shipments/active/all
 */
router.get('/active/all', async (req, res) => {
    try {
        const shipments = await Shipment.findActive()
            .populate('purchaseOrderId', 'poNumber vendor date');
        
        res.json({
            success: true,
            count: shipments.length,
            shipments
        });
    } catch (error) {
        console.error('❌ Error fetching active shipments:', error);
        res.status(500).json({ error: error.message });
    }
});

/**
 * Get overdue shipments
 * GET /shipments/overdue/all
 */
router.get('/overdue/all', async (req, res) => {
    try {
        const shipments = await Shipment.findOverdue()
            .populate('purchaseOrderId', 'poNumber vendor date');
        
        res.json({
            success: true,
            count: shipments.length,
            shipments
        });
    } catch (error) {
        console.error('❌ Error fetching overdue shipments:', error);
        res.status(500).json({ error: error.message });
    }
});

/**
 * Get shipments with issues
 * GET /shipments/issues/all
 */
router.get('/issues/all', async (req, res) => {
    try {
        const shipments = await Shipment.findWithIssues()
            .populate('purchaseOrderId', 'poNumber vendor date');
        
        res.json({
            success: true,
            count: shipments.length,
            shipments
        });
    } catch (error) {
        console.error('❌ Error fetching shipments with issues:', error);
        res.status(500).json({ error: error.message });
    }
});

/**
 * Get shipment statistics
 * GET /shipments/stats/summary
 */
router.get('/stats/summary', async (req, res) => {
    try {
        const [
            total,
            active,
            delivered,
            inTransit,
            overdue,
            withIssues
        ] = await Promise.all([
            Shipment.countDocuments({}),
            Shipment.countDocuments({ status: { $nin: ['Delivered', 'Returned to Sender'] } }),
            Shipment.countDocuments({ status: 'Delivered' }),
            Shipment.countDocuments({ status: 'In Transit' }),
            Shipment.countDocuments({
                status: { $nin: ['Delivered', 'Returned to Sender'] },
                estimatedDelivery: { $lt: new Date() }
            }),
            Shipment.countDocuments({ hasIssues: true })
        ]);
        
        // Get shipments by carrier
        const byCarrier = await Shipment.aggregate([
            { $group: { _id: '$carrier', count: { $sum: 1 } } },
            { $sort: { count: -1 } }
        ]);
        
        // Get shipments by status
        const byStatus = await Shipment.aggregate([
            { $group: { _id: '$status', count: { $sum: 1 } } },
            { $sort: { count: -1 } }
        ]);
        
        res.json({
            success: true,
            stats: {
                total,
                active,
                delivered,
                inTransit,
                overdue,
                withIssues,
                byCarrier,
                byStatus
            }
        });
    } catch (error) {
        console.error('❌ Error fetching shipment stats:', error);
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;
