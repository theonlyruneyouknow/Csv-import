// models/PrePurchaseOrder.js
const mongoose = require('mongoose');

const prePurchaseOrderSchema = new mongoose.Schema({
    vendor: {
        type: String,
        required: true,
        trim: true,
        index: true
    },
    items: {
        type: String,
        default: '',
        trim: true
    },
    status: {
        type: String,
        default: 'Planning',
        index: true
    },
    priority: {
        type: String,
        enum: ['Low', 'Medium', 'High', 'Urgent'],
        default: 'Medium',
        index: true
    },
    receiveDate: {
        type: Date,
        default: null
    },
    notes: {
        type: String,
        default: ''
    },
    createdBy: {
        type: String,
        default: 'System'
    },
    convertedToPO: {
        type: Boolean,
        default: false,
        index: true
    },
    convertedPONumber: {
        type: String,
        default: null
    },
    convertedDate: {
        type: Date,
        default: null
    },
    createdAt: {
        type: Date,
        default: Date.now,
        index: true
    },
    updatedAt: {
        type: Date,
        default: Date.now
    }
});

// Compound indexes for efficient queries
prePurchaseOrderSchema.index({ vendor: 1, createdAt: -1 });
prePurchaseOrderSchema.index({ convertedToPO: 1, createdAt: -1 });
prePurchaseOrderSchema.index({ priority: 1, receiveDate: 1 });
prePurchaseOrderSchema.index({ status: 1, createdAt: -1 });

// Update the updatedAt field before saving
prePurchaseOrderSchema.pre('save', function() {
    this.updatedAt = new Date();
});

module.exports = mongoose.model('PrePurchaseOrder', prePurchaseOrderSchema);
