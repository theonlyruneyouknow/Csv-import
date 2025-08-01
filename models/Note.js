// models/Note.js
const mongoose = require('mongoose');

const noteSchema = new mongoose.Schema({
    poId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'PurchaseOrder',
        required: true
    },
    poNumber: {
        type: String,
        required: true,
        index: true  // For fast filtering by PO number
    },
    vendor: {
        type: String,
        required: true,
        index: true  // For fast filtering by vendor
    },
    content: {
        type: String,
        required: true
    },
    createdAt: {
        type: Date,
        default: Date.now,
        index: true  // For date-based filtering and sorting
    },
    // Optional: Add user tracking if you implement authentication later
    // createdBy: {
    //   type: String,
    //   default: 'Anonymous'
    // }
});

// Compound index for common queries
noteSchema.index({ poNumber: 1, createdAt: -1 });
noteSchema.index({ vendor: 1, createdAt: -1 });

module.exports = mongoose.model('Note', noteSchema);
