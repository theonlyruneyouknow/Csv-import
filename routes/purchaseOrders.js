// routes/purchaseOrders.js
const express = require('express');
const multer = require('multer');
const Papa = require('papaparse');
const PurchaseOrder = require('../models/PurchaseOrder');
const PrePurchaseOrder = require('../models/PrePurchaseOrder');
const StatusOption = require('../models/StatusOption');
const LineItemStatusOption = require('../models/LineItemStatusOption');
const PoTypeOption = require('../models/PoTypeOption');
const Note = require('../models/Note');
const LineItem = require('../models/LineItem');
const OrganicVendor = require('../models/OrganicVendor');
const Vendor = require('../models/Vendor');
const { splitVendorData } = require('../lib/vendorUtils');
const { trackPOChange, trackMultipleChanges, trackLineItemChange } = require('../lib/changeTracking');
const Task = require('../models/Task');

const router = express.Router();
const upload = multer({ dest: 'uploads/' });

// Debug middleware to log all requests hitting this router
router.use((req, res, next) => {
  console.log(`🔶 Router middleware: ${req.method} ${req.path} (originalUrl: ${req.originalUrl})`);
  next();
});

// Test route to verify router is working
router.get('/test-upload', (req, res) => {
  console.log('🧪 TEST ROUTE HIT - Upload route is accessible!');
  res.json({ status: 'Upload route is working', timestamp: new Date() });
});

// Initialize default PO type options if they don't exist
const initializeDefaultPoTypes = async () => {
  try {
    const count = await PoTypeOption.countDocuments();

    if (count === 0) {
      const defaultTypes = [
        { name: 'Seed', color: '#28a745', emoji: '🌱', isDefault: true },
        { name: 'Hardgood', color: '#6c757d', emoji: '🔧', isDefault: true },
        { name: 'Greengood', color: '#20c997', emoji: '🌿', isDefault: true }
      ];

      await PoTypeOption.insertMany(defaultTypes);
      console.log('✅ Initialized default PO type options:', defaultTypes.map(t => t.name).join(', '));
    }
  } catch (error) {
    console.error('❌ Error initializing default PO types:', error);
  }
};

// Initialize on module load
initializeDefaultPoTypes();

