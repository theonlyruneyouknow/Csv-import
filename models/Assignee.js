// models/Assignee.js
const mongoose = require('mongoose');

const assigneeSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        trim: true,
        maxlength: 100
    },
    initials: {
        type: String,
        required: true,
        trim: true,
        maxlength: 5,
        uppercase: true
    },
    email: {
        type: String,
        trim: true,
        lowercase: true
    },
    color: {
        type: String,
        default: '#3498db'
    },
    isActive: {
        type: Boolean,
        default: true
    },
    order: {
        type: Number,
        default: 0
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
});

// Create indexes
assigneeSchema.index({ order: 1 });
assigneeSchema.index({ isActive: 1 });

const Assignee = mongoose.model('Assignee', assigneeSchema);

module.exports = Assignee;
