// models/SeedPartner.js - UNIFIED MODEL
const mongoose = require('mongoose');

// Unified Seed Partnership Schema - International & Domestic
const seedPartnerSchema = new mongoose.Schema({
    // Basic Partner Information
    companyName: {
        type: String,
        required: true,
        trim: true,
        unique: true
    },
    partnerCode: {
        type: String,
        required: true,
        trim: true,
        uppercase: true,
        unique: true
    },
    
    // Geographic Classification
    isDomestic: {
        type: Boolean,
        default: false,
        index: true
    },
    
    // Country and Region (Required for all)
    country: {
        type: String,
        required: true,
        default: 'United States'
    },
    region: {
        type: String,
        trim: true,
        required: true
        // Removed enum to allow custom regions like "Pacific Northwest", "New England", etc.
    },
    
    // US-Specific Fields (Optional - only for domestic partners)
    state: {
        type: String,
        enum: [
            '', // Allow empty for non-US partners
            'Alabama', 'Alaska', 'Arizona', 'Arkansas', 'California',
            'Colorado', 'Connecticut', 'Delaware', 'Florida', 'Georgia',
            'Hawaii', 'Idaho', 'Illinois', 'Indiana', 'Iowa',
            'Kansas', 'Kentucky', 'Louisiana', 'Maine', 'Maryland',
            'Massachusetts', 'Michigan', 'Minnesota', 'Mississippi', 'Missouri',
            'Montana', 'Nebraska', 'Nevada', 'New Hampshire', 'New Jersey',
            'New Mexico', 'New York', 'North Carolina', 'North Dakota', 'Ohio',
            'Oklahoma', 'Oregon', 'Pennsylvania', 'Rhode Island', 'South Carolina',
            'South Dakota', 'Tennessee', 'Texas', 'Utah', 'Vermont',
            'Virginia', 'Washington', 'West Virginia', 'Wisconsin', 'Wyoming'
        ]
    },
    stateCode: {
        type: String,
        uppercase: true,
        maxlength: 2,
        sparse: true // Allows null/undefined
    },
    city: {
        type: String,
        trim: true
    },
    
    // Partnership Type
    partnershipType: {
        type: String,
        enum: ['International Supplier', 'Domestic Supplier', 'International Client', 'Domestic Client', 'Both Supplier & Client'],
        required: true
    },
    
    // Partnership Status
    status: {
        type: String,
        enum: ['Prospective', 'Active', 'On Hold', 'Inactive', 'Terminated', 'Non-Alternative'],
        default: 'Prospective'
    },
    
    // Exclusion Groups (NEW - for filtering)
    // Dynamic array - accepts any custom string values
    exclusionGroups: [{
        type: String,
        trim: true
    }],
    
    // Priority Level
    priority: {
        type: Number,
        min: 1,
        max: 5,
        default: 3
    },
    
    isActive: {
        type: Boolean,
        default: true
    },
    
    // Seed Specializations
    // Dynamic array - accepts any custom string values
    seedTypes: [{
        type: String,
        trim: true
    }],
    
    // Detailed Seed Offerings - Crop Level
    seedOfferings: {
        vegetables: [{ type: String }],
        flowers: [{ type: String }],
        herbs: [{ type: String }]
    },
    
    // Certifications and Compliance
    certifications: [{
        certificationType: {
            type: String,
            enum: [
                'USDA Organic',
                'EU Organic',
                'GlobalGAP',
                'ISTA (International Seed Testing)',
                'Phytosanitary',
                'Non-GMO Project',
                'OMRI Listed',
                'ISO 9001',
                'State Seed License',
                'Safe Seed Pledge',
                'Other'
            ]
        },
        certificateNumber: String,
        issuingAuthority: String,
        issueDate: Date,
        expiryDate: Date,
        documentUrl: String,
        verified: {
            type: Boolean,
            default: false
        }
    }],
    
    // Contact Information
    primaryContact: {
        name: String,
        title: String,
        email: String,
        phone: String,
        mobile: String,
        whatsapp: String,
        preferredLanguage: {
            type: String,
            default: 'English'
        },
        preferredContactMethod: {
            type: String,
            enum: ['Email', 'Phone', 'Mobile', 'Text', 'WhatsApp'],
            default: 'Email'
        }
    },
    
    secondaryContact: {
        name: String,
        title: String,
        email: String,
        phone: String,
        mobile: String
    },
    
    // Multiple additional contacts
    additionalContacts: [{
        name: String,
        title: String,
        department: String,
        email: String,
        phone: String,
        mobile: String,
        role: {
            type: String,
            enum: ['Sales', 'Procurement', 'Customer Service', 'Quality Control', 'Logistics', 'Finance', 'Management', 'Technical', 'Technical Support', 'Other']
        }
    }],
    
    // Company Address
    address: {
        street: String,
        street2: String,
        city: String,
        state: String,
        postalCode: String,
        zipCode: String, // Alias for US partners
        county: String,
        country: String
    },
    
    // Shipping/Receiving Address (if different)
    shippingAddress: {
        street: String,
        street2: String,
        city: String,
        state: String,
        postalCode: String,
        zipCode: String,
        country: String,
        portOfEntry: String, // For international shipments
        customsBroker: String,
        specialInstructions: String
    },
    
    // Business Details
    businessDetails: {
        registrationNumber: String,
        taxId: String,
        yearEstablished: Number,
        numberOfEmployees: String,
        annualRevenue: String,
        businessType: {
            type: String,
            enum: ['Family-Owned', 'Corporation', 'LLC', 'Partnership', 'Sole Proprietorship', 'Cooperative', 'Other']
        },
        website: String,
        linkedIn: String,
        facebook: String,
        instagram: String,
        companyProfile: String
    },
    
    // Financial Terms
    financialTerms: {
        currency: {
            type: String,
            default: 'USD'
        },
        paymentTerms: {
            type: String,
            enum: ['NET 30', 'NET 60', 'NET 90', 'Prepayment', 'COD', 'Letter of Credit', 'Credit Card', 'Custom'],
            default: 'NET 30'
        },
        creditLimit: Number,
        preferredPaymentMethod: {
            type: String,
            enum: ['Wire Transfer', 'ACH', 'Check', 'Credit Card', 'PayPal', 'Letter of Credit', 'Other']
        },
        bankDetails: {
            bankName: String,
            accountNumber: String, // Should be encrypted in production
            routingNumber: String,
            swiftCode: String,
            iban: String
        }
    },
    
    // Import/Export Details (primarily for international)
    tradeDetails: {
        importLicenseNumber: String,
        exportLicenseNumber: String,
        customsBroker: String,
        preferredShippingMethod: {
            type: String,
            enum: ['Air Freight', 'Sea Freight', 'Ground', 'Express Courier', 'UPS', 'FedEx', 'USPS', 'DHL', 'Regional Carrier', 'Own Fleet', 'Other']
        },
        preferredCarrier: String,
        incoterms: {
            type: String,
            enum: ['EXW', 'FCA', 'CPT', 'CIP', 'DAP', 'DPU', 'DDP', 'FAS', 'FOB', 'CFR', 'CIF', 'Other'],
            default: 'FOB'
        },
        averageLeadTime: Number, // in days
        minimumOrderQuantity: String,
        maximumOrderQuantity: String,
        freeShippingThreshold: Number,
        bulkDiscountsAvailable: {
            type: Boolean,
            default: false
        }
    },
    
    // Quality and Compliance
    qualityMetrics: {
        germinationRate: Number, // Average percentage
        purityRate: Number, // Average percentage
        lastQualityAuditDate: Date,
        qualityRating: {
            type: Number,
            min: 1,
            max: 5
        },
        customerSatisfactionRating: {
            type: Number,
            min: 1,
            max: 5
        },
        hasRecalledProducts: {
            type: Boolean,
            default: false
        },
        recallHistory: [{
            date: Date,
            productName: String,
            reason: String,
            resolution: String
        }]
    },
    
    // Partnership History
    partnershipStartDate: Date,
    partnershipEndDate: Date,
    lastOrderDate: Date,
    totalOrdersPlaced: {
        type: Number,
        default: 0
    },
    totalOrderValue: {
        type: Number,
        default: 0
    },
    
    // Performance Tracking
    performanceMetrics: {
        onTimeDeliveryRate: Number, // Percentage
        qualityAcceptanceRate: Number, // Percentage
        responsivenesRating: {
            type: Number,
            min: 1,
            max: 5
        },
        overallRating: {
            type: Number,
            min: 1,
            max: 5
        }
    },
    
    // Documents and Attachments
    documents: [{
        documentType: {
            type: String,
            enum: [
                'Business License',
                'Certificate of Incorporation',
                'Tax Certificate',
                'Organic Certification',
                'Quality Certificate',
                'Product Catalog',
                'Price List',
                'Contract',
                'Insurance Certificate',
                'Import/Export License',
                'Phytosanitary Certificate',
                'Other'
            ]
        },
        fileName: String,
        filePath: String,
        uploadDate: {
            type: Date,
            default: Date.now
        },
        expiryDate: Date,
        notes: String
    }],
    
    // Information Sources & References (from US model)
    references: [{
        sourceType: {
            type: String,
            trim: true
        },
        sourceUrl: String,
        sourceDescription: String,
        dateCollected: {
            type: Date,
            default: Date.now
        },
        collectedBy: String,
        reliability: {
            type: String,
            enum: ['High', 'Medium', 'Low', 'Unknown'],
            default: 'Unknown'
        },
        notes: String
    }],
    
    // Verified Information Tracking (from US model)
    verifiedInformation: {
        companyNameVerified: {
            isVerified: { type: Boolean, default: false },
            verifiedDate: Date,
            verifiedBy: String,
            verificationMethod: String,
            notes: String
        },
        addressVerified: {
            isVerified: { type: Boolean, default: false },
            verifiedDate: Date,
            verifiedBy: String,
            verificationMethod: String,
            notes: String
        },
        contactInfoVerified: {
            isVerified: { type: Boolean, default: false },
            verifiedDate: Date,
            verifiedBy: String,
            verificationMethod: String,
            notes: String
        },
        websiteVerified: {
            isVerified: { type: Boolean, default: false },
            verifiedDate: Date,
            verifiedBy: String,
            verificationMethod: String,
            notes: String
        },
        businessLicenseVerified: {
            isVerified: { type: Boolean, default: false },
            verifiedDate: Date,
            verifiedBy: String,
            verificationMethod: String,
            licenseNumber: String,
            notes: String
        },
        seedOfferingsVerified: {
            isVerified: { type: Boolean, default: false },
            verifiedDate: Date,
            verifiedBy: String,
            verificationMethod: String,
            notes: String
        },
        lastFullVerification: Date,
        overallVerificationScore: {
            type: Number,
            min: 0,
            max: 100,
            default: 0
        }
    },
    
    // Notes and Communication Log
    notes: {
        type: String,
        default: ''
    },
    
    communicationLog: [{
        date: {
            type: Date,
            default: Date.now
        },
        type: {
            type: String,
            enum: ['Email', 'Phone Call', 'Meeting', 'WhatsApp', 'Video Call', 'In-Person', 'Trade Show', 'Other']
        },
        contactPerson: String,
        subject: String,
        summary: String,
        followUpRequired: {
            type: Boolean,
            default: false
        },
        followUpDate: Date,
        attachments: [String]
    }],
    
    // Tags for easy searching and grouping
    tags: [String],
    
    // Metadata
    createdBy: String,
    lastModifiedBy: String
}, {
    timestamps: true, // Adds createdAt and updatedAt
    collection: 'seedpartners' // Unified collection name
});

