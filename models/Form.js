// models/Form.js
const mongoose = require('mongoose');

const formSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        trim: true,
        maxlength: 100
    },
    embedCode: {
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
        enum: ['management', 'operations', 'feedback', 'other'],
        default: 'management'
    },
    order: {
        type: Number,
        default: 0
    },
    isActive: {
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

// Index for ordering
formSchema.index({ category: 1, order: 1 });
formSchema.index({ isActive: 1 });

module.exports = mongoose.model('Form', formSchema);
