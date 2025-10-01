// Manually test DLF vendor creation without CSV upload
const mongoose = require('mongoose');
const OrganicVendor = require('./models/OrganicVendor');
const { splitVendorData } = require('./lib/vendorUtils');
require('dotenv').config();

// Copy of the ensureVendorExists function to test directly
async function ensureVendorExists(vendorData) {
  try {
    const { vendorNumber, vendorName, originalVendor } = vendorData;
    
    console.log(`🔍 VENDOR DEBUG - Processing vendor:`, {
      original: originalVendor,
      vendorNumber: vendorNumber,
      vendorName: vendorName
    });
    
    if (!vendorNumber && !vendorName) {
      console.log(`⚠️ VENDOR DEBUG - Skipping vendor creation: no vendor number or name`);
      return null;
    }

    const internalId = vendorNumber || vendorName.replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
    console.log(`🔍 VENDOR DEBUG - Generated internal ID: ${internalId}`);
    
    const searchCriteria = {
      $or: [
        { internalId: internalId },
        { vendorName: vendorName },
        ...(vendorNumber ? [{ internalId: vendorNumber }] : [])
      ]
    };
    
    console.log(`🔍 VENDOR DEBUG - Searching with criteria:`, searchCriteria);
    
    let existingVendor = await OrganicVendor.findOne(searchCriteria);

    if (existingVendor) {
      console.log(`✅ VENDOR DEBUG - Vendor "${vendorName}" (${vendorNumber}) already exists in database with ID: ${existingVendor.internalId}`);
      console.log(`✅ VENDOR DEBUG - Existing vendor details:`, {
        id: existingVendor._id,
        internalId: existingVendor.internalId,
        vendorName: existingVendor.vendorName,
        status: existingVendor.status
      });
      return existingVendor;
    }

    console.log(`🆕 VENDOR DEBUG - Creating new vendor with data:`, {
      vendorName: vendorName || `Vendor ${vendorNumber}`,
      internalId: internalId,
      originalVendor: originalVendor
    });

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
    console.log(`🎉 VENDOR DEBUG - Successfully created new vendor: "${vendorName}" (${vendorNumber}) with ID: ${internalId}`);
    
    return newVendor;
  } catch (error) {
    console.error(`❌ VENDOR DEBUG - Error ensuring vendor exists for "${vendorData.originalVendor}":`, error);
    return null;
  }
}

async function testDLFVendorCreation() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('✅ Connected to MongoDB');

        // Test the exact DLF vendor data
        const dlfVendorString = "792 DLF USA Inc";
        const vendorData = splitVendorData(dlfVendorString);
        
        console.log('\n=== Testing DLF Vendor Creation ===');
        const result = await ensureVendorExists(vendorData);
        
        if (result) {
            console.log('\n✅ Vendor operation completed successfully');
        } else {
            console.log('\n❌ Vendor operation failed');
        }

        await mongoose.disconnect();
        console.log('🔌 Disconnected from MongoDB');

    } catch (error) {
        console.error('❌ Error in test:', error);
    }
}

testDLFVendorCreation();
