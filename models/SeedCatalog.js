const mongoose = require('mongoose');

const seedCatalogSchema = new mongoose.Schema({
    // Vendor Information
    vendor: {
        type: String,
        required: true,
        index: true
    },
    vendorId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Vendor'
    },
    
    // Product Identification
    sku: {
        type: String,
        index: true
    },
    varietyName: {
        type: String,
        required: true,
        index: true
    },
    commonName: {
        type: String,
        index: true
    },
    botanicalName: String,
    
    // Classification
    category: {
        type: String,
        enum: ['Vegetable', 'Flower', 'Herb', 'Fruit', 'Other'],
        index: true
    },
    subcategory: String, // e.g., 'Tomato', 'Lettuce', 'Rose', etc.
    
    // Seed Details
    seedType: {
        type: String,
        enum: ['Open Pollinated', 'Hybrid', 'Heirloom', 'Organic', 'GMO', 'Treated', 'Unknown']
    },
    organic: {
        type: Boolean,
        default: false
    },
    
    // Packet/Package Information
    packets: [{
        size: String,              // e.g., "100 seeds", "1 oz", "1000 seeds"
        unit: String,              // 'seeds', 'oz', 'lb', 'g', 'kg'
        quantity: Number,          // numerical value
        price: Number,             // price for this packet size
        currency: {
            type: String,
            default: 'USD'
        },
        availability: {
            type: String,
            enum: ['In Stock', 'Out of Stock', 'Seasonal', 'Unknown'],
            default: 'Unknown'
        }
    }],
    
    // Growing Information
    daysToMaturity: Number,
    plantingDepth: String,
    spacing: String,
    sunRequirement: String,
    waterRequirement: String,
    hardiness: String,
    season: [String],             // ['Spring', 'Summer', 'Fall', 'Winter']
    
    // Product Details
    description: String,
    features: [String],           // special characteristics
    resistances: [String],        // disease/pest resistances
    
    // Source & References
    sourceUrl: String,            // URL where info was found
    catalogYear: Number,
    lastVerified: Date,
    aiExtracted: {
        type: Boolean,
        default: false
    },
    extractionNotes: String,
    
    // Images
    imageUrls: [String],
    
    // Status
    active: {
        type: Boolean,
        default: true
    },
    discontinued: {
        type: Boolean,
        default: false
    },
    
    // Metadata
    addedBy: String,
    updatedBy: String,
    notes: String,
    tags: [String]
}, {
    timestamps: true
});

// Indexes for efficient searching
seedCatalogSchema.index({ vendor: 1, varietyName: 1 });
seedCatalogSchema.index({ category: 1, subcategory: 1 });
seedCatalogSchema.index({ sku: 1, vendor: 1 }, { unique: true, sparse: true });
seedCatalogSchema.index({ commonName: 'text', varietyName: 'text', description: 'text' });

module.exports = mongoose.model('SeedCatalog', seedCatalogSchema);
