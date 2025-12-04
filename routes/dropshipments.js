const express = require('express');
const router = express.Router();
const Dropshipment = require('../models/Dropshipment');
const PurchaseOrder = require('../models/PurchaseOrder');
const { GoogleGenerativeAI } = require('@google/generative-ai');

// Initialize Gemini AI if available
const genAI = process.env.GEMINI_API_KEY ? new GoogleGenerativeAI(process.env.GEMINI_API_KEY) : null;

// Test route to verify router is working
router.get('/test', (req, res) => {
    res.json({ success: true, message: 'Dropshipments route is working!' });
});

// GET - Dropshipment tracking page
router.get('/', async (req, res) => {
    try {
        console.log('📦 Loading dropshipment tracking page...');
        console.log('📦 User:', req.user);
        console.log('📦 Session:', req.session);
        res.render('dropshipments', {
            title: 'Dropshipment Tracking',
            user: req.user || { name: 'Admin' }
        });
    } catch (error) {
        console.error('❌ Error loading dropshipment page:', error);
        console.error('❌ Error stack:', error.stack);
        res.status(500).send('Error loading page: ' + error.message);
    }
});

// GET - All dropshipments (with filters)
router.get('/api/dropshipments', async (req, res) => {
    try {
        const { status, vendor, carrier, startDate, endDate, search } = req.query;

        let query = {};

        if (status) query.shippingStatus = status;
        if (vendor) query.vendor = new RegExp(vendor, 'i');
        if (carrier) query.carrier = carrier;

        if (startDate || endDate) {
            query.orderDate = {};
            if (startDate) query.orderDate.$gte = new Date(startDate);
            if (endDate) query.orderDate.$lte = new Date(endDate);
        }

        if (search) {
            query.$or = [
                { poNumber: new RegExp(search, 'i') },
                { trackingNumber: new RegExp(search, 'i') },
                { customerName: new RegExp(search, 'i') }
            ];
        }

        const dropshipments = await Dropshipment.find(query)
            .sort({ orderDate: -1 })
            .lean();

        res.json({ success: true, dropshipments });
    } catch (error) {
        console.error('❌ Error fetching dropshipments:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// GET - Single dropshipment
router.get('/api/dropshipments/:id', async (req, res) => {
    try {
        const dropshipment = await Dropshipment.findById(req.params.id).lean();

        if (!dropshipment) {
            return res.status(404).json({ success: false, error: 'Dropshipment not found' });
        }

        res.json({ success: true, dropshipment });
    } catch (error) {
        console.error('❌ Error fetching dropshipment:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// POST - Create new dropshipment
router.post('/api/dropshipments', async (req, res) => {
    try {
        const dropshipmentData = {
            ...req.body,
            createdBy: req.user?.username || req.session?.username || 'system'
        };

        // If PO number provided, try to link to existing PO
        if (dropshipmentData.poNumber) {
            const po = await PurchaseOrder.findOne({ poNumber: dropshipmentData.poNumber });
            if (po) {
                dropshipmentData.poId = po._id;
                if (!dropshipmentData.vendor) dropshipmentData.vendor = po.vendor;
            }
        }

        const dropshipment = new Dropshipment(dropshipmentData);
        await dropshipment.save();

        console.log(`✅ Created dropshipment: ${dropshipment.poNumber}`);
        res.json({ success: true, dropshipment });
    } catch (error) {
        console.error('❌ Error creating dropshipment:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// PUT - Update dropshipment
router.put('/api/dropshipments/:id', async (req, res) => {
    try {
        const updateData = {
            ...req.body,
            updatedBy: req.user?.username || req.session?.username || 'system'
        };

        const dropshipment = await Dropshipment.findByIdAndUpdate(
            req.params.id,
            updateData,
            { new: true, runValidators: true }
        );

        if (!dropshipment) {
            return res.status(404).json({ success: false, error: 'Dropshipment not found' });
        }

        console.log(`✅ Updated dropshipment: ${dropshipment.poNumber}`);
        res.json({ success: true, dropshipment });
    } catch (error) {
        console.error('❌ Error updating dropshipment:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// DELETE - Delete dropshipment
router.delete('/api/dropshipments/:id', async (req, res) => {
    try {
        const dropshipment = await Dropshipment.findByIdAndDelete(req.params.id);

        if (!dropshipment) {
            return res.status(404).json({ success: false, error: 'Dropshipment not found' });
        }

        console.log(`✅ Deleted dropshipment: ${dropshipment.poNumber}`);
        res.json({ success: true, message: 'Dropshipment deleted' });
    } catch (error) {
        console.error('❌ Error deleting dropshipment:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// POST - Update tracking number
router.post('/api/dropshipments/:id/tracking', async (req, res) => {
    try {
        const { trackingNumber, carrier, trackingUrl } = req.body;

        const dropshipment = await Dropshipment.findById(req.params.id);

        if (!dropshipment) {
            return res.status(404).json({ success: false, error: 'Dropshipment not found' });
        }

        dropshipment.trackingNumber = trackingNumber;
        dropshipment.carrier = carrier || 'USPS';
        dropshipment.trackingUrl = trackingUrl;
        dropshipment.shippingStatus = 'Shipped';
        dropshipment.lastTrackingUpdate = new Date();
        dropshipment.updatedBy = req.user?.username || req.session?.username || 'system';

        await dropshipment.save();

        console.log(`✅ Added tracking to dropshipment: ${dropshipment.poNumber} - ${trackingNumber}`);
        res.json({ success: true, dropshipment });
    } catch (error) {
        console.error('❌ Error updating tracking:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// POST - AI tracking check
router.post('/api/dropshipments/:id/ai-check', async (req, res) => {
    try {
        if (!genAI) {
            return res.status(400).json({
                success: false,
                error: 'AI service not configured. Please add GEMINI_API_KEY to .env file.'
            });
        }

        const dropshipment = await Dropshipment.findById(req.params.id);

        if (!dropshipment) {
            return res.status(404).json({ success: false, error: 'Dropshipment not found' });
        }

        if (!dropshipment.trackingNumber) {
            return res.status(400).json({ success: false, error: 'No tracking number available' });
        }

        const trackingUrl = dropshipment.autoTrackingUrl || dropshipment.trackingUrl;

        if (!trackingUrl) {
            return res.status(400).json({ success: false, error: 'No tracking URL available' });
        }

        console.log(`🤖 AI checking tracking for ${dropshipment.trackingNumber}...`);

        const prompt = `
Check the shipping status for this tracking information:
- Tracking Number: ${dropshipment.trackingNumber}
- Carrier: ${dropshipment.carrier}
- Tracking URL: ${trackingUrl}

Please provide the following information in JSON format:
{
  "status": "current shipping status (Shipped, In Transit, Out for Delivery, Delivered, Exception)",
  "location": "current location or last known location",
  "lastUpdate": "timestamp of last update",
  "description": "brief description of current status",
  "estimatedDelivery": "estimated delivery date if available",
  "events": [
    {
      "timestamp": "event timestamp",
      "status": "event status",
      "location": "event location",
      "description": "event description"
    }
  ]
}

If you cannot access the tracking information, return:
{
  "error": "Unable to retrieve tracking information",
  "message": "Explanation of why"
}

Return ONLY valid JSON, no markdown or extra text.`;

        const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });
        const result = await model.generateContent(prompt);
        const response = await result.response;
        let text = response.text();

        // Clean up response
        text = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();

        let trackingInfo;
        try {
            trackingInfo = JSON.parse(text);
        } catch (parseError) {
            console.error('❌ Failed to parse AI response:', text);
            return res.status(500).json({
                success: false,
                error: 'Failed to parse tracking information',
                rawResponse: text.substring(0, 500)
            });
        }

        if (trackingInfo.error) {
            dropshipment.aiLastChecked = new Date();
            dropshipment.aiCheckStatus = trackingInfo.error;
            await dropshipment.save();

            return res.json({
                success: false,
                error: trackingInfo.error,
                message: trackingInfo.message
            });
        }

        // Update dropshipment with AI findings
        dropshipment.shippingStatus = trackingInfo.status;
        dropshipment.lastTrackingUpdate = new Date();
        dropshipment.aiLastChecked = new Date();
        dropshipment.aiCheckStatus = 'Success';

        if (trackingInfo.estimatedDelivery && !dropshipment.estimatedDelivery) {
            dropshipment.estimatedDelivery = new Date(trackingInfo.estimatedDelivery);
        }

        // Add tracking events to history
        if (trackingInfo.events && Array.isArray(trackingInfo.events)) {
            trackingInfo.events.forEach(event => {
                dropshipment.trackingHistory.push({
                    status: event.status,
                    location: event.location,
                    description: event.description,
                    timestamp: new Date(event.timestamp),
                    checkedAt: new Date()
                });
            });
        }

        await dropshipment.save();

        console.log(`✅ AI updated tracking for ${dropshipment.trackingNumber}`);

        res.json({
            success: true,
            trackingInfo,
            dropshipment
        });

    } catch (error) {
        console.error('❌ Error in AI tracking check:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// GET - Export to CSV
router.get('/export/csv', async (req, res) => {
    try {
        const { status, vendor, carrier, startDate, endDate } = req.query;

        let query = {};

        if (status) query.shippingStatus = status;
        if (vendor) query.vendor = new RegExp(vendor, 'i');
        if (carrier) query.carrier = carrier;

        if (startDate || endDate) {
            query.orderDate = {};
            if (startDate) query.orderDate.$gte = new Date(startDate);
            if (endDate) query.orderDate.$lte = new Date(endDate);
        }

        const dropshipments = await Dropshipment.find(query)
            .sort({ orderDate: -1 })
            .lean();

        // Build CSV
        const csvRows = [];
        csvRows.push([
            'PO Number',
            'Vendor',
            'Customer Name',
            'Customer Email',
            'Order Date',
            'Tracking Number',
            'Carrier',
            'Tracking URL',
            'Status',
            'Last Update',
            'Estimated Delivery',
            'Actual Delivery',
            'Shipping Address',
            'Notes'
        ].join(','));

        dropshipments.forEach(ds => {
            const trackingUrl = ds.trackingUrl || generateTrackingUrl(ds.carrier, ds.trackingNumber);
            const address = ds.shippingAddress
                ? `"${ds.shippingAddress.street}, ${ds.shippingAddress.city}, ${ds.shippingAddress.state} ${ds.shippingAddress.zip}"`
                : '';

            csvRows.push([
                ds.poNumber || '',
                ds.vendor || '',
                ds.customerName || '',
                ds.customerEmail || '',
                ds.orderDate ? new Date(ds.orderDate).toLocaleDateString() : '',
                ds.trackingNumber || '',
                ds.carrier || '',
                trackingUrl || '',
                ds.shippingStatus || '',
                ds.lastTrackingUpdate ? new Date(ds.lastTrackingUpdate).toLocaleString() : '',
                ds.estimatedDelivery ? new Date(ds.estimatedDelivery).toLocaleDateString() : '',
                ds.actualDelivery ? new Date(ds.actualDelivery).toLocaleDateString() : '',
                address,
                `"${(ds.notes || '').replace(/"/g, '""')}"`
            ].join(','));
        });

        const csv = csvRows.join('\n');

        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', `attachment; filename=dropshipments_${Date.now()}.csv`);
        res.send(csv);

        console.log(`✅ Exported ${dropshipments.length} dropshipments to CSV`);

    } catch (error) {
        console.error('❌ Error exporting CSV:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// POST - Import/Sync dropship POs from Purchase Orders
router.post('/api/sync-from-pos', async (req, res) => {
    try {
        console.log('🔄 Syncing dropship POs...');

        // Find all POs that are dropships (poType contains 'dropship' or location contains 'dropship')
        const dropshipPOs = await PurchaseOrder.find({
            $or: [
                { poType: /dropship/i },
                { 'lineItems.locationName': /dropship/i }
            ]
        }).lean();

        console.log(`📦 Found ${dropshipPOs.length} dropship POs`);

        let created = 0;
        let updated = 0;
        let skipped = 0;

        for (const po of dropshipPOs) {
            // Check if already exists
            const existing = await Dropshipment.findOne({ poNumber: po.poNumber });

            if (existing) {
                // Update if PO has new information
                if (po.shippingTracking && !existing.trackingNumber) {
                    existing.trackingNumber = po.shippingTracking;
                    existing.carrier = po.shippingCarrier || 'USPS';
                    existing.shippingStatus = 'Shipped';
                    existing.lastTrackingUpdate = new Date();
                    await existing.save();
                    updated++;
                    console.log(`✅ Updated ${po.poNumber} with tracking`);
                } else {
                    skipped++;
                }
                continue;
            }

            // Create new dropshipment entry
            const dropshipment = new Dropshipment({
                poNumber: po.poNumber,
                poUrl: po.poUrl || '',
                poId: po._id,
                vendor: po.vendor,
                customerName: po.customerName || po.shipToName || 'Unknown Customer',
                customerEmail: po.customerEmail || '',
                shippingAddress: {
                    street: po.shipToAddress || '',
                    city: po.shipToCity || '',
                    state: po.shipToState || '',
                    zip: po.shipToZip || '',
                    country: 'USA'
                },
                orderDate: po.poDate || new Date(),
                items: po.lineItems.map(item => ({
                    sku: item.sku,
                    description: item.memo || item.vendorDescription,
                    quantity: item.netsuiteQuantity || 0,
                    price: 0
                })),
                trackingNumber: po.shippingTracking || '',
                carrier: po.shippingCarrier || 'USPS',
                shippingStatus: po.shippingTracking ? 'Shipped' : 'Awaiting Tracking',
                notes: po.memo || '',
                createdBy: 'system-sync'
            });

            await dropshipment.save();
            created++;
            console.log(`✅ Created dropshipment for ${po.poNumber}`);
        }

        console.log(`✅ Sync complete: ${created} created, ${updated} updated, ${skipped} skipped`);

        res.json({
            success: true,
            stats: { created, updated, skipped, total: dropshipPOs.length }
        });

    } catch (error) {
        console.error('❌ Error syncing POs:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// Helper function to generate tracking URLs
function generateTrackingUrl(carrier, trackingNumber) {
    if (!trackingNumber) return '';

    const trackingUrls = {
        'USPS': `https://tools.usps.com/go/TrackConfirmAction?tLabels=${trackingNumber}`,
        'FedEx': `https://www.fedex.com/fedextrack/?trknbr=${trackingNumber}`,
        'UPS': `https://www.ups.com/track?loc=en_US&tracknum=${trackingNumber}`,
        'DHL': `https://www.dhl.com/en/express/tracking.html?AWB=${trackingNumber}`
    };

    return trackingUrls[carrier] || '';
}

module.exports = router;
