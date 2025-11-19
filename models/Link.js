// models/Link.js
const mongoose = require('mongoose');

const linkSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        trim: true,
        maxlength: 100
    },
    url: {
        type: String,
        required: true,
        trim: true
    },
    description: {
        type: String,
        default: '',
        maxlength: 500
    },
    category: {
        type: String,
        enum: ['management', 'operations', 'external', 'reference', 'other'],
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
    openInNewTab: {
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
    }
});

// Create compound index for sorting
linkSchema.index({ category: 1, order: 1 });
linkSchema.index({ isActive: 1 });

const Link = mongoose.model('Link', linkSchema);

module.exports = Link;
