// models/SeedPartner.js
const mongoose = require('mongoose');

// Global Seed Partnership - Partner Company Schema
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
    
    // Country and Region
    country: {
        type: String,
        required: true,
        default: 'United States'
    },
    region: {
        type: String,
        enum: ['North America', 'South America', 'Europe', 'Asia', 'Africa', 'Australia/Oceania', 'Middle East'],
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
            'GMO Seeds',
            'Native Seeds',
            'Wildflower Seeds',
            'Lawn & Turf Seeds',
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
                'EU Organic',
                'GlobalGAP',
                'ISTA (International Seed Testing)',
                'Phytosanitary',
                'Non-GMO Project',
                'OMRI Listed',
                'ISO 9001',
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
            enum: ['Sales', 'Procurement', 'Quality Control', 'Logistics', 'Finance', 'Management', 'Technical', 'Other']
        }
    }],
    
    // Company Address
    address: {
        street: String,
        street2: String,
        city: String,
        state: String,
        postalCode: String,
        country: String
    },
    
    // Shipping/Receiving Address (if different)
    shippingAddress: {
        street: String,
        street2: String,
        city: String,
        state: String,
        postalCode: String,
        country: String,
        portOfEntry: String, // For international shipments
        customsBroker: String
    },
    
    // Business Details
    businessDetails: {
        registrationNumber: String,
        taxId: String,
        yearEstablished: Number,
        numberOfEmployees: String,
        annualRevenue: String,
        website: String,
        linkedIn: String,
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
            enum: ['NET 30', 'NET 60', 'NET 90', 'Prepayment', 'COD', 'Letter of Credit', 'Custom'],
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
    
    // Import/Export Details
    tradeDetails: {
        importLicenseNumber: String,
        exportLicenseNumber: String,
        customsBroker: String,
        preferredShippingMethod: {
            type: String,
            enum: ['Air Freight', 'Sea Freight', 'Ground', 'Express Courier', 'Other']
        },
        incoterms: {
            type: String,
            enum: ['EXW', 'FCA', 'CPT', 'CIP', 'DAP', 'DPU', 'DDP', 'FAS', 'FOB', 'CFR', 'CIF', 'Other'],
            default: 'FOB'
        },
        averageLeadTime: Number, // in days
        minimumOrderQuantity: String,
        maximumOrderQuantity: String
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
            enum: ['Email', 'Phone', 'Video Call', 'In Person', 'WhatsApp', 'Other']
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
seedPartnerSchema.index({ companyName: 1 });
seedPartnerSchema.index({ partnerCode: 1 });
seedPartnerSchema.index({ country: 1 });
seedPartnerSchema.index({ partnershipType: 1 });
seedPartnerSchema.index({ status: 1 });
seedPartnerSchema.index({ isActive: 1 });
seedPartnerSchema.index({ priority: 1 });

// Virtual for full address
seedPartnerSchema.virtual('fullAddress').get(function() {
    const addr = this.address;
    if (!addr || !addr.street) return '';
    
    let parts = [addr.street];
    if (addr.street2) parts.push(addr.street2);
    if (addr.city) parts.push(addr.city);
    if (addr.state) parts.push(addr.state);
    if (addr.postalCode) parts.push(addr.postalCode);
    if (addr.country && addr.country !== 'United States') parts.push(addr.country);
    
    return parts.join(', ');
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

module.exports = mongoose.model('SeedPartner', seedPartnerSchema);