// Indexes for efficient queries
seedPartnerSchema.index({ companyName: 1 });
seedPartnerSchema.index({ partnerCode: 1 });
seedPartnerSchema.index({ country: 1 });
seedPartnerSchema.index({ isDomestic: 1 });
seedPartnerSchema.index({ state: 1 });
seedPartnerSchema.index({ partnershipType: 1 });
seedPartnerSchema.index({ status: 1 });
seedPartnerSchema.index({ isActive: 1 });
seedPartnerSchema.index({ priority: 1 });
seedPartnerSchema.index({ exclusionGroups: 1 });

// Virtual for full address
seedPartnerSchema.virtual('fullAddress').get(function() {
    const addr = this.address;
    if (!addr || !addr.street) return '';
    
    let parts = [addr.street];
    if (addr.street2) parts.push(addr.street2);
    if (addr.city) parts.push(addr.city);
    if (addr.state) parts.push(addr.state);
    if (addr.postalCode || addr.zipCode) parts.push(addr.postalCode || addr.zipCode);
    if (addr.country && addr.country !== 'United States') parts.push(addr.country);
    
    return parts.join(', ');
});

// Virtual to check if partner is domestic
seedPartnerSchema.virtual('isUSPartner').get(function() {
    return this.country === 'United States' || this.isDomestic === true;
});

// Method to calculate days since last order
seedPartnerSchema.methods.daysSinceLastOrder = function() {
    if (!this.lastOrderDate) return null;
    const now = new Date();
    const diffTime = Math.abs(now - this.lastOrderDate);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
};

// Method to check if certifications are expiring soon
seedPartnerSchema.methods.getExpiringCertifications = function() {
    const now = new Date();
    const thirtyDaysFromNow = new Date(now.getTime() + (30 * 24 * 60 * 60 * 1000));
    
    return this.certifications.filter(cert => {
        return cert.expiryDate && cert.expiryDate <= thirtyDaysFromNow;
    });
};

// Method to check if partner should be excluded based on groups
seedPartnerSchema.methods.shouldBeExcluded = function(selectedGroups) {
    if (!selectedGroups || selectedGroups.length === 0) return false;
    return this.exclusionGroups.some(group => selectedGroups.includes(group));
};

module.exports = mongoose.model('SeedPartner', seedPartnerSchema);
