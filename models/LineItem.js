// models/LineItem.js
const mongoose = require('mongoose');

const lineItemSchema = new mongoose.Schema({
    poId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'PurchaseOrder',
        required: true,
        index: true
    },
    poNumber: {
        type: String,
        required: true,
        index: true
    },
    date: {
        type: String, // Keep as string to match CSV format initially
        index: true
    },
    memo: {
        type: String,
        required: true
    },
    sku: {
        type: String,
        default: '',
        index: true
    },
    itemStatus: {
        type: String,
        default: '',
        index: true
    },
    received: {
        type: Boolean,
        default: false,
        index: true
    },
    receivedDate: {
        type: Date,
        default: null
    },
    eta: {
        type: Date,
        default: null,
        index: true
    },
    notes: {
        type: String,
        default: ''
    },
    createdAt: {
        type: Date,
        default: Date.now
    },
    updatedAt: {
        type: Date,
        default: Date.now
    }
});

// Compound index for efficient queries
lineItemSchema.index({ poNumber: 1, createdAt: -1 });
lineItemSchema.index({ poId: 1, createdAt: -1 });

module.exports = mongoose.model('LineItem', lineItemSchema);
