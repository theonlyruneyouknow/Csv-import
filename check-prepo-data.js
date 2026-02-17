// Quick script to check what's actually stored in pre-purchase orders
require('dotenv').config({ quiet: true });
const mongoose = require('mongoose');

// Define schema inline to avoid loading all routes
const prePurchaseOrderSchema = new mongoose.Schema({
  orderNumber: String,
  vendor: String,
  poLink: String,
  date: String,
  enteredBy: String,
  productTeamNotes: String,
  approval: String,
  ynh: String,
  notesQuestions: String,
  response: String,
  followUp: String,
  createdAt: Date
}, { strict: false }); // Allow all fields

const PrePurchaseOrder = mongoose.model('PrePurchaseOrder', prePurchaseOrderSchema);

async function checkData() {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected\n');

    const all = await PrePurchaseOrder.find().sort({ createdAt: -1 }).limit(5);
    
    console.log(`📊 Total Pre-POs: ${await PrePurchaseOrder.countDocuments()}\n`);
    console.log('📋 Latest 5 Pre-Purchase Orders:\n');

    all.forEach((prePO, index) => {
      console.log(`=== Pre-PO #${index + 1} ===`);
      console.log(`ID: ${prePO._id}`);
      console.log(`Vendor: ${prePO.vendor || 'EMPTY'}`);
      console.log(`Order Number: ${prePO.orderNumber || 'EMPTY'}`);
      console.log(`PO Link: ${prePO.poLink || 'EMPTY'}`);
      console.log(`Date: ${prePO.date || 'EMPTY'}`);
      console.log(`Entered By: ${prePO.enteredBy || 'EMPTY'}`);
      console.log(`Product Team Notes: ${prePO.productTeamNotes || 'EMPTY'}`);
      console.log(`Approval: ${prePO.approval || 'EMPTY'}`);
      console.log(`Y/N/H: ${prePO.ynh || 'EMPTY'}`);
      console.log(`Notes/Questions: ${prePO.notesQuestions || 'EMPTY'}`);
      console.log(`Response: ${prePO.response || 'EMPTY'}`);
      console.log(`Follow-Up: ${prePO.followUp || 'EMPTY'}`);
      console.log(`Created: ${prePO.createdAt}\n`);
    });

    await mongoose.connection.close();
    console.log('✅ Done');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

checkData();
