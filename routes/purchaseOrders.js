// routes/purchaseOrders.js
const express = require('express');
const multer = require('multer');
const Papa = require('papaparse');
const PurchaseOrder = require('../models/PurchaseOrder');

const router = express.Router();
const upload = multer({ dest: 'uploads/' });

// Upload and parse CSV
router.post('/upload', upload.single('csvFile'), async (req, res) => {
  try {
    const fs = require('fs');
    const fileContent = fs.readFileSync(req.file.path, 'utf8');
    
    const parsed = Papa.parse(fileContent, { header: false });
    const reportDate = parsed.data[3][0]; // Extract report date
    
    // Extract data rows (skip headers and totals)
    const dataStartIndex = 8;
    let dataEndIndex = parsed.data.length;
    
    for (let i = dataStartIndex; i < parsed.data.length; i++) {
      if (parsed.data[i][0] && parsed.data[i][0].includes('Total')) {
        dataEndIndex = i;
        break;
      }
    }
    
    const dataRows = parsed.data.slice(dataStartIndex, dataEndIndex);
    
    // Process each PO individually to preserve notes and custom status
    for (const row of dataRows) {
      const poNumber = row[2]; // PO number is the unique identifier
      const csvStatus = row[4]; // Status from CSV (this goes to NS Status!)
      
      // Find existing PO by PO number
      const existingPO = await PurchaseOrder.findOne({ poNumber: poNumber });
      
      if (existingPO) {
        // Update existing PO - CSV status goes to nsStatus, preserve custom status
        await PurchaseOrder.findByIdAndUpdate(existingPO._id, {
          reportDate,
          date: row[1],
          poNumber: poNumber,
          vendor: row[3],
          nsStatus: csvStatus, // CSV status ALWAYS goes to NS Status
          amount: parseFloat((row[5] || '0').replace(/[$,]/g, '')),
          location: row[6],
          updatedAt: new Date(),
          notes: existingPO.notes, // Keep existing notes!
          status: existingPO.status // Keep existing custom Status (not from CSV)!
        });
        console.log(`Updated PO ${poNumber} - NS Status: "${csvStatus}", Custom Status: "${existingPO.status}"`);
      } else {
        // Create new PO - CSV status goes to nsStatus, custom status starts empty
        await PurchaseOrder.create({
          reportDate,
          date: row[1],
          poNumber: poNumber,
          vendor: row[3],
          nsStatus: csvStatus, // CSV status goes to NS Status
          status: '', // Custom status starts EMPTY
          amount: parseFloat((row[5] || '0').replace(/[$,]/g, '')),
          location: row[6],
          notes: '',
          createdAt: new Date(),
          updatedAt: new Date()
        });
        console.log(`Created new PO ${poNumber} - NS Status: "${csvStatus}", Custom Status: empty`);
      }
    }
    
    // Optional: Remove POs that are no longer in the CSV
    const currentPONumbers = dataRows.map(row => row[2]);
    const removedCount = await PurchaseOrder.deleteMany({
      reportDate: reportDate,
      poNumber: { $nin: currentPONumbers }
    });
    
    if (removedCount.deletedCount > 0) {
      console.log(`Removed ${removedCount.deletedCount} POs that are no longer in the report`);
    }
    
    // Clean up uploaded file
    fs.unlinkSync(req.file.path);
    
    res.redirect('/purchase-orders');
  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get all purchase orders with unique status values
router.get('/', async (req, res) => {
  try {
    const purchaseOrders = await PurchaseOrder.find().sort({ date: 1 });
    
    // Get unique NS Status values for filters (from CSV)
    const uniqueNSStatuses = [...new Set(purchaseOrders.map(po => po.nsStatus).filter(Boolean))];
    
    // Get unique custom Status values for filters
    const uniqueStatuses = [...new Set(purchaseOrders.map(po => po.status).filter(Boolean))];
    
    // Get existing custom status values from database
    const existingStatuses = [...new Set(purchaseOrders.map(po => po.status).filter(Boolean))];
    
    // Default custom Status options that are always available
    const defaultStatuses = [
      'In Progress',
      'On Hold', 
      'Approved',
      'Rejected',
      'Completed',
      'Cancelled'
    ];
    
    // Combine existing and default options, remove duplicates
    const allStatusOptions = [...new Set([...existingStatuses, ...defaultStatuses])].sort();
    
    res.render('dashboard', { 
      purchaseOrders,
      uniqueNSStatuses: uniqueNSStatuses.sort(),
      uniqueStatuses: uniqueStatuses.sort(),
      statusOptions: allStatusOptions
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update notes
router.put('/:id/notes', async (req, res) => {
  try {
    const updated = await PurchaseOrder.findByIdAndUpdate(
      req.params.id,
      { notes: req.body.notes, updatedAt: new Date() },
      { new: true }
    );
    console.log(`Updated notes for PO ${updated.poNumber}: "${req.body.notes}"`);
    res.json({ success: true });
  } catch (error) {
    console.error('Notes update error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Update custom Status
router.put('/:id/status', async (req, res) => {
  try {
    const updated = await PurchaseOrder.findByIdAndUpdate(
      req.params.id,
      { status: req.body.status, updatedAt: new Date() },
      { new: true }
    );
    console.log(`Updated custom Status for PO ${updated.poNumber}: "${req.body.status}"`);
    res.json({ success: true });
  } catch (error) {
    console.error('Status update error:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;