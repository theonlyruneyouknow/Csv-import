// routes/purchaseOrders.js
const express = require('express');
const multer = require('multer');
const Papa = require('papaparse');
const PurchaseOrder = require('../models/PurchaseOrder');
const StatusOption = require('../models/StatusOption');
const Note = require('../models/Note');
const LineItem = require('../models/LineItem');

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

// Upload and parse Line Items CSV
router.post('/upload-line-items', upload.single('lineItemsCsvFile'), async (req, res) => {
  console.log('🚀 LINE ITEMS UPLOAD STARTED - File received!');
  console.log('File info:', req.file ? { name: req.file.originalname, size: req.file.size } : 'NO FILE');

  try {
    const fs = require('fs');
    const fileContent = fs.readFileSync(req.file.path, 'utf8');

    const parsed = Papa.parse(fileContent, { header: false });

    console.log(`CSV has ${parsed.data.length} total rows`);
    console.log('First 10 rows for debugging:');
    parsed.data.slice(0, 10).forEach((row, index) => {
      console.log(`Row ${index}:`, row);
    });

    // Skip header rows and find data - be more flexible with PO detection
    let dataStartIndex = -1;

    // Look for the first row that has a PO number pattern in any reasonable column
    for (let i = 0; i < Math.min(parsed.data.length, 50); i++) { // Check first 50 rows max
      const row = parsed.data[i];
      if (row && row.length >= 6) {
        // Check columns 4, 5, 6 for PO patterns (Document Number is likely column 5)
        for (let col = 4; col <= 6; col++) {
          if (row[col]) {
            const cellValue = row[col].toString().trim();
            // More flexible PO pattern - could be "PO12345", "12345", etc.
            if (cellValue.match(/^(PO)?\d{4,6}$/) || cellValue.match(/^PO\d+$/)) {
              console.log(`Found PO pattern "${cellValue}" at row ${i}, column ${col}`);
              dataStartIndex = i;
              break;
            }
          }
        }
        if (dataStartIndex >= 0) break;
      }
    }

    if (dataStartIndex === -1) {
      // If no PO pattern found, let's see what we have
      console.log('No PO pattern found. Sample of data:');
      parsed.data.slice(0, 20).forEach((row, index) => {
        if (row && row.length >= 6) {
          console.log(`Row ${index}, columns 4-8:`, [row[4], row[5], row[6], row[7], row[8]]);
        }
      });
      throw new Error('No valid data found in CSV file. Expected PO numbers in columns 5-6.');
    }

    const dataRows = parsed.data.slice(dataStartIndex);
    let processedCount = 0;
    let skippedCount = 0;
    let errorCount = 0;

    console.log(`Processing ${dataRows.length} line item rows starting from row ${dataStartIndex}...`);

    // Add counters for different skip reasons
    let skipReasons = {
      notEnoughColumns: 0,
      noPOFound: 0,
      noAccount1215: 0,
      poNotInDatabase: 0,
      duplicate: 0
    };

    for (const row of dataRows) {
      try {
        // Add detailed debugging for first few rows
        if (processedCount + skippedCount < 5) {
          console.log(`\n=== Debugging Row ${processedCount + skippedCount + 1} ===`);
          console.log('Row data:', row);
          console.log('Row length:', row.length);
          console.log('Column 5 (PO):', row[5]);
          console.log('Column 7 (Account):', row[7]);
          console.log('Column 8 (Item Description):', row[8]);
        }

        // Skip if not enough columns or missing key data
        if (!row || row.length < 9) { // Need at least 9 columns for memo in column 8
          if (processedCount + skippedCount < 5) {
            console.log('❌ Skipped: Not enough columns');
          }
          skipReasons.notEnoughColumns++;
          skippedCount++;
          continue;
        }

        // Try to find PO number in columns 4, 5, or 6 (Document Number is column 5)
        let poNumber = null;
        let poColumn = -1;

        for (let col = 4; col <= 6; col++) {
          if (row[col]) {
            const cellValue = row[col].toString().trim();
            if (cellValue.match(/^(PO)?\d{4,6}$/) || cellValue.match(/^PO\d+$/)) {
              poNumber = cellValue.startsWith('PO') ? cellValue : `PO${cellValue}`;
              poColumn = col;
              break;
            }
          }
        }

        if (!poNumber) {
          if (processedCount + skippedCount < 5) {
            console.log('❌ Skipped: No PO number found in columns 4-6');
          }
          skipReasons.noPOFound++;
          skippedCount++;
          continue;
        }

        if (processedCount + skippedCount < 5) {
          console.log('✓ Found PO:', poNumber, 'in column', poColumn);
        }

        // Check if this row has "1215" in the Account column (column 7)
        let account = '';
        if (row[7]) {
          account = row[7].toString().trim();
        }

        // Item description is in column 8
        let memo = '';
        if (row[8]) {
          memo = row[8].toString().trim();
        }

        const date = row[2] ? row[2].toString().trim() : ''; // Date field

        // Only process rows where account starts with "1215" as specified
        if (!account || !account.startsWith('1215')) {
          if (processedCount + skippedCount < 5) {
            console.log('❌ Skipped: Account does not start with 1215. Account:', account ? `"${account.substring(0, 50)}..."` : 'empty');
          }
          skipReasons.noAccount1215++;
          skippedCount++;
          continue;
        }

        // Make sure we have a meaningful item description
        if (!memo || memo.trim() === '') {
          if (processedCount + skippedCount < 5) {
            console.log('❌ Skipped: Empty item description');
          }
          skipReasons.noAccount1215++;
          skippedCount++;
          continue;
        }

        if (processedCount + skippedCount < 5) {
          console.log('✓ Valid 1215 account found:', account.substring(0, 50) + '...');
          console.log('✓ Item description:', memo);
        }

        // Find the corresponding PurchaseOrder
        const purchaseOrder = await PurchaseOrder.findOne({ poNumber: poNumber });

        if (!purchaseOrder) {
          console.log(`Skipping line item for PO ${poNumber} - PO not found in database`);
          if (skipReasons.poNotInDatabase < 5) { // Only show first 5 to avoid spam
            console.log(`Available PO numbers in database:`, await PurchaseOrder.distinct('poNumber'));
          }
          skipReasons.poNotInDatabase++;
          skippedCount++;
          continue;
        }

        console.log(`Found matching PO: ${purchaseOrder.poNumber} (ID: ${purchaseOrder._id})`);

        // Check if this exact line item already exists to avoid duplicates
        const existingLineItem = await LineItem.findOne({
          poId: purchaseOrder._id,
          poNumber: poNumber,
          memo: memo,
          date: date
        });

        if (existingLineItem) {
          console.log(`Skipping duplicate line item for PO ${poNumber}: ${memo.substring(0, 50)}...`);
          skipReasons.duplicate++;
          skippedCount++;
          continue;
        }

        // Create new line item
        console.log(`Creating line item:`, {
          poId: purchaseOrder._id,
          poNumber: poNumber,
          date: date,
          memo: memo.substring(0, 100) + (memo.length > 100 ? '...' : '')
        });

        const newLineItem = await LineItem.create({
          poId: purchaseOrder._id,
          poNumber: poNumber,
          date: date,
          memo: memo,
          createdAt: new Date(),
          updatedAt: new Date()
        });

        processedCount++;
        console.log(`✓ Successfully added line item for PO ${poNumber}: ${memo.substring(0, 50)}... (ID: ${newLineItem._id})`);

      } catch (error) {
        console.error(`Error processing line item row:`, error);
        console.error(`Row data:`, row);
        errorCount++;
      }
    }

    // Clean up uploaded file
    fs.unlinkSync(req.file.path);

    console.log(`Line items import completed: ${processedCount} processed, ${skippedCount} skipped, ${errorCount} errors`);
    console.log('Skip reasons breakdown:');
    console.log(`  - Not enough columns: ${skipReasons.notEnoughColumns}`);
    console.log(`  - No PO number found: ${skipReasons.noPOFound}`);
    console.log(`  - No account starting with 1215: ${skipReasons.noAccount1215}`);
    console.log(`  - PO not in database: ${skipReasons.poNotInDatabase}`);
    console.log(`  - Duplicate entries: ${skipReasons.duplicate}`);

    res.json({
      success: true,
      message: `Line items import completed`,
      stats: {
        processed: processedCount,
        skipped: skippedCount,
        errors: errorCount,
        total: dataRows.length,
        skipReasons: skipReasons
      }
    });

  } catch (error) {
    console.error('Line items upload error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Quick debug route to check existing POs
router.get('/debug/pos', async (req, res) => {
  try {
    const pos = await PurchaseOrder.find({}, 'poNumber vendor').limit(20);
    res.json({
      count: await PurchaseOrder.countDocuments(),
      sample: pos
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Temporary debug route - remove after testing
router.get('/debug/line-items/:poNumber', async (req, res) => {
  try {
    const { poNumber } = req.params;

    // Find the PO
    const po = await PurchaseOrder.findOne({ poNumber: poNumber });
    if (!po) {
      return res.json({ error: 'PO not found', poNumber });
    }

    // Find line items by both poId and poNumber
    const lineItemsByPoId = await LineItem.find({ poId: po._id });
    const lineItemsByPoNumber = await LineItem.find({ poNumber: poNumber });

    res.json({
      poNumber,
      poId: po._id,
      lineItemsByPoId: lineItemsByPoId.length,
      lineItemsByPoNumber: lineItemsByPoNumber.length,
      items: lineItemsByPoId.length > 0 ? lineItemsByPoId : lineItemsByPoNumber
    });
  } catch (error) {
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

// Get line items for a PO
router.get('/:id/line-items', async (req, res) => {
  try {
    const purchaseOrder = await PurchaseOrder.findById(req.params.id);
    if (!purchaseOrder) {
      return res.status(404).json({ error: 'Purchase order not found' });
    }

    const lineItems = await LineItem.find({ poId: req.params.id })
      .sort({ createdAt: -1 }); // Most recent first

    res.json(lineItems);
  } catch (error) {
    console.error('Line items error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Mark line item as received
router.put('/line-items/:lineItemId/received', async (req, res) => {
  try {
    const { received } = req.body;
    const updateData = {
      received: Boolean(received),
      updatedAt: new Date()
    };

    // If marking as received, set receivedDate to now
    if (received) {
      updateData.receivedDate = new Date();
    } else {
      updateData.receivedDate = null;
    }

    const lineItem = await LineItem.findByIdAndUpdate(
      req.params.lineItemId,
      updateData,
      { new: true }
    );

    if (!lineItem) {
      return res.status(404).json({ error: 'Line item not found' });
    }

    console.log(`Line item ${lineItem._id} marked as ${received ? 'received' : 'not received'} for PO ${lineItem.poNumber}`);
    res.json({ success: true, lineItem });
  } catch (error) {
    console.error('Line item received update error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Update line item ETA
router.put('/line-items/:lineItemId/eta', async (req, res) => {
  try {
    const { eta } = req.body;
    const etaValue = eta ? new Date(eta) : null;

    const lineItem = await LineItem.findByIdAndUpdate(
      req.params.lineItemId,
      {
        eta: etaValue,
        updatedAt: new Date()
      },
      { new: true }
    );

    if (!lineItem) {
      return res.status(404).json({ error: 'Line item not found' });
    }

    console.log(`Updated ETA for line item ${lineItem._id} (PO ${lineItem.poNumber}): ${eta || 'cleared'}`);
    res.json({ success: true, lineItem });
  } catch (error) {
    console.error('Line item ETA update error:', error);
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