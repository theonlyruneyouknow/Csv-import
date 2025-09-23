// routes/receiving.js
const express = require('express');
const PurchaseOrder = require('../models/PurchaseOrder');
const LineItem = require('../models/LineItem');

const router = express.Router();

// Helper function to calculate the earliest upcoming ETA from line items
const calculateUpcomingETA = (lineItems) => {
  if (!lineItems || lineItems.length === 0) return null;
  
  const now = new Date();
  const upcomingETAs = lineItems
    .filter(item => 
      item.eta && 
      new Date(item.eta) > now && 
      !item.billVarianceField // Only consider items without Bill Variance Field values
    )
    .map(item => new Date(item.eta))
    .sort((a, b) => a - b); // Sort chronologically
  
  return upcomingETAs.length > 0 ? upcomingETAs[0] : null;
};

// Helper function to format ETA display
const formatETA = (eta) => {
  if (!eta) return 'No ETA';
  
  const etaDate = new Date(eta);
  const now = new Date();
  const diffDays = Math.ceil((etaDate - now) / (1000 * 60 * 60 * 24));
  
  if (diffDays < 0) return 'Past Due';
  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Tomorrow';
  if (diffDays <= 7) return `${diffDays} days`;
  
  return etaDate.toLocaleDateString('en-US', { 
    month: 'short', 
    day: 'numeric',
    year: etaDate.getFullYear() !== now.getFullYear() ? 'numeric' : undefined
  });
};

// Receiving Dashboard - Main route
router.get('/', async (req, res) => {
  try {
    console.log('🚚 RECEIVING DASHBOARD - Loading data...');

    // Get POs that are likely to be received soon
    // Filter for POs that are not hidden and have relevant statuses
    const receivingPOs = await PurchaseOrder.find({
      isHidden: { $ne: true },
      $or: [
        { nsStatus: { $regex: /pending receipt|shipped|in transit/i } },
        { status: { $regex: /shipped|in transit|ready to receive/i } },
        { eta: { $exists: true, $ne: null } }, // Has ETA set
        { attachments: { $exists: true, $ne: [] } } // Has attachments (likely shipping docs)
      ]
    }).sort({ 
      eta: 1,  // Sort by ETA first (earliest first)
      date: -1 // Then by PO date (newest first)
    });

    // Get line items for received vs expected tracking
    const poNumbers = receivingPOs.map(po => po.poNumber);
    const lineItems = await LineItem.find({
      poNumber: { $in: poNumbers },
      isHidden: { $ne: true }
    });

    // Create a map of line items by PO number
    const lineItemsByPO = {};
    lineItems.forEach(item => {
      if (!lineItemsByPO[item.poNumber]) {
        lineItemsByPO[item.poNumber] = [];
      }
      lineItemsByPO[item.poNumber].push(item);
    });

    // Add line item data to each PO and calculate ETA
    receivingPOs.forEach(po => {
      po.lineItemsData = lineItemsByPO[po.poNumber] || [];
      
      // Calculate receiving stats
      const totalItems = po.lineItemsData.length;
      const receivedItems = po.lineItemsData.filter(item => item.received).length;
      const pendingItems = totalItems - receivedItems;
      
      po.receivingStats = {
        total: totalItems,
        received: receivedItems,
        pending: pendingItems,
        percentComplete: totalItems > 0 ? Math.round((receivedItems / totalItems) * 100) : 0
      };
      
      // Calculate and format ETA based on line items
      const upcomingETA = calculateUpcomingETA(po.lineItemsData);
      po.upcomingETA = upcomingETA;
      po.formattedETA = formatETA(upcomingETA);
    });

    // Get unique vendors for filtering
    const uniqueVendors = [...new Set(receivingPOs.map(po => po.vendor).filter(Boolean))].sort();

    // Get unique statuses for filtering
    const uniqueNSStatuses = [...new Set(receivingPOs.map(po => po.nsStatus).filter(Boolean))].sort();
    const uniqueStatuses = [...new Set(receivingPOs.map(po => po.status).filter(Boolean))].sort();

    console.log(`📦 Found ${receivingPOs.length} POs for receiving dashboard`);

    res.render('receiving-dashboard', {
      purchaseOrders: receivingPOs,
      uniqueVendors,
      uniqueNSStatuses,
      uniqueStatuses,
      user: req.user,
      pageTitle: 'Receiving Dashboard',
      currentPage: 'receiving'
    });

  } catch (error) {
    console.error('❌ Receiving dashboard error:', error);
    res.status(500).json({ error: error.message });
  }
});

// API route to mark line items as received
router.post('/receive-item/:itemId', async (req, res) => {
  try {
    const { itemId } = req.params;
    const { received, notes } = req.body;
    const receivedBy = req.user ? req.user.username : 'Unknown User';

    const lineItem = await LineItem.findByIdAndUpdate(itemId, {
      received: received === true || received === 'true',
      receivedDate: received ? new Date() : null,
      receivedBy: received ? receivedBy : null,
      receivingNotes: notes || ''
    }, { new: true });

    if (!lineItem) {
      return res.status(404).json({ success: false, error: 'Line item not found' });
    }

    res.json({ 
      success: true, 
      lineItem,
      message: `Item ${received ? 'marked as received' : 'unmarked'}` 
    });

  } catch (error) {
    console.error('Receive item error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// API route to bulk receive all items for a PO
router.post('/receive-po/:poId', async (req, res) => {
  try {
    const { poId } = req.params;
    const { received } = req.body;
    const receivedBy = req.user ? req.user.username : 'Unknown User';

    // Find the PO
    const po = await PurchaseOrder.findById(poId);
    if (!po) {
      return res.status(404).json({ success: false, error: 'PO not found' });
    }

    // Update all line items for this PO
    const updateData = {
      received: received === true || received === 'true',
      receivedDate: received ? new Date() : null,
      receivedBy: received ? receivedBy : null
    };

    const result = await LineItem.updateMany(
      { poNumber: po.poNumber, isHidden: { $ne: true } },
      updateData
    );

    res.json({ 
      success: true, 
      modifiedCount: result.modifiedCount,
      message: `${received ? 'Received' : 'Unreceived'} all items for PO ${po.poNumber}` 
    });

  } catch (error) {
    console.error('Receive PO error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;
