const mongoose = require('mongoose');

const hymnSchema = new mongoose.Schema({
    number: {
        type: Number,
        required: true,
        unique: true
    },
    title: {
        type: String,
        required: true
    },
    category: {
        type: String,
        required: true
    }
}, {
    timestamps: true
});

// Create text index for searching
hymnSchema.index({ title: 'text' });

module.exports = mongoose.model('Hymn', hymnSchema);
