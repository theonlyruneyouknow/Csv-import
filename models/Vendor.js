const mongoose = require('mongoose');

// General Vendor schema for all types of vendors (seeds, supplies, etc.)
const vendorSchema = new mongoose.Schema({
    // Basic vendor information
    vendorName: {
        type: String,
        required: true,
        trim: true,
        unique: true
    },
    vendorCode: {
        type: String,
        required: true,
        unique: true,
        trim: true,
        uppercase: true
    },
    
    // Vendor type and category
    vendorType: {
        type: String,
        enum: ['Seeds', 'Supplies', 'Equipment', 'Services', 'Organic Seeds', 'Fertilizers', 'Tools', 'Other'],
        required: true,
        default: 'Seeds'
    },
    
    // Contact Information
    contactInfo: {
        primaryContact: {
            name: String,
            title: String,
            email: String,
            phone: String,
            mobile: String
        },
        secondaryContact: {
            name: String,
            title: String,
            email: String,
            phone: String,
            mobile: String
        },
        customerService: {
            email: String,
            phone: String,
            hours: String // e.g., "Mon-Fri 8AM-5PM EST"
        },
        salesRep: {
            name: String,
            email: String,
            phone: String,
            territory: String
        }
    },

    // Company Address
    address: {
        street: String,
        street2: String,
        city: String,
        state: String,
        zipCode: String,
        country: {
            type: String,
            default: 'United States'
        }
    },

    // Shipping Address (if different)
    shippingAddress: {
        street: String,
        street2: String,
        city: String,
        state: String,
        zipCode: String,
        country: String,
        notes: String // Special shipping instructions
    },

    // Business Information
    businessInfo: {
        website: String,
        taxId: String,
        businessType: {
            type: String,
            enum: ['Corporation', 'LLC', 'Partnership', 'Sole Proprietorship', 'Non-Profit', 'Other']
        },
        yearsInBusiness: Number,
        employees: Number,
        annualRevenue: String // e.g., "$1M-$5M"
    },

    // Payment Terms and Financial Info
    paymentTerms: {
        terms: {
            type: String,
            enum: ['Net 15', 'Net 30', 'Net 45', 'Net 60', 'COD', 'Prepaid', 'Custom'],
            default: 'Net 30'
        },
        customTerms: String, // For custom payment terms
        creditLimit: Number,
        discount: String, // e.g., "2% 10 Net 30"
        preferredPaymentMethod: {
            type: String,
            enum: ['Check', 'ACH', 'Wire Transfer', 'Credit Card', 'PayPal', 'Other']
        },
        accountNumber: String // Our account number with this vendor
    },

    // Products/Items from this vendor
    items: [{
        itemCode: String,
        itemName: String,
        description: String,
        category: String, // Seeds, Tools, Fertilizer, etc.
        variety: String, // For seeds: variety name
        unitOfMeasure: String, // lbs, packets, each, etc.
        currentPrice: Number,
        priceEffectiveDate: Date,
        minimumOrder: Number,
        leadTime: String, // e.g., "2-3 weeks"
        availability: {
            type: String,
            enum: ['In Stock', 'Limited Stock', 'Out of Stock', 'Seasonal', 'Discontinued'],
            default: 'In Stock'
        },
        notes: String,
        lastOrderDate: Date,
        isActive: {
            type: Boolean,
            default: true
        }
    }],

    // Documents related to vendor
    documents: [{
        filename: String,
        originalName: String,
        mimeType: String,
        size: Number,
        uploadDate: {
            type: Date,
            default: Date.now
        },
        category: {
            type: String,
            enum: ['Contract', 'Catalog', 'Certificate', 'Insurance', 'W9', 'Invoice', 'Quote', 'Correspondence', 'Other'],
            default: 'Other'
        },
        description: String,
        uploadedBy: String,
        isActive: {
            type: Boolean,
            default: true
        },
        expirationDate: Date, // For certificates, contracts, etc.
        version: String,
        fileData: String // base64 encoded file data or file path
    }],

    // Shipping and Logistics
    shipping: {
        preferredCarrier: {
            type: String,
            enum: ['UPS', 'FedEx', 'USPS', 'DHL', 'Freight', 'Will Call', 'Other'],
            default: 'UPS'
        },
        shippingAccount: String, // Our account with carrier
        averageShippingCost: Number,
        averageDeliveryTime: String, // e.g., "3-5 business days"
        freeShippingThreshold: Number,
        specialInstructions: String,
        packageTypes: [String], // boxes, pallets, etc.
        hazmatCapable: {
            type: Boolean,
            default: false
        }
    },

    // Performance Metrics
    performance: {
        orderAccuracy: Number, // percentage
        onTimeDelivery: Number, // percentage
        qualityRating: Number, // 1-5 scale
        customerServiceRating: Number, // 1-5 scale
        overallRating: Number, // 1-5 scale
        totalOrders: {
            type: Number,
            default: 0
        },
        totalSpent: {
            type: Number,
            default: 0
        },
        averageOrderValue: Number,
        lastOrderDate: Date,
        firstOrderDate: Date
    },

    // Certifications and Compliance
    certifications: [{
        type: String, // Organic, GAP, ISO, etc.
        number: String,
        issuer: String,
        issueDate: Date,
        expirationDate: Date,
        status: {
            type: String,
            enum: ['Active', 'Expired', 'Pending Renewal', 'Suspended'],
            default: 'Active'
        },
        documentId: String, // Reference to document in documents array
        notes: String
    }],

    // Vendor Status and Preferences
    status: {
        type: String,
        enum: ['Active', 'Inactive', 'Pending Approval', 'On Hold', 'Discontinued'],
        default: 'Active'
    },
    
    // Preferences and Settings
    preferences: {
        preferredOrderMethod: {
            type: String,
            enum: ['Online', 'Email', 'Phone', 'Fax', 'EDI'],
            default: 'Email'
        },
        catalogReceived: {
            type: Boolean,
            default: false
        },
        priceListDate: Date,
        seasonalVendor: {
            type: Boolean,
            default: false
        },
        emergencyContact: {
            type: Boolean,
            default: false
        },
        autoOrderEnabled: {
            type: Boolean,
            default: false
        }
    },

    // Internal Notes and Communication Log
    notes: String,
    internalNotes: String, // Private notes not shared with vendor
    
    communicationLog: [{
        date: {
            type: Date,
            default: Date.now
        },
        type: {
            type: String,
            enum: ['Email', 'Phone', 'Meeting', 'Order', 'Issue', 'Other']
        },
        subject: String,
        notes: String,
        contactPerson: String, // Who we spoke with
        followUpRequired: {
            type: Boolean,
            default: false
        },
        followUpDate: Date,
        attachments: [String], // File references
        loggedBy: String // Who made this log entry
    }],

    // Audit trail
    createdAt: {
        type: Date,
        default: Date.now
    },
    updatedAt: {
        type: Date,
        default: Date.now
    },
    createdBy: String,
    lastUpdatedBy: String,
    lastReviewDate: Date,
    nextReviewDate: Date
});

