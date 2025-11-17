// models/PoTypeOption.js
const mongoose = require('mongoose');

const poTypeOptionSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        unique: true,
        trim: true
    },
    color: {
        type: String,
        default: '#6c757d' // Default gray color
    },
    emoji: {
        type: String,
        default: '📦' // Default box emoji
    },
    isDefault: {
        type: Boolean,
        default: false
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
});

module.exports = mongoose.model('PoTypeOption', poTypeOptionSchema);
