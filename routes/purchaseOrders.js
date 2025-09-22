// routes/purchaseOrders.js
const express = require('express');
const multer = require('multer');
const Papa = require('papaparse');
const PurchaseOrder = require('../models/PurchaseOrder');
const PrePurchaseOrder = require('../models/PrePurchaseOrder');
const StatusOption = require('../models/StatusOption');
const LineItemStatusOption = require('../models/LineItemStatusOption');
const Note = require('../models/Note');
const LineItem = require('../models/LineItem');
const Task = require('../models/Task');
const trackingService = require('../services/17trackService');

const router = express.Router();
const upload = multer({ dest: 'uploads/' });

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

    // Track which PO numbers were actually processed in this import
    const processedPONumbers = new Set();

    // Process each PO individually to preserve notes and custom status
    for (const row of dataRows) {
      const poNumber = row[2]; // PO number is the unique identifier
      const csvStatus = row[4]; // Status from CSV (this goes to NS Status!)

      // Skip empty rows or invalid PO numbers
      if (!poNumber || !poNumber.trim()) {
        continue;
      }

      // Add to processed list
      processedPONumbers.add(poNumber.trim());

      // Special logging for PO11322 to help debug
      if (poNumber.includes('11322')) {
        console.log(`🎯 FOUND PO11322 in import! Processing...`);
        console.log(`   Raw PO number from CSV: "${poNumber}"`);
        console.log(`   Trimmed PO number: "${poNumber.trim()}"`);
      }

      // Find existing PO by PO number
      const existingPO = await PurchaseOrder.findOne({ poNumber: poNumber });

      if (existingPO) {
        // Update existing PO - CSV status goes to nsStatus, preserve custom status
        const updateData = {
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
        };

        // 🔄 RESURRECTION LOGIC: If this PO was hidden (especially "Not in import"), unhide it
        if (existingPO.isHidden) {
          console.log(`🔄 RESURRECTING PO ${poNumber}!`);
          console.log(`   Previously hidden: ${existingPO.hiddenReason} (by ${existingPO.hiddenBy} on ${existingPO.hiddenDate})`);
          console.log(`   Now unhiding PO and associated line items...`);
          
          // Special extra logging for PO11322
          if (poNumber.includes('11322')) {
            console.log(`🎯 PO11322 RESURRECTION DETECTED!`);
            console.log(`   This is the PO we're specifically testing!`);
          }
          
          // FIRST: Unhide the PO using $unset (separate operation)
          await PurchaseOrder.findByIdAndUpdate(existingPO._id, {
            $unset: {
              isHidden: 1,
              hiddenDate: 1,
              hiddenReason: 1,
              hiddenBy: 1
            }
          });
          console.log(`   ✅ PO ${poNumber} unhidden successfully`);

          // Also unhide any line items that were hidden due to parent PO being hidden
          try {
            const lineItemResult = await LineItem.updateMany(
              { poNumber: poNumber, hiddenReason: 'Parent PO hidden' },
              {
                $unset: {
                  isHidden: 1,
                  hiddenDate: 1,
                  hiddenReason: 1,
                  hiddenBy: 1
                }
              }
            );
            console.log(`   ✅ Unhidden ${lineItemResult.modifiedCount} line items for PO ${poNumber}`);
          } catch (lineItemError) {
            console.error(`   ❌ Error unhiding line items for PO ${poNumber}:`, lineItemError);
          }
        }

        // THEN: Update the regular fields (separate operation)
        await PurchaseOrder.findByIdAndUpdate(existingPO._id, updateData);
        console.log(`Updated PO ${poNumber} - NS Status: "${csvStatus}", Custom Status: "${existingPO.status}"${existingPO.isHidden ? ' (UNHIDDEN)' : ''}`);
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

    // Hide POs that are no longer in the CSV (soft delete)
    // Use the actually processed PO numbers, not raw CSV data
    const currentPONumbers = Array.from(processedPONumbers);
    console.log(`📋 Processed ${currentPONumbers.length} PO numbers in this import:`, currentPONumbers.slice(0, 5), '...');
    
    const hiddenResult = await PurchaseOrder.updateMany(
      {
        reportDate: reportDate,
        poNumber: { $nin: currentPONumbers },
        isHidden: { $ne: true } // Only hide POs that aren't already hidden
      },
      {
        $set: {
          isHidden: true,
          hiddenDate: new Date(),
          hiddenReason: 'Not in import',
          hiddenBy: 'System'
        }
      }
    );

    if (hiddenResult.modifiedCount > 0) {
      console.log(`🫥 Hidden ${hiddenResult.modifiedCount} POs that are no longer in the report`);
      console.log(`🔍 These POs were NOT in the current import and have been hidden`);
    } else {
      console.log(`✅ No POs needed to be hidden - all existing POs are still in the import`);
    }
      
      // Also hide line items for these hidden POs
      const hiddenPONumbers = await PurchaseOrder.find({
        reportDate: reportDate,
        poNumber: { $nin: currentPONumbers },
        isHidden: true
      }, 'poNumber');
      
      const hiddenPONumbersArray = hiddenPONumbers.map(po => po.poNumber);
      
      if (hiddenPONumbersArray.length > 0) {
        const hiddenLineItemsResult = await LineItem.updateMany(
          {
            poNumber: { $in: hiddenPONumbersArray },
            isHidden: { $ne: true }
          },
          {
            $set: {
              isHidden: true,
              hiddenDate: new Date(),
              hiddenReason: 'Parent PO hidden',
              hiddenBy: 'System'
            }
          }
        );
        
        if (hiddenLineItemsResult.modifiedCount > 0) {
          console.log(`Also hidden ${hiddenLineItemsResult.modifiedCount} line items for hidden POs`);
        }
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
          console.log('Column 3 (Quantity):', row[3]);
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

        // Extract quantity (typically in column 3 for NetSuite exports)
        let quantity = null;
        if (row[3]) {
          const quantityStr = row[3].toString().trim();
          // Remove commas from number strings like "6,000" -> "6000"
          const cleanQuantityStr = quantityStr.replace(/,/g, '');
          const quantityNum = parseFloat(cleanQuantityStr);
          if (!isNaN(quantityNum) && quantityNum > 0) {
            quantity = quantityNum;
          }
        }

        // Extract unit of measure if available (often in column 4)
        let unit = '';
        if (row[4] && row[4].toString().trim() !== '') {
          unit = row[4].toString().trim();
        }

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
          memo: memo.substring(0, 100) + (memo.length > 100 ? '...' : ''),
          quantity: quantity,
          unit: unit
        });

        // Extract SKU from column 0 (first column)
        let sku = '';
        if (row[0]) {
          sku = row[0].toString().trim();
        }

        const lineItemData = {
          poId: purchaseOrder._id,
          poNumber: poNumber,
          sku: sku,
          date: date,
          memo: memo,
          createdAt: new Date(),
          updatedAt: new Date()
        };

        // Add quantity if we found one
        if (quantity !== null) {
          lineItemData.quantityExpected = quantity;
        }

        // Add unit if we found one
        if (unit !== '') {
          lineItemData.unit = unit;
        }

        const newLineItem = await LineItem.create(lineItemData);

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

// Debug route for pre-purchase orders
router.get('/debug/pre-pos', async (req, res) => {
  try {
    const prePOs = await PrePurchaseOrder.find().limit(20);
    const count = await PrePurchaseOrder.countDocuments();

    console.log(`🔍 DEBUG: Found ${count} pre-purchase orders in database`);
    prePOs.forEach((prePO, index) => {
      console.log(`  ${index + 1}. ID: ${prePO._id}, Vendor: ${prePO.vendor}, Status: ${prePO.status}, Priority: ${prePO.priority}`);
    });

    res.json({
      count: count,
      prePurchaseOrders: prePOs,
      message: `Found ${count} pre-purchase orders`
    });
  } catch (error) {
    console.error('Debug pre-PO route error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Debug route to see what the dashboard route finds
router.get('/debug/dashboard-data', async (req, res) => {
  try {
    console.log('🔍 DASHBOARD DEBUG - Fetching same data as dashboard route...');

    const purchaseOrders = await PurchaseOrder.find().sort({ date: 1 });
    const prePurchaseOrders = await PrePurchaseOrder.find({ convertedToPO: false }).sort({ createdAt: -1 });

    console.log(`📊 Purchase Orders: ${purchaseOrders.length}`);
    console.log(`📋 Pre-Purchase Orders: ${prePurchaseOrders.length}`);

    console.log('Pre-purchase orders details:');
    prePurchaseOrders.forEach((prePO, index) => {
      console.log(`  ${index + 1}. ${prePO.vendor} - ${prePO.status} - ${prePO.priority} - convertedToPO: ${prePO.convertedToPO}`);
    });

    res.json({
      purchaseOrdersCount: purchaseOrders.length,
      prePurchaseOrdersCount: prePurchaseOrders.length,
      prePurchaseOrders: prePurchaseOrders,
      message: 'Dashboard data debug'
    });
  } catch (error) {
    console.error('Dashboard debug error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Debug page to show pre-purchase orders in a simple format
router.get('/debug/pre-pos-page', async (req, res) => {
  try {
    const prePurchaseOrders = await PrePurchaseOrder.find({ convertedToPO: false }).sort({ createdAt: -1 });

    console.log(`🔍 DEBUG PAGE: Found ${prePurchaseOrders.length} pre-purchase orders`);

    res.render('debug-pre-pos', {
      prePurchaseOrders
    });
  } catch (error) {
    console.error('Debug page error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Test route to create a sample pre-purchase order
router.post('/debug/create-test-pre-po', async (req, res) => {
  try {
    console.log('🧪 Creating test pre-purchase order...');

    const testPrePO = await PrePurchaseOrder.create({
      vendor: 'Test Vendor',
      items: 'Test items for NetSuite import',
      status: 'Planning',
      priority: 'Medium',
      receiveDate: new Date('2025-08-15'),
      notes: 'This is a test pre-purchase order'
    });

    console.log('✅ Test pre-purchase order created:', testPrePO);
    res.json({ success: true, testPrePO });
  } catch (error) {
    console.error('❌ Test pre-PO creation error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Test route that simulates the exact form submission
router.post('/debug/test-form-submission', async (req, res) => {
  try {
    console.log('🧪 Simulating form submission...');

    // Simulate the exact data that would come from the form
    const formData = {
      vendor: 'Form Test Vendor',
      items: 'Test items from form\nLine 1: Widget A\nLine 2: Widget B',
      status: 'Planning',
      priority: 'High',
      receiveDate: '2025-08-20'
    };

    console.log('📝 Form data to save:', formData);

    const prePO = await PrePurchaseOrder.create({
      vendor: formData.vendor.trim(),
      items: formData.items?.trim() || '',
      status: formData.status || 'Planning',
      priority: formData.priority || 'Medium',
      receiveDate: formData.receiveDate ? new Date(formData.receiveDate) : null,
      notes: ''
    });

    console.log('✅ Form simulation pre-purchase order created:', prePO);

    // Immediately try to find it
    const foundPrePO = await PrePurchaseOrder.findById(prePO._id);
    console.log('🔍 Can we find it again?', !!foundPrePO);

    // Check how many total pre-purchase orders exist
    const totalCount = await PrePurchaseOrder.countDocuments();
    const nonConvertedCount = await PrePurchaseOrder.countDocuments({ convertedToPO: false });

    console.log(`📊 Total pre-purchase orders: ${totalCount}`);
    console.log(`📊 Non-converted pre-purchase orders: ${nonConvertedCount}`);

    res.json({
      success: true,
      prePO,
      foundPrePO: !!foundPrePO,
      totalCount,
      nonConvertedCount,
      message: 'Form simulation successful'
    });
  } catch (error) {
    console.error('❌ Form simulation error:', error);
    res.status(500).json({ error: error.message, stack: error.stack });
  }
});

// Simple route to create and immediately test database operations
router.post('/debug/create-and-verify', async (req, res) => {
  try {
    console.log('🧪 Creating and verifying pre-purchase order...');

    // Create a simple pre-purchase order
    const newPrePO = await PrePurchaseOrder.create({
      vendor: `Test Vendor ${Date.now()}`,
      items: 'Simple test items',
      status: 'Planning',
      priority: 'Medium'
    });

    console.log('✅ Created:', newPrePO);

    // Immediately query all pre-purchase orders
    const allPrePOs = await PrePurchaseOrder.find();
    const nonConvertedPrePOs = await PrePurchaseOrder.find({ convertedToPO: false });

    console.log(`📊 Total in database: ${allPrePOs.length}`);
    console.log(`📊 Non-converted: ${nonConvertedPrePOs.length}`);

    res.json({
      success: true,
      created: newPrePO,
      totalInDB: allPrePOs.length,
      nonConverted: nonConvertedPrePOs.length,
      allPrePOs: allPrePOs.map(p => ({ id: p._id, vendor: p.vendor, convertedToPO: p.convertedToPO }))
    });

  } catch (error) {
    console.error('❌ Create and verify error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Line Items Manager - This must come before parameterized routes!
router.get('/line-items-manager', async (req, res) => {
  try {
    // Get statistics
    const totalLineItems = await LineItem.countDocuments();
    const receivedItems = await LineItem.countDocuments({ status: 'Received' });
    const itemsWithSKU = await LineItem.countDocuments({ sku: { $exists: true, $ne: '' } });
    const itemsWithStatus = await LineItem.countDocuments({ itemStatus: { $exists: true, $ne: null } });

    // Get unique values for filters
    const uniquePONumbers = await LineItem.distinct('poNumber');
    const uniqueStatuses = await LineItem.distinct('status');
    const uniqueSKUs = await LineItem.distinct('sku');

    // Get vendor info from purchase orders
    const vendorInfo = await PurchaseOrder.distinct('vendor');

    res.render('line-items-manager', {
      totalLineItems,
      receivedItems,
      itemsWithSKU,
      itemsWithStatus,
      uniquePONumbers: uniquePONumbers.filter(Boolean).sort(),
      uniqueStatuses: uniqueStatuses.filter(Boolean).sort(),
      uniqueSKUs: uniqueSKUs.filter(Boolean).sort(),
      uniqueVendors: vendorInfo.filter(Boolean).sort(),
      user: req.user // Pass user information for authentication status
    });
  } catch (error) {
    console.error('Line items manager error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Trouble Seed Dashboard - This must come before parameterized routes!
router.get('/trouble-seed', async (req, res) => {
  try {
    const today = new Date();
    const sevenDaysFromNow = new Date(today);
    sevenDaysFromNow.setDate(today.getDate() + 7);
    const fourteenDaysFromNow = new Date(today);
    fourteenDaysFromNow.setDate(today.getDate() + 14);

    // Get filter parameters
    const { category = 'all', vendor = 'all', sortBy = 'poNumber' } = req.query;

    // Base query for items in partially received POs that are not yet received
    const baseMatch = {
      received: false,
      $or: [
        { itemStatus: { $in: ['Pending', 'Ordered', 'Delivery Delay', 'Back Order'] } },
        { itemStatus: { $exists: false } },
        { itemStatus: '' }
      ]
    };

    // Enhanced aggregation pipeline
    const troubleItems = await LineItem.aggregate([
      {
        $lookup: {
          from: 'purchaseorders',
          localField: 'poId',
          foreignField: '_id',
          as: 'purchaseOrder'
        }
      },
      {
        $addFields: {
          vendor: { $arrayElemAt: ['$purchaseOrder.vendor', 0] },
          poNsStatus: { $arrayElemAt: ['$purchaseOrder.nsStatus', 0] },
          poUrl: { $arrayElemAt: ['$purchaseOrder.poUrl', 0] },
          poDate: { $arrayElemAt: ['$purchaseOrder.date', 0] }
        }
      },
      {
        $match: {
          ...baseMatch,
          poNsStatus: { $in: ['Partially Received', 'Pending Receipt'] }
        }
      },
      {
        $lookup: {
          from: 'vendors',
          localField: 'vendor',
          foreignField: 'name',
          as: 'vendorInfo'
        }
      },
      {
        $addFields: {
          vendorData: { $arrayElemAt: ['$vendorInfo', 0] },
          etaStatus: {
            $cond: {
              if: { $or: [{ $eq: ['$eta', null] }, { $eq: ['$eta', ''] }, { $not: ['$eta'] }] },
              then: 'no-eta',
              else: {
                $cond: {
                  if: { $lt: ['$eta', today] },
                  then: 'overdue',
                  else: {
                    $cond: {
                      if: { $lte: ['$eta', sevenDaysFromNow] },
                      then: 'approaching-soon',
                      else: {
                        $cond: {
                          if: { $lte: ['$eta', fourteenDaysFromNow] },
                          then: 'approaching',
                          else: 'future'
                        }
                      }
                    }
                  }
                }
              }
            }
          },
          daysFromToday: {
            $cond: {
              if: { $or: [{ $eq: ['$eta', null] }, { $eq: ['$eta', ''] }, { $not: ['$eta'] }] },
              then: null,
              else: {
                $divide: [
                  { $subtract: ['$eta', today] },
                  86400000  // milliseconds in a day
                ]
              }
            }
          }
        }
      },
      {
        $match: vendor !== 'all' ? { vendor: vendor } : {}
      },
      {
        $sort: sortBy === 'eta' ? { eta: 1, poNumber: 1 } :
               sortBy === 'vendor' ? { vendor: 1, poNumber: 1 } :
               { poNumber: 1, memo: 1 }
      }
    ]);

    // Categorize items
    const categories = {
      noEta: troubleItems.filter(item => item.etaStatus === 'no-eta'),
      approachingSoon: troubleItems.filter(item => item.etaStatus === 'approaching-soon'), // 0-7 days
      approaching: troubleItems.filter(item => item.etaStatus === 'approaching'), // 8-14 days
      overdue: troubleItems.filter(item => item.etaStatus === 'overdue'),
      needsFollowup: troubleItems.filter(item => 
        item.etaStatus === 'overdue' || 
        (item.etaStatus === 'no-eta' && item.itemStatus === 'Delivery Delay') ||
        (item.etaStatus === 'approaching-soon' && !item.vendorData)
      )
    };

    // Filter by category if specified
    let displayItems = troubleItems;
    if (category !== 'all') {
      displayItems = categories[category] || [];
    }

    // Group items by PO for better organization
    const troubleByPO = {};
    displayItems.forEach(item => {
      if (!troubleByPO[item.poNumber]) {
        troubleByPO[item.poNumber] = {
          poNumber: item.poNumber,
          vendor: item.vendor,
          vendorData: item.vendorData,
          poUrl: item.poUrl,
          poDate: item.poDate,
          items: []
        };
      }
      troubleByPO[item.poNumber].items.push(item);
    });

    // Get unique vendors for filter dropdown
    const uniqueVendors = [...new Set(troubleItems.map(item => item.vendor))].sort();

    // Calculate comprehensive statistics
    const stats = {
      totalItems: troubleItems.length,
      totalPOs: Object.keys(troubleByPO).length,
      noEtaCount: categories.noEta.length,
      approachingSoonCount: categories.approachingSoon.length,
      approachingCount: categories.approaching.length,
      overdueCount: categories.overdue.length,
      needsFollowupCount: categories.needsFollowup.length,
      vendorsWithIssues: uniqueVendors.length
    };

    res.render('trouble-seed', {
      troubleByPO: Object.values(troubleByPO),
      stats,
      categories,
      uniqueVendors,
      currentFilters: {
        category,
        vendor,
        sortBy
      },
      troubleItems: displayItems
    });

  } catch (error) {
    console.error('🚨 Enhanced Trouble Seed dashboard error:', error);
    console.error('🚨 Error stack:', error.stack);
    res.status(500).render('error', { 
      error: 'System Error',
      message: 'Something went wrong!',
      details: error.message 
    });
  }
});

// API route to update ETA for a line item
router.put('/line-items/:itemId/eta', async (req, res) => {
  try {
    const { itemId } = req.params;
    const { eta } = req.body;
    
    console.log(`🗓️ Updating ETA for item ${itemId} to ${eta}`);
    
    // Validate ETA format
    const etaDate = new Date(eta);
    if (isNaN(etaDate.getTime())) {
      return res.status(400).json({ error: 'Invalid ETA date format' });
    }
    
    const updatedItem = await LineItem.findByIdAndUpdate(
      itemId,
      { 
        eta: etaDate,
        notes: `ETA updated to ${etaDate.toLocaleDateString()} on ${new Date().toLocaleDateString()}`
      },
      { new: true }
    );
    
    if (!updatedItem) {
      return res.status(404).json({ error: 'Line item not found' });
    }
    
    console.log(`✅ ETA updated successfully for item: ${updatedItem.memo}`);
    res.json({ success: true, item: updatedItem });
    
  } catch (error) {
    console.error('Error updating ETA:', error);
    res.status(500).json({ error: error.message });
  }
});

// API route to mark item as received
router.put('/line-items/:itemId/receive', async (req, res) => {
  try {
    const { itemId } = req.params;
    const { receivedDate = new Date(), receivedBy = 'System' } = req.body;
    
    console.log(`📦 Marking item ${itemId} as received`);
    
    const updatedItem = await LineItem.findByIdAndUpdate(
      itemId,
      { 
        received: true,
        receivedDate: new Date(receivedDate),
        receivedBy: receivedBy,
        itemStatus: 'Received',
        receivingNotes: `Marked as received on ${new Date().toLocaleDateString()}`
      },
      { new: true }
    );
    
    if (!updatedItem) {
      return res.status(404).json({ error: 'Line item not found' });
    }
    
    console.log(`✅ Item marked as received: ${updatedItem.memo}`);
    res.json({ success: true, item: updatedItem });
    
  } catch (error) {
    console.error('Error marking item as received:', error);
    res.status(500).json({ error: error.message });
  }
});

// API route to add vendor follow-up note
router.put('/line-items/:itemId/follow-up', async (req, res) => {
  try {
    const { itemId } = req.params;
    const { followUpNote, contactMethod = 'Email' } = req.body;
    
    console.log(`📞 Adding follow-up note for item ${itemId}`);
    
    const currentItem = await LineItem.findById(itemId);
    if (!currentItem) {
      return res.status(404).json({ error: 'Line item not found' });
    }
    
    const followUpEntry = `[${new Date().toLocaleDateString()}] ${contactMethod} Follow-up: ${followUpNote}`;
    const existingNotes = currentItem.notes || '';
    const updatedNotes = existingNotes ? `${existingNotes}\n${followUpEntry}` : followUpEntry;
    
    const updatedItem = await LineItem.findByIdAndUpdate(
      itemId,
      { 
        notes: updatedNotes,
        itemStatus: 'Vendor Contacted'
      },
      { new: true }
    );
    
    console.log(`✅ Follow-up note added: ${updatedItem.memo}`);
    res.json({ success: true, item: updatedItem });
    
  } catch (error) {
    console.error('Error adding follow-up note:', error);
    res.status(500).json({ error: error.message });
  }
});

// API route to validate PO number exists
router.get('/api/validate-po/:poNumber', async (req, res) => {
  try {
    const { poNumber } = req.params;
    console.log(`🔍 Validating PO: ${poNumber}`);
    
    const po = await PurchaseOrder.findOne({ poNumber: poNumber });
    
    if (po) {
      res.json({ 
        exists: true, 
        po: {
          poNumber: po.poNumber,
          vendor: po.vendor,
          totalCost: po.totalCost,
          expectedShipDate: po.expectedShipDate
        }
      });
    } else {
      res.json({ exists: false });
    }
  } catch (error) {
    console.error('PO validation error:', error);
    res.status(500).json({ error: error.message });
  }
});

// API route for line items - This must also come before parameterized routes!
router.get('/line-items-api', async (req, res) => {
  console.log('🚀 Line Items API called with params:', req.query);
  try {
    // First, let's check if we have any line items at all
    const totalLineItems = await LineItem.countDocuments();
    console.log(`📊 Total line items in database: ${totalLineItems}`);

    if (totalLineItems === 0) {
      console.log('⚠️ No line items found in database');
      return res.json({
        lineItems: [],
        totalCount: 0,
        hasMore: false,
        message: 'No line items found in database'
      });
    }

    const {
      poNumber,
      sku,
      itemStatus,
      received,
      vendor,
      search,
      hideNotMyConcern = 'true',
      hidePendingBill = 'true',
      limit = 50,
      skip = 0,
      sortBy = 'createdAt',
      sortOrder = 'asc'  // Changed from 'desc' to 'asc' for chronological order
    } = req.query;

    // Build filter query
    let filter = {};

    if (poNumber) {
      filter.poNumber = new RegExp(poNumber, 'i');
    }

    if (sku) {
      filter.sku = new RegExp(sku, 'i');
    }

    if (itemStatus) {
      filter.itemStatus = itemStatus;
    }

    if (received !== undefined) {
      filter.received = received === 'true';
    }

    // Handle vendor filtering separately since it requires a join
    let vendorFilter = null;
    if (vendor) {
      vendorFilter = new RegExp(vendor, 'i');
      // Don't add vendor to main filter since line items don't have vendor field
    }

    if (search) {
      filter.$or = [
        { memo: new RegExp(search, 'i') },
        { sku: new RegExp(search, 'i') },
        { poNumber: new RegExp(search, 'i') },
        { notes: new RegExp(search, 'i') }
      ];
    }

    console.log('🔍 Filter being applied:', filter);
    console.log('📊 Hide filters:', { hideNotMyConcern, hidePendingBill });

    // Use aggregation to join with purchase orders and get vendor info
    const aggregationPipeline = [
      { $match: filter },
      {
        $lookup: {
          from: 'purchaseorders',
          localField: 'poId',
          foreignField: '_id',
          as: 'purchaseOrder'
        }
      },
      {
        $addFields: {
          vendor: { $arrayElemAt: ['$purchaseOrder.vendor', 0] },
          poAmount: { $arrayElemAt: ['$purchaseOrder.amount', 0] },
          poNsStatus: { $arrayElemAt: ['$purchaseOrder.nsStatus', 0] },
          poUrl: { $arrayElemAt: ['$purchaseOrder.poUrl', 0] },
          poStatus: { $arrayElemAt: ['$purchaseOrder.status', 0] }
        }
      },
      // Add vendor filter if specified
      ...(vendorFilter ? [{ $match: { vendor: vendorFilter } }] : []),
      // Add PO status filters
      ...(hideNotMyConcern === 'true' || hidePendingBill === 'true' ? [{
        $match: {
          $and: [
            ...(hideNotMyConcern === 'true' ? [{
              $or: [
                { poStatus: { $ne: 'Not my concern' } },
                { poStatus: { $exists: false } },
                { poStatus: null },
                { poStatus: '' }
              ]
            }] : []),
            ...(hidePendingBill === 'true' ? [{
              $or: [
                { poNsStatus: { $ne: 'Pending Bill' } },
                { poNsStatus: { $exists: false } },
                { poNsStatus: null },
                { poNsStatus: '' }
              ]
            }] : [])
          ]
        }
      }] : []),
      {
        $project: {
          purchaseOrder: 0 // Remove the full purchase order object to keep response clean
        }
      },
      { $sort: { [sortBy]: sortOrder === 'desc' ? -1 : 1 } },
      { $skip: parseInt(skip) },
      { $limit: parseInt(limit) }
    ];

    const lineItems = await LineItem.aggregate(aggregationPipeline);

    // For total count with any PO-related filters, we need a separate aggregation
    let totalCount;
    if (vendorFilter || hideNotMyConcern === 'true' || hidePendingBill === 'true') {
      const countPipeline = [
        { $match: filter },
        {
          $lookup: {
            from: 'purchaseorders',
            localField: 'poId',
            foreignField: '_id',
            as: 'purchaseOrder'
          }
        },
        {
          $addFields: {
            vendor: { $arrayElemAt: ['$purchaseOrder.vendor', 0] },
            poStatus: { $arrayElemAt: ['$purchaseOrder.status', 0] },
            poNsStatus: { $arrayElemAt: ['$purchaseOrder.nsStatus', 0] }
          }
        },
        // Add vendor filter if specified
        ...(vendorFilter ? [{ $match: { vendor: vendorFilter } }] : []),
        // Add PO status filters
        ...(hideNotMyConcern === 'true' || hidePendingBill === 'true' ? [{
          $match: {
            $and: [
              ...(hideNotMyConcern === 'true' ? [{
                $or: [
                  { poStatus: { $ne: 'Not my concern' } },
                  { poStatus: { $exists: false } },
                  { poStatus: null },
                  { poStatus: '' }
                ]
              }] : []),
              ...(hidePendingBill === 'true' ? [{
                $or: [
                  { poNsStatus: { $ne: 'Pending Bill' } },
                  { poNsStatus: { $exists: false } },
                  { poNsStatus: null },
                  { poNsStatus: '' }
                ]
              }] : [])
            ]
          }
        }] : []),
        { $count: "total" }
      ];
      const countResult = await LineItem.aggregate(countPipeline);
      totalCount = countResult.length > 0 ? countResult[0].total : 0;
    } else {
      totalCount = await LineItem.countDocuments(filter);
    }

    console.log(`✅ Line Items API: Found ${lineItems.length} items with vendor info, total: ${totalCount}`);

    res.json({
      lineItems,
      totalCount,
      hasMore: totalCount > parseInt(skip) + parseInt(limit)
    });
  } catch (error) {
    console.error('Line items API error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get line item status options - This must also come before parameterized routes!
router.get('/line-items/status-options', async (req, res) => {
  try {
    // Get status options from database
    let statusOptions = await LineItemStatusOption.find().sort({ name: 1 });

    // If no status options exist, create default ones
    if (statusOptions.length === 0) {
      console.log('Creating default line item status options...');
      const defaultStatuses = [
        'In Stock',
        'Backordered',
        'Find Different Vendor',
        'Substitute Product',
        'Discontinued',
        'Delivery Delay',
        'On Order',
        'Cancelled',
        'Special Order'
      ];

      const statusPromises = defaultStatuses.map(name =>
        LineItemStatusOption.create({ name, isDefault: true })
      );

      statusOptions = await Promise.all(statusPromises);
    }

    // Return array of status names with empty string first
    const statusNames = ['', ...statusOptions.map(option => option.name)];
    res.json(statusNames);
  } catch (error) {
    console.error('Line item status options error:', error);
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
    console.log('🔍 DASHBOARD ROUTE - Fetching data...');

    // Check if we should include hidden POs
    const includeHidden = req.query.includeHidden === 'true';
    
    let query = {};
    if (!includeHidden) {
      query.isHidden = { $ne: true }; // Only show non-hidden POs by default
    }

    const purchaseOrders = await PurchaseOrder.find(query).sort({ date: 1 });

    // Fetch line items for each PO and calculate ETAs
    const purchaseOrdersWithETA = await Promise.all(
      purchaseOrders.map(async (po) => {
        const lineItems = await LineItem.find({ poId: po._id, isHidden: { $ne: true } });
        const upcomingETA = calculateUpcomingETA(lineItems);
        const formattedETA = formatETA(upcomingETA);
        
        return {
          ...po.toObject(),
          lineItems,
          upcomingETA,
          formattedETA,
          lineItemCount: lineItems.length
        };
      })
    );

    // Get all tasks that are related to purchase orders
    const allTasks = await Task.find({ 
      relatedPOs: { $exists: true, $ne: [] } 
    }).populate('relatedPOs', 'poNumber');

    // Create a map of PO ObjectId to tasks
    const tasksByPOId = {};
    allTasks.forEach(task => {
      task.relatedPOs.forEach(po => {
        if (!tasksByPOId[po._id]) {
          tasksByPOId[po._id] = [];
        }
        tasksByPOId[po._id].push(task);
      });
    });

    // Add task data to each purchase order
    purchaseOrdersWithETA.forEach(po => {
      po.relatedTasks = tasksByPOId[po._id] || [];
    });

    console.log(`📋 Found ${allTasks.length} tasks related to purchase orders`);

    // Try multiple queries to see what's in the database
    const allPrePurchaseOrders = await PrePurchaseOrder.find().sort({ createdAt: -1 });
    const nonConvertedPrePOs = await PrePurchaseOrder.find({ convertedToPO: false }).sort({ createdAt: -1 });
    const convertedPrePOs = await PrePurchaseOrder.find({ convertedToPO: true }).sort({ createdAt: -1 });

    console.log(`📊 Found ${purchaseOrdersWithETA.length} purchase orders`);
    console.log(`📋 Found ${allPrePurchaseOrders.length} total pre-purchase orders in database`);
    console.log(`📋 Found ${nonConvertedPrePOs.length} non-converted pre-purchase orders`);
    console.log(`📋 Found ${convertedPrePOs.length} converted pre-purchase orders`);

    if (allPrePurchaseOrders.length > 0) {
      console.log('ALL Pre-purchase orders in database:');
      allPrePurchaseOrders.forEach((prePO, index) => {
        console.log(`  ${index + 1}. ID: ${prePO._id}, Vendor: ${prePO.vendor}, ConvertedToPO: ${prePO.convertedToPO}`);
      });
    } else {
      console.log('❌ No pre-purchase orders found in database at all');
    }

    // Use all pre-purchase orders for now to see if the filter is the issue
    const prePurchaseOrders = allPrePurchaseOrders;

    // Get unique NS Status values for filters (from CSV)
    const uniqueNSStatuses = [...new Set(purchaseOrdersWithETA.map(po => po.nsStatus).filter(Boolean))];

    // Get unique custom Status values for filters
    const uniqueStatuses = [...new Set(purchaseOrdersWithETA.map(po => po.status).filter(Boolean))];

    // Get unique vendors from both POs and pre-POs
    const allVendors = [
      ...purchaseOrdersWithETA.map(po => po.vendor),
      ...prePurchaseOrders.map(ppo => ppo.vendor)
    ];
    const uniqueVendors = [...new Set(allVendors.filter(Boolean))].sort();

    // Get status options from database
    let statusOptions = await StatusOption.find().sort({ name: 1 });

    // If no status options exist, create default ones
    if (statusOptions.length === 0) {
      console.log('Creating default status options...');
      const defaultStatuses = [
        'Planning',
        'Approved for Purchase',
        'Pending Approval',
        'On Hold',
        'Cancelled',
        'Ready to Order'
      ];

      const statusPromises = defaultStatuses.map(name =>
        StatusOption.create({ name, isDefault: true })
      );

      statusOptions = await Promise.all(statusPromises);
    }

    // Extract just the names for the dropdown
    const statusOptionNames = statusOptions.map(option => option.name);
    console.log('📝 Status options:', statusOptionNames);

    console.log(`🎨 Rendering dashboard with ${prePurchaseOrders.length} pre-purchase orders...`);
    res.render('dashboard', {
      purchaseOrders: purchaseOrdersWithETA,
      prePurchaseOrders,
      uniqueNSStatuses: uniqueNSStatuses.sort(),
      uniqueStatuses: uniqueStatuses.sort(),
      uniqueVendors,
      statusOptions: statusOptionNames,
      allStatusOptions: statusOptions, // Send full objects for management
      user: req.user // Pass user information for authentication status
    });
  } catch (error) {
    console.error('❌ Dashboard route error:', error);
    res.status(500).json({ error: error.message });
  }
});

// API route to get purchase orders with hidden filter
router.get('/api/purchase-orders', async (req, res) => {
  try {
    const includeHidden = req.query.includeHidden === 'true';
    
    let query = {};
    if (!includeHidden) {
      query.isHidden = { $ne: true };
    }
    
    const purchaseOrders = await PurchaseOrder.find(query).sort({ date: 1 });
    
    // Get all tasks that are related to purchase orders
    const allTasks = await Task.find({ 
      relatedPOs: { $exists: true, $ne: [] } 
    }).populate('relatedPOs', 'poNumber');

    // Create a map of PO ObjectId to tasks
    const tasksByPOId = {};
    allTasks.forEach(task => {
      task.relatedPOs.forEach(po => {
        if (!tasksByPOId[po._id]) {
          tasksByPOId[po._id] = [];
        }
        tasksByPOId[po._id].push(task);
      });
    });

    // Add task data to each purchase order
    purchaseOrders.forEach(po => {
      po.relatedTasks = tasksByPOId[po._id] || [];
    });
    
    res.json({ success: true, purchaseOrders });
  } catch (error) {
    console.error('❌ API purchase orders error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Pre-Purchase Order Management Routes

// Create new pre-purchase order
router.post('/pre-purchase-orders', async (req, res) => {
  try {
    console.log('🔍 PRE-PO CREATION REQUEST RECEIVED');
    console.log('Request body:', req.body);
    console.log('Request headers:', req.headers);

    const { vendor, items, status, priority, receiveDate, notes } = req.body;

    // Validation
    if (!vendor || !vendor.trim()) {
      console.log('❌ Validation failed: Vendor is required');
      return res.status(400).json({ success: false, error: 'Vendor is required' });
    }

    console.log('✅ Validation passed. Creating pre-purchase order with data:', {
      vendor: vendor.trim(),
      items: items?.trim() || '',
      status: status || 'Planning',
      priority: priority || 'Medium',
      receiveDate: receiveDate ? new Date(receiveDate) : null,
      notes: notes?.trim() || ''
    });

    // Create the pre-purchase order
    const prePO = await PrePurchaseOrder.create({
      vendor: vendor.trim(),
      items: items?.trim() || '',
      status: status || 'Planning',
      priority: priority || 'Medium',
      receiveDate: receiveDate ? new Date(receiveDate) : null,
      notes: notes?.trim() || ''
    });

    console.log(`✅ Successfully created pre-purchase order:`, {
      id: prePO._id,
      vendor: prePO.vendor,
      status: prePO.status,
      priority: prePO.priority,
      convertedToPO: prePO.convertedToPO
    });

    // Verify it was saved
    const verification = await PrePurchaseOrder.findById(prePO._id);
    console.log('🔍 Verification - Pre-PO exists in database:', !!verification);

    // Count total pre-purchase orders
    const totalCount = await PrePurchaseOrder.countDocuments({ convertedToPO: false });
    console.log(`📊 Total non-converted pre-purchase orders in database: ${totalCount}`);

    res.json({ success: true, prePO, message: 'Pre-purchase order created successfully' });
  } catch (error) {
    console.error('❌ Pre-purchase order creation error:', error);
    console.error('Error stack:', error.stack);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Update pre-purchase order
router.put('/pre-purchase-orders/:id', async (req, res) => {
  try {
    const { vendor, items, status, priority, receiveDate, notes } = req.body;

    const updateData = {
      updatedAt: new Date()
    };

    if (vendor !== undefined) updateData.vendor = vendor.trim();
    if (items !== undefined) updateData.items = items.trim();
    if (status !== undefined) updateData.status = status;
    if (priority !== undefined) updateData.priority = priority;
    if (receiveDate !== undefined) updateData.receiveDate = receiveDate ? new Date(receiveDate) : null;
    if (notes !== undefined) updateData.notes = notes.trim();

    const prePO = await PrePurchaseOrder.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true }
    );

    if (!prePO) {
      return res.status(404).json({ error: 'Pre-purchase order not found' });
    }

    console.log(`Updated pre-purchase order ${prePO._id} for vendor: ${prePO.vendor}`);
    res.json({ success: true, prePO });
  } catch (error) {
    console.error('Pre-purchase order update error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Convert pre-purchase order to actual PO
router.post('/pre-purchase-orders/:id/convert', async (req, res) => {
  try {
    const { poNumber } = req.body;

    if (!poNumber || !poNumber.trim()) {
      return res.status(400).json({ error: 'PO number is required' });
    }

    // Check if PO number already exists
    const existingPO = await PurchaseOrder.findOne({ poNumber: poNumber.trim() });
    if (existingPO) {
      return res.status(400).json({ error: 'PO number already exists' });
    }

    const prePO = await PrePurchaseOrder.findById(req.params.id);
    if (!prePO) {
      return res.status(404).json({ error: 'Pre-purchase order not found' });
    }

    if (prePO.convertedToPO) {
      return res.status(400).json({ error: 'Pre-purchase order already converted' });
    }

    // Create actual PO
    const newPO = await PurchaseOrder.create({
      reportDate: new Date().toLocaleDateString(),
      date: new Date().toLocaleDateString(),
      poNumber: poNumber.trim(),
      vendor: prePO.vendor,
      nsStatus: 'Pending',
      status: prePO.status,
      amount: prePO.estimatedAmount,
      location: '',
      notes: prePO.notes,
      createdAt: new Date(),
      updatedAt: new Date()
    });

    // Mark pre-PO as converted
    await PrePurchaseOrder.findByIdAndUpdate(req.params.id, {
      convertedToPO: true,
      convertedPONumber: poNumber.trim(),
      convertedDate: new Date(),
      updatedAt: new Date()
    });

    console.log(`Converted pre-purchase order "${prePO.title}" to PO ${poNumber}`);
    res.json({ success: true, poNumber: newPO.poNumber, poId: newPO._id });
  } catch (error) {
    console.error('Pre-purchase order conversion error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Delete pre-purchase order
router.delete('/pre-purchase-orders/:id', async (req, res) => {
  try {
    const prePO = await PrePurchaseOrder.findById(req.params.id);

    if (!prePO) {
      return res.status(404).json({ error: 'Pre-purchase order not found' });
    }

    await PrePurchaseOrder.findByIdAndDelete(req.params.id);
    console.log(`Deleted pre-purchase order: "${prePO.title}"`);
    res.json({ success: true });
  } catch (error) {
    console.error('Pre-purchase order deletion error:', error);
    res.status(500).json({ error: error.message });
  }
});

// NOTE: Parameterized routes (/:id/*) moved to end of file to avoid conflicts

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

// Update line item SKU
router.put('/line-items/:lineItemId/sku', async (req, res) => {
  try {
    const { sku } = req.body;

    const lineItem = await LineItem.findByIdAndUpdate(
      req.params.lineItemId,
      {
        sku: sku || '',
        updatedAt: new Date()
      },
      { new: true }
    );

    if (!lineItem) {
      return res.status(404).json({ error: 'Line item not found' });
    }

    console.log(`Updated SKU for line item ${lineItem._id} (PO ${lineItem.poNumber}): ${sku || 'cleared'}`);
    res.json({ success: true, lineItem });
  } catch (error) {
    console.error('Line item SKU update error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Update line item status
router.put('/line-items/:lineItemId/item-status', async (req, res) => {
  try {
    const { itemStatus } = req.body;

    // Validate the status against database options
    if (itemStatus && itemStatus.trim()) {
      const validStatus = await LineItemStatusOption.findOne({ name: itemStatus.trim() });
      if (!validStatus) {
        return res.status(400).json({ error: 'Invalid item status' });
      }
    }

    const lineItem = await LineItem.findByIdAndUpdate(
      req.params.lineItemId,
      {
        itemStatus: itemStatus || '',
        updatedAt: new Date()
      },
      { new: true }
    );

    if (!lineItem) {
      return res.status(404).json({ error: 'Line item not found' });
    }

    console.log(`Updated item status for line item ${lineItem._id} (PO ${lineItem.poNumber}): ${itemStatus || 'cleared'}`);
    res.json({ success: true, lineItem });
  } catch (error) {
    console.error('Line item status update error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Update line item notes
router.put('/line-items/:lineItemId/notes', async (req, res) => {
  try {
    const { notes } = req.body;

    const lineItem = await LineItem.findByIdAndUpdate(
      req.params.lineItemId,
      {
        notes: notes || '',
        updatedAt: new Date()
      },
      { new: true }
    );

    if (!lineItem) {
      return res.status(404).json({ error: 'Line item not found' });
    }

    console.log(`Updated notes for line item ${lineItem._id} (PO ${lineItem.poNumber})`);
    res.json({ success: true, lineItem });
  } catch (error) {
    console.error('Line item notes update error:', error);
    res.status(500).json({ error: error.message });
  }
});

// NOTE: Parameterized routes for PO management (/:id/*) moved to end of file to avoid conflicts

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

// Line Item Status Options Management Routes

// Get all line item status options
router.get('/line-item-status-options', async (req, res) => {
  try {
    const statusOptions = await LineItemStatusOption.find().sort({ name: 1 });
    res.json(statusOptions);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Add new line item status option
router.post('/line-item-status-options', async (req, res) => {
  try {
    const { name } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({ error: 'Status name is required' });
    }

    const statusOption = await LineItemStatusOption.create({
      name: name.trim(),
      isDefault: false
    });

    console.log(`Added new line item status option: "${statusOption.name}"`);
    res.json({ success: true, statusOption });
  } catch (error) {
    if (error.code === 11000) {
      res.status(400).json({ error: 'Line item status option already exists' });
    } else {
      console.error('Line item status option creation error:', error);
      res.status(500).json({ error: error.message });
    }
  }
});

// Delete line item status option
router.delete('/line-item-status-options/:id', async (req, res) => {
  try {
    const statusOption = await LineItemStatusOption.findById(req.params.id);

    if (!statusOption) {
      return res.status(404).json({ error: 'Line item status option not found' });
    }

    // Check if this status is being used by any line items
    const usageCount = await LineItem.countDocuments({ itemStatus: statusOption.name });

    if (usageCount > 0) {
      return res.status(400).json({
        error: `Cannot delete "${statusOption.name}" - it's being used by ${usageCount} line item(s)`
      });
    }

    await LineItemStatusOption.findByIdAndDelete(req.params.id);
    console.log(`Deleted line item status option: "${statusOption.name}"`);
    res.json({ success: true });
  } catch (error) {
    console.error('Line item status option deletion error:', error);
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

// =============================================================================
// PARAMETERIZED ROUTES (/:id/*) - These MUST be at the end to avoid conflicts
// =============================================================================

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
      .sort({ createdAt: 1 }); // Changed from -1 to 1 for chronological order (oldest first)

    res.json(lineItems);
  } catch (error) {
    console.error('Line items error:', error);
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

// Update ETA
router.put('/:id/eta', async (req, res) => {
  try {
    const { eta } = req.body;
    const dateValue = eta ? new Date(eta) : null;

    const updated = await PurchaseOrder.findByIdAndUpdate(
      req.params.id,
      { eta: dateValue, updatedAt: new Date() },
      { new: true }
    );
    console.log(`Updated ETA for PO ${updated.poNumber}: ${eta || 'cleared'}`);
    res.json({ success: true });
  } catch (error) {
    console.error('ETA update error:', error);
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

// Update shipping tracking
router.put('/:id/shipping-tracking', async (req, res) => {
  try {
    const { shippingTracking, shippingCarrier } = req.body;

    // Update the PO with both tracking number and carrier
    const updateData = {
      shippingTracking: shippingTracking || '',
      updatedAt: new Date()
    };

    // Only update carrier if provided, otherwise keep existing or set default
    if (shippingCarrier !== undefined) {
      updateData.shippingCarrier = shippingCarrier || 'FedEx';
    }

    const updated = await PurchaseOrder.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true }
    );

    // Also update line items for this PO if tracking number is provided
    if (shippingTracking && shippingTracking.trim()) {
      const lineItemUpdateData = {
        trackingNumber: shippingTracking.trim(),
        updatedAt: new Date()
      };

      // Update carrier in line items if provided
      if (shippingCarrier !== undefined) {
        lineItemUpdateData.trackingCarrier = shippingCarrier || 'FedEx';
      }

      const updateResult = await LineItem.updateMany(
        { poId: req.params.id },
        lineItemUpdateData
      );
      console.log(`Updated ${updateResult.modifiedCount} line items with tracking: ${shippingTracking} (${shippingCarrier || 'FedEx'})`);

      // Auto-register with 17track if we have line items
      if (updateResult.modifiedCount > 0) {
        try {
          await trackingService.registerTrackingNumbers([
            trackingService.formatTrackingNumber(shippingTracking.trim(), shippingCarrier || 'FedEx')
          ]);
          console.log(`Registered ${shippingTracking} with 17track using carrier: ${shippingCarrier || 'FedEx'}`);
        } catch (registerError) {
          console.error('Failed to register tracking number with 17track:', registerError);
          // Don't fail the request if registration fails
        }
      }
    } else if (!shippingTracking || !shippingTracking.trim()) {
      // Clear tracking from line items if PO tracking is cleared
      const clearResult = await LineItem.updateMany(
        { poId: req.params.id },
        {
          $unset: {
            trackingNumber: '',
            trackingCarrier: '',
            trackingStatus: '',
            trackingStatusDescription: '',
            trackingLastUpdate: '',
            trackingLocation: '',
            trackingEstimatedDelivery: ''
          },
          updatedAt: new Date()
        }
      );
      console.log(`Cleared tracking from ${clearResult.modifiedCount} line items`);
    }

    console.log(`Updated shipping tracking for PO ${updated.poNumber}: ${shippingTracking || 'cleared'} (${shippingCarrier || updated.shippingCarrier || 'FedEx'})`);
    res.json({ success: true });
  } catch (error) {
    console.error('Shipping tracking update error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Update priority
router.put('/:id/priority', async (req, res) => {
  try {
    const { priority } = req.body;
    
    // Validate priority is between 1-5 or null/undefined to clear
    if (priority !== null && priority !== undefined && (isNaN(priority) || priority < 1 || priority > 5)) {
      return res.status(400).json({ error: 'Priority must be between 1 and 5, or null to clear' });
    }

    const updated = await PurchaseOrder.findByIdAndUpdate(
      req.params.id,
      { priority: priority, updatedAt: new Date() },
      { new: true }
    );
    
    console.log(`Updated priority for PO ${updated.poNumber}: ${priority || 'cleared'}`);
    res.json({ success: true });
  } catch (error) {
    console.error('Priority update error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Route to identify and manage orphaned line items
router.get('/orphaned-line-items', async (req, res) => {
  try {
    console.log('🔍 Finding orphaned line items...');

    // Find line items with missing or problematic PO data
    const orphanedItems = await LineItem.aggregate([
      {
        $lookup: {
          from: 'purchaseorders',
          localField: 'poId',
          foreignField: '_id',
          as: 'purchaseOrder'
        }
      },
      {
        $addFields: {
          vendor: { $arrayElemAt: ['$purchaseOrder.vendor', 0] },
          poStatus: { $arrayElemAt: ['$purchaseOrder.status', 0] },
          poNsStatus: { $arrayElemAt: ['$purchaseOrder.nsStatus', 0] },
          poExists: { $gt: [{ $size: '$purchaseOrder' }, 0] }
        }
      },
      {
        $match: {
          $or: [
            { poExists: false }, // No matching PO found
            { vendor: { $in: [null, '', 'N/A'] } }, // Missing vendor
            { $and: [{ poStatus: { $in: [null, '', 'No Status'] } }, { poNsStatus: { $in: [null, '', 'No NS Status'] } }] } // No statuses
          ]
        }
      },
      {
        $project: {
          purchaseOrder: 0 // Remove full PO object for cleaner response
        }
      },
      { $sort: { poNumber: 1, createdAt: 1 } }
    ]);

    // Group by PO number for better organization
    const orphanedByPO = {};
    orphanedItems.forEach(item => {
      if (!orphanedByPO[item.poNumber]) {
        orphanedByPO[item.poNumber] = {
          poNumber: item.poNumber,
          vendor: item.vendor || 'N/A',
          poStatus: item.poStatus || 'No Status',
          poNsStatus: item.poNsStatus || 'No NS Status',
          poExists: item.poExists,
          items: []
        };
      }
      orphanedByPO[item.poNumber].items.push(item);
    });

    const stats = {
      totalOrphanedItems: orphanedItems.length,
      totalOrphanedPOs: Object.keys(orphanedByPO).length,
      itemsWithoutPO: orphanedItems.filter(item => !item.poExists).length,
      itemsWithMissingVendor: orphanedItems.filter(item => item.poExists && (!item.vendor || item.vendor === 'N/A')).length,
      itemsWithNoStatus: orphanedItems.filter(item => item.poExists && (!item.poStatus || item.poStatus === 'No Status') && (!item.poNsStatus || item.poNsStatus === 'No NS Status')).length
    };

    res.render('orphaned-line-items', {
      orphanedByPO: Object.values(orphanedByPO),
      stats,
      orphanedItems
    });

  } catch (error) {
    console.error('Error finding orphaned line items:', error);
    res.status(500).json({ error: error.message });
  }
});

// Route to archive/delete orphaned line items
router.post('/archive-orphaned-items', async (req, res) => {
  try {
    const { itemIds, action } = req.body; // action can be 'archive' or 'delete'

    if (!itemIds || !Array.isArray(itemIds)) {
      return res.status(400).json({ error: 'Item IDs required' });
    }

    if (action === 'delete') {
      const result = await LineItem.deleteMany({ _id: { $in: itemIds } });
      res.json({
        success: true,
        message: `Deleted ${result.deletedCount} orphaned line items`,
        deletedCount: result.deletedCount
      });
    } else if (action === 'archive') {
      // Add an 'archived' field instead of deleting
      const result = await LineItem.updateMany(
        { _id: { $in: itemIds } },
        { $set: { archived: true, archivedDate: new Date() } }
      );
      res.json({
        success: true,
        message: `Archived ${result.modifiedCount} orphaned line items`,
        archivedCount: result.modifiedCount
      });
    } else {
      res.status(400).json({ error: 'Invalid action. Use "archive" or "delete"' });
    }

  } catch (error) {
    console.error('Error archiving orphaned items:', error);
    res.status(500).json({ error: error.message });
  }
});

// Route to fix orphaned line items by creating or linking POs
router.post('/fix-orphaned-items', async (req, res) => {
  try {
    const { poNumber, action, vendor, status, itemIds } = req.body;

    if (!poNumber || !action || !itemIds || !Array.isArray(itemIds)) {
      return res.status(400).json({ error: 'PO number, action, and item IDs required' });
    }

    if (action === 'create-po') {
      // Validate required fields for creating new PO
      if (!vendor) {
        return res.status(400).json({ error: 'Vendor is required for creating new PO' });
      }
      if (!status) {
        return res.status(400).json({ error: 'Status is required for creating new PO' });
      }

      // Check if PO number already exists
      const existingPO = await PurchaseOrder.findOne({ poNumber: poNumber });
      if (existingPO) {
        return res.status(400).json({ error: 'PO number already exists' });
      }

      // Create a new PO for these orphaned items
      const lineItems = await LineItem.find({ _id: { $in: itemIds } });

      if (lineItems.length === 0) {
        return res.status(404).json({ error: 'No line items found' });
      }

      // Calculate total amount from line items
      const totalAmount = lineItems.reduce((sum, item) => {
        const amount = parseFloat(item.amount) || 0;
        return sum + amount;
      }, 0);

      // Create new PO with user-selected status
      const newPO = new PurchaseOrder({
        poNumber: poNumber,
        vendor: vendor,
        amount: totalAmount,
        status: status, // Use user-selected status
        nsStatus: 'Open', // Default NS status
        date: lineItems[0].date || new Date(),
        reportDate: new Date().toLocaleDateString(),
        location: '',
        notes: `Created from orphaned line items - ${lineItems.length} items recovered`,
        createdAt: new Date(),
        updatedAt: new Date()
      });

      const savedPO = await newPO.save();

      // Update line items to reference the new PO
      const updateResult = await LineItem.updateMany(
        { _id: { $in: itemIds } },
        { $set: { poId: savedPO._id, poNumber: poNumber, updatedAt: new Date() } }
      );

      console.log(`✅ Created new PO ${poNumber} with status: ${status} and linked ${updateResult.modifiedCount} items`);

      res.json({
        success: true,
        message: `Created new PO ${poNumber} with status "${status}" and linked ${updateResult.modifiedCount} line items`,
        poId: savedPO._id,
        linkedItems: updateResult.modifiedCount
      });

    } else if (action === 'link-existing') {
      // Link to existing PO
      const existingPO = await PurchaseOrder.findOne({ poNumber: poNumber });

      if (!existingPO) {
        return res.status(404).json({ error: `PO ${poNumber} not found` });
      }

      // Update line items to reference the existing PO
      const updateResult = await LineItem.updateMany(
        { _id: { $in: itemIds } },
        { $set: { poId: existingPO._id, poNumber: poNumber, updatedAt: new Date() } }
      );

      console.log(`✅ Linked ${updateResult.modifiedCount} items to existing PO ${poNumber}`);

      res.json({
        success: true,
        message: `Linked ${updateResult.modifiedCount} line items to existing PO ${poNumber}`,
        poId: existingPO._id,
        linkedItems: updateResult.modifiedCount
      });

    } else {
      res.status(400).json({ error: 'Invalid action. Use "create-po" or "link-existing"' });
    }

  } catch (error) {
    console.error('Error fixing orphaned items:', error);
    res.status(500).json({ error: error.message });
  }
});

// Route to export orphaned items data before deletion
router.get('/export-orphaned-items', async (req, res) => {
  try {
    const orphanedItems = await LineItem.aggregate([
      {
        $lookup: {
          from: 'purchaseorders',
          localField: 'poId',
          foreignField: '_id',
          as: 'purchaseOrder'
        }
      },
      {
        $addFields: {
          vendor: { $arrayElemAt: ['$purchaseOrder.vendor', 0] },
          poStatus: { $arrayElemAt: ['$purchaseOrder.status', 0] },
          poNsStatus: { $arrayElemAt: ['$purchaseOrder.nsStatus', 0] },
          poExists: { $gt: [{ $size: '$purchaseOrder' }, 0] }
        }
      },
      {
        $match: {
          $or: [
            { poExists: false },
            { vendor: { $in: [null, '', 'N/A'] } },
            { $and: [{ poStatus: { $in: [null, '', 'No Status'] } }, { poNsStatus: { $in: [null, '', 'No NS Status'] } }] }
          ]
        }
      },
      {
        $project: {
          purchaseOrder: 0
        }
      },
      { $sort: { poNumber: 1, createdAt: 1 } }
    ]);

    // Set headers for CSV download
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="orphaned-line-items.csv"');

    // Create CSV content
    const csvHeaders = 'PO Number,Vendor,Item Description,SKU,Amount,Received,Item Status,Date,Notes,Issue Type\n';
    const csvRows = orphanedItems.map(item => {
      const issueType = !item.poExists ? 'No PO' :
        (!item.vendor || item.vendor === 'N/A') ? 'No Vendor' : 'No Status';

      return [
        item.poNumber || '',
        item.vendor || 'N/A',
        `"${(item.memo || '').replace(/"/g, '""')}"`, // Escape quotes
        item.sku || '',
        item.amount || '',
        item.received ? 'Yes' : 'No',
        item.itemStatus || '',
        item.date ? new Date(item.date).toLocaleDateString() : '',
        `"${(item.notes || '').replace(/"/g, '""')}"`, // Escape quotes
        issueType
      ].join(',');
    }).join('\n');

    res.send(csvHeaders + csvRows);

  } catch (error) {
    console.error('Error exporting orphaned items:', error);
    res.status(500).json({ error: error.message });
  }
});

// NetSuite PO Form Import Route
router.post('/import-netsuite', async (req, res) => {
  console.log('🏢 NetSuite import route called with body:', req.body);
  try {
    const { data, targetPOId, addToExisting } = req.body;
    console.log(`🔄 Import mode: ${addToExisting ? 'ADD to existing' : 'REPLACE existing'} line items`);

    // Debug: Log the target PO details
    if (targetPOId) {
      console.log('🎯 Target PO ID received:', targetPOId);
      const targetPO = await PurchaseOrder.findById(targetPOId);
      if (targetPO) {
        console.log('✅ Target PO found:', targetPO.poNumber, '-', targetPO.vendor);
        console.log('📋 Current lineItems count:', targetPO.lineItems ? targetPO.lineItems.length : 0);
      } else {
        console.log('❌ Target PO not found with ID:', targetPOId);
      }
    } else {
      console.log('⚠️ No target PO ID provided');
    }

    if (!data || !data.trim()) {
      return res.status(400).json({ error: 'No data provided' });
    }

    // Parse the NetSuite data (tab-separated values)
    const lines = data.trim().split('\n');
    if (lines.length < 2) {
      return res.status(400).json({ error: 'Invalid data format - need header and at least one data row' });
    }

    console.log('🔍 First few lines:', lines.slice(0, 5));

    // Check if headers are in a single line (tab-separated) or multiple lines
    let headers = [];
    let dataStartIndex = 1;

    if (lines[0].includes('\t')) {
      // Headers are tab-separated in first line
      headers = lines[0].split('\t');
      dataStartIndex = 1;
    } else {
      // Headers are on separate lines, find the start of data
      for (let i = 0; i < lines.length; i++) {
        if (lines[i].includes('\t') && lines[i].split('\t').length > 3) {
          // This line has tabs and multiple columns, treat as data
          // Reconstruct headers from the previous lines
          headers = lines.slice(0, i);
          dataStartIndex = i;
          break;
        }
      }
    }

    console.log('📊 Parsed headers:', headers);
    console.log('📍 Data starts at line:', dataStartIndex);

    // Find column indices for the data we need
    const getColumnIndex = (headerName) => {
      return headers.findIndex(h => h.toLowerCase().includes(headerName.toLowerCase()));
    };

    const itemIndex = getColumnIndex('item');
    const vendorNameIndex = getColumnIndex('vendor name');
    const quantityIndex = getColumnIndex('quantity');
    const descriptionIndex = getColumnIndex('description');
    const vendorDescIndex = getColumnIndex('vendor desc');
    const unitsIndex = getColumnIndex('units');
    const receivedIndex = getColumnIndex('received');
    const billedIndex = getColumnIndex('billed');
    const expectedReceiptIndex = getColumnIndex('expected receipt date');
    const expectedArrivalIndex = getColumnIndex('expected arrival date');
    const billVarianceStatusIndex = getColumnIndex('bill variance status');
    const billVarianceFieldIndex = getColumnIndex('bill variance');
    const closedIndex = getColumnIndex('closed');

    console.log('🔍 Column indices:', { itemIndex, quantityIndex, descriptionIndex });

    if (itemIndex === -1 || quantityIndex === -1 || descriptionIndex === -1) {
      console.log('❌ Missing required columns. Available headers:', headers);
      return res.status(400).json({
        error: 'Required columns (Item, Quantity, Description) not found',
        availableHeaders: headers,
        foundIndices: { itemIndex, quantityIndex, descriptionIndex }
      });
    }

    let imported = 0;
    let targetPO = null;
    let clearedPOs = new Set(); // Track which POs we've already cleared

    // If specific PO provided, verify it exists
    if (targetPOId) {
      targetPO = await PurchaseOrder.findById(targetPOId);
      if (!targetPO) {
        return res.status(400).json({ error: 'Target purchase order not found' });
      }


    }

    // Process each data line
    for (let i = dataStartIndex; i < lines.length; i++) {
      const row = lines[i].split('\t');

      console.log(`🔍 Processing line ${i}:`, row.slice(0, 5)); // Log first 5 columns

      // Skip empty rows, but don't skip rows just because they end with "History"
      if (row.length < 3 || row.join('').trim() === '') {
        console.log(`⏭️ Skipping line ${i}: empty row`);
        continue;
      }

      // Skip if this is just the word "History" alone (not a data row)
      if (row.length === 1 && row[0] === 'History') {
        console.log(`⏭️ Skipping line ${i}: standalone History`);
        continue;
      }

      // Extract item data
      const itemCode = row[itemIndex] || '';
      const vendorName = row[vendorNameIndex] || '';
      
      // Parse quantity with comma support (e.g., "6,000" -> 6000)
      let quantity = 0;
      if (row[quantityIndex]) {
        const quantityStr = row[quantityIndex].toString().trim();
        const cleanQuantityStr = quantityStr.replace(/,/g, ''); // Remove commas
        quantity = parseFloat(cleanQuantityStr) || 0;
      }
      
      const description = row[descriptionIndex] || '';
      const vendorDescription = row[vendorDescIndex] || '';
      const units = row[unitsIndex] || '';
      
      // Parse received with comma support
      let received = 0;
      if (row[receivedIndex]) {
        const receivedStr = row[receivedIndex].toString().trim();
        const cleanReceivedStr = receivedStr.replace(/,/g, '');
        received = parseFloat(cleanReceivedStr) || 0;
      }
      
      // Parse billed with comma support  
      let billed = 0;
      if (row[billedIndex]) {
        const billedStr = row[billedIndex].toString().trim();
        const cleanBilledStr = billedStr.replace(/,/g, '');
        billed = parseFloat(cleanBilledStr) || 0;
      }
      
      const expectedReceiptDate = row[expectedReceiptIndex] || '';
      const expectedArrivalDate = row[expectedArrivalIndex] || '';
      const billVarianceStatus = row[billVarianceStatusIndex] || '';
      const billVarianceField = row[billVarianceFieldIndex] || '';
      const closed = row[closedIndex] || '';

      console.log(`📦 Extracted data:`, {
        itemCode,
        quantity,
        units,
        description: description.substring(0, 30) + '...',
        expectedReceiptDate,
        expectedArrivalDate
      });

      // Helper function to safely parse dates
      const parseDate = (dateStr) => {
        if (!dateStr || dateStr.trim() === '' || dateStr.trim() === ' ') {
          return null;
        }
        const parsed = new Date(dateStr.trim());
        return isNaN(parsed.getTime()) ? null : parsed;
      };

      // Skip if essential data is missing
      if (!itemCode && !description) {
        console.log(`⏭️ Skipping line ${i}: missing essential data`);
        continue;
      }

      // Try to find the PO if not specified
      let poToUse = targetPO;
      if (!poToUse && vendorName) {
        // Try to find PO by vendor name
        console.log(`🔍 Looking for PO with vendor: ${vendorName}`);
        poToUse = await PurchaseOrder.findOne({
          vendor: { $regex: vendorName, $options: 'i' }
        }).sort({ date: -1 });
        console.log(`🔍 Found PO by vendor search:`, poToUse ? poToUse.poNumber : 'None');
      } else if (targetPO) {
        console.log(`🎯 Using target PO: ${targetPO.poNumber}`);
      }

      // Handle clearing existing line items for this PO (only once per PO)
      if (poToUse && !addToExisting && !clearedPOs.has(poToUse._id.toString())) {
        console.log(`🗑️ Clearing ${poToUse.lineItems ? poToUse.lineItems.length : 0} existing line items from PO ${poToUse.poNumber} (replace mode)`);

        // Delete existing LineItem documents for this PO
        if (poToUse.lineItems && poToUse.lineItems.length > 0) {
          await LineItem.deleteMany({ poId: poToUse._id });
          console.log(`🗑️ Deleted existing LineItem documents for PO ${poToUse.poNumber}`);
        }

        // Clear the lineItems array in the PO
        poToUse.lineItems = [];
        await poToUse.save();
        console.log(`✅ PO ${poToUse.poNumber} lineItems array cleared`);

        // Mark this PO as cleared
        clearedPOs.add(poToUse._id.toString());
      }

      if (!poToUse) {
        console.log(`❌ No PO found for item: ${itemCode} - ${description.substring(0, 30)}...`);
        continue;
      }

      console.log(`✅ Processing item ${itemCode} for PO ${poToUse.poNumber}`);

      // Implement ETA logic and quantity discrepancy detection
      let calculatedEta = parseDate(expectedArrivalDate);
      let notesArray = [`NetSuite Import - Qty: ${quantity}, Received: ${received}, Billed: ${billed}`];
      
      // Add vendor description if available
      if (vendorDescription) {
        notesArray.push(`Vendor Desc: ${vendorDescription}`);
      }
      
      // Quantity Discrepancy Detection:
      // If Bill Variance Status is empty BUT there's a value in Bill Variance Field
      if (!billVarianceStatus && billVarianceField) {
        notesArray.push('Quantity Discrepancy');
        console.log(`⚠️ Quantity discrepancy detected for ${itemCode}: No variance status but variance field has value`);
      }
      
      // ETA Logic: Use Expected Arrival Date only if no Bill Variance Field value
      if (!billVarianceField && expectedArrivalDate) {
        calculatedEta = parseDate(expectedArrivalDate);
        console.log(`📅 Setting ETA from Expected Arrival Date for ${itemCode}: ${expectedArrivalDate}`);
      } else if (billVarianceField) {
        // Don't worry about Expected Arrival Date if there's a Bill Variance Field value
        calculatedEta = null;
        console.log(`🚫 Ignoring Expected Arrival Date for ${itemCode} due to Bill Variance Field value`);
      }

      // Create the line item
      const lineItem = new LineItem({
        poId: poToUse._id,
        poNumber: poToUse.poNumber,
        date: expectedReceiptDate || expectedArrivalDate || new Date().toISOString().split('T')[0],
        memo: description, // Use description as memo (required field)
        sku: itemCode,
        quantityExpected: quantity, // Store the quantity from CSV
        unit: units, // Store the unit from CSV
        billVarianceStatus: billVarianceStatus,
        billVarianceField: billVarianceField,
        expectedArrivalDate: parseDate(expectedArrivalDate),
        itemStatus: closed === 'T' ? 'Closed' : (received >= quantity ? 'Received' : 'Pending'),
        received: received >= quantity, // Convert to boolean - true if fully received
        receivedDate: received > 0 ? new Date() : null,
        eta: calculatedEta, // Use calculated ETA based on logic
        notes: notesArray.join(', ')
      });

      console.log(`💾 Creating LineItem with eta:`, parseDate(expectedArrivalDate));

      await lineItem.save();
      console.log(`✅ LineItem saved with ID: ${lineItem._id}`);

      // Update the PO's lineItems array if it doesn't already contain this line item
      if (!poToUse.lineItems) {
        poToUse.lineItems = [];
      }

      // Check if line item already exists in PO
      const existingIndex = poToUse.lineItems.findIndex(li =>
        li.sku === itemCode && li.memo === description
      );

      if (existingIndex === -1) {
        const lineItemData = {
          sku: itemCode,
          memo: description,
          itemStatus: closed === 'T' ? 'Closed' : (received >= quantity ? 'Received' : 'Pending'),
          received: received >= quantity,
          lineItemId: lineItem._id,
          // NetSuite specific data for reference
          netsuiteQuantity: quantity,
          netsuiteReceived: received,
          netsuiteBilled: billed,
          vendorDescription: vendorDescription
        };

        poToUse.lineItems.push(lineItemData);
        console.log(`➕ Added new line item to PO: ${itemCode}`);
      } else {
        // Update existing line item
        poToUse.lineItems[existingIndex] = {
          ...poToUse.lineItems[existingIndex],
          sku: itemCode,
          memo: description,
          itemStatus: closed === 'T' ? 'Closed' : (received >= quantity ? 'Received' : 'Pending'),
          received: received >= quantity,
          lineItemId: lineItem._id,
          netsuiteQuantity: quantity,
          netsuiteReceived: received,
          netsuiteBilled: billed,
          vendorDescription: vendorDescription
        };
        console.log(`🔄 Updated existing line item in PO: ${itemCode}`);
      }

      await poToUse.save();
      console.log(`💾 PO updated with ${poToUse.lineItems.length} line items`);
      imported++;
    }

    res.json({
      success: true,
      imported,
      message: `Successfully imported ${imported} line items`
    });

  } catch (error) {
    console.error('NetSuite import error:', error);
    res.status(500).json({ error: error.message });
  }
});

// =============================================================================
// 17TRACK API INTEGRATION ROUTES
// =============================================================================

// Register tracking numbers with 17track
router.post('/tracking/register', async (req, res) => {
  try {
    const { trackingNumbers } = req.body;

    if (!trackingNumbers || !Array.isArray(trackingNumbers)) {
      return res.status(400).json({ error: 'trackingNumbers array is required' });
    }

    console.log('📦 Registering tracking numbers:', trackingNumbers.length);

    // Format tracking numbers for API
    const formattedNumbers = trackingNumbers.map(item =>
      trackingService.formatTrackingNumber(item.number, item.carrier)
    );

    const result = await trackingService.registerTrackingNumbers(formattedNumbers);

    res.json({
      success: true,
      message: `Registered ${trackingNumbers.length} tracking numbers`,
      data: result
    });
  } catch (error) {
    console.error('Tracking registration error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get tracking status for line items
router.post('/tracking/status', async (req, res) => {
  try {
    const { trackingNumbers } = req.body;

    if (!trackingNumbers || !Array.isArray(trackingNumbers)) {
      return res.status(400).json({ error: 'trackingNumbers array is required' });
    }

    console.log('🔍 Getting tracking status for:', trackingNumbers.length, 'numbers');

    const result = await trackingService.getBatchStatus(trackingNumbers);

    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    console.error('Tracking status error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Update all line items with tracking information
router.post('/tracking/update-all', async (req, res) => {
  try {
    console.log('🚀 Starting bulk tracking update...');

    // Find all line items with tracking numbers
    const lineItemsWithTracking = await LineItem.find({
      trackingNumber: { $exists: true, $ne: '', $ne: null }
    });

    if (lineItemsWithTracking.length === 0) {
      return res.json({
        success: true,
        message: 'No line items with tracking numbers found',
        updated: 0
      });
    }

    console.log(`Found ${lineItemsWithTracking.length} line items with tracking numbers`);

    // Get unique tracking numbers
    const trackingNumbers = [...new Set(lineItemsWithTracking.map(item => item.trackingNumber))];

    console.log(`Checking ${trackingNumbers.length} unique tracking numbers`);

    // Get tracking status from 17track
    const trackingData = await trackingService.getBatchStatus(
      trackingNumbers.map(num => ({ number: num }))
    );

    // Update line items with tracking information
    const updateResults = await trackingService.updateLineItemsWithTracking(
      lineItemsWithTracking,
      trackingData.data?.accepted || []
    );

    console.log(`✅ Updated ${updateResults.length} line items with tracking data`);

    res.json({
      success: true,
      message: `Updated ${updateResults.length} line items with tracking information`,
      totalTracked: trackingNumbers.length,
      updated: updateResults.length
    });
  } catch (error) {
    console.error('Bulk tracking update error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Update tracking for a specific PO
router.post('/:id/tracking/update', async (req, res) => {
  try {
    const purchaseOrder = await PurchaseOrder.findById(req.params.id);
    if (!purchaseOrder) {
      return res.status(404).json({ error: 'Purchase order not found' });
    }

    // Find line items for this PO with tracking numbers
    const lineItems = await LineItem.find({
      poId: req.params.id,
      trackingNumber: { $exists: true, $ne: '', $ne: null }
    });

    if (lineItems.length === 0) {
      return res.json({
        success: true,
        message: 'No line items with tracking numbers found for this PO',
        updated: 0
      });
    }

    console.log(`Updating tracking for ${lineItems.length} line items in PO ${purchaseOrder.poNumber}`);

    // Get unique tracking numbers
    const trackingNumbers = [...new Set(lineItems.map(item => item.trackingNumber))];

    // Get tracking status from 17track
    const trackingData = await trackingService.getBatchStatus(
      trackingNumbers.map(num => ({ number: num }))
    );

    // Update line items with tracking information
    const updateResults = await trackingService.updateLineItemsWithTracking(
      lineItems,
      trackingData.data?.accepted || []
    );

    console.log(`✅ Updated ${updateResults.length} line items with tracking data for PO ${purchaseOrder.poNumber}`);

    res.json({
      success: true,
      message: `Updated tracking for ${updateResults.length} line items`,
      poNumber: purchaseOrder.poNumber,
      updated: updateResults.length
    });
  } catch (error) {
    console.error('PO tracking update error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Add tracking number to line item
router.put('/line-items/:lineItemId/tracking', async (req, res) => {
  try {
    const { trackingNumber, carrier } = req.body;

    const lineItem = await LineItem.findByIdAndUpdate(
      req.params.lineItemId,
      {
        trackingNumber: trackingNumber?.trim() || '',
        trackingCarrier: carrier?.trim() || '',
        updatedAt: new Date()
      },
      { new: true }
    );

    if (!lineItem) {
      return res.status(404).json({ error: 'Line item not found' });
    }

    // If tracking number was added, optionally register it with 17track
    if (trackingNumber && trackingNumber.trim()) {
      try {
        await trackingService.registerTrackingNumbers([
          trackingService.formatTrackingNumber(trackingNumber.trim(), carrier)
        ]);
        console.log(`Registered tracking number ${trackingNumber} with 17track`);
      } catch (registerError) {
        console.error('Failed to register tracking number:', registerError);
        // Don't fail the request if registration fails
      }
    }

    console.log(`Updated tracking for line item ${lineItem._id} (PO ${lineItem.poNumber}): ${trackingNumber || 'cleared'}`);
    res.json({ success: true, lineItem });
  } catch (error) {
    console.error('Line item tracking update error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Update tracking status for a single line item
router.put('/line-items/:lineItemId/tracking/update', async (req, res) => {
  try {
    const { lineItemId } = req.params;

    // Find the line item
    const lineItem = await LineItem.findById(lineItemId);
    if (!lineItem) {
      return res.status(404).json({ error: 'Line item not found' });
    }

    if (!lineItem.trackingNumber) {
      return res.status(400).json({ error: 'No tracking number assigned to this line item' });
    }

    console.log(`🔄 Updating tracking for line item ${lineItemId} with tracking number: ${lineItem.trackingNumber}`);

    // Get updated tracking information from 17track
    const trackingData = await trackingService.getTrackingInfo([
      { number: lineItem.trackingNumber }
    ]);

    if (trackingData.data && trackingData.data.accepted && trackingData.data.accepted.length > 0) {
      const parsedStatus = trackingService.parseTrackingStatus(trackingData.data.accepted[0]);

      // Update the line item with new tracking information
      const updatedLineItem = await LineItem.findByIdAndUpdate(
        lineItemId,
        {
          trackingStatus: parsedStatus.status,
          trackingStatusDescription: parsedStatus.statusDescription,
          trackingLastUpdate: new Date(),
          trackingLocation: parsedStatus.lastLocation,
          trackingEstimatedDelivery: parsedStatus.estimatedDelivery,
          updatedAt: new Date()
        },
        { new: true }
      );

      console.log(`✅ Updated tracking for line item ${lineItemId}: ${parsedStatus.status}`);

      res.json({
        success: true,
        lineItem: updatedLineItem,
        trackingInfo: parsedStatus
      });
    } else {
      res.json({
        success: false,
        message: 'No tracking information found',
        lineItem: lineItem
      });
    }
  } catch (error) {
    console.error('Line item tracking update error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Debug route for testing specific tracking number
router.get('/tracking/debug/:trackingNumber/:carrier', async (req, res) => {
  try {
    const { trackingNumber, carrier } = req.params;

    console.log('🐞 DEBUG: Testing tracking number:', trackingNumber, 'with carrier:', carrier || 'auto-detect');

    // Test 1: Try registering the tracking number first
    const trackingObj = trackingService.formatTrackingNumber(trackingNumber, carrier);
    console.log('📦 Formatted tracking object:', trackingObj);

    try {
      console.log('🔄 Step 1: Attempting to register tracking number...');
      const registerResult = await trackingService.registerTrackingNumbers([trackingObj]);
      console.log('✅ Registration result:', registerResult);
    } catch (registerError) {
      console.log('⚠️ Registration failed (may be already registered):', registerError.response?.data || registerError.message);
    }

    // Test 2: Try to get tracking info
    console.log('🔄 Step 2: Attempting to get tracking info...');
    const trackingData = await trackingService.getTrackingInfo([{ number: trackingNumber }]);
    console.log('📊 Raw tracking data:', JSON.stringify(trackingData, null, 2));

    if (trackingData.data && trackingData.data.accepted && trackingData.data.accepted.length > 0) {
      const parsedStatus = trackingService.parseTrackingStatus(trackingData.data.accepted[0]);
      console.log('✅ Parsed status:', parsedStatus);

      res.json({
        success: true,
        trackingNumber,
        carrier,
        rawData: trackingData.data.accepted[0],
        parsedStatus: parsedStatus,
        registrationAttempt: 'completed'
      });
    } else {
      console.log('❌ No tracking data found');
      res.json({
        success: false,
        message: 'No tracking data found',
        trackingNumber,
        carrier,
        rawResponse: trackingData
      });
    }
  } catch (error) {
    console.error('💥 Debug tracking error:', error);
    res.status(500).json({
      error: error.message,
      trackingNumber: req.params.trackingNumber,
      carrier: req.params.carrier,
      details: error.response?.data || error.stack
    });
  }
});

// Get tracking details for a specific tracking number
router.get('/tracking/:trackingNumber', async (req, res) => {
  try {
    const { trackingNumber } = req.params;

    console.log('🔍 Getting detailed tracking info for:', trackingNumber);

    const trackingData = await trackingService.getTrackingInfo([
      { number: trackingNumber }
    ]);

    if (trackingData.data && trackingData.data.accepted && trackingData.data.accepted.length > 0) {
      const parsedStatus = trackingService.parseTrackingStatus(trackingData.data.accepted[0]);
      res.json({
        success: true,
        trackingInfo: parsedStatus,
        rawData: trackingData.data.accepted[0]
      });
    } else {
      res.json({
        success: false,
        message: 'No tracking information found'
      });
    }
  } catch (error) {
    console.error('Tracking details error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Tracking dashboard page
router.get('/tracking-dashboard', async (req, res) => {
  try {
    console.log('📊 Loading tracking dashboard...');

    // Get statistics
    const totalLineItems = await LineItem.countDocuments();
    const itemsWithTracking = await LineItem.countDocuments({
      trackingNumber: { $exists: true, $ne: '', $ne: null }
    });
    const deliveredItems = await LineItem.countDocuments({
      trackingStatus: '40' // 40 = Delivered in 17track
    });
    const inTransitItems = await LineItem.countDocuments({
      trackingStatus: '10' // 10 = In Transit in 17track
    });

    // Get recent tracking updates
    const recentlyUpdated = await LineItem.find({
      trackingLastUpdate: { $exists: true, $ne: null }
    })
      .sort({ trackingLastUpdate: -1 })
      .limit(10)
      .populate('poId', 'poNumber vendor');

    // Get items needing attention (tracking issues)
    const trackingIssues = await LineItem.find({
      $or: [
        { trackingStatus: '20' }, // Expired
        { trackingStatus: '35' }, // Undelivered
        { trackingStatus: '50' }  // Alert
      ]
    })
      .populate('poId', 'poNumber vendor')
      .limit(20);

    // Get unique carriers for filtering
    const uniqueCarriers = await LineItem.distinct('trackingCarrier');

    res.render('tracking-dashboard', {
      stats: {
        totalLineItems,
        itemsWithTracking,
        deliveredItems,
        inTransitItems,
        trackingCoverage: totalLineItems > 0 ? Math.round((itemsWithTracking / totalLineItems) * 100) : 0
      },
      recentlyUpdated,
      trackingIssues,
      uniqueCarriers: uniqueCarriers.filter(Boolean).sort()
    });
  } catch (error) {
    console.error('Tracking dashboard error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Task Management API endpoints for dashboard
// Get tasks for a specific PO
router.get('/api/po/:poId/tasks', async (req, res) => {
  try {
    const { poId } = req.params;
    const tasks = await Task.find({ 
      relatedPOs: poId 
    }).populate('relatedPOs', 'poNumber vendor');
    
    res.json({ success: true, tasks });
  } catch (error) {
    console.error('Get PO tasks error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Create a new task for a PO from the dashboard
router.post('/api/po/:poId/tasks', async (req, res) => {
  try {
    const { poId } = req.params;
    const {
      title,
      description,
      priority = 'medium',
      category = 'po-management',
      dueDate,
      assignedTo = ''
    } = req.body;

    // Verify the PO exists
    const po = await PurchaseOrder.findById(poId);
    if (!po) {
      return res.status(404).json({ error: 'Purchase order not found' });
    }

    const task = new Task({
      title,
      description,
      priority,
      category,
      dueDate: new Date(dueDate),
      assignedTo,
      createdBy: 'Dashboard User',
      relatedPOs: [poId],
      relatedPONumbers: [po.poNumber]
    });

    await task.save();
    await task.populate('relatedPOs', 'poNumber vendor');
    
    console.log(`✅ Task created from dashboard for PO ${po.poNumber}:`, task.title);
    res.json({ success: true, task });
  } catch (error) {
    console.error('Create PO task error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Update a task from the dashboard
router.put('/api/tasks/:taskId', async (req, res) => {
  try {
    const { taskId } = req.params;
    const updateData = req.body;

    // Handle date fields
    if (updateData.dueDate) {
      updateData.dueDate = new Date(updateData.dueDate);
    }

    const task = await Task.findByIdAndUpdate(taskId, updateData, { new: true })
      .populate('relatedPOs', 'poNumber vendor');

    if (!task) {
      return res.status(404).json({ error: 'Task not found' });
    }

    console.log(`✅ Task updated from dashboard:`, task.title);
    res.json({ success: true, task });
  } catch (error) {
    console.error('Update task error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Manual hide/unhide PO routes
router.post('/hide/:poId', async (req, res) => {
  try {
    const { poId } = req.params;
    const { reason = 'Manually hidden' } = req.body;
    const hiddenBy = req.user ? req.user.username : 'Unknown User';

    const po = await PurchaseOrder.findByIdAndUpdate(poId, {
      $set: {
        isHidden: true,
        hiddenDate: new Date(),
        hiddenReason: reason,
        hiddenBy: hiddenBy
      }
    }, { new: true });

    if (!po) {
      return res.status(404).json({ success: false, error: 'PO not found' });
    }

    // Also hide associated line items
    await LineItem.updateMany(
      { poNumber: po.poNumber, isHidden: { $ne: true } },
      {
        $set: {
          isHidden: true,
          hiddenDate: new Date(),
          hiddenReason: 'Parent PO hidden',
          hiddenBy: hiddenBy
        }
      }
    );

    res.json({ success: true, message: `PO ${po.poNumber} has been hidden` });
  } catch (error) {
    console.error('Hide PO error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

router.post('/unhide/:poId', async (req, res) => {
  try {
    const { poId } = req.params;

    const po = await PurchaseOrder.findByIdAndUpdate(poId, {
      $unset: {
        isHidden: 1,
        hiddenDate: 1,
        hiddenReason: 1,
        hiddenBy: 1
      }
    }, { new: true });

    if (!po) {
      return res.status(404).json({ success: false, error: 'PO not found' });
    }

    // Also unhide associated line items that were hidden due to parent PO
    await LineItem.updateMany(
      { poNumber: po.poNumber, hiddenReason: 'Parent PO hidden' },
      {
        $unset: {
          isHidden: 1,
          hiddenDate: 1,
          hiddenReason: 1,
          hiddenBy: 1
        }
      }
    );

    res.json({ success: true, message: `PO ${po.poNumber} has been unhidden` });
  } catch (error) {
    console.error('Unhide PO error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// File attachment routes
const path = require('path');
const fs = require('fs');

// Configure multer for file uploads
const attachmentUpload = multer({
  dest: 'uploads/po-attachments/',
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    // Check file type
    const allowedTypes = /\.(pdf|jpg|jpeg|png|doc|docx|xls|xlsx|txt)$/i;
    const isValidType = allowedTypes.test(file.originalname);
    
    if (isValidType) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only PDF, images, Word, Excel, and text files are allowed.'));
    }
  }
});

// Upload attachment
router.post('/upload-attachment', attachmentUpload.single('attachment'), async (req, res) => {
  console.log('📎 UPLOAD ROUTE HIT - File upload attempt');
  console.log('📎 Request body:', req.body);
  console.log('📎 File info:', req.file ? { name: req.file.originalname, size: req.file.size } : 'No file');
  
  try {
    const { poId, description, documentType } = req.body;
    const uploadedBy = req.user ? req.user.username : 'Unknown User';
    
    console.log('📎 Upload params:', { poId, description, documentType, uploadedBy });
    
    if (!req.file) {
      console.log('❌ No file uploaded');
      return res.status(400).json({ success: false, error: 'No file uploaded' });
    }
    
    if (!poId) {
      console.log('❌ No PO ID provided');
      return res.status(400).json({ success: false, error: 'PO ID is required' });
    }
    
    console.log('📎 Looking for PO with ID:', poId);
    
    // Find the PO
    const po = await PurchaseOrder.findById(poId);
    if (!po) {
      console.log('❌ PO not found, cleaning up file');
      // Clean up uploaded file
      fs.unlinkSync(req.file.path);
      return res.status(404).json({ success: false, error: 'Purchase Order not found' });
    }
    
    console.log('✅ Found PO:', po.poNumber, '-', po.vendor);
    
    // Ensure attachments array exists
    if (!po.attachments) {
      console.log('📎 Initializing attachments array for PO');
      po.attachments = [];
    }
    
    // Create unique filename with timestamp
    const timestamp = Date.now();
    const fileExtension = path.extname(req.file.originalname);
    const savedFilename = `${timestamp}-${req.file.originalname}`;
    const finalPath = path.join('uploads/po-attachments', savedFilename);
    
    // Move file to final location
    fs.renameSync(req.file.path, finalPath);
    
    // Add attachment to PO
    const attachment = {
      filename: req.file.originalname,
      savedFilename: savedFilename,
      filePath: finalPath,
      fileSize: req.file.size,
      fileType: req.file.mimetype,
      uploadedBy: uploadedBy,
      uploadedAt: new Date(),
      description: description || '',
      documentType: documentType || 'Other'
    };
    
    console.log('📎 Adding attachment to PO:', attachment);
    
    po.attachments.push(attachment);
    await po.save();
    
    console.log(`✅ File uploaded successfully: ${req.file.originalname} for PO ${po.poNumber}`);
    console.log(`✅ PO now has ${po.attachments.length} attachments`);
    
    res.json({ 
      success: true, 
      message: 'File uploaded successfully',
      attachment: attachment
    });
    
  } catch (error) {
    console.error('Upload attachment error:', error);
    
    // Clean up uploaded file if it exists
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
    
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get attachments for a PO
router.get('/attachments/:poId', async (req, res) => {
  try {
    const { poId } = req.params;
    console.log('📎 GET ATTACHMENTS: Request for PO ID:', poId);
    
    const po = await PurchaseOrder.findById(poId);
    if (!po) {
      console.log('❌ GET ATTACHMENTS: PO not found');
      return res.status(404).json({ success: false, error: 'Purchase Order not found' });
    }
    
    console.log('✅ GET ATTACHMENTS: Found PO:', po.poNumber);
    console.log('📎 GET ATTACHMENTS: Attachments count:', po.attachments ? po.attachments.length : 'No attachments array');
    
    res.json({ 
      success: true, 
      attachments: po.attachments || []
    });
    
  } catch (error) {
    console.error('Get attachments error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Download attachment
router.get('/download-attachment/:attachmentId', async (req, res) => {
  try {
    const { attachmentId } = req.params;
    
    // Find PO with this attachment
    const po = await PurchaseOrder.findOne({
      'attachments._id': attachmentId
    });
    
    if (!po) {
      return res.status(404).json({ success: false, error: 'Attachment not found' });
    }
    
    // Find the specific attachment
    const attachment = po.attachments.id(attachmentId);
    if (!attachment) {
      return res.status(404).json({ success: false, error: 'Attachment not found' });
    }
    
    // Check if file exists
    if (!fs.existsSync(attachment.filePath)) {
      return res.status(404).json({ success: false, error: 'File not found on disk' });
    }
    
    // Set headers for download
    res.setHeader('Content-Disposition', `attachment; filename="${attachment.filename}"`);
    res.setHeader('Content-Type', attachment.fileType);
    
    // Stream the file
    const fileStream = fs.createReadStream(attachment.filePath);
    fileStream.pipe(res);
    
  } catch (error) {
    console.error('Download attachment error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// View attachment (for iframe display)
router.get('/view-attachment/:attachmentId', async (req, res) => {
  try {
    const { attachmentId } = req.params;
    console.log(`📄 View attachment request for ID: ${attachmentId}`);
    
    // Find PO with this attachment
    const po = await PurchaseOrder.findOne({
      'attachments._id': attachmentId
    });
    
    if (!po) {
      console.log(`❌ Attachment not found: ${attachmentId}`);
      return res.status(404).send('Attachment not found');
    }
    
    // Find the specific attachment
    const attachment = po.attachments.id(attachmentId);
    if (!attachment) {
      console.log(`❌ Attachment not found in PO: ${attachmentId}`);
      return res.status(404).send('Attachment not found');
    }
    
    console.log(`📋 Found attachment: ${attachment.filename} in PO ${po.poNumber}`);
    
    // Check if file exists
    if (!fs.existsSync(attachment.filePath)) {
      console.log(`❌ File not found on disk: ${attachment.filePath}`);
      return res.status(404).send('File not found');
    }
    
    console.log(`📤 Serving attachment for viewing: ${attachment.filename}`);
    
    // Set headers optimized for iframe viewing
    res.setHeader('Content-Type', attachment.fileType || 'application/octet-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    
    // For PDFs and images, use inline display
    if (attachment.fileType && (attachment.fileType.includes('pdf') || attachment.fileType.includes('image'))) {
      res.setHeader('Content-Disposition', `inline; filename="${attachment.filename}"`);
    }
    
    // Stream the file
    const fileStream = fs.createReadStream(attachment.filePath);
    fileStream.pipe(res);
    
  } catch (error) {
    console.error('View attachment error:', error);
    res.status(500).send('Error loading attachment');
  }
});

// Delete attachment
router.delete('/attachments/:attachmentId', async (req, res) => {
  try {
    const { attachmentId } = req.params;
    
    // Find PO with this attachment
    const po = await PurchaseOrder.findOne({
      'attachments._id': attachmentId
    });
    
    if (!po) {
      return res.status(404).json({ success: false, error: 'Attachment not found' });
    }
    
    // Find the specific attachment
    const attachment = po.attachments.id(attachmentId);
    if (!attachment) {
      return res.status(404).json({ success: false, error: 'Attachment not found' });
    }
    
    // Delete file from disk if it exists
    if (fs.existsSync(attachment.filePath)) {
      fs.unlinkSync(attachment.filePath);
    }
    
    // Remove attachment from PO
    po.attachments.pull(attachmentId);
    await po.save();
    
    console.log(`🗑️ Attachment deleted: ${attachment.filename} from PO ${po.poNumber}`);
    
    res.json({ 
      success: true, 
      message: 'Attachment deleted successfully'
    });
    
  } catch (error) {
    console.error('Delete attachment error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Test route to check specific PO status (for debugging)
router.get('/test-po/:poNumber', async (req, res) => {
  try {
    const { poNumber } = req.params;
    console.log(`🔍 Testing PO status for: ${poNumber}`);
    
    const po = await PurchaseOrder.findOne({ poNumber: poNumber });
    if (!po) {
      return res.json({ found: false, message: `PO ${poNumber} not found` });
    }
    
    const lineItems = await LineItem.find({ poNumber: poNumber });
    const hiddenLineItems = lineItems.filter(item => item.isHidden);
    
    res.json({
      found: true,
      po: {
        poNumber: po.poNumber,
        vendor: po.vendor,
        amount: po.amount,
        nsStatus: po.nsStatus,
        status: po.status,
        isHidden: po.isHidden,
        hiddenDate: po.hiddenDate,
        hiddenReason: po.hiddenReason,
        hiddenBy: po.hiddenBy
      },
      lineItems: {
        total: lineItems.length,
        hidden: hiddenLineItems.length,
        visible: lineItems.length - hiddenLineItems.length
      }
    });
  } catch (error) {
    console.error('Test PO error:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;