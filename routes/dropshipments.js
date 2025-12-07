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
            .populate('poId', 'poUrl poNumber shippingTracking shippingCarrier')
            .sort({ orderDate: -1 })
            .lean();

        res.json({ success: true, dropshipments });
    } catch (error) {
        console.error('❌ Error fetching dropshipments:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// GET - Group tracking numbers by carrier (MUST be before :id route)
router.get('/api/dropshipments/group/by-carrier', async (req, res) => {
    try {
        const { status } = req.query;
        
        // Build query - only get shipments that aren't delivered
        let query = {
            shippingStatus: { $nin: ['Delivered', 'Cancelled'] }
        };
        
        if (status) {
            query.shippingStatus = status;
        }
        
        const dropshipments = await Dropshipment.find(query)
            .populate('poId', 'shippingTracking shippingCarrier poNumber')
            .lean();
        
        // Group by carrier
        const grouped = {
            USPS: [],
            FedEx: [],
            UPS: [],
            Other: []
        };
        
        dropshipments.forEach(ds => {
            // Get tracking from PO if available
            const trackingNumber = (ds.poId && ds.poId.shippingTracking) 
                ? ds.poId.shippingTracking 
                : ds.trackingNumber;
            
            const carrier = (ds.poId && ds.poId.shippingCarrier) 
                ? ds.poId.shippingCarrier 
                : (ds.carrier || 'USPS');
            
            if (trackingNumber) {
                const entry = {
                    id: ds._id,
                    trackingNumber: trackingNumber,
                    poNumber: ds.poNumber,
                    customerName: ds.customerName,
                    status: ds.shippingStatus
                };
                
                if (grouped[carrier]) {
                    grouped[carrier].push(entry);
                } else {
                    grouped.Other.push(entry);
                }
            }
        });
        
        // Generate bulk tracking URLs
        const trackingUrls = {};
        
        // USPS supports multiple tracking numbers
        if (grouped.USPS.length > 0) {
            const trackingNumbers = grouped.USPS.map(item => item.trackingNumber).join(',');
            trackingUrls.USPS = `https://tools.usps.com/go/TrackConfirmAction?tLabels=${trackingNumbers}`;
        }
        
        // FedEx - supports multiple tracking numbers in URL
        if (grouped.FedEx.length > 0) {
            const trackingNumbers = grouped.FedEx.map(item => item.trackingNumber).join(',');
            trackingUrls.FedEx = `https://www.fedex.com/fedextrack/?trknbr=${trackingNumbers}`;
        }
        
        // UPS - bulk tracking with comma-separated numbers
        if (grouped.UPS.length > 0) {
            const trackingNumbers = grouped.UPS.map(item => item.trackingNumber).join(',');
            trackingUrls.UPS = `https://www.ups.com/track?loc=en_US&requester=ST/&tracknum=${trackingNumbers}`;
        }
        
        res.json({ 
            success: true, 
            grouped: grouped,
            trackingUrls: trackingUrls,
            counts: {
                USPS: grouped.USPS.length,
                FedEx: grouped.FedEx.length,
                UPS: grouped.UPS.length,
                Other: grouped.Other.length,
                total: grouped.USPS.length + grouped.FedEx.length + grouped.UPS.length + grouped.Other.length
            }
        });
        
    } catch (error) {
        console.error('❌ Error grouping by carrier:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// GET - Single dropshipment
router.get('/api/dropshipments/:id', async (req, res) => {
    try {
        const dropshipment = await Dropshipment.findById(req.params.id)
            .populate('poId', 'poUrl poNumber shippingTracking shippingCarrier')
            .lean();

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
        const dropshipment = await Dropshipment.findById(req.params.id);
        if (!dropshipment) {
            return res.status(404).json({ success: false, error: 'Dropshipment not found' });
        }

        // If updating poUrl, trackingNumber, or carrier, update the Purchase Order instead
        let poUpdates = {};

        if (req.body.poUrl !== undefined) {
            poUpdates.poUrl = req.body.poUrl;
            delete req.body.poUrl;
        }

        if (req.body.trackingNumber !== undefined) {
            poUpdates.shippingTracking = req.body.trackingNumber;
            delete req.body.trackingNumber;
        }

        if (req.body.carrier !== undefined) {
            poUpdates.shippingCarrier = req.body.carrier;
            delete req.body.carrier;
        }

        // Update the PO if there are any PO-related fields
        if (dropshipment.poId && Object.keys(poUpdates).length > 0) {
            await PurchaseOrder.findByIdAndUpdate(dropshipment.poId, poUpdates);
            console.log(`✅ Updated PO fields for: ${dropshipment.poNumber}`, poUpdates);

            // If only updating PO fields, return the updated dropshipment with populated poId
            if (Object.keys(req.body).length === 0) {
                const updated = await Dropshipment.findById(req.params.id)
                    .populate('poId', 'poUrl poNumber shippingTracking shippingCarrier');
                return res.json({ success: true, dropshipment: updated });
            }
        } else if (Object.keys(poUpdates).length > 0) {
            console.log(`⚠️ Warning: Dropshipment ${dropshipment.poNumber} has no linked PO (poId is null)`);
        } const updateData = {
            ...req.body,
            updatedBy: req.user?.username || req.session?.username || 'system'
        };

        const dropshipmentUpdate = await Dropshipment.findByIdAndUpdate(
            req.params.id,
            updateData,
            { new: true, runValidators: true }
        ).populate('poId', 'poUrl poNumber shippingTracking shippingCarrier');

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

        const dropshipment = await Dropshipment.findById(req.params.id)
            .populate('poId', 'poUrl poNumber shippingTracking shippingCarrier');

        if (!dropshipment) {
            return res.status(404).json({ success: false, error: 'Dropshipment not found' });
        }

        console.log(`🔍 Checking dropshipment ${dropshipment.poNumber}:`, {
            hasPoId: !!dropshipment.poId,
            poTracking: dropshipment.poId?.shippingTracking,
            dropshipTracking: dropshipment.trackingNumber,
            poCarrier: dropshipment.poId?.shippingCarrier,
            dropshipCarrier: dropshipment.carrier
        });

        // Get tracking from PO if available
        const trackingNumber = (dropshipment.poId && dropshipment.poId.shippingTracking) 
            ? dropshipment.poId.shippingTracking 
            : dropshipment.trackingNumber;
        
        const carrier = (dropshipment.poId && dropshipment.poId.shippingCarrier) 
            ? dropshipment.poId.shippingCarrier 
            : (dropshipment.carrier || 'USPS');

        if (!trackingNumber) {
            let errorMsg = 'No tracking number available';
            if (!dropshipment.poId) {
                errorMsg += ' - Dropshipment not linked to a PO. Try syncing from POs.';
            } else if (!dropshipment.poId.shippingTracking && !dropshipment.trackingNumber) {
                errorMsg += ' - Please add a tracking number to the PO or dropshipment first.';
            }
            return res.status(400).json({ success: false, error: errorMsg });
        }

        // Generate tracking URL
        const trackingUrl = generateTrackingUrl(carrier, trackingNumber);

        console.log(`🤖 AI checking tracking for ${trackingNumber} (${carrier})...`);
        console.log(`🔗 URL: ${trackingUrl}`);

        const prompt = `You are a shipping tracking assistant. I need you to check the shipping status for this package:

Tracking Number: ${trackingNumber}
Carrier: ${carrier}
Tracking URL: ${trackingUrl}

Please visit the tracking page and extract the current shipping information. Return ONLY a valid JSON object with this structure:
{
  "status": "current status (must be one of: Shipped, In Transit, Out for Delivery, Delivered, Exception)",
  "location": "current location or last scan location",
  "lastUpdate": "timestamp of last update",
  "description": "brief description of current status",
  "estimatedDelivery": "estimated delivery date if available (or null)",
  "events": [
    {
      "timestamp": "event date/time",
      "status": "event status",
      "location": "event location",
      "description": "event description"
    }
  ]
}

If you cannot access or parse the tracking information, return:
{
  "error": "Unable to retrieve tracking information",
  "message": "detailed explanation"
}

Return ONLY valid JSON, no markdown formatting or extra text.`;

        const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash-exp' });
        const result = await model.generateContent(prompt);
        const response = await result.response;
        let text = response.text();

        // Clean up response
        text = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();

        console.log('📄 AI Response:', text.substring(0, 200) + '...');

        let trackingInfo;
        try {
            trackingInfo = JSON.parse(text);
        } catch (parseError) {
            console.error('❌ Failed to parse AI response:', text);
            return res.status(500).json({
                success: false,
                error: 'Failed to parse AI response. The AI may not have been able to access the tracking page.',
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
                message: trackingInfo.message || 'AI could not retrieve tracking information'
            });
        }

        // Update dropshipment with AI findings
        dropshipment.shippingStatus = trackingInfo.status;
        dropshipment.lastTrackingUpdate = new Date();
        dropshipment.aiLastChecked = new Date();
        dropshipment.aiCheckStatus = 'Success';

        if (trackingInfo.estimatedDelivery && !dropshipment.estimatedDelivery) {
            try {
                dropshipment.estimatedDelivery = new Date(trackingInfo.estimatedDelivery);
            } catch (e) {
                console.log('⚠️ Could not parse estimated delivery date');
            }
        }

        // Add tracking events to history
        if (trackingInfo.events && Array.isArray(trackingInfo.events)) {
            trackingInfo.events.slice(0, 10).forEach(event => {
                dropshipment.trackingHistory.push({
                    status: event.status,
                    location: event.location,
                    description: event.description,
                    timestamp: new Date(event.timestamp || Date.now()),
                    checkedAt: new Date()
                });
            });
        }

        // Set delivered date if status is Delivered
        if (trackingInfo.status === 'Delivered' && !dropshipment.actualDelivery) {
            dropshipment.actualDelivery = new Date();
        }

        await dropshipment.save();

        console.log(`✅ AI updated tracking for ${trackingNumber}: ${trackingInfo.status}`);

        res.json({
            success: true,
            message: 'AI successfully checked tracking',
            trackingInfo: trackingInfo,
            dropshipment: dropshipment
        });

    } catch (error) {
        console.error('❌ Error in AI check:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// POST - Update tracking status manually
router.post('/api/dropshipments/:id/update-status', async (req, res) => {
    try {
        const { status, location, notes } = req.body;
        
        const dropshipment = await Dropshipment.findById(req.params.id);
        
        if (!dropshipment) {
            return res.status(404).json({ success: false, error: 'Dropshipment not found' });
        }

        // Update status
        dropshipment.shippingStatus = status;
        dropshipment.lastTrackingUpdate = new Date();
        
        // Add to tracking history
        if (status || location || notes) {
            dropshipment.trackingHistory.push({
                status: status || dropshipment.shippingStatus,
                location: location || '',
                description: notes || 'Manual status update',
                timestamp: new Date(),
                checkedAt: new Date()
            });
        }
        
        // If delivered, set actual delivery date
        if (status === 'Delivered' && !dropshipment.actualDelivery) {
            dropshipment.actualDelivery = new Date();
        }
        
        await dropshipment.save();
        
        console.log(`✅ Updated tracking status for ${dropshipment.poNumber}: ${status}`);
        
        res.json({ success: true, dropshipment });
        
    } catch (error) {
        console.error('❌ Error updating status:', error);
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
                // Update poId if not set (to link to PO for URL and tracking access)
                let needsUpdate = false;

                if (!existing.poId) {
                    existing.poId = po._id;
                    needsUpdate = true;
                    console.log(`✅ Linked ${po.poNumber} to PO`);
                }

                if (needsUpdate) {
                    await existing.save();
                    updated++;
                } else {
                    skipped++;
                }
                continue;
            }

            // Create new dropshipment entry
            const dropshipment = new Dropshipment({
                poNumber: po.poNumber,
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
                // Tracking fields will be read from PO via poId
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
