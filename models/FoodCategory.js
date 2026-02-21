const mongoose = require('mongoose');

const foodCategorySchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        trim: true
    },
    
    // Icon/Emoji for visual identification
    icon: {
        type: String,
        default: '🛒'
    },
    
    // Parent category for subcategories
    parent: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'FoodCategory',
        default: null
    },
    
    // Description
    description: String,
    
    // Color for UI
    color: {
        type: String,
        default: '#6c757d'
    },
    
    // User Association (null for system-wide categories)
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        default: null
    },
    
    // Display order
    order: {
        type: Number,
        default: 0
    },
    
    // Active status
    isActive: {
        type: Boolean,
        default: true
    },
    
    createdAt: {
        type: Date,
        default: Date.now
    }
});

// Index for faster queries
foodCategorySchema.index({ user: 1, isActive: 1 });
foodCategorySchema.index({ parent: 1 });

module.exports = mongoose.model('FoodCategory', foodCategorySchema);
