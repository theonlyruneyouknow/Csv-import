// models/StagedPartner.js - Staging area for partner approval workflow
const mongoose = require('mongoose');

const stagedPartnerSchema = new mongoose.Schema({
    // All the same fields as SeedPartner, but in staging
    companyName: {
        type: String,
        required: true,
        trim: true
    },
    partnerCode: {
        type: String,
        trim: true,
        uppercase: true
    },
    
    // Geographic Classification
    isDomestic: {
        type: Boolean,
        default: false
    },
    country: {
        type: String,
        required: true
    },
    region: String,
    state: String,
    stateCode: String,
    city: String,
    
    // Partnership details
    partnershipType: {
        type: String,
        enum: ['International Supplier', 'Domestic Supplier', 'International Client', 'Domestic Client', 'Both Supplier & Client']
    },
    status: {
        type: String,
        enum: ['Prospective', 'Active', 'On Hold', 'Inactive', 'Terminated', 'Non-Alternative'],
        default: 'Prospective'
    },
    
    // Seed information
    seedTypes: [String],
    
    // Business details
    businessDetails: {
        website: String,
        yearEstablished: Number,
        numberOfEmployees: String,
        companyProfile: String
    },
    
    // Contact information
    primaryContact: {
        name: String,
        title: String,
        email: String,
        phone: String
    },
    
    // STAGING-SPECIFIC FIELDS
    reviewStatus: {
        type: String,
        enum: ['pending', 'approved', 'rejected', 'needs_info'],
        default: 'pending',
        index: true
    },
    
    submittedBy: {
        type: String,
        default: 'System Research'
    },
    
    submittedAt: {
        type: Date,
        default: Date.now
    },
    
    reviewedBy: String,
    reviewedAt: Date,
    
    reviewNotes: String,
    
    sourceVerification: {
        websiteVerified: Boolean,
        verifiedAt: Date,
        verificationMethod: String,
        verificationNotes: String
    },
    
    researchNotes: {
        type: String,
        default: ''
    }
}, {
    timestamps: true
});

// Index for quick filtering
stagedPartnerSchema.index({ reviewStatus: 1, submittedAt: -1 });

module.exports = mongoose.model('StagedPartner', stagedPartnerSchema, 'stagedpartners');
