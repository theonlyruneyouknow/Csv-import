// Test script to find attachment details
const mongoose = require('mongoose');
const PurchaseOrder = require('./models/PurchaseOrder');

mongoose.connect('mongodb://localhost:27017/purchaseOrderDB')
  .then(async () => {
    console.log('Connected to MongoDB');
    
    // Search for the attachment ID
    const attachmentId = '68bb567e4d436d6d115dcb54';
    console.log(`\n🔍 Searching for attachment ID: ${attachmentId}`);
    
    const po1 = await PurchaseOrder.findOne({
      'attachments._id': attachmentId
    });
    
    if (po1) {
      console.log(`✅ Found in PO: ${po1.poNumber}`);
      const att = po1.attachments.id(attachmentId);
      console.log('Attachment details:', JSON.stringify(att, null, 2));
    } else {
      console.log('❌ Attachment ID not found in any PO');
    }
    
    // Search for PO11079
    console.log(`\n🔍 Searching for PO11079...`);
    const po2 = await PurchaseOrder.findOne({ poNumber: 'PO11079' });
    
    if (po2) {
      console.log(`✅ Found PO11079`);
      console.log(`   Vendor: ${po2.vendor}`);
      console.log(`   Total attachments: ${po2.attachments ? po2.attachments.length : 0}`);
      
      if (po2.attachments && po2.attachments.length > 0) {
        console.log('\n📎 Attachments:');
        po2.attachments.forEach((att, idx) => {
          console.log(`\n${idx + 1}. ${att.filename}`);
          console.log(`   ID: ${att._id.toString()}`);
          console.log(`   Type: ${att.fileType}`);
          console.log(`   Size: ${att.fileSize}`);
          console.log(`   Path: ${att.filePath}`);
          console.log(`   Uploaded: ${att.uploadedAt}`);
          
          // Check if file exists
          const fs = require('fs');
          if (fs.existsSync(att.filePath)) {
            console.log(`   ✅ File exists on disk`);
          } else {
            console.log(`   ❌ File NOT found on disk`);
          }
        });
      }
    } else {
      console.log('❌ PO11079 not found');
    }
    
    // Search for the specific filename
    console.log(`\n🔍 Searching for filename containing "PurchOrd15281746"...`);
    const poWithFile = await PurchaseOrder.findOne({
      'attachments.filename': { $regex: 'PurchOrd15281746', $options: 'i' }
    });
    
    if (poWithFile) {
      console.log(`✅ Found in PO: ${poWithFile.poNumber}`);
      const matchingAtt = poWithFile.attachments.find(a => 
        a.filename.includes('PurchOrd15281746')
      );
      if (matchingAtt) {
        console.log('Matching attachment:', JSON.stringify(matchingAtt, null, 2));
      }
    } else {
      console.log('❌ Filename not found in any PO');
    }
    
    process.exit(0);
  })
  .catch(err => {
    console.error('Error:', err);
    process.exit(1);
  });
