// routes/tracking.js
// Self-managed tracking routes (replaces 17track integration)

const express = require('express');
const router = express.Router();
const LineItem = require('../models/LineItem');
const PurchaseOrder = require('../models/PurchaseOrder');
const trackingService = require('../services/trackingService');

// ============================================
// LINE ITEM TRACKING ROUTES
// ============================================

/**
 * Update tracking information for a line item
 * PUT /purchase-orders/line-items/:lineItemId/tracking
 */
router.put('/line-items/:lineItemId/tracking', async (req, res) => {
    try {
        const { trackingNumber, carrier, status, location, description, estimatedDelivery } = req.body;
        const username = req.user ? req.user.username : 'System';

        console.log(`📦 Updating tracking for line item ${req.params.lineItemId}`);

        const lineItem = await LineItem.findById(req.params.lineItemId);
        if (!lineItem) {
            return res.status(404).json({ error: 'Line item not found' });
        }

        // Auto-detect carrier if not provided
        let detectedCarrier = carrier;
        if (trackingNumber && !carrier) {
            detectedCarrier = trackingService.detectCarrier(trackingNumber);
            console.log(`🔍 Auto-detected carrier: ${detectedCarrier}`);
        }

        // Generate tracking URL
        const trackingURL = trackingService.getTrackingURL(trackingNumber, detectedCarrier);

        // Update tracking fields
        lineItem.trackingNumber = trackingNumber?.trim() || '';
        lineItem.trackingCarrier = detectedCarrier || '';
        lineItem.trackingURL = trackingURL || '';
        
        if (status) {
            lineItem.trackingStatus = status;
            lineItem.trackingLastUpdate = new Date();
        }
        
        if (location) {
            lineItem.trackingLocation = location;
        }
        
        if (description) {
            lineItem.trackingStatusDescription = description;
        }
        
        if (estimatedDelivery) {
            lineItem.trackingEstimatedDelivery = new Date(estimatedDelivery);
        }

        // Add to tracking history if status was updated
        if (status) {
            if (!lineItem.trackingHistory) {
                lineItem.trackingHistory = [];
            }
            
            lineItem.trackingHistory.push({
                timestamp: new Date(),
                status: status,
                location: location || '',
                description: description || '',
                updatedBy: username
            });
        }

        lineItem.updatedAt = new Date();
        await lineItem.save();

        console.log(`✅ Updated tracking for line item ${lineItem._id}: ${trackingNumber || 'cleared'}`);
        
        res.json({ 
            success: true, 
            lineItem,
            trackingURL
        });
    } catch (error) {
        console.error('❌ Line item tracking update error:', error);
        res.status(500).json({ error: error.message });
    }
});

/**
 * Get tracking information for a line item
 * GET /purchase-orders/line-items/:lineItemId/tracking
 */
router.get('/line-items/:lineItemId/tracking', async (req, res) => {
    try {
        const lineItem = await LineItem.findById(req.params.lineItemId);
        if (!lineItem) {
            return res.status(404).json({ error: 'Line item not found' });
        }

        const trackingData = trackingService.formatTrackingData(lineItem);
        
        res.json({
            success: true,
            tracking: trackingData,
            history: lineItem.trackingHistory || []
        });
    } catch (error) {
        console.error('❌ Error fetching tracking:', error);
        res.status(500).json({ error: error.message });
    }
});

/**
 * Bulk update tracking for multiple line items
 * POST /purchase-orders/tracking/bulk-update
 */
router.post('/tracking/bulk-update', async (req, res) => {
    try {
        const { updates } = req.body; // Array of {lineItemId, trackingNumber, carrier, status, ...}
        const username = req.user ? req.user.username : 'System';

        if (!Array.isArray(updates) || updates.length === 0) {
            return res.status(400).json({ error: 'Updates array is required' });
        }

        console.log(`📦 Bulk updating ${updates.length} line items with tracking info`);

        const results = {
            success: [],
            failed: []
        };

        for (const update of updates) {
            try {
                const lineItem = await LineItem.findById(update.lineItemId);
                if (!lineItem) {
                    results.failed.push({
                        lineItemId: update.lineItemId,
                        error: 'Line item not found'
                    });
                    continue;
                }

                // Auto-detect carrier if not provided
                let carrier = update.carrier;
                if (update.trackingNumber && !carrier) {
                    carrier = trackingService.detectCarrier(update.trackingNumber);
                }

                // Generate tracking URL
                const trackingURL = trackingService.getTrackingURL(update.trackingNumber, carrier);

                // Update fields
                lineItem.trackingNumber = update.trackingNumber?.trim() || '';
                lineItem.trackingCarrier = carrier || '';
                lineItem.trackingURL = trackingURL || '';
                
                if (update.status) {
                    lineItem.trackingStatus = update.status;
                    lineItem.trackingLastUpdate = new Date();
                    
                    // Add to history
                    if (!lineItem.trackingHistory) {
                        lineItem.trackingHistory = [];
                    }
                    lineItem.trackingHistory.push({
                        timestamp: new Date(),
                        status: update.status,
                        location: update.location || '',
                        description: update.description || '',
                        updatedBy: username
                    });
                }

                if (update.location) lineItem.trackingLocation = update.location;
                if (update.description) lineItem.trackingStatusDescription = update.description;
                if (update.estimatedDelivery) lineItem.trackingEstimatedDelivery = new Date(update.estimatedDelivery);

                lineItem.updatedAt = new Date();
                await lineItem.save();

                results.success.push({
                    lineItemId: lineItem._id,
                    trackingNumber: lineItem.trackingNumber,
                    carrier: lineItem.trackingCarrier
                });

            } catch (itemError) {
                results.failed.push({
                    lineItemId: update.lineItemId,
                    error: itemError.message
                });
            }
        }

        console.log(`✅ Bulk update complete: ${results.success.length} succeeded, ${results.failed.length} failed`);

        res.json({
            success: true,
            results
        });
    } catch (error) {
        console.error('❌ Bulk tracking update error:', error);
        res.status(500).json({ error: error.message });
    }
});

