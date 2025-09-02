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
  eta: {                    // Expected Time of Arrival - estimated delivery date
    type: Date,
    default: null
  },
  poUrl: {                  // URL associated with this PO - makes PO number clickable
    type: String,
    default: ''
  },
  shippingTracking: {       // Shipping tracking number/URL - for future implementation
    type: String,
    default: ''
  },
  shippingCarrier: {        // Shipping carrier (FedEx, UPS, USPS, etc.)
    type: String,
    default: 'FedEx'          // Default to FedEx as most vendors use it
  },
  priority: {               // Priority level (1-5, where 1 is highest priority)
    type: Number,
    min: 1,
    max: 5,
    default: null             // No priority by default
  },
  lineItems: [{             // Array of line items for this PO
    sku: String,
    memo: String,
    itemStatus: String,
    received: Boolean,
    lineItemId: mongoose.Schema.Types.ObjectId,
    // NetSuite specific fields for reference
    netsuiteQuantity: Number,
    netsuiteReceived: Number,
    netsuiteBilled: Number,
    vendorDescription: String
  }],
  // Soft delete/hide functionality
  isHidden: {
    type: Boolean,
    default: false,
    index: true                // Index for efficient filtering
  },
  hiddenDate: {
    type: Date,
    default: null
  },
  hiddenReason: {
    type: String,
    default: '',
    enum: ['', 'Not in import', 'Manually hidden', 'Completed', 'Cancelled', 'Other']
  },
  hiddenBy: {                 // Track who hid the PO (for audit purposes)
    type: String,
    default: ''
  },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('PurchaseOrder', purchaseOrderSchema);