// Helper function to calculate the earliest upcoming ETA from line items
const calculateUpcomingETA = (lineItems) => {
  if (!lineItems || lineItems.length === 0) return null;

  const now = new Date();
  const upcomingETAs = lineItems
    .filter(item => {
      // Check for any type of ETA (eta, expectedArrivalDate, or trackingEstimatedDelivery)
      const hasETA = item.eta || item.expectedArrivalDate || item.trackingEstimatedDelivery;
      if (!hasETA) return false;

      // Use the best available ETA
      const etaDate = item.eta || item.expectedArrivalDate || item.trackingEstimatedDelivery;
      return new Date(etaDate) > now;
    })
    .map(item => {
      const etaDate = item.eta || item.expectedArrivalDate || item.trackingEstimatedDelivery;
      return new Date(etaDate);
    })
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

// Helper function to ensure vendor exists in OrganicVendor database
const ensureVendorExists = async (vendorData) => {
  try {
    const { vendorNumber, vendorName, originalVendor } = vendorData;

    // Skip if no vendor data
    if (!vendorNumber && !vendorName) {
      return null;
    }

    // Create a unique internal ID from vendor number or name
    const internalId = vendorNumber || vendorName.replace(/[^a-zA-Z0-9]/g, '').toUpperCase();

    // Check if vendor already exists by internal ID or vendor number
    const searchCriteria = {
      $or: [
        { internalId: internalId },
        { vendorName: vendorName },
        ...(vendorNumber ? [{ internalId: vendorNumber }] : [])
      ]
    };

    let existingVendor = await OrganicVendor.findOne(searchCriteria);

    if (existingVendor) {
      return existingVendor;
    }

    // Create new vendor with minimal required fields
    const newVendor = new OrganicVendor({
      vendorName: vendorName || `Vendor ${vendorNumber}`,
      internalId: internalId,
      lastOrganicCertificationDate: new Date('1900-01-01'),
      status: 'Pending Review',
      address: {
        country: 'United States'
      },
      notes: `Auto-created during CSV import from PO data. Original vendor string: "${originalVendor}". Vendor Number: ${vendorNumber || 'N/A'}`
    });

    await newVendor.save();
    return newVendor;
  } catch (error) {
    console.error(`❌ Error ensuring vendor exists for "${vendorData.originalVendor}":`, error);
    return null;
  }
};

// Upload and parse CSV
router.post('/upload', upload.single('csvFile'), async (req, res) => {
  console.log('🚨 UPLOAD ENDPOINT HIT! File upload detected!');
  console.log('📁 Request file:', req.file ? req.file.originalname : 'NO FILE');
  console.log('📁 Request body:', req.body);

  try {
    if (!req.file) {
      console.log('❌ No file uploaded!');
      return res.status(400).send('No file uploaded');
    }

    const fs = require('fs');
    const fileContent = fs.readFileSync(req.file.path, 'utf8');

    console.log('📁 CSV UPLOAD DEBUG - Starting CSV processing...');
    console.log('📁 File content preview:', fileContent.substring(0, 200) + '...');

    const parsed = Papa.parse(fileContent, { header: false });
    const reportDate = parsed.data[3][0]; // Extract report date

    console.log(`📊 CSV UPLOAD DEBUG - Report date: ${reportDate}`);
    console.log(`📊 CSV UPLOAD DEBUG - Total parsed rows: ${parsed.data.length}`);

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

    console.log(`📊 CSV UPLOAD DEBUG - Processing rows ${dataStartIndex} to ${dataEndIndex} (${dataRows.length} data rows)`);
    console.log(`📊 CSV UPLOAD DEBUG - Sample data rows:`, dataRows.slice(0, 3).map((row, idx) => ({
      rowIndex: dataStartIndex + idx,
      date: row[1],
      poNumber: row[2],
      vendor: row[3],
      status: row[4],
      amount: row[5]
    })));

    // Track which PO numbers were actually processed in this import
    const processedPONumbers = new Set();

    // Process each PO individually to preserve notes and custom status
    for (const row of dataRows) {
      const poNumber = row[2]; // PO number is the unique identifier
      const csvStatus = row[4]; // Status from CSV (this goes to NS Status!)
      const vendorString = row[3]; // Vendor data

      // Skip empty rows or invalid PO numbers
      if (!poNumber || !poNumber.trim()) {
        continue;
      }

      // Add to processed list
      processedPONumbers.add(poNumber.trim());

      // Find existing PO by PO number
      const existingPO = await PurchaseOrder.findOne({ poNumber: poNumber });

      // ALWAYS split vendor data and ensure vendor exists FIRST
      const vendorData = splitVendorData(vendorString);

      // Ensure vendor exists in vendor database and get default PO type
      const vendorResult = await ensureVendorExists(vendorData);
      
      // Try to get default PO type from main Vendor model
      let defaultPoType = '';
      console.log(`\n🔍 VENDOR DEFAULT PO TYPE LOOKUP for PO ${poNumber}:`);
      console.log(`   Vendor string: "${vendorString}"`);
      console.log(`   Vendor number: "${vendorData.vendorNumber}"`);
      console.log(`   Vendor name: "${vendorData.vendorName}"`);
      
      if (vendorData.vendorNumber) {
        const mainVendor = await Vendor.findOne({ vendorCode: vendorData.vendorNumber });
        console.log(`   Query: Vendor.findOne({ vendorCode: "${vendorData.vendorNumber}" })`);
        
        if (mainVendor) {
          console.log(`   ✅ Found vendor in Vendor collection:`);
          console.log(`      - Vendor name: ${mainVendor.vendorName}`);
          console.log(`      - Vendor code: ${mainVendor.vendorCode}`);
          console.log(`      - Default PO type: "${mainVendor.defaultPoType || '(empty)'}"`);
          
          if (mainVendor.defaultPoType) {
            defaultPoType = mainVendor.defaultPoType;
            console.log(`   ✅ Will apply default PO type: "${defaultPoType}"`);
          } else {
            console.log(`   ⚠️ Vendor has no default PO type set`);
          }
        } else {
          console.log(`   ❌ Vendor NOT FOUND in Vendor collection`);
          console.log(`   💡 This vendor needs to be created in the main Vendors page`);
        }
      } else {
        console.log(`   ⚠️ No vendor number extracted from vendor string`);
      }

      if (existingPO) {
        console.log(`   📝 PO ${poNumber} is EXISTING - will NOT apply default PO type (preserves existing type)`);

        // Update existing PO - CSV status goes to nsStatus, preserve custom status
        const updateData = {
          reportDate,
          date: row[1],
          poNumber: poNumber,
          vendor: vendorString,
          vendorNumber: vendorData.vendorNumber,
          vendorName: vendorData.vendorName,
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
        console.log(`   🆕 PO ${poNumber} is NEW - WILL apply default PO type: "${defaultPoType || '(none)'}"`);
        
        // Create new PO - CSV status goes to nsStatus, custom status starts empty, apply default PO type
        const newPO = await PurchaseOrder.create({
          reportDate,
          date: row[1],
          poNumber: poNumber,
          vendor: vendorString,
          vendorNumber: vendorData.vendorNumber,
          vendorName: vendorData.vendorName,
          nsStatus: csvStatus, // CSV status goes to NS Status
          status: '', // Custom status starts EMPTY
          poType: defaultPoType, // Auto-apply vendor's default PO type
          amount: parseFloat((row[5] || '0').replace(/[$,]/g, '')),
          location: row[6],
          notes: '',
          createdAt: new Date(),
          updatedAt: new Date()
        });
        
        console.log(`   ✅ Created new PO ${poNumber} with PO Type: "${newPO.poType || '(empty)'}"`);
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

    // ============================================================
    // AUTOMATIC VENDOR RECONCILIATION
    // ============================================================
    // Automatically link vendors to the main Vendor model after import
    console.log('\n🔗 === AUTOMATIC VENDOR RECONCILIATION ===');
    
    // Find all POs that don't have a linkedVendor
    const unlinkedPOs = await PurchaseOrder.find({
      vendor: { $exists: true, $ne: null, $ne: '' },
      $or: [
        { linkedVendor: { $exists: false } },
        { linkedVendor: null }
      ]
    });

    console.log(`📊 Found ${unlinkedPOs.length} POs with unlinked vendors`);

    if (unlinkedPOs.length > 0) {
      // Extract unique vendor strings
      const uniqueVendors = [...new Set(unlinkedPOs.map(po => po.vendor))];
      console.log(`📋 Processing ${uniqueVendors.length} unique vendors`);

      let vendorsCreated = 0;
      let posLinked = 0;

      // Process each unique vendor
      for (const vendorString of uniqueVendors) {
        // Split vendor data
        const vendorData = splitVendorData(vendorString);

        // Generate a vendor code if vendorNumber is empty
        let vendorCode = vendorData.vendorNumber || '';
        if (!vendorCode || vendorCode.trim() === '') {
          // Generate vendor code from vendor name
          const words = vendorData.vendorName.trim().split(/\s+/);
          if (words.length === 1) {
            vendorCode = words[0].substring(0, 4).toUpperCase();
          } else {
            vendorCode = words.slice(0, 5).map(word => word.charAt(0)).join('').toUpperCase();
          }
        }

        // Check if vendor already exists by vendorCode
        let vendor = await Vendor.findOne({ vendorCode: vendorCode });

        if (!vendor) {
          // Ensure vendor code is unique
          let finalVendorCode = vendorCode;
          let counter = 1;
          while (await Vendor.findOne({ vendorCode: finalVendorCode })) {
            finalVendorCode = vendorCode + counter;
            counter++;
          }

          // Create new vendor in the Vendor model
          vendor = new Vendor({
            vendorName: vendorData.vendorName,
            vendorCode: finalVendorCode,
            vendorType: 'Seeds', // Default type
            status: 'Active'
          });

          await vendor.save();
          vendorsCreated++;
          console.log(`✅ Created vendor: ${vendor.vendorName} (Code: ${finalVendorCode})`);
        }

        // Link this vendor to all matching POs
        const matchingPOs = unlinkedPOs.filter(po => po.vendor === vendorString);
        
        for (const po of matchingPOs) {
          po.linkedVendor = vendor._id;
          await po.save();
          posLinked++;
        }
      }

      console.log(`✅ Vendor reconciliation complete: ${vendorsCreated} vendors created, ${posLinked} POs linked`);
    } else {
      console.log(`✅ All POs already linked to vendors`);
    }

    // Clean up uploaded file
    fs.unlinkSync(req.file.path);

    // Send JSON response instead of redirect so client can handle navigation
    res.json({ success: true, redirect: '/manage-po-urls' });
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
    const { category = 'all', vendor = 'all', sortBy = 'poNumber', emailStatus = 'all', includeHidden = 'false' } = req.query;

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
          poDate: { $arrayElemAt: ['$purchaseOrder.date', 0] },
          poIsHidden: { $arrayElemAt: ['$purchaseOrder.isHidden', 0] }
        }
      },
      {
        $match: {
          ...baseMatch,
          poNsStatus: { $in: ['Partially Received', 'Pending Receipt'] },
          ...(includeHidden === 'true' ? {} : { poIsHidden: { $ne: true } }) // Conditionally exclude hidden POs
        }
      },
      {
        $lookup: {
          from: 'vendors',
          let: { poVendor: '$vendor' },
          pipeline: [
            {
              $match: {
                $expr: {
                  $or: [
                    // Try exact match with vendorName
                    { $eq: ['$vendorName', '$$poVendor'] },
                    // Try match with vendor code extracted from start of PO vendor field
                    { $eq: ['$vendorCode', { $arrayElemAt: [{ $split: ['$$poVendor', ' '] }, 0] }] }
                  ]
                }
              }
            }
          ],
          as: 'vendorInfo'
        }
      },
      {
        $addFields: {
          vendorData: { $arrayElemAt: ['$vendorInfo', 0] },
          // Auto-calculate if this is a partial shipment
          isPartialShipment: {
            $cond: {
              if: {
                $and: [
                  { $gt: ['$quantityReceived', 0] },
                  { $gt: ['$quantityExpected', 0] },
                  { $lt: ['$quantityReceived', '$quantityExpected'] }
                ]
              },
              then: true,
              else: false
            }
          },
          // Auto-calculate remaining quantity
          autoQuantityRemaining: {
            $cond: {
              if: {
                $and: [
                  { $gt: ['$quantityExpected', 0] },
                  { $gte: ['$quantityReceived', 0] }
                ]
              },
              then: { $subtract: ['$quantityExpected', '$quantityReceived'] },
              else: null
            }
          },
          // Use the best available ETA: eta field first, then expectedArrivalDate, then trackingEstimatedDelivery
          effectiveETA: {
            $cond: {
              if: { $and: [{ $ne: ['$eta', null] }, { $ne: ['$eta', ''] }] },
              then: '$eta',
              else: {
                $cond: {
                  if: { $and: [{ $ne: ['$expectedArrivalDate', null] }, { $ne: ['$expectedArrivalDate', ''] }] },
                  then: '$expectedArrivalDate',
                  else: {
                    $cond: {
                      if: { $and: [{ $ne: ['$trackingEstimatedDelivery', null] }, { $ne: ['$trackingEstimatedDelivery', ''] }] },
                      then: '$trackingEstimatedDelivery',
                      else: null
                    }
                  }
                }
              }
            }
          }
        }
      },
      {
        $addFields: {
          etaStatus: {
            $cond: {
              if: { $or: [{ $eq: ['$effectiveETA', null] }, { $eq: ['$effectiveETA', ''] }, { $not: ['$effectiveETA'] }] },
              then: 'no-eta',
              else: {
                $cond: {
                  if: { $lt: ['$effectiveETA', today] },
                  then: 'overdue',
                  else: {
                    $cond: {
                      if: { $lte: ['$effectiveETA', sevenDaysFromNow] },
                      then: 'approaching-soon',
                      else: {
                        $cond: {
                          if: { $lte: ['$effectiveETA', fourteenDaysFromNow] },
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
              if: { $or: [{ $eq: ['$effectiveETA', null] }, { $eq: ['$effectiveETA', ''] }, { $not: ['$effectiveETA'] }] },
              then: null,
              else: {
                $divide: [
                  { $subtract: ['$effectiveETA', today] },
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
      partialShipment: troubleItems.filter(item => item.isPartialShipment === true),
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
        const purchaseOrderData = item.purchaseOrder?.[0];
        troubleByPO[item.poNumber] = {
          poNumber: item.poNumber,
          vendor: item.vendor,
          vendorData: item.vendorData,
          poUrl: item.poUrl,
          poDate: item.poDate,
          _id: purchaseOrderData?._id, // Store PO ID for email tracking and snoozing
          lastEmailSent: purchaseOrderData?.lastEmailSent,
          lastEmailRecipient: purchaseOrderData?.lastEmailRecipient,
          lastEmailSubject: purchaseOrderData?.lastEmailSubject,
          snoozedUntil: purchaseOrderData?.snoozedUntil, // Include snooze data
          snoozedBy: purchaseOrderData?.snoozedBy,
          snoozeDuration: purchaseOrderData?.snoozeDuration,
          items: []
        };
      }
      troubleByPO[item.poNumber].items.push(item);
    });

    // Filter out snoozed POs (only show if snoozedUntil is null or in the past)
    let filteredPOs = Object.values(troubleByPO).filter(po => {
      if (!po.snoozedUntil) return true;
      return new Date(po.snoozedUntil) <= new Date();
    });

    // Filter by email status if specified
    if (emailStatus === 'contacted') {
      filteredPOs = filteredPOs.filter(po => po.lastEmailSent);
    } else if (emailStatus === 'not-contacted') {
      filteredPOs = filteredPOs.filter(po => !po.lastEmailSent);
    }

    // Get unique vendors for filter dropdown
    const uniqueVendors = [...new Set(troubleItems.map(item => item.vendor))].sort();

    // Calculate statistics for each vendor
    const vendorStats = {};
    uniqueVendors.forEach(vendorName => {
      const vendorItems = troubleItems.filter(item => item.vendor === vendorName);
      vendorStats[vendorName] = {
        total: vendorItems.length,
        overdue: vendorItems.filter(item => item.etaStatus === 'overdue').length,
        noEta: vendorItems.filter(item => item.etaStatus === 'no-eta').length,
        approachingSoon: vendorItems.filter(item => item.etaStatus === 'approaching-soon').length,
        approaching: vendorItems.filter(item => item.etaStatus === 'approaching').length
      };
    });

    // Calculate comprehensive statistics
    const stats = {
      totalItems: troubleItems.length,
      totalPOs: filteredPOs.length,
      noEtaCount: categories.noEta.length,
      approachingSoonCount: categories.approachingSoon.length,
      approachingCount: categories.approaching.length,
      overdueCount: categories.overdue.length,
      partialShipmentCount: categories.partialShipment.length,
      needsFollowupCount: categories.needsFollowup.length,
      vendorsWithIssues: uniqueVendors.length,
      uniqueVendors: uniqueVendors.length,
      contactedPOs: Object.values(troubleByPO).filter(po => po.lastEmailSent).length,
      notContactedPOs: Object.values(troubleByPO).filter(po => !po.lastEmailSent).length
    };

    res.render('trouble-seed', {
      troubleByPO: filteredPOs,
      stats,
      categories,
      uniqueVendors,
      vendorStats,
      currentFilters: {
        category,
        vendor,
        sortBy,
        emailStatus,
        includeHidden
      },
      troubleItems: displayItems,
      currentPage: 'trouble-seed',
      user: req.user || null // Pass user information for email signature
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

// API route to mark item as partial shipment
router.put('/line-items/:itemId/partial-shipment', async (req, res) => {
  try {
    const { itemId } = req.params;
    const {
      partialShipmentStatus,
      partialShipmentNotes,
      remainderETA,
      vendorResponse,
      vendorResponseDate
    } = req.body;

    const username = req.user ? req.user.username : 'System';

    console.log(`📦 Recording vendor response for partial shipment ${itemId}: ${partialShipmentStatus}`);

    const updateData = {
      partialShipmentStatus: partialShipmentStatus || '',
      partialShipmentNotes: partialShipmentNotes || '',
      partialShipmentDate: new Date(),
      partialShipmentUpdatedBy: username,
      vendorResponse: vendorResponse || '',
      vendorResponseDate: vendorResponseDate ? new Date(vendorResponseDate) : new Date()
    };

    if (remainderETA) {
      updateData.remainderETA = new Date(remainderETA);
    }

    const updatedItem = await LineItem.findByIdAndUpdate(
      itemId,
      updateData,
      { new: true }
    );

    if (!updatedItem) {
      return res.status(404).json({ error: 'Line item not found' });
    }

    console.log(`✅ Vendor response recorded for: ${updatedItem.memo} - Status: ${partialShipmentStatus}`);
    res.json({ success: true, item: updatedItem });

  } catch (error) {
    console.error('Error recording vendor response:', error);
    res.status(500).json({ error: 'Failed to record vendor response' });
  }
});

// Snooze POs in trouble seed dashboard
router.put('/pos/:poId/snooze', async (req, res) => {
  try {
    const { poId } = req.params;
    const { days } = req.body; // 1, 7, or 14 days

    if (!days || ![1, 7, 14].includes(Number(days))) {
      return res.status(400).json({ error: 'Invalid snooze duration. Must be 1, 7, or 14 days.' });
    }

    const username = req.user ? req.user.username : 'System';
    const snoozedUntil = new Date();
    snoozedUntil.setDate(snoozedUntil.getDate() + Number(days));

    console.log(`⏰ Snoozing PO ${poId} for ${days} days until ${snoozedUntil.toLocaleDateString()}`);

    const updatedPO = await PurchaseOrder.findByIdAndUpdate(
      poId,
      {
        snoozedUntil: snoozedUntil,
        snoozedBy: username,
        snoozeDuration: Number(days)
      },
      { new: true }
    );

    if (!updatedPO) {
      return res.status(404).json({ error: 'Purchase Order not found' });
    }

    console.log(`✅ Snoozed PO ${updatedPO.poNumber} until ${snoozedUntil.toLocaleDateString()}`);
    res.json({
      success: true,
      po: updatedPO,
      snoozedUntil: snoozedUntil,
      message: `Snoozed for ${days} day${days > 1 ? 's' : ''}`
    });

  } catch (error) {
    console.error('Error snoozing PO:', error);
    res.status(500).json({ error: 'Failed to snooze PO' });
  }
});

// Unsnooze (wake up) a PO
router.put('/pos/:poId/unsnooze', async (req, res) => {
  try {
    const { poId } = req.params;

    console.log(`⏰ Unsnoozing PO ${poId}`);

    const updatedPO = await PurchaseOrder.findByIdAndUpdate(
      poId,
      {
        snoozedUntil: null,
        snoozedBy: '',
        snoozeDuration: null
      },
      { new: true }
    );

    if (!updatedPO) {
      return res.status(404).json({ error: 'Purchase Order not found' });
    }

    console.log(`✅ Unsnoozed PO ${updatedPO.poNumber}`);
    res.json({ success: true, po: updatedPO });

  } catch (error) {
    console.error('Error unsnoozing PO:', error);
    res.status(500).json({ error: 'Failed to unsnooze PO' });
  }
});

// Update PO Type (Seed, Hardgood, Greengood)
router.put('/:poId/type', async (req, res) => {
  try {
    const { poId } = req.params;
    const { poType } = req.body;

    // Get valid types from database
    const validTypeOptions = await PoTypeOption.find({}, 'name');
    const validTypes = validTypeOptions.map(opt => opt.name);

    // Validate PO Type
    if (!poType || !validTypes.includes(poType)) {
      return res.status(400).json({ error: `Invalid PO type. Must be one of: ${validTypes.join(', ')}` });
    }

    console.log(`🏷️  Updating PO ${poId} type to ${poType}`);

    const updatedPO = await PurchaseOrder.findByIdAndUpdate(
      poId,
      { poType: poType },
      { new: true }
    );

    if (!updatedPO) {
      return res.status(404).json({ error: 'Purchase Order not found' });
    }

    console.log(`✅ Updated PO ${updatedPO.poNumber} type to ${poType}`);
    res.json({ success: true, po: updatedPO });

  } catch (error) {
    console.error('Error updating PO type:', error);
    res.status(500).json({ error: 'Failed to update PO type' });
  }
});

// PO Type Options Management Routes

// Get all PO type options
router.get('/po-type-options', async (req, res) => {
  try {
    const poTypeOptions = await PoTypeOption.find();
    // Sort with Seed first, then alphabetically
    poTypeOptions.sort((a, b) => {
      if (a.name === 'Seed') return -1;
      if (b.name === 'Seed') return 1;
      return a.name.localeCompare(b.name);
    });
    res.json(poTypeOptions);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Add new PO type option
router.post('/po-type-options', async (req, res) => {
  try {
    const { name, color, emoji } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({ error: 'Type name is required' });
    }

    const poTypeOption = await PoTypeOption.create({
      name: name.trim(),
      color: color || '#6c757d',
      emoji: emoji || '📦',
      isDefault: false
    });

    console.log(`Added new PO type option: "${poTypeOption.name}" with color ${poTypeOption.color} and emoji ${poTypeOption.emoji}`);
    res.json({ success: true, poTypeOption });
  } catch (error) {
    if (error.code === 11000) {
      res.status(400).json({ error: 'PO type option already exists' });
    } else {
      console.error('PO type option creation error:', error);
      res.status(500).json({ error: error.message });
    }
  }
});

// Delete PO type option
router.delete('/po-type-options/:id', async (req, res) => {
  try {
    const poTypeOption = await PoTypeOption.findById(req.params.id);

    if (!poTypeOption) {
      return res.status(404).json({ error: 'PO type option not found' });
    }

    // Prevent deletion of default types
    if (poTypeOption.isDefault) {
      return res.status(400).json({
        error: `Cannot delete default type "${poTypeOption.name}"`
      });
    }

    // Check if this type is being used by any purchase orders
    const usageCount = await PurchaseOrder.countDocuments({ poType: poTypeOption.name });

    if (usageCount > 0) {
      return res.status(400).json({
        error: `Cannot delete "${poTypeOption.name}" - it's being used by ${usageCount} purchase order(s)`
      });
    }

    await PoTypeOption.findByIdAndDelete(req.params.id);
    console.log(`Deleted PO type option: "${poTypeOption.name}"`);
    res.json({ success: true });
  } catch (error) {
    console.error('PO type option deletion error:', error);
    res.status(500).json({ error: error.message });
  }
});

// ============= ASSIGNEE MANAGEMENT ROUTES =============

const Assignee = require('../models/Assignee');

// Get all assignees
router.get('/assignees', async (req, res) => {
  try {
    const assignees = await Assignee.find().sort({ order: 1, name: 1 });
    res.json(assignees);
  } catch (error) {
    console.error('Error fetching assignees:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Create new assignee
router.post('/assignees', async (req, res) => {
  try {
    const { name, initials, email, color } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({ success: false, error: 'Name is required' });
    }

    if (!initials || !initials.trim()) {
      return res.status(400).json({ success: false, error: 'Initials are required' });
    }

    // Get the highest order number
    const lastAssignee = await Assignee.findOne().sort({ order: -1 });
    const order = lastAssignee ? lastAssignee.order + 1 : 0;

    const assignee = await Assignee.create({
      name: name.trim(),
      initials: initials.trim().toUpperCase(),
      email: email?.trim() || '',
      color: color || '#3498db',
      order
    });

    console.log(`✅ Created assignee: ${assignee.name} (${assignee.initials})`);
    res.json({ success: true, assignee });
  } catch (error) {
    console.error('Error creating assignee:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Update assignee
router.put('/assignees/:id', async (req, res) => {
  try {
    const { name, initials, email, color, isActive } = req.body;

    const assignee = await Assignee.findByIdAndUpdate(
      req.params.id,
      { name, initials: initials?.toUpperCase(), email, color, isActive },
      { new: true, runValidators: true }
    );

    if (!assignee) {
      return res.status(404).json({ success: false, error: 'Assignee not found' });
    }

    console.log(`✅ Updated assignee: ${assignee.name}`);
    res.json({ success: true, assignee });
  } catch (error) {
    console.error('Error updating assignee:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Delete assignee
router.delete('/assignees/:id', async (req, res) => {
  try {
    // Check if assignee is assigned to any POs
    const assignedCount = await PurchaseOrder.countDocuments({ assignedTo: req.params.id });

    if (assignedCount > 0) {
      return res.status(400).json({
        success: false,
        error: `Cannot delete this assignee - assigned to ${assignedCount} PO(s)`
      });
    }

    const assignee = await Assignee.findByIdAndDelete(req.params.id);

    if (!assignee) {
      return res.status(404).json({ success: false, error: 'Assignee not found' });
    }

    console.log(`✅ Deleted assignee: ${assignee.name}`);
    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting assignee:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Update PO assignment
router.put('/pos/:id/assign', async (req, res) => {
  try {
    const { assignedTo } = req.body;

    // Get current PO to track the change
    const currentPO = await PurchaseOrder.findById(req.params.id).populate('assignedTo');
    if (!currentPO) {
      return res.status(404).json({ success: false, error: 'PO not found' });
    }

    const oldAssignee = currentPO.assignedTo?.name || 'Unassigned';

    const po = await PurchaseOrder.findByIdAndUpdate(
      req.params.id,
      { assignedTo: assignedTo || null },
      { new: true }
    ).populate('assignedTo');

    const newAssignee = po.assignedTo?.name || 'Unassigned';

    // Track the assignment change
    const username = req.user?.name || req.user?.username || 'System';
    await trackPOChange(req.params.id, 'Assigned To', oldAssignee, newAssignee, username);

    console.log(`✅ Updated PO ${po.poNumber} assignment to ${newAssignee}`);
    res.json({ success: true, po });
  } catch (error) {
    console.error('Error updating PO assignment:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get all currently snoozed POs
router.get('/pos/snoozed/list', async (req, res) => {
  try {
    const now = new Date();

    const snoozedPOs = await PurchaseOrder.find({
      snoozedUntil: { $exists: true, $ne: null, $gt: now }
    }).sort({ snoozedUntil: 1 }); // Sort by wake-up date, soonest first

    console.log(`📋 Found ${snoozedPOs.length} snoozed POs`);

    res.json({
      success: true,
      snoozedPOs: snoozedPOs.map(po => ({
        _id: po._id,
        poNumber: po.poNumber,
        vendor: po.vendor,
        snoozedUntil: po.snoozedUntil,
        snoozedBy: po.snoozedBy,
        snoozeDuration: po.snoozeDuration,
        nsStatus: po.nsStatus
      }))
    });

  } catch (error) {
    console.error('Error fetching snoozed POs:', error);
    res.status(500).json({ error: 'Failed to fetch snoozed POs' });
  }
});

// Un-hide a PO
router.put('/pos/:poId/unhide', async (req, res) => {
  try {
    const { poId } = req.params;
    const username = req.user ? req.user.username : 'System';

    console.log(`🔓 Un-hiding PO ${poId} by ${username}`);

    const updatedPO = await PurchaseOrder.findByIdAndUpdate(
      poId,
      {
        isHidden: false,
        hiddenBy: '',
        hiddenDate: null,
        hiddenReason: '',
        unhiddenBy: username,
        unhiddenDate: new Date()
      },
      { new: true }
    );

    if (!updatedPO) {
      return res.status(404).json({ error: 'Purchase Order not found' });
    }

    console.log(`✅ Un-hidden PO ${updatedPO.poNumber}`);
    res.json({ success: true, po: updatedPO });

  } catch (error) {
    console.error('Error un-hiding PO:', error);
    res.status(500).json({ error: 'Failed to un-hide PO' });
  }
});

// Snooze line items in trouble seed dashboard (DEPRECATED - keeping for backward compatibility)
router.put('/line-items/:itemId/snooze', async (req, res) => {
  try {
    const { itemId } = req.params;
    const { days } = req.body; // 1, 7, or 14 days

    if (!days || ![1, 7, 14].includes(Number(days))) {
      return res.status(400).json({ error: 'Invalid snooze duration. Must be 1, 7, or 14 days.' });
    }

    const username = req.user ? req.user.username : 'System';
    const snoozedUntil = new Date();
    snoozedUntil.setDate(snoozedUntil.getDate() + Number(days));

    console.log(`⏰ Snoozing line item ${itemId} for ${days} days until ${snoozedUntil.toLocaleDateString()}`);

    const updatedItem = await LineItem.findByIdAndUpdate(
      itemId,
      {
        snoozedUntil: snoozedUntil,
        snoozedBy: username,
        snoozeDuration: Number(days)
      },
      { new: true }
    );

    if (!updatedItem) {
      return res.status(404).json({ error: 'Line item not found' });
    }

    console.log(`✅ Snoozed: ${updatedItem.memo} until ${snoozedUntil.toLocaleDateString()}`);
    res.json({
      success: true,
      item: updatedItem,
      snoozedUntil: snoozedUntil,
      message: `Snoozed for ${days} day${days > 1 ? 's' : ''}`
    });

  } catch (error) {
    console.error('Error snoozing line item:', error);
    res.status(500).json({ error: 'Failed to snooze item' });
  }
});

// Unsnooze (wake up) a line item
router.put('/line-items/:itemId/unsnooze', async (req, res) => {
  try {
    const { itemId } = req.params;

    console.log(`⏰ Unsnoozing line item ${itemId}`);

    const updatedItem = await LineItem.findByIdAndUpdate(
      itemId,
      {
        snoozedUntil: null,
        snoozedBy: '',
        snoozeDuration: null
      },
      { new: true }
    );

    if (!updatedItem) {
      return res.status(404).json({ error: 'Line item not found' });
    }

    console.log(`✅ Unsnoozed: ${updatedItem.memo}`);
    res.json({ success: true, item: updatedItem });

  } catch (error) {
    console.error('Error unsnoozing line item:', error);

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

// API route to update line item quantities and details
router.put('/line-items/:itemId/update', async (req, res) => {
  try {
    const { itemId } = req.params;
    const { quantityOrdered, quantityReceived, itemStatus, notes } = req.body;
    const username = req.user ? req.user.username : 'System';

    console.log(`📝 Updating line item ${itemId}:`, {
      quantityOrdered,
      quantityReceived,
      itemStatus,
      notes: notes ? 'provided' : 'none'
    });

    // Get the existing line item first to track changes
    const existingItem = await LineItem.findById(itemId);
    if (!existingItem) {
      return res.status(404).json({ error: 'Line item not found' });
    }

    const updateData = {};
    const changes = [];

    if (quantityOrdered !== undefined) {
      const qty = parseFloat(quantityOrdered);
      if (existingItem.quantityOrdered !== qty) {
        changes.push({
          changeType: 'Quantity Ordered',
          oldValue: existingItem.quantityOrdered || 0,
          newValue: qty
        });
      }
      updateData.quantityOrdered = qty;
      updateData.quantityExpected = qty; // Keep both fields in sync
    }

    if (quantityReceived !== undefined) {
      const qty = parseFloat(quantityReceived);
      if (existingItem.quantityReceived !== qty) {
        // Build detailed change message with EAD if available
        let changeMessage = `Qty Received: ${existingItem.quantityReceived || 0} → ${qty}`;
        if (existingItem.ead) {
          changeMessage += ` (EAD: ${existingItem.ead})`;
        }
        changes.push({
          changeType: 'Quantity Received',
          oldValue: existingItem.quantityReceived || 0,
          newValue: qty,
          detailedMessage: changeMessage
        });
      }
      updateData.quantityReceived = qty;
    }

    if (itemStatus !== undefined && itemStatus !== '') {
      if (existingItem.itemStatus !== itemStatus) {
        changes.push({
          changeType: 'Item Status',
          oldValue: existingItem.itemStatus || 'None',
          newValue: itemStatus
        });
      }
      updateData.itemStatus = itemStatus;
    }

    // Add update tracking
    updateData.lastUpdatedBy = username;
    updateData.lastUpdatedDate = new Date();

    const updatedItem = await LineItem.findByIdAndUpdate(
      itemId,
      updateData,
      { new: true }
    );

    if (!updatedItem) {
      return res.status(404).json({ error: 'Line item not found' });
    }

    // Track changes to the parent PO
    if (changes.length > 0 && updatedItem.poId) {
      await trackMultipleChanges(
        updatedItem.poId,
        changes.map(c => ({
          changeType: `Line Item [${updatedItem.sku || updatedItem.memo}] ${c.changeType}`,
          oldValue: c.oldValue,
          newValue: c.newValue,
          detailedMessage: c.detailedMessage
        })),
        username
      );
    }

    // If notes provided, add them
    if (notes && notes.trim()) {
      // Get the PO details to populate vendor and poNumber for the note
      const po = await PurchaseOrder.findById(updatedItem.poId);
      if (po) {
        const note = new Note({
          poId: updatedItem.poId,
          poNumber: po.poNumber,
          vendor: po.vendor,
          content: `[Quantity Update by ${username}] ${notes}`
        });
        await note.save();
        console.log(`📝 Created note for line item ${itemId}`);
      }
    }

    console.log(`✅ Successfully updated line item ${itemId}`);
    res.json({
      success: true,
      lineItem: updatedItem,
      message: 'Line item updated successfully'
    });
  } catch (error) {
    console.error('Error updating line item:', error);
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

// Get line items WITH tracking numbers (dedicated endpoint for tracking dashboard)
router.get('/line-items-with-tracking', async (req, res) => {
  try {
    console.log('📦 Fetching line items with tracking numbers...');

    const limit = parseInt(req.query.limit) || 1000;

    // Query for items with tracking numbers
    const lineItems = await LineItem.find({
      trackingNumber: { $exists: true, $ne: '', $ne: null }
    })
      .populate('poId', 'poNumber vendor')
      .sort({ trackingLastUpdate: -1 })
      .limit(limit)
      .lean();

    console.log(`✅ Found ${lineItems.length} line items with tracking numbers`);

    res.json({
      lineItems,
      totalCount: lineItems.length
    });
  } catch (error) {
    console.error('❌ Line items with tracking error:', error);
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

// Unreceived Items Report Page - MUST be before '/' route
router.get('/unreceived-items-report', async (req, res) => {
  try {
    console.log('📋 Loading unreceived items report page...');
    res.render('unreceived-items', {
      user: req.user
    });
  } catch (error) {
    console.error('❌ Error loading unreceived items report page:', error);
    res.status(500).send('Error loading report page: ' + error.message);
  }
});

// Waiting for Approval Report - filtered by status
router.get('/waiting-for-approval', async (req, res) => {
  try {
    console.log('📋 Loading waiting for approval report page...');
    res.render('waiting-for-approval', {
      user: req.user
    });
  } catch (error) {
    console.error('❌ Error loading waiting for approval report page:', error);
    res.status(500).send('Error loading report page: ' + error.message);
  }
});

// Get all purchase orders with unique status values
router.get('/', async (req, res) => {
  try {
    console.log('🔍 DASHBOARD ROUTE - Fetching data...');

    // Check if we should include hidden POs
    const includeHidden = req.query.includeHidden === 'true';

    // Check for vendor filter
    const vendorFilter = req.query.vendor;

    let query = {};
    if (!includeHidden) {
      query.isHidden = { $ne: true }; // Only show non-hidden POs by default
    }

    // Add vendor filter if provided
    if (vendorFilter) {
      query.vendor = { $regex: new RegExp(vendorFilter, 'i') }; // Case-insensitive match
    }

    const purchaseOrders = await PurchaseOrder.find(query)
      .populate('linkedVendor')  // Populate the linked vendor from Vendor model
      .populate('organicVendor') // Populate the organic vendor from OrganicVendor model
      .populate('assignedTo')    // Populate the assigned person
      .sort({ date: 1 });

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

    // Create vendor mapping for clickable links using the Vendor model (main vendor dashboard)
    // First, try to use the linkedVendor field if it exists
    const vendorMap = {};
    purchaseOrdersWithETA.forEach(po => {
      if (po.vendor && po.linkedVendor && po.linkedVendor._id) {
        vendorMap[po.vendor] = po.linkedVendor._id;
      }
    });

    // For vendors without links, try pattern matching
    const unmappedVendors = uniqueVendors.filter(v => !vendorMap[v]);
    if (unmappedVendors.length > 0) {
      const allVendorRecords = await Vendor.find();

      unmappedVendors.forEach(poVendor => {
        const vendorData = splitVendorData(poVendor);

        // Try to find matching vendor in the database
        const matchingVendor = allVendorRecords.find(vendor => {
          // Match by vendor code (number)
          if (vendorData.vendorNumber &&
            (vendor.vendorCode === vendorData.vendorNumber ||
              vendor.vendorCode === vendorData.vendorNumber.padStart(3, '0'))) {
            return true;
          }
          // Match by vendor name (case-insensitive)
          if (vendorData.vendorName &&
            vendor.vendorName.toLowerCase() === vendorData.vendorName.toLowerCase()) {
            return true;
          }
          // Match full vendor string
          if (vendor.vendorName.toLowerCase() === poVendor.toLowerCase()) {
            return true;
          }
          return false;
        });

        if (matchingVendor) {
          vendorMap[poVendor] = matchingVendor._id;
        }
      });
    }

    console.log(`📝 Created vendor mapping for ${Object.keys(vendorMap).length} vendors (using Vendor model)`);
    console.log(`🔍 Vendor map sample:`, Object.keys(vendorMap).slice(0, 5));
    console.log(`🔍 Sample PO vendors:`, uniqueVendors.slice(0, 5));

    // Check for matches
    const matchedVendors = uniqueVendors.filter(vendor => vendorMap[vendor]);
    console.log(`✅ ${matchedVendors.length} vendors have links out of ${uniqueVendors.length} total vendors`);
    if (matchedVendors.length > 0) {
      console.log(`🔗 Vendors with links:`, matchedVendors.slice(0, 3));
    }
    // Log unmatched vendors for debugging
    const unmatchedVendors = uniqueVendors.filter(vendor => !vendorMap[vendor]);
    if (unmatchedVendors.length > 0) {
      console.log(`⚠️ Vendors WITHOUT links (need to be added to Vendor model):`, unmatchedVendors.slice(0, 10));
    }

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

    // Get PO type options from database
    const poTypeOptions = await PoTypeOption.find();
    // Sort with Seed first, then alphabetically
    poTypeOptions.sort((a, b) => {
      if (a.name === 'Seed') return -1;
      if (b.name === 'Seed') return 1;
      return a.name.localeCompare(b.name);
    });
    console.log('📦 PO type options:', poTypeOptions.map(t => t.name).join(', '));

    // Get assignees from database
    const assignees = await Assignee.find({ isActive: true }).sort({ order: 1, name: 1 });
    console.log('👥 Active assignees:', assignees.map(a => a.name).join(', '));

    console.log(`🎨 Rendering dashboard with ${prePurchaseOrders.length} pre-purchase orders...`);

    // Log sample PO data to verify location fields
    if (purchaseOrdersWithETA.length > 0) {
      const samplePO = purchaseOrdersWithETA[0];
      console.log('📦 Sample PO data:');
      console.log('  - poNumber:', samplePO.poNumber);
      console.log('  - location field:', samplePO.location);
      console.log('  - lineItems count:', samplePO.lineItems?.length || 0);
      if (samplePO.lineItems && samplePO.lineItems.length > 0) {
        console.log('  - First line item locationName:', samplePO.lineItems[0].locationName);
      }
    }

    // Set cache control headers to prevent browser caching of this page
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');

    res.render('dashboard', {
      purchaseOrders: purchaseOrdersWithETA,
      prePurchaseOrders,
      uniqueNSStatuses: uniqueNSStatuses.sort(),
      uniqueStatuses: uniqueStatuses.sort(),
      uniqueVendors,
      vendorMap, // Add vendor ID mapping for clickable links
      statusOptions: statusOptionNames,
      allStatusOptions: statusOptions, // Send full objects for management
      poTypeOptions: poTypeOptions, // Send PO type options for dynamic rendering
      assignees: assignees, // Send assignees for assignment dropdown
      user: req.user, // Pass user information for authentication status
      cacheKey: Date.now() // Add cache-busting key
    });
  } catch (error) {
    console.error('❌ Dashboard route error:', error);
    console.error('❌ Error stack:', error.stack);
    console.error('❌ Error name:', error.name);
    console.error('❌ Error message:', error.message);
    res.status(500).json({
      error: error.message,
      stack: error.stack,
      name: error.name
    });
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

// Universal PATCH endpoint for line item updates
router.patch('/line-items/:id', async (req, res) => {
  try {
    const lineItem = await LineItem.findById(req.params.id);
    if (!lineItem) {
      return res.status(404).json({ error: 'Line item not found' });
    }

    // Track changes for each field
    const changes = [];
    const updateData = { updatedAt: new Date() };

    // Handle received status
    if (req.body.received !== undefined) {
      const oldValue = lineItem.received;
      updateData.received = Boolean(req.body.received);
      if (req.body.received) {
        updateData.receivedDate = new Date();
      } else {
        updateData.receivedDate = null;
      }
      if (oldValue !== updateData.received) {
        changes.push({
          changeType: 'Received Status',
          oldValue: oldValue ? 'Yes' : 'No',
          newValue: updateData.received ? 'Yes' : 'No'
        });
      }
    }

    // Handle EAD (Expected Availability Date)
    if (req.body.ead !== undefined) {
      const oldValue = lineItem.ead;
      updateData.ead = req.body.ead || null;
      if (oldValue !== updateData.ead) {
        changes.push({
          changeType: 'Expected Availability Date',
          oldValue: oldValue,
          newValue: updateData.ead
        });
      }
    }

    // Handle tracking number
    if (req.body.trackingNumber !== undefined) {
      const oldValue = lineItem.trackingNumber;
      updateData.trackingNumber = req.body.trackingNumber || '';
      if (oldValue !== updateData.trackingNumber) {
        changes.push({
          changeType: 'Tracking Number',
          oldValue: oldValue,
          newValue: updateData.trackingNumber
        });
      }
    }

    // Update the line item
    const updated = await LineItem.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true }
    );

    // Track changes to the parent PO if there are any
    if (changes.length > 0 && updated.poId) {
      const username = req.user?.name || req.user?.username || 'System';
      await trackMultipleChanges(
        updated.poId,
        changes.map(c => ({
          changeType: `Line Item [${updated.sku}] ${c.changeType}`,
          oldValue: c.oldValue,
          newValue: c.newValue
        })),
        username
      );
    }

    console.log(`Line item ${updated._id} updated for PO ${updated.poNumber}`);
    res.json({ success: true, lineItem: updated });
  } catch (error) {
    console.error('Line item update error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Mark line item as received
router.put('/line-items/:lineItemId/received', async (req, res) => {
  try {
    const { received } = req.body;
    const lineItem = await LineItem.findById(req.params.lineItemId);
    if (!lineItem) {
      return res.status(404).json({ error: 'Line item not found' });
    }

    const oldValue = lineItem.received;
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

    const updated = await LineItem.findByIdAndUpdate(
      req.params.lineItemId,
      updateData,
      { new: true }
    );

    // Track the change
    if (oldValue !== updateData.received && updated.poId) {
      const username = req.user?.name || req.user?.username || 'System';
      await trackLineItemChange(
        updated.poId,
        updated.sku,
        'Received Status',
        oldValue ? 'Yes' : 'No',
        updateData.received ? 'Yes' : 'No',
        username
      );
    }

    console.log(`Line item ${updated._id} marked as ${received ? 'received' : 'not received'} for PO ${updated.poNumber}`);
    res.json({ success: true, lineItem: updated });
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

// Update item notes for unreceived items (MUST be before /:id/ routes)
router.patch('/line-item/:itemId/notes', async (req, res) => {
  try {
    const { itemId } = req.params;
    const { receivingNotes } = req.body;

    console.log(`📝 Updating notes for item ${itemId}`);

    const lineItem = await LineItem.findByIdAndUpdate(
      itemId,
      { receivingNotes },
      { new: true }
    );

    if (!lineItem) {
      return res.status(404).json({
        success: false,
        error: 'Line item not found'
      });
    }

    console.log(`✅ Notes updated for item ${itemId}`);

    res.json({
      success: true,
      receivingNotes: lineItem.receivingNotes
    });

  } catch (error) {
    console.error('❌ Error updating item notes:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Update item urgency for unreceived items (MUST be before /:id/ routes)
router.patch('/line-item/:itemId/urgency', async (req, res) => {
  try {
    const { itemId } = req.params;
    const { urgency } = req.body;

    console.log(`⚡ Updating urgency for item ${itemId} to ${urgency}`);

    const lineItem = await LineItem.findByIdAndUpdate(
      itemId,
      { urgency },
      { new: true }
    );

    if (!lineItem) {
      return res.status(404).json({
        success: false,
        error: 'Line item not found'
      });
    }

    console.log(`✅ Urgency updated for item ${itemId}`);

    res.json({
      success: true,
      urgency: lineItem.urgency
    });

  } catch (error) {
    console.error('❌ Error updating item urgency:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// PATCH /purchase-orders/line-item/:itemId/ead - Update line item EAD
router.patch('/line-item/:itemId/ead', async (req, res) => {
  try {
    const { itemId } = req.params;
    const { ead } = req.body;

    console.log(`⚡ Updating EAD for item ${itemId} to ${ead}`);

    const lineItem = await LineItem.findByIdAndUpdate(
      itemId,
      { ead },
      { new: true }
    );

    if (!lineItem) {
      return res.status(404).json({
        success: false,
        error: 'Line item not found'
      });
    }

    console.log(`✅ EAD updated for item ${itemId}`);

    res.json({
      success: true,
      ead: lineItem.ead
    });

  } catch (error) {
    console.error('❌ Error updating item EAD:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Preview inventory data import (MUST be before /:id/ routes)
router.post('/preview-inventory-import', async (req, res) => {
  try {
    const { inventoryData } = req.body;

    if (!inventoryData || !Array.isArray(inventoryData)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid inventory data format'
      });
    }

    console.log(`🔍 Previewing inventory import for ${inventoryData.length} SKUs`);

    const matches = [];
    const notFound = [];
    let lineItemCount = 0;
    let unreceivedCount = 0;

    // Process each inventory item to find matches
    for (const item of inventoryData) {
      const { sku, measure, raw, child, forecast, forecastSupply, forecastTotal } = item;

      if (!sku) continue;

      // Try exact match first
      let lineItems = await LineItem.find({ sku: sku })
        .populate('poId')
        .lean();

      // If no exact match, try partial match
      if (lineItems.length === 0) {
        const skuPattern = new RegExp(`^${sku.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(\\s*:|$)`, 'i');
        lineItems = await LineItem.find({ sku: skuPattern })
          .populate('poId')
          .lean();
      }

      if (lineItems.length === 0) {
        notFound.push(sku);
        continue;
      }

      // Count unreceived items
      const unreceivedItems = lineItems.filter(item => !item.received);
      unreceivedCount += unreceivedItems.length;
      lineItemCount += lineItems.length;

      matches.push({
        sku,
        measure,
        raw,
        child,
        forecast,
        forecastSupply,
        forecastTotal,
        lineItems: lineItems.map(li => ({
          poNumber: li.poNumber,
          fullSku: li.sku,
          received: li.received,
          currentInventory: {
            raw: li.inventoryRawQuantity,
            child: li.inventoryChildQuantity,
            measure: li.inventoryMeasure
          },
          currentForecast: {
            forecast: li.forecast,
            forecastSupply: li.forecastSupply,
            forecastTotal: li.forecastSupplyTotal
          }
        }))
      });
    }

    const summary = {
      totalSkus: inventoryData.length,
      matchCount: matches.length,
      notFoundCount: notFound.length,
      lineItemCount,
      unreceivedCount
    };

    console.log(`✅ Preview complete: ${matches.length} SKUs matched (${lineItemCount} line items, ${unreceivedCount} unreceived)`);

    res.json({
      success: true,
      matches,
      notFound,
      summary
    });

  } catch (error) {
    console.error('❌ Error previewing inventory import:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Import inventory data (MUST be before /:id/ routes)
router.post('/import-inventory-data', async (req, res) => {
  try {
    const { inventoryData } = req.body;

    if (!inventoryData || !Array.isArray(inventoryData)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid inventory data format'
      });
    }

    console.log(`📦 Importing inventory data for ${inventoryData.length} SKUs`);

    let updatedCount = 0;
    let notFoundCount = 0;
    const notFoundSkus = [];
    let exactMatches = 0;
    let partialMatches = 0;

    // Log first few SKUs for debugging
    console.log('🔍 Sample SKUs from import data:', inventoryData.slice(0, 5).map(item => item.sku));

    // Process each inventory item
    for (const item of inventoryData) {
      const { sku, measure, raw, child, forecast, forecastSupply, forecastTotal } = item;

      if (!sku) continue;

      // Find all line items with this SKU (could be multiple)
      // Try exact match first, then partial match (SKU might be stored as "SKU : Description")
      let lineItems = await LineItem.find({ sku: sku });
      let usedExactMatch = false;

      if (lineItems.length > 0) {
        exactMatches++;
        usedExactMatch = true;
      }

      // If no exact match, try matching where the sku field starts with this SKU code
      if (lineItems.length === 0) {
        const skuPattern = new RegExp(`^${sku.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(\\s*:|$)`, 'i');
        lineItems = await LineItem.find({ sku: skuPattern });

        if (lineItems.length > 0) {
          partialMatches++;
        }
      }

      if (lineItems.length === 0) {
        notFoundCount++;
        notFoundSkus.push(sku);
        continue;
      }

      // Update all line items with this SKU
      // Use the same matching logic as the find query
      let updateQuery;
      if (usedExactMatch) {
        // Exact match was found for THIS sku
        updateQuery = { sku: sku };
      } else {
        // Use regex pattern for partial match
        const skuPattern = new RegExp(`^${sku.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(\\s*:|$)`, 'i');
        updateQuery = { sku: skuPattern };
      }

      const updateData = {
        inventoryRawQuantity: isNaN(parseFloat(raw)) ? null : parseFloat(raw),  // Keep 0 as 0
        inventoryChildQuantity: isNaN(parseFloat(child)) ? null : parseFloat(child),  // Keep 0 as 0
        inventoryMeasure: measure || '',
        inventoryLastUpdated: new Date(),
        forecast: isNaN(parseFloat(forecast)) ? null : parseFloat(forecast),  // Keep 0 as 0
        forecastSupply: isNaN(parseFloat(forecastSupply)) ? null : parseFloat(forecastSupply),  // Keep 0 as 0
        forecastSupplyTotal: isNaN(parseFloat(forecastTotal)) ? null : parseFloat(forecastTotal),  // Keep 0 as 0
        forecastLastUpdated: new Date()
      };

      // Log first few updates for debugging
      if (updatedCount < 3 || sku.includes('ON540')) {
        console.log(`🔄 Updating SKU "${sku}":`, {
          query: updateQuery,
          data: updateData,
          matchedItems: lineItems.length
        });
      }

      const updateResult = await LineItem.updateMany(
        updateQuery,
        { $set: updateData }
      );

      if (updatedCount < 3 || sku.includes('ON540')) {
        console.log(`   Result: matched=${updateResult.matchedCount}, modified=${updateResult.modifiedCount}`);
      }

      updatedCount += lineItems.length;
    }

    console.log(`✅ Inventory import complete: ${updatedCount} line items updated, ${notFoundCount} SKUs not found`);
    console.log(`📊 Match statistics: ${exactMatches} exact matches, ${partialMatches} partial matches`);

    if (notFoundSkus.length > 0) {
      console.log('⚠️ Sample not found SKUs:', notFoundSkus.slice(0, 5));
    }

    res.json({
      success: true,
      updatedCount,
      notFoundCount,
      notFoundSkus: notFoundSkus.slice(0, 10), // Only return first 10 for display
      totalNotFound: notFoundSkus.length
    });

  } catch (error) {
    console.error('❌ Error importing inventory data:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
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

// EXPLICIT API ENDPOINT - Get a single purchase order by ID (for AJAX requests)
router.get('/api/po-details/:id', async (req, res) => {
  try {
    console.log('🔍 API GET /api/po-details/:id route hit with ID:', req.params.id);
    console.log('🔍 Request headers accept:', req.headers.accept);
    
    const purchaseOrder = await PurchaseOrder.findById(req.params.id)
      .populate('linkedVendor')
      .lean();
    
    if (!purchaseOrder) {
      console.log('❌ Purchase order not found with ID:', req.params.id);
      return res.status(404).json({ success: false, error: 'Purchase order not found' });
    }

    console.log('✅ Found purchase order:', purchaseOrder.poNumber);

    // Get line items for this PO
    const lineItems = await LineItem.find({ poId: req.params.id })
      .sort({ createdAt: 1 })
      .lean();
    
    console.log('✅ Found', lineItems.length, 'line items');
    
    // Add line items to the purchase order object
    purchaseOrder.lineItems = lineItems;

    console.log('📤 Sending JSON response with PO:', purchaseOrder.poNumber);
    console.log('📤 Response will have', lineItems.length, 'line items');
    
    const responseData = { 
      success: true,
      purchaseOrder 
    };
    
    console.log('📤 About to call res.json()');
    res.json(responseData);
    console.log('✅ res.json() called successfully');
  } catch (error) {
    console.error('❌ Get purchase order error:', error);
    console.error('❌ Error stack:', error.stack);
    res.status(500).json({ 
      success: false,
      error: error.message,
      stack: error.stack 
    });
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
    const currentPO = await PurchaseOrder.findById(req.params.id);
    if (!currentPO) {
      return res.status(404).json({ error: 'Purchase order not found' });
    }

    const oldStatus = currentPO.status;

    const updated = await PurchaseOrder.findByIdAndUpdate(
      req.params.id,
      { status: req.body.status, updatedAt: new Date() },
      { new: true }
    );

    // Track the status change
    const username = req.user?.name || req.user?.username || 'System';
    await trackPOChange(req.params.id, 'Status', oldStatus, req.body.status, username);

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

    const currentPO = await PurchaseOrder.findById(req.params.id);
    if (!currentPO) {
      return res.status(404).json({ error: 'Purchase order not found' });
    }

    const oldETA = currentPO.eta;

    const updated = await PurchaseOrder.findByIdAndUpdate(
      req.params.id,
      { eta: dateValue, updatedAt: new Date() },
      { new: true }
    );

    // Track the ETA change
    const username = req.user?.name || req.user?.username || 'System';
    await trackPOChange(req.params.id, 'ETA', oldETA, dateValue, username);

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

    const currentPO = await PurchaseOrder.findById(req.params.id);
    if (!currentPO) {
      return res.status(404).json({ error: 'Purchase order not found' });
    }

    const oldUrl = currentPO.poUrl;

    const updated = await PurchaseOrder.findByIdAndUpdate(
      req.params.id,
      { poUrl: url || '', updatedAt: new Date() },
      { new: true }
    );

    // Track the URL change
    const username = req.user?.name || req.user?.username || 'System';
    await trackPOChange(req.params.id, 'PO URL', oldUrl, url || '', username);

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

    // Get current PO to track the change
    const currentPO = await PurchaseOrder.findById(req.params.id);
    if (!currentPO) {
      return res.status(404).json({ error: 'Purchase order not found' });
    }

    const oldTracking = currentPO.shippingTracking;

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

    // Track the shipping tracking change
    const username = req.user?.name || req.user?.username || 'System';
    await trackPOChange(req.params.id, 'Shipping Tracking', oldTracking, shippingTracking || '', username);

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

      // Tracking number saved - can be updated via tracking dashboard
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
    res.json({ success: true, po: updated });
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

    const currentPO = await PurchaseOrder.findById(req.params.id);
    if (!currentPO) {
      return res.status(404).json({ error: 'Purchase order not found' });
    }

    const oldPriority = currentPO.priority;

    const updated = await PurchaseOrder.findByIdAndUpdate(
      req.params.id,
      { priority: priority, updatedAt: new Date() },
      { new: true }
    );

    // Track the priority change
    const username = req.user?.name || req.user?.username || 'System';
    await trackPOChange(req.params.id, 'Priority', oldPriority, priority, username);

    console.log(`Updated priority for PO ${updated.poNumber}: ${priority || 'cleared'}`);
    res.json({ success: true, po: updated });
  } catch (error) {
    console.error('Priority update error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Update dropship status
router.put('/:id/dropship', async (req, res) => {
  try {
    const { isDropship } = req.body;

    // Validate isDropship is a boolean
    if (typeof isDropship !== 'boolean') {
      return res.status(400).json({ error: 'isDropship must be a boolean value' });
    }

    const currentPO = await PurchaseOrder.findById(req.params.id);
    if (!currentPO) {
      return res.status(404).json({ error: 'Purchase order not found' });
    }

    const oldDropship = currentPO.isDropship;

    const updated = await PurchaseOrder.findByIdAndUpdate(
      req.params.id,
      { isDropship: isDropship, updatedAt: new Date() },
      { new: true }
    );

    // Track the dropship status change
    const username = req.user?.name || req.user?.username || 'System';
    await trackPOChange(req.params.id, 'Dropship Status', oldDropship ? 'Yes' : 'No', isDropship ? 'Yes' : 'No', username);

    console.log(`🚚 Updated dropship status for PO ${updated.poNumber}: ${isDropship ? 'YES' : 'NO'}`);
    res.json({
      success: true,
      isDropship: updated.isDropship,
      poNumber: updated.poNumber,
      po: updated
    });
  } catch (error) {
    console.error('❌ Dropship update error:', error);
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

    // Helper function to properly escape CSV values
    function escapeCSV(value) {
      if (value === null || value === undefined) {
        return '';
      }
      const stringValue = String(value);
      // If the value contains comma, quote, or newline, wrap it in quotes and escape existing quotes
      if (stringValue.includes(',') || stringValue.includes('"') || stringValue.includes('\n') || stringValue.includes('\r')) {
        return `"${stringValue.replace(/"/g, '""')}"`;
      }
      return stringValue;
    }

    // Create CSV content
    const csvHeaders = 'PO Number,Vendor,Item Description,SKU,Amount,Received,Item Status,Date,Notes,Issue Type\n';
    const csvRows = orphanedItems.map(item => {
      const issueType = !item.poExists ? 'No PO' :
        (!item.vendor || item.vendor === 'N/A') ? 'No Vendor' : 'No Status';

      return [
        escapeCSV(item.poNumber),
        escapeCSV(item.vendor || 'N/A'),
        escapeCSV(item.memo),
        escapeCSV(item.sku),
        escapeCSV(item.amount),
        escapeCSV(item.received ? 'Yes' : 'No'),
        escapeCSV(item.itemStatus),
        escapeCSV(item.date ? new Date(item.date).toLocaleDateString() : ''),
        escapeCSV(item.notes),
        escapeCSV(issueType)
      ].join(',');
    }).join('\n');

    res.send(csvHeaders + csvRows);

  } catch (error) {
    console.error('Error exporting orphaned items:', error);
    res.status(500).json({ error: error.message });
  }
});

// NetSuite PO Form Import Route
// Preview NetSuite import - parse and analyze without saving
router.post('/preview-netsuite-import', async (req, res) => {
  console.log('👀 NetSuite preview route called');
  try {
    const { data, targetPOId, addToExisting } = req.body;

    if (!data || !data.trim()) {
      return res.status(400).json({ error: 'No data provided' });
    }

    // Parse the NetSuite data
    const lines = data.trim().split('\n');
    if (lines.length < 2) {
      return res.status(400).json({ error: 'Invalid data format - need header and at least one data row' });
    }

    // Parse headers (same logic as import)
    let headers = [];
    let dataStartIndex = 1;

    if (lines[0].includes('\t')) {
      headers = lines[0].split('\t');
      dataStartIndex = 1;
    } else {
      for (let i = 0; i < lines.length; i++) {
        if (lines[i].includes('\t') && lines[i].split('\t').length > 3) {
          headers = lines.slice(0, i);
          dataStartIndex = i;
          break;
        }
      }
    }

    // Get column indices
    const getColumnIndex = (headerName) => {
      return headers.findIndex(h => h.toLowerCase().includes(headerName.toLowerCase()));
    };

    const itemIndex = getColumnIndex('item');
    const quantityIndex = getColumnIndex('quantity');
    const descriptionIndex = getColumnIndex('description');
    const vendorDescIndex = getColumnIndex('vendor desc');
    const receivedIndex = getColumnIndex('received');
    const billedIndex = getColumnIndex('billed');
    const rateIndex = getColumnIndex('rate');
    const unitsIndex = getColumnIndex('units');

    // Get target PO if specified
    let targetPO = null;
    let currentLineItems = [];
    if (targetPOId) {
      targetPO = await PurchaseOrder.findById(targetPOId).populate('lineItems');
      if (targetPO && targetPO.lineItems) {
        currentLineItems = targetPO.lineItems;
      }
    }

    // Parse new items from import data
    const newItems = [];
    const warnings = [];
    const errors = [];

    for (let i = dataStartIndex; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line || line === 'History') continue;

      const row = line.split('\t');
      const itemCode = row[itemIndex] || '';
      const quantity = parseFloat(row[quantityIndex]) || 0;
      const description = row[descriptionIndex] || '';
      const vendorDesc = row[vendorDescIndex] || '';
      const received = parseFloat(row[receivedIndex]) || 0;
      const billed = parseFloat(row[billedIndex]) || 0;
      const rate = parseFloat(row[rateIndex]?.replace(/,/g, '') || '0') || 0;
      const units = row[unitsIndex] || '';

      if (!itemCode && !description) {
        warnings.push(`Line ${i + 1}: Skipped - missing item code and description`);
        continue;
      }

      newItems.push({
        item: itemCode,
        memo: vendorDesc || description,
        description: description,
        quantityExpected: quantity,
        quantityReceived: received,
        quantityBilled: billed,
        rate: rate,
        units: units,
        lineNumber: i + 1
      });
    }

    // Compare with existing items
    const previewItems = [];
    const itemMap = new Map();

    // Add current items to map
    currentLineItems.forEach(item => {
      itemMap.set(item.item || item.memo, { ...item.toObject(), isExisting: true });
    });

    // Process new items
    newItems.forEach(newItem => {
      const key = newItem.item || newItem.memo;
      const existingItem = itemMap.get(key);

      if (!existingItem) {
        // New item
        previewItems.push({
          ...newItem,
          changeType: 'new-item',
          changes: 'New item will be added'
        });
      } else if (!addToExisting) {
        // Check for changes
        const changes = [];
        if (existingItem.quantityExpected !== newItem.quantityExpected) {
          changes.push('quantityExpected');
        }
        if (existingItem.quantityReceived !== newItem.quantityReceived) {
          changes.push('quantityReceived');
        }
        if (existingItem.rate !== newItem.rate) {
          changes.push('rate');
        }

        if (changes.length > 0) {
          previewItems.push({
            ...newItem,
            old: existingItem,
            changeType: 'updated-item',
            changes: changes.join(', ')
          });
        } else {
          previewItems.push({
            ...newItem,
            changeType: 'unchanged-item',
            changes: ''
          });
        }
        itemMap.delete(key); // Mark as processed
      } else {
        // Adding to existing
        previewItems.push({
          ...newItem,
          changeType: 'new-item',
          changes: 'Will be added to existing items'
        });
      }
    });

    // Remaining items in map are being removed (if not addToExisting)
    if (!addToExisting) {
      itemMap.forEach((item, key) => {
        if (item.isExisting) {
          previewItems.push({
            item: item.item,
            memo: item.memo,
            description: item.description,
            quantityExpected: item.quantityExpected,
            quantityReceived: item.quantityReceived,
            quantityBilled: item.quantityBilled,
            rate: item.rate,
            changeType: 'removed-item',
            changes: 'Will be removed (not in new data)'
          });
        }
      });
    }

    // Generate summary
    const summary = {
      newItems: previewItems.filter(i => i.changeType === 'new-item').length,
      updatedItems: previewItems.filter(i => i.changeType === 'updated-item').length,
      removedItems: previewItems.filter(i => i.changeType === 'removed-item').length,
      unchangedItems: previewItems.filter(i => i.changeType === 'unchanged-item').length,
      totalItems: previewItems.length
    };

    // Add warning if no target PO
    if (!targetPO) {
      warnings.push('No target PO specified - items will be imported to POs based on vendor name matching');
    }

    // Add warning about history mismatch
    if (targetPO && !addToExisting) {
      const currentCount = currentLineItems.length;
      const newCount = newItems.length;
      if (currentCount !== newCount) {
        warnings.push(`History count mismatch: Current has ${currentCount} items, import has ${newCount} items`);
      }
    }

    res.json({
      success: true,
      summary,
      items: previewItems,
      warnings,
      errors,
      targetPO: targetPO ? { poNumber: targetPO.poNumber, vendor: targetPO.vendor } : null,
      mode: addToExisting ? 'add' : 'replace'
    });

  } catch (error) {
    console.error('Preview error:', error);
    res.status(500).json({ error: error.message });
  }
});

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
    const locationNameIndex = getColumnIndex('location: name');

    console.log('🔍 Column indices:', { itemIndex, quantityIndex, descriptionIndex, locationNameIndex });

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
      const locationName = row[locationNameIndex] || '';

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
        quantityReceived: received, // Store actual received quantity
        unit: units, // Store the unit from CSV
        billVarianceStatus: billVarianceStatus,
        billVarianceField: billVarianceField,
        expectedArrivalDate: parseDate(expectedArrivalDate),
        itemStatus: closed === 'T' ? 'Closed' : (received >= quantity ? 'Received' : 'Pending'),
        received: received >= quantity, // Convert to boolean - true if fully received
        receivedDate: received > 0 ? new Date() : null,
        eta: calculatedEta, // Use calculated ETA based on logic
        notes: notesArray.join(', '),
        locationName: locationName // Add location name from NetSuite
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
          vendorDescription: vendorDescription,
          locationName: locationName // Add location name to embedded array
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
          vendorDescription: vendorDescription,
          locationName: locationName // Add location name to embedded array
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

// ============================================
// TRACKING ROUTES
// ============================================
// Note: Main tracking routes are in routes/tracking.js

// Add tracking number to line item
router.put('/line-items/:lineItemId/tracking', async (req, res) => {
  try {
    const { trackingNumber, carrier, status, location, description, estimatedDelivery } = req.body;
    const username = req.user ? req.user.username : 'System';

    console.log(`📦 Updating tracking for line item ${req.params.lineItemId}`);

    const lineItem = await LineItem.findById(req.params.lineItemId);
    if (!lineItem) {
      return res.status(404).json({ error: 'Line item not found' });
    }

    // Load tracking service for auto-detection and URL generation
    const trackingService = require('../services/trackingService');

    // Auto-detect carrier if tracking number provided but carrier isn't
    let finalCarrier = carrier;
    if (trackingNumber && trackingNumber.trim() && !carrier) {
      finalCarrier = trackingService.detectCarrier(trackingNumber.trim());
      console.log(`🔍 Auto-detected carrier: ${finalCarrier}`);
    }

    // Generate tracking URL
    const trackingURL = trackingService.getTrackingURL(
      trackingNumber?.trim() || '',
      finalCarrier || lineItem.trackingCarrier
    );

    // Update tracking fields
    lineItem.trackingNumber = trackingNumber?.trim() || '';
    lineItem.trackingCarrier = finalCarrier?.trim() || '';
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

    console.log(`✅ Updated tracking for line item ${lineItem._id} (PO ${lineItem.poNumber}): ${trackingNumber || 'cleared'}`);

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

// Update tracking status for a single line item (manual update)
router.put('/line-items/:lineItemId/tracking/update', async (req, res) => {
  try {
    const { lineItemId } = req.params;
    const { status, location, description } = req.body;
    const username = req.user ? req.user.username : 'System';

    // Find the line item
    const lineItem = await LineItem.findById(lineItemId);
    if (!lineItem) {
      return res.status(404).json({ error: 'Line item not found' });
    }

    if (!lineItem.trackingNumber) {
      return res.status(400).json({ error: 'No tracking number assigned to this line item' });
    }

    console.log(`🔄 Manually updating tracking for line item ${lineItemId}: ${status || 'No status change'}`);

    // Update tracking status
    if (status) {
      lineItem.trackingStatus = status;
      lineItem.trackingLastUpdate = new Date();

      // Add to history
      if (!lineItem.trackingHistory) {
        lineItem.trackingHistory = [];
      }
      lineItem.trackingHistory.push({
        timestamp: new Date(),
        status: status,
        location: location || lineItem.trackingLocation || '',
        description: description || '',
        updatedBy: username
      });
    }

    if (location) {
      lineItem.trackingLocation = location;
    }

    if (description) {
      lineItem.trackingStatusDescription = description;
    }

    lineItem.updatedAt = new Date();
    await lineItem.save();

    console.log(`✅ Updated tracking for line item ${lineItemId}: ${status || 'info updated'}`);

    res.json({
      success: true,
      lineItem: lineItem
    });
  } catch (error) {
    console.error('❌ Line item tracking update error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Bulk update all tracking numbers using carrier APIs
router.post('/tracking/bulk-update', async (req, res) => {
  try {
    console.log('🔄 Starting bulk tracking update using carrier APIs...');

    const trackingService = require('../services/trackingService');
    const fedexService = require('../services/fedexService');

    // Find all line items with tracking numbers
    const lineItems = await LineItem.find({
      trackingNumber: { $exists: true, $ne: '', $ne: null }
    }).limit(100); // Limit to prevent API overuse

    console.log(`📦 Found ${lineItems.length} line items with tracking numbers`);

    let updated = 0;
    let failed = 0;
    let skipped = 0;

    for (const lineItem of lineItems) {
      try {
        const carrier = lineItem.trackingCarrier || trackingService.detectCarrier(lineItem.trackingNumber);

        // Currently only FedEx is supported, skip others
        if (carrier.toLowerCase() !== 'fedex') {
          console.log(`⏭️  Skipping ${lineItem.trackingNumber} - ${carrier} API not yet implemented`);
          skipped++;
          continue;
        }

        // Fetch live tracking data from FedEx
        const trackingData = await fedexService.trackPackage(lineItem.trackingNumber);

        if (trackingData.success && trackingData.status) {
          // Update line item with live data
          lineItem.trackingStatus = trackingData.status;
          lineItem.trackingStatusDescription = trackingData.statusDescription || '';
          lineItem.trackingLastUpdate = new Date();
          lineItem.trackingLocation = trackingData.lastLocation || '';
          lineItem.trackingCarrier = 'FedEx';

          if (trackingData.estimatedDelivery) {
            lineItem.trackingEstimatedDelivery = trackingData.estimatedDelivery;
          }

          if (trackingData.actualDelivery) {
            lineItem.trackingActualDelivery = trackingData.actualDelivery;
          }

          // Add to tracking history if we have new events
          if (trackingData.history && trackingData.history.length > 0) {
            if (!lineItem.trackingHistory) {
              lineItem.trackingHistory = [];
            }

            // Add the most recent event
            const latestEvent = trackingData.history[0];
            lineItem.trackingHistory.push({
              timestamp: latestEvent.timestamp || new Date(),
              status: latestEvent.status || trackingData.status,
              location: latestEvent.location || '',
              description: latestEvent.description || '',
              updatedBy: 'FedEx API'
            });
          }

          await lineItem.save();
          updated++;
          console.log(`✅ Updated ${lineItem.trackingNumber}: ${trackingData.status}`);
        } else {
          failed++;
          console.log(`❌ Failed to get tracking for ${lineItem.trackingNumber}: ${trackingData.error || 'Unknown error'}`);
        }

        // Add small delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 100));

      } catch (error) {
        console.error(`❌ Error updating ${lineItem.trackingNumber}:`, error.message);
        failed++;
      }
    }

    console.log(`✅ Bulk update complete: ${updated} updated, ${failed} failed, ${skipped} skipped`);

    res.json({
      success: true,
      message: `Updated ${updated} of ${lineItems.length} tracking numbers`,
      totalTracked: lineItems.length,
      updated,
      failed,
      skipped,
      details: {
        fedexSupported: true,
        upsSupported: false,
        uspsSupported: false,
        dhlSupported: false
      }
    });

  } catch (error) {
    console.error('❌ Bulk tracking update error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Bulk update PO URLs to NetSuite format
router.post('/bulk-update-netsuite-urls', async (req, res) => {
  try {
    console.log('🔗 Starting bulk update of NetSuite URLs...');

    // Find all POs that don't have a URL or have an empty URL
    const posWithoutUrl = await PurchaseOrder.find({
      $or: [
        { poUrl: { $exists: false } },
        { poUrl: '' },
        { poUrl: null }
      ]
    });

    console.log(`📋 Found ${posWithoutUrl.length} POs without NetSuite URLs`);

    let updated = 0;
    let failed = 0;

    for (const po of posWithoutUrl) {
      try {
        // Extract numbers only from PO number
        const poNumberOnly = po.poNumber.replace(/[^0-9]/g, '');
        const defaultPoUrl = `https://4774474.app.netsuite.com/app//common/search/globalseacrchresults.nl?searchtype=Transactions&Uber_NAME=${poNumberOnly}`;
        
        await PurchaseOrder.findByIdAndUpdate(po._id, {
          poUrl: defaultPoUrl
        });

        updated++;
        console.log(`✅ Updated ${po.poNumber}: ${defaultPoUrl}`);
      } catch (error) {
        console.error(`❌ Error updating ${po.poNumber}:`, error.message);
        failed++;
      }
    }

    console.log(`✅ Bulk URL update complete: ${updated} updated, ${failed} failed`);

    res.json({
      success: true,
      message: `Updated NetSuite URLs for ${updated} of ${posWithoutUrl.length} purchase orders`,
      total: posWithoutUrl.length,
      updated,
      failed
    });

  } catch (error) {
    console.error('❌ Bulk NetSuite URL update error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Get POs that need URLs (for post-import form)
router.get('/pos-needing-urls', async (req, res) => {
  try {
    console.log('🔗 Fetching POs that need URLs...');

    const posWithoutUrl = await PurchaseOrder.find({
      $or: [
        { poUrl: { $exists: false } },
        { poUrl: '' },
        { poUrl: null }
      ]
    })
    .select('poNumber vendor vendorNumber vendorName poType amount nsStatus status poUrl')
    .sort({ poNumber: -1 })
    .limit(100); // Limit to recent 100 POs

    console.log(`📋 Found ${posWithoutUrl.length} POs without URLs`);

    // For each PO, look up the vendor's default PO type using vendor name
    const posWithDefaultTypes = await Promise.all(posWithoutUrl.map(async (po) => {
      const poObj = po.toObject();
      
      let vendor = null;
      
      // Try to find vendor by vendor code first
      if (poObj.vendorNumber) {
        vendor = await Vendor.findOne({ vendorCode: poObj.vendorNumber });
        console.log(`   🔍 Lookup by code "${poObj.vendorNumber}": ${vendor ? 'FOUND' : 'NOT FOUND'}`);
      }
      
      // If not found by code, try by vendor name
      if (!vendor && poObj.vendorName) {
        vendor = await Vendor.findOne({ 
          vendorName: { $regex: new RegExp('^' + poObj.vendorName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '$', 'i') }
        });
        console.log(`   🔍 Lookup by name "${poObj.vendorName}": ${vendor ? 'FOUND' : 'NOT FOUND'}`);
      }
      
      // If still not found, try parsing the vendor string "619 CASCADIA MUSHROOMS"
      if (!vendor && poObj.vendor) {
        const vendorData = splitVendorData(poObj.vendor);
        if (vendorData.vendorNumber) {
          vendor = await Vendor.findOne({ vendorCode: vendorData.vendorNumber });
          console.log(`   🔍 Lookup by parsed code "${vendorData.vendorNumber}": ${vendor ? 'FOUND' : 'NOT FOUND'}`);
        }
        if (!vendor && vendorData.vendorName) {
          vendor = await Vendor.findOne({ 
            vendorName: { $regex: new RegExp('^' + vendorData.vendorName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '$', 'i') }
          });
          console.log(`   🔍 Lookup by parsed name "${vendorData.vendorName}": ${vendor ? 'FOUND' : 'NOT FOUND'}`);
        }
      }
      
      // If vendor found and has default PO type, apply it
      if (vendor) {
        console.log(`   ✅ Found vendor: ${vendor.vendorName} (code: ${vendor.vendorCode}), defaultPoType: "${vendor.defaultPoType || '(none)'}"`);
        
        if (vendor.defaultPoType) {
          // Always use vendor's default type to pre-fill the dropdown
          poObj.poType = vendor.defaultPoType;
          console.log(`   ✅ Pre-filling PO ${poObj.poNumber} with vendor default: ${vendor.defaultPoType}`);
        }
      } else {
        console.log(`   ⚠️ No vendor found for PO ${poObj.poNumber} (vendor: "${poObj.vendor}")`);
      }
      
      return poObj;
    }));

    res.json({
      success: true,
      count: posWithDefaultTypes.length,
      pos: posWithDefaultTypes
    });

  } catch (error) {
    console.error('❌ Error fetching POs needing URLs:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Bulk update URLs and PO types from post-import form
router.post('/bulk-update-urls-and-types', async (req, res) => {
  try {
    console.log('🔗 Starting bulk URL and PO type update from form...');
    
    const { updates } = req.body; // Array of { poNumber, url, poType }

    if (!updates || !Array.isArray(updates)) {
      return res.status(400).json({
        success: false,
        error: 'Updates array is required'
      });
    }

    console.log(`📋 Processing ${updates.length} PO updates`);

    let updated = 0;
    let failed = 0;
    const errors = [];

    for (const update of updates) {
      try {
        const { poNumber, url, poType } = update;

        if (!poNumber) {
          errors.push(`Missing PO number in update`);
          failed++;
          continue;
        }

        const updateData = {};
        if (url) updateData.poUrl = url.trim();
        if (poType) updateData.poType = poType;

        if (Object.keys(updateData).length === 0) {
          continue; // Skip if no updates
        }

        const result = await PurchaseOrder.findOneAndUpdate(
          { poNumber: poNumber },
          updateData,
          { new: true }
        );

        if (result) {
          updated++;
          console.log(`✅ Updated ${poNumber}: URL=${!!url}, Type=${poType || 'unchanged'}`);
        } else {
          errors.push(`PO ${poNumber} not found`);
          failed++;
        }
      } catch (error) {
        console.error(`❌ Error updating ${update.poNumber}:`, error.message);
        errors.push(`${update.poNumber}: ${error.message}`);
        failed++;
      }
    }

    console.log(`✅ Bulk update complete: ${updated} updated, ${failed} failed`);

    res.json({
      success: true,
      message: `Updated ${updated} purchase orders`,
      updated,
      failed,
      errors: errors.length > 0 ? errors : undefined
    });

  } catch (error) {
    console.error('❌ Bulk URL and type update error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Debug/validation route for testing tracking numbers (with optional carrier)
router.get('/tracking/debug/:trackingNumber/:carrier', async (req, res) => {
  try {
    const { trackingNumber, carrier } = req.params;
    const trackingService = require('../services/trackingService');

    console.log('🐞 DEBUG: Validating tracking number:', trackingNumber, 'carrier:', carrier || 'auto-detect');

    // Auto-detect carrier if not provided
    const detectedCarrier = carrier || trackingService.detectCarrier(trackingNumber);

    // Validate tracking number
    const isValid = trackingService.validateTrackingNumber(trackingNumber, detectedCarrier);

    // Generate tracking URL
    const trackingURL = trackingService.getTrackingURL(trackingNumber, detectedCarrier);

    // Get available carriers and statuses
    const carriers = trackingService.getCarriers();
    const statuses = trackingService.getStatuses();

    res.json({
      success: true,
      trackingNumber,
      providedCarrier: carrier || null,
      detectedCarrier,
      isValid,
      trackingURL,
      availableCarriers: carriers,
      availableStatuses: statuses
    });
  } catch (error) {
    console.error('❌ Tracking debug error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Debug/validation route for testing tracking numbers (without carrier - auto-detect)
router.get('/tracking/debug/:trackingNumber', async (req, res) => {
  try {
    const { trackingNumber } = req.params;
    const trackingService = require('../services/trackingService');

    console.log('🐞 DEBUG: Validating tracking number:', trackingNumber, 'carrier: auto-detect');

    // Auto-detect carrier
    const detectedCarrier = trackingService.detectCarrier(trackingNumber);

    // Validate tracking number
    const isValid = trackingService.validateTrackingNumber(trackingNumber, detectedCarrier);

    // Generate tracking URL
    const trackingURL = trackingService.getTrackingURL(trackingNumber, detectedCarrier);

    // Get available carriers and statuses
    const carriers = trackingService.getCarriers();
    const statuses = trackingService.getStatuses();

    res.json({
      success: true,
      trackingNumber,
      providedCarrier: null,
      detectedCarrier,
      isValid,
      trackingURL,
      availableCarriers: carriers,
      availableStatuses: statuses
    });
  } catch (error) {
    console.error('❌ Tracking debug error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get tracking details for a line item (just returns info from database)
router.get('/tracking/:trackingNumber', async (req, res) => {
  try {
    const { trackingNumber } = req.params;
    const trackingService = require('../services/trackingService');

    console.log('🔍 Getting tracking info for:', trackingNumber);

    // Find line item(s) with this tracking number
    const lineItems = await LineItem.find({ trackingNumber })
      .populate('poId', 'poNumber vendor')
      .lean();

    if (lineItems.length === 0) {
      return res.json({
        success: false,
        message: 'No line items found with this tracking number'
      });
    }

    // Get tracking info from the first match
    const lineItem = lineItems[0];
    const trackingData = trackingService.formatTrackingData(lineItem);

    res.json({
      success: true,
      trackingNumber,
      lineItems: lineItems.length,
      trackingInfo: {
        ...trackingData,
        lastLocation: lineItem.trackingLocation,
        history: lineItem.trackingHistory || []
      },
      poNumber: lineItem.poId?.poNumber,
      vendor: lineItem.poId?.vendor
    });
  } catch (error) {
    console.error('❌ Tracking details error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Fetch live tracking data from carrier API
router.get('/tracking/:trackingNumber/live', async (req, res) => {
  try {
    const { trackingNumber } = req.params;
    const { carrier } = req.query; // Optional carrier parameter
    const trackingService = require('../services/trackingService');

    console.log(`🔄 Fetching live tracking for: ${trackingNumber} (${carrier || 'auto-detect'})`);

    // Auto-detect carrier if not provided
    let finalCarrier = carrier;
    if (!finalCarrier) {
      // Try to find in database first
      const lineItem = await LineItem.findOne({ trackingNumber }).lean();
      finalCarrier = lineItem?.trackingCarrier || trackingService.detectCarrier(trackingNumber);
    }

    if (!finalCarrier || finalCarrier === 'Unknown') {
      return res.json({
        success: false,
        error: 'Could not determine carrier for tracking number',
        trackingNumber
      });
    }

    // Fetch live tracking data
    const liveData = await trackingService.fetchLiveTracking(trackingNumber, finalCarrier);

    // If API fetch failed, return error but client can fallback to iframe
    if (!liveData.success) {
      return res.json({
        success: false,
        error: liveData.error,
        useIframe: liveData.useIframe || false,
        trackingNumber,
        carrier: finalCarrier
      });
    }

    // Update database with latest tracking info
    const updateData = {
      trackingStatus: liveData.status,
      trackingStatusDescription: liveData.statusDescription,
      trackingLastUpdate: liveData.lastUpdate || new Date(),
      trackingLocation: liveData.lastLocation,
      trackingEstimatedDelivery: liveData.estimatedDelivery
    };

    // Add to tracking history if we have new information
    if (liveData.history && liveData.history.length > 0) {
      // Only add the most recent event if it's new
      const latestEvent = liveData.history[0];
      const existingLineItem = await LineItem.findOne({ trackingNumber });

      if (existingLineItem) {
        const hasEvent = existingLineItem.trackingHistory?.some(
          h => h.timestamp?.getTime() === latestEvent.timestamp?.getTime()
        );

        if (!hasEvent) {
          updateData.$push = {
            trackingHistory: {
              timestamp: latestEvent.timestamp || new Date(),
              status: latestEvent.status,
              location: latestEvent.location,
              description: latestEvent.description,
              updatedBy: 'API Update'
            }
          };
        }
      }
    }

    // Update all line items with this tracking number
    await LineItem.updateMany(
      { trackingNumber },
      updateData
    );

    console.log(`✅ Updated tracking info for ${trackingNumber} from live API`);

    res.json({
      success: true,
      trackingNumber,
      carrier: finalCarrier,
      trackingInfo: liveData,
      updated: true
    });

  } catch (error) {
    console.error('❌ Live tracking error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Tracking dashboard page
router.get('/tracking-dashboard', async (req, res) => {
  try {
    console.log('📊 Loading tracking dashboard (Self-Managed System)...');

    // Get filter parameters
    const statusFilter = req.query.status || 'all';
    const carrierFilter = req.query.carrier || 'all';
    const dateRange = req.query.dateRange || '30'; // days

    // Get statistics
    const totalLineItems = await LineItem.countDocuments();
    const itemsWithTracking = await LineItem.countDocuments({
      trackingNumber: { $exists: true, $ne: '', $ne: null }
    });

    // Count by status using standardized status values from carrier APIs
    const deliveredItems = await LineItem.countDocuments({
      trackingStatus: { $in: ['Delivered', 'delivered'] }
    });
    const inTransitItems = await LineItem.countDocuments({
      trackingStatus: {
        $in: [
          'In Transit', 'in transit',
          'Out for Delivery', 'out for delivery',
          'Picked Up', 'picked up',
          'Label Created', 'label created'
        ]
      }
    });
    const exceptionItems = await LineItem.countDocuments({
      trackingStatus: {
        $in: [
          'Exception', 'exception',
          'Delayed', 'delayed',
          'Returned to Sender', 'returned'
        ]
      }
    });

    // Build query for filtered line items
    let query = { trackingNumber: { $exists: true, $ne: '', $ne: null } };

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

    // Get recent tracking updates
    const recentlyUpdated = await LineItem.find(query)
      .sort({ trackingLastUpdate: -1 })
      .limit(50)
      .populate('poId', 'poNumber vendor')
      .lean();

    // Get items needing attention (exceptions, delays, etc.)
    const trackingIssues = await LineItem.find({
      trackingNumber: { $exists: true, $ne: '' },
      trackingStatus: {
        $in: [
          'Exception', 'exception',
          'Delayed', 'delayed',
          'Lost', 'lost',
          'Damaged', 'damaged',
          'Returned to Sender', 'returned'
        ]
      }
    })
      .populate('poId', 'poNumber vendor')
      .limit(20)
      .lean();

    // Get unique carriers and statuses for filtering
    const uniqueCarriers = await LineItem.distinct('trackingCarrier', {
      trackingCarrier: { $exists: true, $ne: '' }
    });
    const uniqueStatuses = await LineItem.distinct('trackingStatus', {
      trackingStatus: { $exists: true, $ne: '' }
    });

    // Generate tracking URLs for display
    const trackingService = require('../services/trackingService');
    recentlyUpdated.forEach(item => {
      if (item.trackingNumber && item.trackingCarrier) {
        item.trackingURL = trackingService.getTrackingURL(item.trackingNumber, item.trackingCarrier);
      }
    });

    trackingIssues.forEach(item => {
      if (item.trackingNumber && item.trackingCarrier) {
        item.trackingURL = trackingService.getTrackingURL(item.trackingNumber, item.trackingCarrier);
      }
    });

    console.log(`✅ Manual Tracking dashboard loaded: ${totalLineItems} total items, ${itemsWithTracking} with tracking`);

    res.render('tracking-dashboard-manual', {
      stats: {
        totalLineItems,
        itemsWithTracking,
        deliveredItems,
        inTransitItems,
        exceptionItems,
        noTracking: totalLineItems - itemsWithTracking,
        trackingCoverage: totalLineItems > 0 ? Math.round((itemsWithTracking / totalLineItems) * 100) : 0
      },
      user: req.user
    });
  } catch (error) {
    console.error('❌ Tracking dashboard error:', error);
    res.status(500).send('Error loading tracking dashboard: ' + error.message);
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

    // Get the attachment ID that was just created
    const newAttachment = po.attachments[po.attachments.length - 1];
    const attachmentId = newAttachment._id.toString();

    console.log('═══════════════════════════════════════════════════════════');
    console.log('✅ FILE UPLOADED SUCCESSFULLY');
    console.log('═══════════════════════════════════════════════════════════');
    console.log(`📄 Filename: ${req.file.originalname}`);
    console.log(`📋 PO Number: ${po.poNumber}`);
    console.log(`🏢 Vendor: ${po.vendor}`);
    console.log(`🆔 PO ID: ${po._id.toString()}`);
    console.log(`🔑 Attachment ID: ${attachmentId}`);
    console.log(`📁 File Path: ${finalPath}`);
    console.log(`📊 File Size: ${req.file.size} bytes`);
    console.log(`📎 File Type: ${req.file.mimetype}`);
    console.log(`📝 Document Type: ${documentType || 'Other'}`);
    console.log(`👤 Uploaded By: ${uploadedBy}`);
    console.log(`📅 Upload Time: ${new Date().toISOString()}`);
    console.log(`📊 Total Attachments for this PO: ${po.attachments.length}`);
    console.log('');
    console.log('🔗 VIEW URL:');
    console.log(`   http://localhost:3002/purchase-orders/view-attachment/${attachmentId}`);
    console.log('🔗 DOWNLOAD URL:');
    console.log(`   http://localhost:3002/purchase-orders/download-attachment/${attachmentId}`);
    console.log('═══════════════════════════════════════════════════════════');

    res.json({
      success: true,
      message: 'File uploaded successfully',
      attachment: {
        ...attachment,
        attachmentId: attachmentId,
        viewUrl: `/purchase-orders/view-attachment/${attachmentId}`,
        downloadUrl: `/purchase-orders/download-attachment/${attachmentId}`
      }
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
// Real-time Excel Export API
router.get('/export/live-excel', async (req, res) => {
  try {
    console.log('📊 Real-time Excel export requested');

    // Check for API key in query params or headers
    const apiKey = req.query.api_key || req.headers['x-api-key'];
    const validApiKey = process.env.EXCEL_API_KEY;

    // Allow access if user is authenticated OR has valid API key
    if (!req.isAuthenticated() && (!apiKey || apiKey !== validApiKey)) {
      console.log('❌ Unauthorized access attempt to Excel export');
      return res.status(401).json({
        success: false,
        error: 'Unauthorized. Please provide a valid API key or log in.',
        hint: 'Add ?api_key=YOUR_KEY to the URL or use X-API-Key header'
      });
    }

    console.log('✅ Access granted:', req.isAuthenticated() ? 'authenticated user' : 'valid API key');

    // Fetch all purchase orders with populated line items
    const purchaseOrders = await PurchaseOrder.find()
      .populate('lineItems')
      .sort({ poNumber: -1 });

    console.log(`📦 Found ${purchaseOrders.length} purchase orders to export`);

    // Import XLSX
    const XLSX = require('xlsx');

    // Create a new workbook
    const workbook = XLSX.utils.book_new();

    // Prepare data for main PO sheet
    const poData = purchaseOrders.map(po => ({
      'PO Number': po.poNumber || '',
      'Vendor': po.vendor || '',
      'PO Type': po.poType || '',
      'Status': po.status || '',
      'NS Status': po.nsStatus || '',
      'Priority': po.priority || '',
      'Location': po.location || '',
      'Tracking Number': po.trackingNumber || '',
      'ETA': po.eta ? new Date(po.eta).toLocaleDateString() : '',
      'Date Ordered': po.dateOrdered ? new Date(po.dateOrdered).toLocaleDateString() : '',
      'Notes': po.notes || '',
      'Line Items Count': po.lineItems ? po.lineItems.length : 0,
      'Created At': po.createdAt ? new Date(po.createdAt).toLocaleDateString() : '',
      'Updated At': po.updatedAt ? new Date(po.updatedAt).toLocaleDateString() : ''
    }));

    // Create PO worksheet
    const poWorksheet = XLSX.utils.json_to_sheet(poData);
    XLSX.utils.book_append_sheet(workbook, poWorksheet, 'Purchase Orders');

    // Prepare data for line items sheet
    const lineItemsData = [];
    purchaseOrders.forEach(po => {
      if (po.lineItems && po.lineItems.length > 0) {
        po.lineItems.forEach(item => {
          lineItemsData.push({
            'PO Number': po.poNumber || '',
            'Vendor': po.vendor || '',
            'Item Number': item.itemNumber || '',
            'Variety': item.variety || '',
            'Description': item.description || '',
            'Location': item.locationName || '',
            'Quantity Ordered': item.quantityOrdered || 0,
            'Quantity Expected': item.quantityExpected || 0,
            'Quantity Received': item.quantityReceived || 0,
            'Unit': item.unit || '',
            'Status': item.status || '',
            'Urgency': item.urgency || '',
            'EAD': item.ead || '',
            'ETA': item.eta ? new Date(item.eta).toLocaleDateString() : '',
            'Notes': item.notes || ''
          });
        });
      }
    });

    // Create Line Items worksheet
    const lineItemsWorksheet = XLSX.utils.json_to_sheet(lineItemsData);
    XLSX.utils.book_append_sheet(workbook, lineItemsWorksheet, 'Line Items');

    // Generate buffer
    const excelBuffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });

    // Set response headers
    const filename = `PurchaseOrders_${new Date().toISOString().split('T')[0]}.xlsx`;
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Content-Length', excelBuffer.length);

    console.log(`✅ Excel file generated: ${filename} (${excelBuffer.length} bytes)`);

    // Send the buffer
    res.send(excelBuffer);

  } catch (error) {
    console.error('❌ Excel export error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to generate Excel file',
      details: error.message
    });
  }
});

// Simplified CSV endpoint for easy Excel Power Query import (no auth required with valid key)
router.get('/export/csv-data', async (req, res) => {
  try {
    console.log('📊 CSV data export requested');

    // Check for API key
    const apiKey = req.query.key;
    const validApiKey = process.env.EXCEL_API_KEY;

    if (!apiKey || apiKey !== validApiKey) {
      console.log('❌ Invalid or missing API key');
      return res.status(401).send('Unauthorized. Invalid API key.');
    }

    console.log('✅ Valid API key provided');

    // Fetch data
    const purchaseOrders = await PurchaseOrder.find()
      .populate('lineItems')
      .sort({ poNumber: -1 });

    console.log(`📦 Found ${purchaseOrders.length} purchase orders`);

    // Flatten data for CSV
    const csvData = [];
    purchaseOrders.forEach(po => {
      if (po.lineItems && po.lineItems.length > 0) {
        po.lineItems.forEach(item => {
          csvData.push({
            'PO_Number': po.poNumber || '',
            'Vendor': po.vendor || '',
            'PO_Type': po.poType || '',
            'PO_Status': po.status || '',
            'PO_NS_Status': po.nsStatus || '',
            'PO_Priority': po.priority || '',
            'PO_Location': po.location || '',
            'PO_Tracking': po.trackingNumber || '',
            'PO_ETA': po.eta ? new Date(po.eta).toISOString().split('T')[0] : '',
            'PO_Date_Ordered': po.dateOrdered ? new Date(po.dateOrdered).toISOString().split('T')[0] : '',
            'Item_Number': item.itemNumber || '',
            'Variety': item.variety || '',
            'Description': item.description || '',
            'Location': item.locationName || '',
            'Qty_Ordered': item.quantityOrdered || 0,
            'Qty_Expected': item.quantityExpected || 0,
            'Qty_Received': item.quantityReceived || 0,
            'Unit': item.unit || '',
            'Item_Status': item.status || '',
            'Urgency': item.urgency || '',
            'EAD': item.ead || '',
            'Item_ETA': item.eta ? new Date(item.eta).toISOString().split('T')[0] : '',
            'Item_Notes': item.notes || '',
            'PO_Notes': po.notes || ''
          });
        });
      } else {
        // PO with no line items
        csvData.push({
          'PO_Number': po.poNumber || '',
          'Vendor': po.vendor || '',
          'PO_Type': po.poType || '',
          'PO_Status': po.status || '',
          'PO_NS_Status': po.nsStatus || '',
          'PO_Priority': po.priority || '',
          'PO_Location': po.location || '',
          'PO_Tracking': po.trackingNumber || '',
          'PO_ETA': po.eta ? new Date(po.eta).toISOString().split('T')[0] : '',
          'PO_Date_Ordered': po.dateOrdered ? new Date(po.dateOrdered).toISOString().split('T')[0] : '',
          'Item_Number': '',
          'Variety': '',
          'Description': '',
          'Location': '',
          'Qty_Ordered': 0,
          'Qty_Expected': 0,
          'Qty_Received': 0,
          'Unit': '',
          'Item_Status': '',
          'Urgency': '',
          'EAD': '',
          'Item_ETA': '',
          'Item_Notes': '',
          'PO_Notes': po.notes || ''
        });
      }
    });

    // Convert to CSV
    const Papa = require('papaparse');
    const csv = Papa.unparse(csvData);

    // Send CSV
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="PurchaseOrders_${new Date().toISOString().split('T')[0]}.csv"`);

    console.log(`✅ CSV generated with ${csvData.length} rows`);
    res.send(csv);

  } catch (error) {
    console.error('❌ CSV export error:', error);
    res.status(500).send('Error generating CSV: ' + error.message);
  }
});

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

// POST route to reconcile missing vendors after import
router.post('/reconcile-vendors', async (req, res) => {
  try {
    console.log('🔄 Starting vendor reconciliation...');

    // Find all POs that have vendor strings but no linked organic vendor
    const unlinkedPOs = await PurchaseOrder.find({
      vendor: { $exists: true, $ne: null, $ne: '' },
      $or: [
        { organicVendor: { $exists: false } },
        { organicVendor: null }
      ]
    });

    console.log(`📊 Found ${unlinkedPOs.length} POs with unlinked vendors`);

    if (unlinkedPOs.length === 0) {
      return res.json({
        success: true,
        message: 'No unlinked vendors found. All POs are properly linked!',
        created: 0,
        linked: 0
      });
    }

    // Extract unique vendor strings
    const uniqueVendors = [...new Set(unlinkedPOs.map(po => po.vendor))];
    console.log(`📋 Unique vendor strings to process: ${uniqueVendors.length}`);
    uniqueVendors.forEach(v => console.log(`  - "${v}"`));

    let vendorsCreated = 0;
    let posLinked = 0;

    // Process each unique vendor
    for (const vendorString of uniqueVendors) {
      console.log(`\n🔍 Processing vendor: "${vendorString}"`);

      // Split vendor data using our utility
      const vendorData = splitVendorData(vendorString);
      console.log(`📊 Split data:`, vendorData);

      // Check if vendor already exists by internalId (using vendorNumber from split)
      let vendor = await OrganicVendor.findOne({ internalId: vendorData.vendorNumber });

      if (!vendor) {
        // Create new vendor - use vendorNumber as internalId
        console.log(`➕ Creating new vendor: ${vendorData.vendorName} (ID: ${vendorData.vendorNumber})`);
        vendor = new OrganicVendor({
          vendorName: vendorData.vendorName,
          internalId: vendorData.vendorNumber,
          lastOrganicCertificationDate: new Date('2024-01-01'),
          status: 'Active'
        });

        await vendor.save();
        vendorsCreated++;
        console.log(`✅ Created vendor: ${vendor.vendorName} (ID: ${vendor._id})`);
      } else {
        console.log(`ℹ️ Vendor already exists: ${vendor.vendorName} (ID: ${vendor._id})`);
      }

      // Link this vendor to all matching POs
      const matchingPOs = unlinkedPOs.filter(po => po.vendor === vendorString);
      console.log(`🔗 Linking vendor to ${matchingPOs.length} POs...`);

      for (const po of matchingPOs) {
        po.organicVendor = vendor._id;
        await po.save();
        posLinked++;
        console.log(`✅ Linked PO ${po.poNumber} to vendor ${vendor.vendorName}`);
      }
    }

    console.log(`\n🎉 Reconciliation complete!`);
    console.log(`📈 Summary: ${vendorsCreated} vendors created, ${posLinked} POs linked`);

    res.json({
      success: true,
      message: `Reconciliation complete! Created ${vendorsCreated} vendors and linked ${posLinked} POs.`,
      created: vendorsCreated,
      linked: posLinked,
      processedVendors: uniqueVendors
    });

  } catch (error) {
    console.error('❌ Reconciliation failed:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to reconcile vendors',
      details: error.message
    });
  }
});

// GET route to preview what vendors would be reconciled (for debugging)
router.get('/preview-vendor-reconciliation', async (req, res) => {
  try {
    console.log('🔍 Previewing vendor reconciliation...');

    // Find all POs that have vendor strings but no linked organic vendor
    const unlinkedPOs = await PurchaseOrder.find({
      vendor: { $exists: true, $ne: null, $ne: '' },
      $or: [
        { organicVendor: { $exists: false } },
        { organicVendor: null }
      ]
    }).select('poNumber vendor');

    // Extract unique vendor strings
    const uniqueVendors = [...new Set(unlinkedPOs.map(po => po.vendor))];

    const preview = {
      totalUnlinkedPOs: unlinkedPOs.length,
      uniqueVendors: uniqueVendors.length,
      vendors: uniqueVendors.map(vendorString => {
        const vendorData = splitVendorData(vendorString);
        const relatedPOs = unlinkedPOs.filter(po => po.vendor === vendorString);
        return {
          originalString: vendorString,
          parsedName: vendorData.vendorName,
          parsedId: vendorData.vendorNumber,  // Using vendorNumber instead of internalId
          affectedPOs: relatedPOs.length,
          samplePOs: relatedPOs.slice(0, 3).map(po => po.poNumber)
        };
      })
    };

    res.json({
      success: true,
      preview: preview
    });

  } catch (error) {
    console.error('❌ Preview failed:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to preview reconciliation',
      details: error.message
    });
  }
});

// GET route for direct reconciliation (for testing - will actually perform the reconciliation)
router.get('/reconcile-vendors', async (req, res) => {
  try {
    console.log('🔄 Starting vendor reconciliation via GET...');

    // Find all POs that have vendor strings but no linked organic vendor
    const unlinkedPOs = await PurchaseOrder.find({
      vendor: { $exists: true, $ne: null, $ne: '' },
      $or: [
        { organicVendor: { $exists: false } },
        { organicVendor: null }
      ]
    });

    console.log(`📊 Found ${unlinkedPOs.length} POs with unlinked vendors`);

    if (unlinkedPOs.length === 0) {
      return res.json({
        success: true,
        message: 'No unlinked vendors found. All POs are properly linked!',
        created: 0,
        linked: 0
      });
    }

    // Extract unique vendor strings
    const uniqueVendors = [...new Set(unlinkedPOs.map(po => po.vendor))];
    console.log(`📋 Unique vendor strings to process: ${uniqueVendors.length}`);
    uniqueVendors.forEach(v => console.log(`  - "${v}"`));

    let vendorsCreated = 0;
    let posLinked = 0;

    // Process each unique vendor
    for (const vendorString of uniqueVendors) {
      console.log(`\n🔍 Processing vendor: "${vendorString}"`);

      // Split vendor data using our utility
      const vendorData = splitVendorData(vendorString);
      console.log(`📊 Split data:`, vendorData);

      // Check if vendor already exists by internalId (using vendorNumber from split)
      let vendor = await OrganicVendor.findOne({ internalId: vendorData.vendorNumber });

      if (!vendor) {
        // Create new vendor - use vendorNumber as internalId
        console.log(`➕ Creating new vendor: ${vendorData.vendorName} (ID: ${vendorData.vendorNumber})`);
        vendor = new OrganicVendor({
          vendorName: vendorData.vendorName,
          internalId: vendorData.vendorNumber,
          lastOrganicCertificationDate: new Date('2024-01-01'),
          status: 'Active'
        });

        await vendor.save();
        vendorsCreated++;
        console.log(`✅ Created vendor: ${vendor.vendorName} (ID: ${vendor._id})`);
      } else {
        console.log(`ℹ️ Vendor already exists: ${vendor.vendorName} (ID: ${vendor._id})`);
      }

      // Link this vendor to all matching POs
      const matchingPOs = unlinkedPOs.filter(po => po.vendor === vendorString);
      console.log(`🔗 Linking vendor to ${matchingPOs.length} POs...`);

      for (const po of matchingPOs) {
        po.organicVendor = vendor._id;
        await po.save();
        posLinked++;
        console.log(`✅ Linked PO ${po.poNumber} to vendor ${vendor.vendorName}`);
      }
    }

    console.log(`\n🎉 Reconciliation complete!`);
    console.log(`📈 Summary: ${vendorsCreated} vendors created, ${posLinked} POs linked`);

    res.json({
      success: true,
      message: `Reconciliation complete! Created ${vendorsCreated} vendors and linked ${posLinked} POs.`,
      created: vendorsCreated,
      linked: posLinked,
      processedVendors: uniqueVendors,
      refreshPage: true
    });

  } catch (error) {
    console.error('❌ Reconciliation failed:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to reconcile vendors',
      details: error.message
    });
  }
});

// POST route to reconcile missing vendors in the main Vendor model
router.post('/reconcile-main-vendors', async (req, res) => {
  try {
    console.log('🔄 Starting main vendor reconciliation...');

    // Find all POs that don't have a linkedVendor
    const unlinkedPOs = await PurchaseOrder.find({
      vendor: { $exists: true, $ne: null, $ne: '' },
      $or: [
        { linkedVendor: { $exists: false } },
        { linkedVendor: null }
      ]
    });

    console.log(`📊 Found ${unlinkedPOs.length} POs with unlinked vendors`);

    if (unlinkedPOs.length === 0) {
      return res.json({
        success: true,
        message: 'No unlinked vendors found. All POs are properly linked to the Vendor model!',
        created: 0,
        linked: 0
      });
    }

    // Extract unique vendor strings
    const uniqueVendors = [...new Set(unlinkedPOs.map(po => po.vendor))];
    console.log(`📋 Unique vendor strings to process: ${uniqueVendors.length}`);
    uniqueVendors.forEach(v => console.log(`  - "${v}"`));

    let vendorsCreated = 0;
    let posLinked = 0;

    // Process each unique vendor
    for (const vendorString of uniqueVendors) {
      console.log(`\n🔍 Processing vendor: "${vendorString}"`);

      // Split vendor data using our utility
      const vendorData = splitVendorData(vendorString);
      console.log(`📊 Split data:`, vendorData);

      // Generate a vendor code if vendorNumber is empty
      let vendorCode = vendorData.vendorNumber || '';
      if (!vendorCode || vendorCode.trim() === '') {
        // Generate vendor code from vendor name
        const words = vendorData.vendorName.trim().split(/\s+/);
        if (words.length === 1) {
          // Single word: take first 3-4 characters
          vendorCode = words[0].substring(0, 4).toUpperCase();
        } else {
          // Multiple words: take first letter of each word, max 5 characters
          vendorCode = words.slice(0, 5).map(word => word.charAt(0)).join('').toUpperCase();
        }
        console.log(`📝 Generated vendor code: ${vendorCode} for vendor: ${vendorData.vendorName}`);
      }

      // Check if vendor already exists by vendorCode
      let vendor = await Vendor.findOne({ vendorCode: vendorCode });

      if (!vendor) {
        // Ensure vendor code is unique
        let finalVendorCode = vendorCode;
        let counter = 1;
        while (await Vendor.findOne({ vendorCode: finalVendorCode })) {
          finalVendorCode = vendorCode + counter;
          counter++;
        }

        // Create new vendor in the Vendor model
        console.log(`➕ Creating new vendor: ${vendorData.vendorName} (Code: ${finalVendorCode})`);
        vendor = new Vendor({
          vendorName: vendorData.vendorName,
          vendorCode: finalVendorCode,
          vendorType: 'Seeds', // Default type
          status: 'Active'
        });

        await vendor.save();
        vendorsCreated++;
        console.log(`✅ Created vendor: ${vendor.vendorName} (ID: ${vendor._id})`);
      } else {
        console.log(`ℹ️ Vendor already exists: ${vendor.vendorName} (ID: ${vendor._id})`);
      }

      // Link this vendor to all matching POs
      const matchingPOs = unlinkedPOs.filter(po => po.vendor === vendorString);
      console.log(`🔗 Linking vendor to ${matchingPOs.length} POs...`);

      for (const po of matchingPOs) {
        po.linkedVendor = vendor._id;
        await po.save();
        posLinked++;
        console.log(`✅ Linked PO ${po.poNumber} to vendor ${vendor.vendorName}`);
      }
    }

    console.log(`\n🎉 Reconciliation complete!`);
    console.log(`📈 Summary: ${vendorsCreated} vendors created, ${posLinked} POs linked`);

    res.json({
      success: true,
      message: `Reconciliation complete! Created ${vendorsCreated} vendors and linked ${posLinked} POs to the main Vendor model.`,
      created: vendorsCreated,
      linked: posLinked,
      processedVendors: uniqueVendors
    });

  } catch (error) {
    console.error('❌ Reconciliation failed:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to reconcile vendors',
      details: error.message
    });
  }
});

// GET route for direct reconciliation (for testing - will actually perform the reconciliation)
router.get('/reconcile-main-vendors', async (req, res) => {
  try {
    console.log('🔄 Starting main vendor reconciliation via GET...');

    // Find all POs that don't have a linkedVendor
    const unlinkedPOs = await PurchaseOrder.find({
      vendor: { $exists: true, $ne: null, $ne: '' },
      $or: [
        { linkedVendor: { $exists: false } },
        { linkedVendor: null }
      ]
    });

    console.log(`📊 Found ${unlinkedPOs.length} POs with unlinked vendors`);

    if (unlinkedPOs.length === 0) {
      return res.json({
        success: true,
        message: 'No unlinked vendors found. All POs are properly linked to the Vendor model!',
        created: 0,
        linked: 0
      });
    }

    // Extract unique vendor strings
    const uniqueVendors = [...new Set(unlinkedPOs.map(po => po.vendor))];
    console.log(`📋 Unique vendor strings to process: ${uniqueVendors.length}`);
    uniqueVendors.forEach(v => console.log(`  - "${v}"`));

    let vendorsCreated = 0;
    let posLinked = 0;

    // Process each unique vendor
    for (const vendorString of uniqueVendors) {
      console.log(`\n🔍 Processing vendor: "${vendorString}"`);

      // Split vendor data using our utility
      const vendorData = splitVendorData(vendorString);
      console.log(`📊 Split data:`, vendorData);

      // Check if vendor already exists by vendorCode (using vendorNumber from split)
      let vendor = await Vendor.findOne({ vendorCode: vendorData.vendorNumber });

      if (!vendor) {
        // Create new vendor in the Vendor model
        console.log(`➕ Creating new vendor: ${vendorData.vendorName} (Code: ${vendorData.vendorNumber})`);
        vendor = new Vendor({
          vendorName: vendorData.vendorName,
          vendorCode: vendorData.vendorNumber,
          vendorType: 'Seeds', // Default type
          status: 'Active'
        });

        await vendor.save();
        vendorsCreated++;
        console.log(`✅ Created vendor: ${vendor.vendorName} (ID: ${vendor._id})`);
      } else {
        console.log(`ℹ️ Vendor already exists: ${vendor.vendorName} (ID: ${vendor._id})`);
      }

      // Link this vendor to all matching POs
      const matchingPOs = unlinkedPOs.filter(po => po.vendor === vendorString);
      console.log(`🔗 Linking vendor to ${matchingPOs.length} POs...`);

      for (const po of matchingPOs) {
        po.linkedVendor = vendor._id;
        await po.save();
        posLinked++;
        console.log(`✅ Linked PO ${po.poNumber} to vendor ${vendor.vendorName}`);
      }
    }

    console.log(`\n🎉 Reconciliation complete!`);
    console.log(`📈 Summary: ${vendorsCreated} vendors created, ${posLinked} POs linked`);

    res.json({
      success: true,
      message: `Reconciliation complete! Created ${vendorsCreated} vendors and linked ${posLinked} POs to the main Vendor model.`,
      created: vendorsCreated,
      linked: posLinked,
      processedVendors: uniqueVendors
    });

  } catch (error) {
    console.error('❌ Reconciliation failed:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to reconcile vendors',
      details: error.message
    });
  }
});

// Test route to check vendor links without authentication
router.get('/check-vendor-links', async (req, res) => {
  try {
    console.log('🔍 Checking vendor links...');

    // Count vendors in both collections
    const vendorCount = await Vendor.countDocuments();
    const organicVendorCount = await OrganicVendor.countDocuments();

    // Get all POs with populated vendors
    const pos = await PurchaseOrder.find()
      .populate('linkedVendor')
      .populate('organicVendor')
      .select('poNumber vendor linkedVendor organicVendor');

    const withMainLinks = pos.filter(po => po.linkedVendor);
    const withOrganicLinks = pos.filter(po => po.organicVendor);
    const withoutAnyLinks = pos.filter(po => !po.linkedVendor && !po.organicVendor);

    res.json({
      vendorCollections: {
        mainVendors: vendorCount,
        organicVendors: organicVendorCount
      },
      purchaseOrders: {
        total: pos.length,
        withMainVendorLinks: withMainLinks.length,
        withOrganicVendorLinks: withOrganicLinks.length,
        withoutAnyLinks: withoutAnyLinks.length
      },
      sampleLinkedPOs: withMainLinks.slice(0, 5).map(po => ({
        poNumber: po.poNumber,
        vendor: po.vendor,
        linkedToMainVendor: po.linkedVendor ? po.linkedVendor.vendorName : null,
        linkedToOrganicVendor: po.organicVendor ? po.organicVendor.vendorName : null
      })),
      unlinkedPOs: withoutAnyLinks.slice(0, 10).map(po => ({
        poNumber: po.poNumber,
        vendor: po.vendor
      }))
    });

  } catch (error) {
    console.error('❌ Check failed:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get all unreceived items report
router.get('/unreceived-items', async (req, res) => {
  try {
    console.log('📋 Fetching unreceived items report...');

    // Find all line items where received = false
    const unreceivedItems = await LineItem.find({ received: false })
      .populate('poId')
      .sort({ poNumber: 1, sku: 1 })
      .lean();

    console.log(`Found ${unreceivedItems.length} unreceived items`);

    // Debug: Log the first item to see what fields are available
    if (unreceivedItems.length > 0) {
      console.log('📊 Sample unreceived item fields:', {
        quantityExpected: unreceivedItems[0].quantityExpected,
        quantityOrdered: unreceivedItems[0].quantityOrdered,
        quantityReceived: unreceivedItems[0].quantityReceived,
        allKeys: Object.keys(unreceivedItems[0]).filter(k => k.toLowerCase().includes('quant'))
      });
    }

    // Format the data for the report - filter out items from hidden POs
    const formattedItems = unreceivedItems
      .filter(item => {
        // Only include items with valid PO references
        if (!item.poId) return false;
        // Exclude items from hidden POs (matching dashboard behavior)
        if (item.poId.isHidden === true) return false;
        return true;
      })
      .map(item => ({
        itemId: item._id,
        poId: item.poId._id,
        poNumber: item.poNumber,
        poUrl: item.poId.poUrl || null,
        vendor: item.poId.vendor || 'N/A',
        vendorId: item.poId.linkedVendor || null,
        poDate: item.poId.date || item.date || 'N/A',
        eta: item.poId.eta || null,
        sku: item.sku || 'N/A',
        memo: item.memo || 'N/A',
        quantity: item.quantityRemaining || item.quantityExpected || item.quantityOrdered || 0,
        itemStatus: item.itemStatus || 'N/A',
        poStatus: item.poId.status || 'N/A',
        poType: item.poId.poType || 'N/A',
        receivingNotes: item.receivingNotes || '',
        urgency: item.urgency || '',
        ead: item.ead || '',
        inventoryRawQuantity: item.inventoryRawQuantity !== null && item.inventoryRawQuantity !== undefined ? item.inventoryRawQuantity : null,
        inventoryChildQuantity: item.inventoryChildQuantity !== null && item.inventoryChildQuantity !== undefined ? item.inventoryChildQuantity : null,
        inventoryMeasure: item.inventoryMeasure || '',
        inventoryLastUpdated: item.inventoryLastUpdated || null,
        forecast: item.forecast !== null && item.forecast !== undefined ? item.forecast : null,
        forecastSupply: item.forecastSupply !== null && item.forecastSupply !== undefined ? item.forecastSupply : null,
        forecastSupplyTotal: item.forecastSupplyTotal !== null && item.forecastSupplyTotal !== undefined ? item.forecastSupplyTotal : null,
        forecastLastUpdated: item.forecastLastUpdated || null
      }));

    // Get stats
    const uniquePOs = new Set(formattedItems.map(item => item.poNumber));
    const stats = {
      totalItems: formattedItems.length,
      totalPOs: uniquePOs.size
    };

    const hiddenCount = unreceivedItems.length - formattedItems.length;
    console.log(`📊 Stats: ${stats.totalItems} items across ${stats.totalPOs} POs (${hiddenCount} items excluded from hidden POs)`);

    res.json({
      success: true,
      items: formattedItems,
      stats: stats
    });

  } catch (error) {
    console.error('❌ Error fetching unreceived items:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Get waiting for approval items (filtered by status)
router.get('/waiting-for-approval-items', async (req, res) => {
  try {
    console.log('📋 Fetching waiting for approval items...');

    // Find all line items where received = false AND poId.status = "Awaiting Approval"
    const waitingItems = await LineItem.find({ received: false })
      .populate('poId')
      .sort({ poNumber: 1, sku: 1 })
      .lean();

    console.log(`Found ${waitingItems.length} unreceived items`);

    // Format the data for the report - filter by "Awaiting Approval" status
    const formattedItems = waitingItems
      .filter(item => {
        // Only include items with valid PO references
        if (!item.poId) return false;
        // Exclude items from hidden POs
        if (item.poId.isHidden === true) return false;
        // Only include items with "Awaiting Approval" status
        if (item.poId.status !== 'Awaiting Approval') return false;
        return true;
      })
      .map(item => ({
        itemId: item._id,
        poNumber: item.poNumber,
        poUrl: item.poId.poUrl || null,
        vendor: item.poId.vendor || 'N/A',
        vendorId: item.poId.linkedVendor || null,
        poDate: item.poId.date || item.date || 'N/A',
        eta: item.poId.eta || null,
        sku: item.sku || 'N/A',
        memo: item.memo || 'N/A',
        quantity: item.quantityRemaining || item.quantityExpected || item.quantityOrdered || 0,
        itemStatus: item.itemStatus || 'N/A',
        poStatus: item.poId.status || 'N/A',
        poType: item.poId.poType || 'N/A',
        receivingNotes: item.receivingNotes || '',
        urgency: item.urgency || '',
        ead: item.ead || '',
        inventoryRawQuantity: item.inventoryRawQuantity !== null && item.inventoryRawQuantity !== undefined ? item.inventoryRawQuantity : null,
        inventoryChildQuantity: item.inventoryChildQuantity !== null && item.inventoryChildQuantity !== undefined ? item.inventoryChildQuantity : null,
        inventoryMeasure: item.inventoryMeasure || '',
        inventoryLastUpdated: item.inventoryLastUpdated || null,
        forecast: item.forecast !== null && item.forecast !== undefined ? item.forecast : null,
        forecastSupply: item.forecastSupply !== null && item.forecastSupply !== undefined ? item.forecastSupply : null,
        forecastSupplyTotal: item.forecastSupplyTotal !== null && item.forecastSupplyTotal !== undefined ? item.forecastSupplyTotal : null,
        forecastLastUpdated: item.forecastLastUpdated || null
      }));

    // Get stats
    const uniquePOs = new Set(formattedItems.map(item => item.poNumber));
    const stats = {
      totalItems: formattedItems.length,
      totalPOs: uniquePOs.size
    };

    const hiddenCount = waitingItems.length - formattedItems.length;
    console.log(`📊 Stats: ${stats.totalItems} items across ${stats.totalPOs} POs (${hiddenCount} items excluded)`);

    res.json({
      success: true,
      items: formattedItems,
      stats: stats
    });

  } catch (error) {
    console.error('❌ Error fetching waiting for approval items:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Record email communication for a PO
router.post('/:id/email-sent', async (req, res) => {
  try {
    const { recipient, subject, sentBy, notes } = req.body;

    if (!recipient) {
      return res.status(400).json({
        success: false,
        error: 'Recipient email is required'
      });
    }

    const po = await PurchaseOrder.findById(req.params.id);

    if (!po) {
      return res.status(404).json({
        success: false,
        error: 'Purchase Order not found'
      });
    }

    // Update last email fields
    po.lastEmailSent = new Date();
    po.lastEmailRecipient = recipient;
    po.lastEmailSubject = subject || '';
    po.lastEmailSentBy = sentBy || 'Unknown';

    // Add to communication history
    if (!po.emailCommunicationHistory) {
      po.emailCommunicationHistory = [];
    }

    po.emailCommunicationHistory.push({
      sentAt: new Date(),
      recipient: recipient,
      subject: subject || '',
      sentBy: sentBy || 'Unknown',
      notes: notes || ''
    });

    await po.save();

    res.json({
      success: true,
      message: 'Email communication recorded',
      lastEmailSent: po.lastEmailSent,
      lastEmailRecipient: po.lastEmailRecipient
    });

  } catch (error) {
    console.error('❌ Error recording email communication:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// POST route to send vendor status request email
router.post('/send-vendor-email', async (req, res) => {
  try {
    const { poId, recipient, subject, body, trackEmail } = req.body;

    console.log('📧 Sending vendor status request email:', { poId, recipient, subject: subject.substring(0, 50) + '...' });

    if (!poId || !recipient || !subject || !body) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: poId, recipient, subject, body'
      });
    }

    // Get the PO to include details in email
    const po = await PurchaseOrder.findById(poId);
    if (!po) {
      return res.status(404).json({
        success: false,
        error: 'Purchase Order not found'
      });
    }

    // Import email service
    const emailService = require('../services/emailService');

    // Send the email
    const emailResult = await emailService.sendEmail({
      to: recipient,
      subject: subject,
      text: body,
      html: body.replace(/\n/g, '<br>')
    });

    if (!emailResult.success) {
      return res.status(500).json({
        success: false,
        error: 'Failed to send email: ' + emailResult.error
      });
    }

    // Track the email communication if requested
    if (trackEmail) {
      const user = req.user || { username: 'system' };
      
      po.lastEmailSent = new Date();
      po.lastEmailRecipient = recipient;
      po.lastEmailSubject = subject;
      po.lastEmailSentBy = user.username || user.email || 'system';

      // Add to history
      po.emailCommunicationHistory.push({
        sentAt: new Date(),
        recipient: recipient,
        subject: subject,
        sentBy: user.username || user.email || 'system',
        notes: `Status request sent via dashboard`
      });

      await po.save();
      console.log(`✅ Email tracked for PO ${po.poNumber}`);
    }

    console.log('✅ Email sent successfully:', emailResult.messageId);

    res.json({
      success: true,
      message: 'Email sent successfully',
      messageId: emailResult.messageId,
      lastEmailSent: po.lastEmailSent,
      previewUrl: emailResult.previewUrl || null
    });

  } catch (error) {
    console.error('❌ Error sending vendor email:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Get a single purchase order by ID - MUST BE LAST to avoid catching specific routes
router.get('/:id', async (req, res) => {
  try {
    console.log('🔍 GET /:id route hit with ID:', req.params.id);
    console.log('🔍 Request headers accept:', req.headers.accept);
    
    const purchaseOrder = await PurchaseOrder.findById(req.params.id)
      .populate('linkedVendor')
      .lean();
    
    if (!purchaseOrder) {
      console.log('❌ Purchase order not found with ID:', req.params.id);
      return res.status(404).json({ error: 'Purchase order not found' });
    }

    console.log('✅ Found purchase order:', purchaseOrder.poNumber);

    // Get line items for this PO
    const lineItems = await LineItem.find({ poId: req.params.id })
      .sort({ createdAt: 1 })
      .lean();
    
    console.log('✅ Found', lineItems.length, 'line items');
    
    // Add line items to the purchase order object
    purchaseOrder.lineItems = lineItems;

    console.log('📤 Sending JSON response with PO:', purchaseOrder.poNumber);
    console.log('📤 Response will have', lineItems.length, 'line items');
    
    const responseData = { 
      success: true,
      purchaseOrder 
    };
    
    console.log('📤 About to call res.json()');
    res.json(responseData);
    console.log('✅ res.json() called successfully');
  } catch (error) {
    console.error('❌ Get purchase order error:', error);
    console.error('❌ Error stack:', error.stack);
    res.status(500).json({ 
      success: false,
      error: error.message,
      stack: error.stack 
    });
  }
});

module.exports = router;