// routes/purchaseOrders.js
const express = require('express');
const multer = require('multer');
const Papa = require('papaparse');
const PurchaseOrder = require('../models/PurchaseOrder');
const StatusOption = require('../models/StatusOption');
const Note = require('../models/Note');

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

    // Get status options from database
    let statusOptions = await StatusOption.find().sort({ name: 1 });

    // If no status options exist, create default ones
    if (statusOptions.length === 0) {
      const defaultStatuses = [
        'In Progress',
        'On Hold',
        'Approved',
        'Rejected',
        'Completed',
        'Cancelled'
      ];

      const statusPromises = defaultStatuses.map(name =>
        StatusOption.create({ name, isDefault: true })
      );

      statusOptions = await Promise.all(statusPromises);
    }

    // Extract just the names for the dropdown
    const statusOptionNames = statusOptions.map(option => option.name);

    res.render('dashboard', {
      purchaseOrders,
      uniqueNSStatuses: uniqueNSStatuses.sort(),
      uniqueStatuses: uniqueStatuses.sort(),
      statusOptions: statusOptionNames,
      allStatusOptions: statusOptions // Send full objects for management
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Add new note (replaces the old update notes functionality)
router.post('/:id/notes', async (req, res) => {
  try {
    const { notes } = req.body;
    
    // Only create a note if there's actual content
    if (!notes || !notes.trim()) {
      return res.json({ success: true });
    }
    
    const purchaseOrder = await PurchaseOrder.findById(req.params.id);
    if (!purchaseOrder) {
      return res.status(404).json({ error: 'Purchase order not found' });
    }
    
    // Create new note record
    const note = await Note.create({
      poId: purchaseOrder._id,
      poNumber: purchaseOrder.poNumber,
      vendor: purchaseOrder.vendor,
      content: notes.trim()
    });
    
    // Update the PO's notes field with the latest note for display
    await PurchaseOrder.findByIdAndUpdate(
      req.params.id,
      { notes: notes.trim(), updatedAt: new Date() }
    );
    
    console.log(`Added note for PO ${purchaseOrder.poNumber}: "${notes.trim()}"`);
    res.json({ success: true, noteId: note._id });
  } catch (error) {
    console.error('Note creation error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get notes history for a PO
router.get('/:id/notes-history', async (req, res) => {
  try {
    const purchaseOrder = await PurchaseOrder.findById(req.params.id);
    if (!purchaseOrder) {
      return res.status(404).json({ error: 'Purchase order not found' });
    }
    
    const notes = await Note.find({ poId: req.params.id })
      .sort({ createdAt: -1 }); // Most recent first
    
    res.json(notes);
  } catch (error) {
    console.error('Notes history error:', error);
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

// Update next update date
router.put('/:id/next-update-date', async (req, res) => {
  try {
    const { nextUpdateDate } = req.body;
    const dateValue = nextUpdateDate ? new Date(nextUpdateDate) : null;

    const updated = await PurchaseOrder.findByIdAndUpdate(
      req.params.id,
      { nextUpdateDate: dateValue, updatedAt: new Date() },
      { new: true }
    );
    console.log(`Updated next update date for PO ${updated.poNumber}: ${nextUpdateDate || 'cleared'}`);
    res.json({ success: true });
  } catch (error) {
    console.error('Next update date error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Update PO URL
router.put('/:id/url', async (req, res) => {
  try {
    const { url } = req.body;

    const updated = await PurchaseOrder.findByIdAndUpdate(
      req.params.id,
      { poUrl: url || '', updatedAt: new Date() },
      { new: true }
    );
    console.log(`Updated URL for PO ${updated.poNumber}: ${url || 'cleared'}`);
    res.json({ success: true });
  } catch (error) {
    console.error('URL update error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Status Options Management Routes// Get all status options
router.get('/status-options', async (req, res) => {
  try {
    const statusOptions = await StatusOption.find().sort({ name: 1 });
    res.json(statusOptions);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Add new status option
router.post('/status-options', async (req, res) => {
  try {
    const { name } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({ error: 'Status name is required' });
    }

    const statusOption = await StatusOption.create({
      name: name.trim(),
      isDefault: false
    });

    console.log(`Added new status option: "${statusOption.name}"`);
    res.json({ success: true, statusOption });
  } catch (error) {
    if (error.code === 11000) {
      res.status(400).json({ error: 'Status option already exists' });
    } else {
      console.error('Status option creation error:', error);
      res.status(500).json({ error: error.message });
    }
  }
});

// Delete status option
router.delete('/status-options/:id', async (req, res) => {
  try {
    const statusOption = await StatusOption.findById(req.params.id);

    if (!statusOption) {
      return res.status(404).json({ error: 'Status option not found' });
    }

    // Check if this status is being used by any purchase orders
    const usageCount = await PurchaseOrder.countDocuments({ status: statusOption.name });

    if (usageCount > 0) {
      return res.status(400).json({
        error: `Cannot delete "${statusOption.name}" - it's being used by ${usageCount} purchase order(s)`
      });
    }

    await StatusOption.findByIdAndDelete(req.params.id);
    console.log(`Deleted status option: "${statusOption.name}"`);
    res.json({ success: true });
  } catch (error) {
    console.error('Status option deletion error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Notes Management Routes

// Get all notes with filtering
router.get('/notes', async (req, res) => {
  try {
    const { 
      poNumber, 
      vendor, 
      dateFrom, 
      dateTo, 
      search,
      limit = 100,
      skip = 0 
    } = req.query;
    
    // Build filter query
    let filter = {};
    
    if (poNumber) {
      filter.poNumber = new RegExp(poNumber, 'i');
    }
    
    if (vendor) {
      filter.vendor = new RegExp(vendor, 'i');
    }
    
    if (search) {
      filter.content = new RegExp(search, 'i');
    }
    
    if (dateFrom || dateTo) {
      filter.createdAt = {};
      if (dateFrom) {
        filter.createdAt.$gte = new Date(dateFrom);
      }
      if (dateTo) {
        const endDate = new Date(dateTo);
        endDate.setHours(23, 59, 59, 999); // End of day
        filter.createdAt.$lte = endDate;
      }
    }
    
    const notes = await Note.find(filter)
      .sort({ createdAt: -1 })
      .limit(parseInt(limit))
      .skip(parseInt(skip));
    
    const totalCount = await Note.countDocuments(filter);
    
    res.json({
      notes,
      totalCount,
      hasMore: totalCount > parseInt(skip) + parseInt(limit)
    });
  } catch (error) {
    console.error('Notes query error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Delete a specific note
router.delete('/notes/:noteId', async (req, res) => {
  try {
    const note = await Note.findById(req.params.noteId);
    
    if (!note) {
      return res.status(404).json({ error: 'Note not found' });
    }
    
    await Note.findByIdAndDelete(req.params.noteId);
    
    // Update the PO's current notes field with the most recent remaining note
    const latestNote = await Note.findOne({ poId: note.poId })
      .sort({ createdAt: -1 });
    
    await PurchaseOrder.findByIdAndUpdate(
      note.poId,
      { 
        notes: latestNote ? latestNote.content : '',
        updatedAt: new Date()
      }
    );
    
    console.log(`Deleted note for PO ${note.poNumber}`);
    res.json({ success: true });
  } catch (error) {
    console.error('Note deletion error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Notes Management Page
router.get('/notes-manager', async (req, res) => {
  try {
    // Get summary statistics
    const totalNotes = await Note.countDocuments();
    const recentNotes = await Note.countDocuments({
      createdAt: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) } // Last 7 days
    });
    
    // Get unique PO numbers and vendors for filtering
    const uniquePOs = await Note.distinct('poNumber');
    const uniqueVendors = await Note.distinct('vendor');
    
    res.render('notes-manager', {
      totalNotes,
      recentNotes,
      uniquePOs: uniquePOs.sort(),
      uniqueVendors: uniqueVendors.sort()
    });
  } catch (error) {
    console.error('Notes manager error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Migration route to convert existing PO notes to individual Note records
router.post('/migrate-notes', async (req, res) => {
  try {
    // Find all PurchaseOrders that have notes
    const purchaseOrdersWithNotes = await PurchaseOrder.find({
      notes: { $exists: true, $ne: '' }
    });

    let migratedCount = 0;
    let errorCount = 0;
    let skippedCount = 0;

    for (const po of purchaseOrdersWithNotes) {
      try {
        // Check if we already have a note for this PO (to avoid duplicates)
        const existingNote = await Note.findOne({ 
          poId: po._id,
          content: po.notes 
        });

        if (existingNote) {
          skippedCount++;
          continue;
        }

        // Create a new Note record
        const newNote = new Note({
          poId: po._id,
          poNumber: po.poNumber,
          vendor: po.vendor || 'Unknown Vendor',
          content: po.notes,
          createdAt: po.updatedAt || po.createdAt || new Date()
        });

        await newNote.save();
        migratedCount++;

      } catch (error) {
        console.error(`Error migrating PO ${po.poNumber}:`, error.message);
        errorCount++;
      }
    }

    res.json({
      success: true,
      message: 'Migration completed',
      migrated: migratedCount,
      errors: errorCount,
      skipped: skippedCount,
      total: purchaseOrdersWithNotes.length
    });

  } catch (error) {
    console.error('Migration error:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;