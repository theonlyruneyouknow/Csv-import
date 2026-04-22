// models/USSeedPartner.js
const mongoose = require('mongoose');

// US Domestic Seed Partnership - State-by-State Partners
const usSeedPartnerSchema = new mongoose.Schema({
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

    // Partnership Type (US Domestic)
    partnershipType: {
        type: String,
        enum: ['Domestic Supplier', 'Domestic Client', 'Both Supplier & Client'],
        required: true,
        default: 'Domestic Supplier'
    },

    // Partnership Status
    status: {
        type: String,
        enum: ['Prospective', 'Active', 'On Hold', 'Inactive', 'Terminated'],
        default: 'Prospective'
    },

    // US State (Required - One partner per state)
    state: {
        type: String,
        required: true,
        enum: [
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

    // State Abbreviation
    stateCode: {
        type: String,
        required: true,
        uppercase: true,
        maxlength: 2
    },

    // City (Primary location)
    city: {
        type: String,
        trim: true
    },

    // Region (US Regions)
    region: {
        type: String,
        enum: ['Northeast', 'Southeast', 'Midwest', 'Southwest', 'West', 'Pacific', 'Mountain'],
        required: true
    },

    // Seed Specializations
    seedTypes: [{
        type: String,
        enum: [
            'Vegetable Seeds',
            'Flower Seeds',
            'Herb Seeds',
            'Grain Seeds',
            'Cover Crop Seeds',
            'Organic Seeds',
            'Hybrid Seeds',
            'Heirloom Seeds',
            'Native Seeds',
            'Wildflower Seeds',
            'Lawn & Turf Seeds',
            'Regional Specialty Seeds',
            'Other'
        ]
    }],

    // Detailed Seed Offerings - Crop Level
    seedOfferings: {
        vegetables: [{
            type: String,
            // Common vegetable crops
        }],
        flowers: [{
            type: String,
            // Common flower types
        }],
        herbs: [{
            type: String,
            // Common herb types
        }]
    },

    // Certifications and Compliance
    certifications: [{
        certificationType: {
            type: String,
            enum: [
                'USDA Organic',
                'Non-GMO Project',
                'OMRI Listed',
                'ISTA (International Seed Testing)',
                'State Seed License',
                'GlobalGAP',
                'ISO 9001',
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
        preferredContactMethod: {
            type: String,
            enum: ['Email', 'Phone', 'Mobile', 'Text'],
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
            enum: ['Sales', 'Customer Service', 'Quality Control', 'Logistics', 'Management', 'Technical Support', 'Other']
        }
    }],

    // Company Address
    address: {
        street: String,
        street2: String,
        city: String,
        state: String,
        zipCode: String,
        county: String
    },

    // Shipping/Receiving Address (if different)
    shippingAddress: {
        street: String,
        street2: String,
        city: String,
        state: String,
        zipCode: String,
        specialInstructions: String
    },

    // Business Details
    businessDetails: {
        registrationNumber: String,
        taxId: String,
        yearEstablished: Number,
        numberOfEmployees: String,
        businessType: {
            type: String,
            enum: ['Family-Owned', 'Corporation', 'LLC', 'Partnership', 'Sole Proprietorship', 'Cooperative', 'Other']
        },
        website: String,
        facebook: String,
        instagram: String,
        companyProfile: String // Detailed description
    },

    // Financial Terms
    financialTerms: {
        currency: {
            type: String,
            default: 'USD'
        },
        paymentTerms: {
            type: String,
            enum: ['NET 30', 'NET 60', 'NET 90', 'Prepayment', 'COD', 'Credit Card', 'Custom'],
            default: 'NET 30'
        },
        creditLimit: Number,
        preferredPaymentMethod: {
            type: String,
            enum: ['ACH', 'Wire Transfer', 'Check', 'Credit Card', 'PayPal', 'Other']
        },
        bankDetails: {
            bankName: String,
            accountNumber: String, // Should be encrypted in production
            routingNumber: String
        }
    },

    // Shipping Details
    shippingDetails: {
        preferredCarrier: {
            type: String,
            enum: ['UPS', 'FedEx', 'USPS', 'DHL', 'Regional Carrier', 'Own Fleet', 'Other']
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
        }
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
                'State Seed License',
                'Certificate of Incorporation',
                'Tax Certificate',
                'Organic Certification',
                'Quality Certificate',
                'Product Catalog',
                'Price List',
                'Contract',
                'Insurance Certificate',
                'Safe Seed Pledge',
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

    // Information Sources & References
    references: [{
        sourceType: {
            type: String,
            enum: [
                'Company Website',
                'USDA Database',
                'State Agriculture Department',
                'Industry Directory',
                'Direct Contact',
                'Trade Show',
                'Referral',
                'Online Research',
                'LinkedIn',
                'Better Business Bureau',
                'Customer Review',
                'Industry Publication',
                'Other'
            ]
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

    // Verified Information Tracking
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
        contactPerson: String,
        method: {
            type: String,
            enum: ['Email', 'Phone', 'Video Call', 'In Person', 'Text Message', 'Other']
        },
        subject: String,
        summary: String,
        followUpRequired: {
            type: Boolean,
            default: false
        },
        followUpDate: Date,
        loggedBy: String
    }],

    // Internal Notes (Private)
    internalNotes: {
        type: String,
        default: ''
    },

    // Tags for easy filtering
    tags: [String],

    // Priority Level
    priority: {
        type: Number,
        min: 1,
        max: 5,
        default: 3
    },

    // Personal Notes
    personalNotes: {
        type: String,
        trim: true
    },

    // Assigned Team Member
    assignedTo: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },

    // Active/Inactive Status
    isActive: {
        type: Boolean,
        default: true
    },

    // Metadata
    createdBy: String,
    createdAt: {
        type: Date,
        default: Date.now
    },
    updatedAt: {
        type: Date,
        default: Date.now
    },
    lastUpdatedBy: String
}, {
    timestamps: true
});

// Indexes for efficient queries
usSeedPartnerSchema.index({ companyName: 1 });
usSeedPartnerSchema.index({ partnerCode: 1 });
usSeedPartnerSchema.index({ state: 1 });
usSeedPartnerSchema.index({ stateCode: 1 });
usSeedPartnerSchema.index({ region: 1 });
usSeedPartnerSchema.index({ partnershipType: 1 });
usSeedPartnerSchema.index({ status: 1 });
usSeedPartnerSchema.index({ isActive: 1 });
usSeedPartnerSchema.index({ priority: 1 });

// Virtual for full address
usSeedPartnerSchema.virtual('fullAddress').get(function () {
    const addr = this.address;
    if (!addr || !addr.street) return '';

    let parts = [addr.street];
    if (addr.street2) parts.push(addr.street2);
    if (addr.city) parts.push(addr.city);
    if (addr.state) parts.push(addr.state);
    if (addr.zipCode) parts.push(addr.zipCode);

    return parts.join(', ');
});

// Virtual for display name with state
usSeedPartnerSchema.virtual('displayName').get(function () {
    return `${this.companyName} (${this.stateCode})`;
});

module.exports = mongoose.model('USSeedPartner', usSeedPartnerSchema);