// Virtual fields
vendorSchema.virtual('totalActiveItems').get(function () {
    return this.items ? this.items.filter(item => item.isActive).length : 0;
});

vendorSchema.virtual('totalActiveDocuments').get(function () {
    return this.documents ? this.documents.filter(doc => doc.isActive).length : 0;
});

vendorSchema.virtual('daysSinceLastOrder').get(function () {
    if (!this.performance.lastOrderDate) return null;
    const now = new Date();
    const diffTime = Math.abs(now - this.performance.lastOrderDate);
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
});

vendorSchema.virtual('expiringCertifications').get(function () {
    if (!this.certifications) return [];
    const thirtyDaysFromNow = new Date();
    thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);
    
    return this.certifications.filter(cert => 
        cert.expirationDate && 
        cert.expirationDate <= thirtyDaysFromNow && 
        cert.status === 'Active'
    );
});

// Middleware to update updatedAt on save
vendorSchema.pre('save', function (next) {
    this.updatedAt = new Date();
    next();
});

// Ensure virtuals are included in JSON output
vendorSchema.set('toJSON', { virtuals: true });
vendorSchema.set('toObject', { virtuals: true });

// Indexes for performance
vendorSchema.index({ vendorName: 1 });
vendorSchema.index({ vendorCode: 1 });
vendorSchema.index({ vendorType: 1 });
vendorSchema.index({ status: 1 });
vendorSchema.index({ 'performance.lastOrderDate': -1 });
vendorSchema.index({ createdAt: -1 });
vendorSchema.index({ status: 1, vendorType: 1 });
vendorSchema.index({ 'contactInfo.primaryContact.email': 1 });

module.exports = mongoose.model('Vendor', vendorSchema);
