const mongoose = require('mongoose');

const seedVendorSchema = new mongoose.Schema({
    vendorName: {
        type: String,
        required: true,
        unique: true,
        trim: true
    },
    baseUrl: {
        type: String,
        required: true,
        trim: true
    },
    seedCategoriesUrl: {
        type: String,
        trim: true,
        comment: 'Optional: direct link to seeds/catalog page'
    },
    discoveredCategories: [{
        name: String,
        url: String,
        lastScanned: Date,
        lastFullRefresh: Date,
        seedCount: { type: Number, default: 0 }
    }],
    lastIncrementalUpdate: {
        type: Date,
        comment: 'Last time we checked for new products only'
    },
    lastFullRefresh: {
        type: Date,
        comment: 'Last time we re-scanned everything for updates'
    },
    active: {
        type: Boolean,
        default: true
    },
    notes: String,
    lastScanned: Date,
    addedBy: String,
    updatedBy: String
}, {
    timestamps: true
});

// Index for searching
seedVendorSchema.index({ vendorName: 1 });
seedVendorSchema.index({ active: 1 });

module.exports = mongoose.model('SeedVendor', seedVendorSchema);
