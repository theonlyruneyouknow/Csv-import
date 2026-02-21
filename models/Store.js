const mongoose = require('mongoose');

const storeSchema = new mongoose.Schema({
    // Basic Information
    name: {
        type: String,
        required: true,
        trim: true
    },
    chain: {
        type: String,
        trim: true
        // e.g., "Walmart", "WinCo", "Albertsons", "Fred Meyer"
    },
    
    // Location
    location: {
        address: String,
        city: String,
        state: String,
        zipCode: String,
        coordinates: {
            latitude: Number,
            longitude: Number
        }
    },
    
    // Contact & Website
    contact: {
        phone: String,
        website: String
    },
    
    // Store Details
    storeNumber: String, // Store-specific identifier
    logo: String, // URL to logo image
    color: {
        type: String,
        default: '#007bff'
    },
    
    // Operating Hours
    hours: {
        monday: { open: String, close: String },
        tuesday: { open: String, close: String },
        wednesday: { open: String, close: String },
        thursday: { open: String, close: String },
        friday: { open: String, close: String },
        saturday: { open: String, close: String },
        sunday: { open: String, close: String }
    },
    
    // Features
    features: [{
        type: String,
        enum: ['curbside-pickup', 'delivery', 'self-checkout', 'pharmacy', 'deli', 'bakery', 'organic-section', '24-hours']
    }],
    
    // User Association
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    
    // Preferences
    isFavorite: {
        type: Boolean,
        default: false
    },
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
storeSchema.pre('save', function(next) {
    this.updatedAt = Date.now();
    next();
});

// Virtual for full address
storeSchema.virtual('fullAddress').get(function() {
    if (!this.location) return '';
    const parts = [];
    if (this.location.address) parts.push(this.location.address);
    if (this.location.city) parts.push(this.location.city);
    if (this.location.state) parts.push(this.location.state);
    if (this.location.zipCode) parts.push(this.location.zipCode);
    return parts.join(', ');
});

// Ensure virtuals are included in JSON
storeSchema.set('toJSON', { virtuals: true });
storeSchema.set('toObject', { virtuals: true });

module.exports = mongoose.model('Store', storeSchema);