// ============================================
// TRACKING DASHBOARD ROUTES
// ============================================

/**
 * Tracking Dashboard - Main view
 * GET /purchase-orders/tracking-dashboard
 */
router.get('/tracking-dashboard', async (req, res) => {
    try {
        console.log('📊 Loading tracking dashboard...');

        // Get filter parameters
        const statusFilter = req.query.status || 'all';
        const carrierFilter = req.query.carrier || 'all';
        const dateRange = req.query.dateRange || '30'; // days

        // Build query for line items with tracking
        let query = { trackingNumber: { $exists: true, $ne: '' } };

        if (statusFilter !== 'all') {
            query.trackingStatus = statusFilter;
        }

        if (carrierFilter !== 'all') {
            query.trackingCarrier = carrierFilter;
        }

        // Date range filter
        if (dateRange !== 'all') {
            const daysAgo = new Date();
            daysAgo.setDate(daysAgo.getDate() - parseInt(dateRange));
            query.trackingLastUpdate = { $gte: daysAgo };
        }

        // Get line items with tracking
        const lineItems = await LineItem.find(query)
            .sort({ trackingLastUpdate: -1 })
            .limit(500)
            .lean();

        // Generate statistics
        const stats = trackingService.generateStats(lineItems);

        // Get all line items for comparison
        const allLineItems = await LineItem.find({}).lean();
        stats.totalLineItems = allLineItems.length;
        stats.percentageWithTracking = ((stats.withTracking / stats.totalLineItems) * 100).toFixed(1);

        // Get recent updates (last 7 days)
        const recentDate = new Date();
        recentDate.setDate(recentDate.setDate - 7);
        const recentUpdates = lineItems
            .filter(item => item.trackingLastUpdate && new Date(item.trackingLastUpdate) >= recentDate)
            .slice(0, 50);

        // Get carriers and statuses for filters
        const carriers = trackingService.getCarriers();
        const statuses = trackingService.getStatuses();

        console.log(`✅ Tracking dashboard loaded: ${lineItems.length} items with tracking`);

        res.render('tracking-dashboard', {
            lineItems,
            stats,
            recentUpdates,
            carriers,
            statuses,
            filters: {
                status: statusFilter,
                carrier: carrierFilter,
                dateRange
            },
            user: req.user
        });

    } catch (error) {
        console.error('❌ Tracking dashboard error:', error);
        res.status(500).send('Error loading tracking dashboard: ' + error.message);
    }
});

/**
 * Get tracking statistics
 * GET /purchase-orders/tracking/stats
 */
router.get('/tracking/stats', async (req, res) => {
    try {
        const lineItems = await LineItem.find({}).lean();
        const stats = trackingService.generateStats(lineItems);

        res.json({
            success: true,
            stats
        });
    } catch (error) {
        console.error('❌ Error getting tracking stats:', error);
        res.status(500).json({ error: error.message });
    }
});

/**
 * Validate tracking number
 * POST /purchase-orders/tracking/validate
 */
router.post('/tracking/validate', (req, res) => {
    try {
        const { trackingNumber, carrier } = req.body;

        if (!trackingNumber) {
            return res.status(400).json({ error: 'Tracking number is required' });
        }

        const isValid = trackingService.validateTrackingNumber(trackingNumber, carrier);
        const detectedCarrier = trackingService.detectCarrier(trackingNumber);
        const trackingURL = trackingService.getTrackingURL(trackingNumber, carrier || detectedCarrier);

        res.json({
            success: true,
            isValid,
            detectedCarrier,
            trackingURL,
            providedCarrier: carrier || null
        });
    } catch (error) {
        console.error('❌ Tracking validation error:', error);
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;
