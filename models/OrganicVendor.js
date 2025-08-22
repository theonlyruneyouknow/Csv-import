const mongoose = require('mongoose');

const organicVendorSchema = new mongoose.Schema({
    // Basic vendor information
    vendorName: {
        type: String,
        required: true,
        trim: true
    },
    internalId: {
        type: String,
        required: true,
        unique: true,
        trim: true
    },

    // Organic certification information
    lastOrganicCertificationDate: {
        type: Date,
        required: true
    },

    // Certificate and operations profile (stored as file paths or base64)
    certificate: {
        filename: String,
        data: String, // base64 encoded file data
        mimeType: String,
        uploadDate: Date,
        source: String // 'Upload' or 'USDA Organic Database'
    },

    operationsProfile: {
        filename: String,
        data: String, // base64 encoded file data
        mimeType: String,
        uploadDate: Date,
        source: String // 'Upload' or 'USDA Organic Database'
    },

    // USDA direct download links
    usdaDownloadLinks: {
        certificate: String,
        operationalProfile: String
    },

    // Organic products information
    organicSeeds: [{
        name: String,
        variety: String,
        certificationStatus: String,
        notes: String
    }],

    // Raw organic seeds data from USDA (manual paste)
    organicSeedsRawData: {
        type: String,
        trim: true
    },

    // Parsed organic products from USDA database
    organicProducts: [{
        number: String,
        category: String,
        description: String,
        certificateNumber: String,
        status: String,
        dateAdded: String,
        notes: String
    }],

    // TSC (Third-party Supply Chain) information
    tscItem: {
        type: String,
        trim: true
    },
    tscDescription: {
        type: String,
        trim: true
    },

    // Certified products from USDA database
    certifiedProducts: [{
        category: String,
        subcategory: String,
        product: String,
        description: String
    }],

    // Official Organic Database information
    organicDatabaseId: {
        type: String,
        trim: true
    },
    organicDatabaseUrl: {
        type: String,
        trim: true
    },
    manualUSDALink: {
        type: String,
        trim: true
    },

    // USDA integration tracking
    lastUSDASync: Date,
    certifier: String,
    anniversaryDate: Date,

    // Contact and additional information
    contactPerson: String,
    email: String,
    phone: String,
    address: {
        street: String,
        city: String,
        state: String,
        zipCode: String,
        country: String
    },

    // Status and notes
    status: {
        type: String,
        enum: ['Active', 'Inactive', 'Pending Review', 'Certification Expired'],
        default: 'Active'
    },
    notes: String,

    // Audit trail
    createdAt: {
        type: Date,
        default: Date.now
    },
    updatedAt: {
        type: Date,
        default: Date.now
    },
    lastReviewDate: Date,
    nextReviewDate: Date
});

// Virtual field for days since last organic certification
organicVendorSchema.virtual('daysSinceLastCertification').get(function () {
    if (!this.lastOrganicCertificationDate) return null;
    const now = new Date();
    const diffTime = Math.abs(now - this.lastOrganicCertificationDate);
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
});

// Virtual field for certification status based on date
organicVendorSchema.virtual('certificationStatus').get(function () {
    const days = this.daysSinceLastCertification;
    if (!days) return 'Unknown';
    if (days > 365) return 'Expired';
    if (days > 330) return 'Expiring Soon';
    return 'Current';
});

// Middleware to update updatedAt on save
organicVendorSchema.pre('save', function (next) {
    this.updatedAt = new Date();
    next();
});

// Ensure virtuals are included in JSON output
organicVendorSchema.set('toJSON', { virtuals: true });
organicVendorSchema.set('toObject', { virtuals: true });

// Add database indexes for performance
organicVendorSchema.index({ vendorName: 1 }); // For sorting by vendor name
organicVendorSchema.index({ status: 1 }); // For filtering by status
organicVendorSchema.index({ lastOrganicCertificationDate: -1 }); // For sorting by certification date
organicVendorSchema.index({ createdAt: -1 }); // For general sorting
organicVendorSchema.index({ status: 1, vendorName: 1 }); // Compound index for filtered sorting

module.exports = mongoose.model('OrganicVendor', organicVendorSchema);
