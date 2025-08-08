// models/LineItemStatusOption.js
const mongoose = require('mongoose');

const lineItemStatusOptionSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        unique: true,
        trim: true
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

module.exports = mongoose.model('LineItemStatusOption', lineItemStatusOptionSchema);
