// models/PurchaseOrder.js
const mongoose = require('mongoose');

const purchaseOrderSchema = new mongoose.Schema({
  reportDate: String,        // "As of September 2, 2025"
  date: String,             // PO date
  poNumber: {               // Document number - this is our unique identifier
    type: String,
    unique: true,
    required: true
  },
  vendor: String,           // Vendor name
  nsStatus: String,         // NS Status - from CSV (Pending Receipt, etc.) - display only
  status: {                 // Status - custom editable dropdown (In Progress, On Hold, etc.)
    type: String,
    default: ''
  },
  amount: Number,           // Amount as number
  location: String,         // Location
  notes: {                  // User's notes - this persists across CSV uploads
    type: String,
    default: ''
  },
  nextUpdateDate: {         // Next update date - user can set when this PO needs attention
    type: Date,
    default: null
  },
  poUrl: {                  // URL associated with this PO - makes PO number clickable
    type: String,
    default: ''
  },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('PurchaseOrder', purchaseOrderSchema);