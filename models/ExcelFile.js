// models/ExcelFile.js
const mongoose = require('mongoose');

const excelFileSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        trim: true,
        maxlength: 100
    },
    sharePointUrl: {
        type: String,
        required: true,
        trim: true
    },
    embedUrl: {
        type: String,
        trim: true
    },
    description: {
        type: String,
        default: '',
        maxlength: 500
    },
    category: {
        type: String,
        enum: ['inventory', 'financial', 'operations', 'reports', 'other'],
        default: 'other'
    },
    order: {
        type: Number,
        default: 0
    },
    isActive: {
        type: Boolean,
        default: true
    },
    allowDirectAccess: {
        type: Boolean,
        default: true
    },
    createdAt: {
        type: Date,
        default: Date.now
    },
    createdBy: {
        type: String,
        default: 'admin'
    },
    lastAccessed: {
        type: Date
    }
});

// Index for ordering
excelFileSchema.index({ category: 1, order: 1 });
excelFileSchema.index({ isActive: 1 });

module.exports = mongoose.model('ExcelFile', excelFileSchema);
