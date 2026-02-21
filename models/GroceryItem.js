const mongoose = require('mongoose');

const groceryItemSchema = new mongoose.Schema({
    // Basic Information
    name: {
        type: String,
        required: true,
        trim: true
    },
    
    brand: {
        type: String,
        trim: true
    },
    
    // Category
    category: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'FoodCategory',
        required: true
    },
    
    // Product Details
    size: {
        value: Number,
        unit: {
            type: String,
            enum: ['oz', 'lb', 'g', 'kg', 'ml', 'l', 'gal', 'count', 'each']
        }
    },
    
    // Identifiers
    barcode: {
        type: String,
        trim: true
    },
    upc: {
        type: String,
        trim: true
    },
    sku: String,
    
    // Image
    image: String, // URL to product image
    
    // Description
    description: String,
    
    // Nutrition (optional, for future features)
    nutrition: {
        calories: Number,
        protein: Number,
        carbs: Number,
        fat: Number,
        servingSize: String
    },
    
    // Tags for searching
    tags: [String],
    
    // Purchase frequency tracking
    purchaseFrequency: {
        type: String,
        enum: ['weekly', 'biweekly', 'monthly', 'occasional', 'rare'],
        default: 'occasional'
    },
    
    // Priority for price tracking
    priority: {
        type: String,
        enum: ['high', 'medium', 'low'],
        default: 'medium'
    },
    
    // User Association
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    
    // Status
    isActive: {
        type: Boolean,
        default: true
    },
    
    // Notes
    notes: String,
    
    // Metadata
    createdAt: {
        type: Date,
        default: Date.now
    },
    updatedAt: {
        type: Date,
        default: Date.now
    }
});

// Update timestamp on save
groceryItemSchema.pre('save', function(next) {
    this.updatedAt = Date.now();
    next();
});

// Virtual for display name with size
groceryItemSchema.virtual('displayName').get(function() {
    let name = this.name;
    if (this.brand) name = `${this.brand} ${name}`;
    if (this.size && this.size.value) {
        name += ` (${this.size.value}${this.size.unit})`;
    }
    return name;
});

// Index for search
groceryItemSchema.index({ name: 'text', brand: 'text', tags: 'text' });
groceryItemSchema.index({ user: 1, category: 1, isActive: 1 });
groceryItemSchema.index({ barcode: 1 });

// Ensure virtuals are included in JSON
groceryItemSchema.set('toJSON', { virtuals: true });
groceryItemSchema.set('toObject', { virtuals: true });

module.exports = mongoose.model('GroceryItem', groceryItemSchema);
