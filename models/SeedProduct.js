// models/SeedProduct.js
const mongoose = require('mongoose');

const seedProductSchema = new mongoose.Schema({
    // Basic Product Information
    productName: {
        type: String,
        required: true,
        trim: true
    },
    scientificName: {
        type: String,
        trim: true
    },
    
    // Category Classification
    category: {
        type: String,
        required: true,
        enum: ['Vegetable', 'Flower', 'Herb', 'Wildflower Mix'],
        index: true
    },
    subcategory: {
        type: String,
        trim: true,
        index: true
        // Examples: 'Beans - Bush', 'Beans - Pole', 'Sunflower', 'Basil', etc.
    },
    
    // Product Details
    description: {
        type: String,
        trim: true
    },
    variety: {
        type: String,
        trim: true
        // e.g., 'Heirloom', 'Hybrid', 'F1', 'Open Pollinated', 'Organic'
    },
    
    // Images
    images: [{
        url: String,
        caption: String,
        isPrimary: {
            type: Boolean,
            default: false
        },
        order: {
            type: Number,
            default: 0
        }
    }],
    primaryImage: {
        type: String,
        // Direct URL for quick access (duplicates from images array)
    },
    
    // Growing Information
    growingInfo: {
        daysToMaturity: Number,
        plantingDepth: String,
        spacing: String,
        sunRequirement: {
            type: String,
            enum: ['Full Sun', 'Partial Sun', 'Partial Shade', 'Full Shade', 'Varies']
        },
        waterRequirement: {
            type: String,
            enum: ['Low', 'Medium', 'High', 'Varies']
        },
        soilType: String,
        hardiness: String, // e.g., 'Annual', 'Perennial', 'Zones 3-9'
        height: String,
        spread: String
    },
    
    // Product Specifications
    specifications: {
        seedCount: String,
        weight: String,
        packageSize: String,
        organic: {
            type: Boolean,
            default: false
        },
        nongmo: {
            type: Boolean,
            default: false
        },
        certifications: [String]
    },
    
    // Pricing & Availability
    pricing: {
        retailPrice: Number,
        wholesalePrice: Number,
        bulkPrice: Number,
        currency: {
            type: String,
            default: 'USD'
        }
    },
    inStock: {
        type: Boolean,
        default: true
    },
    availability: {
        type: String,
        enum: ['In Stock', 'Limited', 'Out of Stock', 'Coming Soon', 'Seasonal'],
        default: 'In Stock'
    },
    seasonalAvailability: [String], // e.g., ['Spring', 'Fall']
    
    // Marketing & Display
    featured: {
        type: Boolean,
        default: false,
        index: true
    },
    newArrival: {
        type: Boolean,
        default: false
    },
    badge: String, // e.g., 'Bestseller', 'New', 'Organic', 'Rare'
    tags: [String], // for filtering/searching
    
    // SEO & URL
    slug: {
        type: String,
        unique: true,
        sparse: true,
        lowercase: true,
        trim: true
    },
    
    // Metadata
    sortOrder: {
        type: Number,
        default: 0
    },
    isActive: {
        type: Boolean,
        default: true,
        index: true
    },
    notes: String,
    
    // Timestamps
    createdAt: {
        type: Date,
        default: Date.now
    },
    updatedAt: {
        type: Date,
        default: Date.now
    },
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    updatedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    }
}, {
    timestamps: true
});

// Indexes for performance
seedProductSchema.index({ category: 1, subcategory: 1 });
seedProductSchema.index({ productName: 'text', scientificName: 'text', description: 'text' });
seedProductSchema.index({ featured: 1, isActive: 1 });
seedProductSchema.index({ tags: 1 });

// Pre-save middleware to generate slug
seedProductSchema.pre('save', function(next) {
    if (this.isModified('productName') && !this.slug) {
        this.slug = this.productName
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, '-')
            .replace(/^-+|-+$/g, '');
    }
    
    // Set primary image from images array
    if (this.images && this.images.length > 0) {
        const primaryImg = this.images.find(img => img.isPrimary);
        this.primaryImage = primaryImg ? primaryImg.url : this.images[0].url;
    }
    
    next();
});

// Virtual for display name with scientific name
seedProductSchema.virtual('fullName').get(function() {
    if (this.scientificName) {
        return `${this.productName} (${this.scientificName})`;
    }
    return this.productName;
});

// Virtual for URL path
seedProductSchema.virtual('urlPath').get(function() {
    const categoryPath = this.category.toLowerCase().replace(/ /g, '-');
    return `/${categoryPath}/${this.slug}`;
});

// Method to get display badge
seedProductSchema.methods.getDisplayBadge = function() {
    if (this.badge) return this.badge;
    if (this.newArrival) return 'New';
    if (this.specifications.organic) return 'Organic';
    if (this.featured) return 'Featured';
    return null;
};

// Static method to get products by category with filters
seedProductSchema.statics.getProductsByCategory = async function(category, filters = {}) {
    const query = { category, isActive: true };
    
    if (filters.subcategory) {
        query.subcategory = filters.subcategory;
    }
    if (filters.featured) {
        query.featured = true;
    }
    if (filters.organic) {
        query['specifications.organic'] = true;
    }
    if (filters.inStock !== undefined) {
        query.inStock = filters.inStock;
    }
    if (filters.tags) {
        query.tags = { $in: Array.isArray(filters.tags) ? filters.tags : [filters.tags] };
    }
    
    return this.find(query).sort({ sortOrder: 1, productName: 1 });
};

// Static method to get featured products
seedProductSchema.statics.getFeaturedProducts = async function(limit = 12) {
    return this.find({ featured: true, isActive: true })
        .sort({ sortOrder: 1, updatedAt: -1 })
        .limit(limit);
};

// Static method to search products
seedProductSchema.statics.searchProducts = async function(searchTerm, category = null) {
    const query = {
        $text: { $search: searchTerm },
        isActive: true
    };
    
    if (category) {
        query.category = category;
    }
    
    return this.find(query, { score: { $meta: 'textScore' } })
        .sort({ score: { $meta: 'textScore' } });
};

module.exports = mongoose.model('SeedProduct', seedProductSchema);
