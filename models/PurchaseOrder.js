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
  vendor: String,           // Vendor name (original combined format for backward compatibility)
  vendorNumber: {           // Extracted vendor number (e.g., "121" from "121 CROOKHAM CO")
    type: String,
    default: '',
    index: true             // Index for efficient lookups
  },
  vendorName: {             // Extracted vendor name (e.g., "CROOKHAM CO" from "121 CROOKHAM CO")
    type: String,
    default: '',
    index: true             // Index for efficient lookups
  },
  linkedVendor: {           // Link to main Vendor model - for clickable vendor links to /vendors dashboard
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Vendor',
    default: null
  },
  organicVendor: {          // Link to OrganicVendor model - ONLY for organic certified vendors
    type: mongoose.Schema.Types.ObjectId,
    ref: 'OrganicVendor',
    default: null
  },
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
    vendorDescription: String,
    locationName: String      // Location name from NetSuite (e.g., "Main Warehouse", "Dropship")
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
  // Dropship flag - to distinguish dropship POs from regular POs
  isDropship: {
    type: Boolean,
    default: false,
    index: true                // Index for efficient filtering
  },
  dropshipNotes: {            // Special notes for dropship orders
    type: String,
    default: ''
  },
  // File attachments for PO documents and PDFs
  attachments: [{
    filename: {               // Original filename
      type: String,
      required: true
    },
    savedFilename: {          // Saved filename (with timestamp prefix)
      type: String,
      required: true
    },
    filePath: {               // Path to the file on disk
      type: String,
      required: true
    },
    fileSize: {               // File size in bytes
      type: Number,
      required: true
    },
    fileType: {               // MIME type
      type: String,
      required: true
    },
    uploadedBy: {             // Who uploaded the file
      type: String,
      default: 'Unknown User'
    },
    uploadedAt: {             // When was it uploaded
      type: Date,
      default: Date.now
    },
    description: {            // Optional description of what this file is
      type: String,
      default: ''
    },
    documentType: {           // Type of document (PO, Invoice, Packing Slip, etc.)
      type: String,
      default: 'Other',
      enum: [
        'Purchase Order',
        'Invoice',
        'Packing Slip',
        'Bill of Lading (BOL)',
        'Shipping Confirmation',
        'Receipt',
        'Quote',
        'Contract',
        'Specification Sheet',
        'Other'
      ]
    }
  }],
  // Email communication tracking
  lastEmailSent: {            // When was the last email sent to vendor about this PO
    type: Date,
    default: null
  },
  lastEmailRecipient: {       // Email address the last communication was sent to
    type: String,
    default: ''
  },
  lastEmailSubject: {         // Subject of the last email sent
    type: String,
    default: ''
  },
  lastEmailSentBy: {          // Who sent the email (user identifier)
    type: String,
    default: ''
  },
  emailCommunicationHistory: [{  // Full history of email communications
    sentAt: {
      type: Date,
      required: true
    },
    recipient: {
      type: String,
      required: true
    },
    subject: {
      type: String,
      default: ''
    },
    sentBy: {
      type: String,
      default: ''
    },
    notes: {                  // Any notes about this communication
      type: String,
      default: ''
    }
  }],
  // Snooze functionality for trouble seed dashboard
  snoozedUntil: {             // Date until which this PO is snoozed
    type: Date,
    default: null,
    index: true
  },
  snoozedBy: {                // User who snoozed the PO
    type: String,
    default: ''
  },
  snoozeDuration: {           // Duration in days (1, 7, or 14)
    type: Number,
    default: null
  },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('PurchaseOrder', purchaseOrderSchema);