// models/Shipment.js
// Shipment tracking model for organizing tracking by vendor and purchase order

const mongoose = require('mongoose');

const shipmentSchema = new mongoose.Schema({
    // Core identification
    shipmentNumber: {
        type: String,
        required: true,
        unique: true,
        index: true
    },
    
    // Tracking information
    trackingNumber: {
        type: String,
        required: true,
        index: true
    },
    carrier: {
        type: String,
        required: true,
        index: true,
        enum: ['FedEx', 'UPS', 'USPS', 'DHL', 'OnTrac', 'Other']
    },
    trackingURL: {
        type: String,
        default: ''
    },
    
    // Relationship to PO and Vendor
    purchaseOrderId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'PurchaseOrder',
        required: true,
        index: true
    },
    poNumber: {
        type: String,
        required: true,
        index: true
    },
    vendorId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Vendor',
        index: true
    },
    vendorName: {
        type: String,
        required: true,
        index: true
    },
    
    // Line items in this shipment
    lineItems: [{
        lineItemId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'LineItem'
        },
        sku: String,
        description: String,
        quantity: Number,
        received: {
            type: Boolean,
            default: false
        }
    }],
    
    // Shipment details
    shipDate: {
        type: Date,
        index: true
    },
    estimatedDelivery: {
        type: Date,
        index: true
    },
    actualDelivery: {
        type: Date,
        index: true
    },
    
    // Current status
    status: {
        type: String,
        required: true,
        default: 'Label Created',
        index: true,
        enum: [
            'Label Created',
            'Picked Up',
            'In Transit',
            'Out for Delivery',
            'Delivered',
            'Exception',
            'Delayed',
            'Lost/Damaged',
            'Returned to Sender',
            'Unknown'
        ]
    },
    statusDescription: {
        type: String,
        default: ''
    },
    lastUpdate: {
        type: Date,
        default: Date.now,
        index: true
    },
    lastLocation: {
        type: String,
        default: ''
    },
    
    // Tracking history
    trackingHistory: [{
        timestamp: {
            type: Date,
            default: Date.now
        },
        status: String,
        location: String,
        description: String,
        updatedBy: String  // Username or 'System' or 'API'
    }],
    
    // Shipment metadata
    weight: {
        value: Number,
        unit: {
            type: String,
            enum: ['lbs', 'kg', 'oz', 'g']
        }
    },
    dimensions: {
        length: Number,
        width: Number,
        height: Number,
        unit: {
            type: String,
            enum: ['in', 'cm']
        }
    },
    packageCount: {
        type: Number,
        default: 1
    },
    
    // Costs
    shippingCost: {
        type: Number,
        default: 0
    },
    insurance: {
        type: Number,
        default: 0
    },
    
    // Additional information
    notes: {
        type: String,
        default: ''
    },
    internalNotes: {
        type: String,
        default: ''
    },
    
    // Alerts and issues
    hasIssues: {
        type: Boolean,
        default: false,
        index: true
    },
    issues: [{
        type: {
            type: String,
            enum: ['Delayed', 'Exception', 'Damaged', 'Lost', 'Other']
        },
        description: String,
        reportedDate: {
            type: Date,
            default: Date.now
        },
        resolved: {
            type: Boolean,
            default: false
        },
        resolution: String
    }],
    
    // Receiving information
    receivedBy: {
        type: String,
        default: ''
    },
    receivedDate: {
        type: Date
    },
    receivingNotes: {
        type: String,
        default: ''
    },
    signatureRequired: {
        type: Boolean,
        default: false
    },
    signedBy: {
        type: String,
        default: ''
    },
    
    // System fields
    createdBy: {
        type: String,
        required: true
    },
    updatedBy: {
        type: String,
        default: ''
    },
    
    // Tags for organization
    tags: [{
        type: String,
        index: true
    }],
    
    // Priority
    priority: {
        type: String,
        enum: ['Low', 'Normal', 'High', 'Urgent'],
        default: 'Normal',
        index: true
    }
}, {
    timestamps: true
});

// Indexes for efficient queries
shipmentSchema.index({ vendorName: 1, status: 1 });
shipmentSchema.index({ poNumber: 1, status: 1 });
shipmentSchema.index({ status: 1, estimatedDelivery: 1 });
shipmentSchema.index({ trackingNumber: 1, carrier: 1 });
shipmentSchema.index({ createdAt: -1 });

// Virtual for days in transit
shipmentSchema.virtual('daysInTransit').get(function() {
    if (!this.shipDate) return null;
    const endDate = this.actualDelivery || new Date();
    const diffTime = Math.abs(endDate - this.shipDate);
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
});

// Virtual for is overdue
shipmentSchema.virtual('isOverdue').get(function() {
    if (!this.estimatedDelivery || this.status === 'Delivered') return false;
    return new Date() > this.estimatedDelivery;
});

// Methods
shipmentSchema.methods.addTrackingEvent = function(status, location, description, updatedBy) {
    this.trackingHistory.push({
        timestamp: new Date(),
        status: status,
        location: location || '',
        description: description || '',
        updatedBy: updatedBy || 'System'
    });
    
    this.status = status;
    this.lastUpdate = new Date();
    if (location) this.lastLocation = location;
    if (description) this.statusDescription = description;
    
    // Auto-set delivered date
    if (status === 'Delivered' && !this.actualDelivery) {
        this.actualDelivery = new Date();
    }
};

shipmentSchema.methods.addIssue = function(type, description) {
    this.issues.push({
        type: type,
        description: description,
        reportedDate: new Date(),
        resolved: false
    });
    this.hasIssues = true;
};

shipmentSchema.methods.resolveIssue = function(issueId, resolution) {
    const issue = this.issues.id(issueId);
    if (issue) {
        issue.resolved = true;
        issue.resolution = resolution;
    }
    
    // Check if all issues are resolved
    this.hasIssues = this.issues.some(issue => !issue.resolved);
};

// Static methods for queries
shipmentSchema.statics.findByVendor = function(vendorName) {
    return this.find({ vendorName: vendorName }).sort({ createdAt: -1 });
};

shipmentSchema.statics.findByPO = function(poNumber) {
    return this.find({ poNumber: poNumber }).sort({ createdAt: -1 });
};

shipmentSchema.statics.findActive = function() {
    return this.find({ 
        status: { $nin: ['Delivered', 'Returned to Sender'] } 
    }).sort({ estimatedDelivery: 1 });
};

shipmentSchema.statics.findOverdue = function() {
    return this.find({
        status: { $nin: ['Delivered', 'Returned to Sender'] },
        estimatedDelivery: { $lt: new Date() }
    }).sort({ estimatedDelivery: 1 });
};

shipmentSchema.statics.findWithIssues = function() {
    return this.find({ hasIssues: true }).sort({ createdAt: -1 });
};

module.exports = mongoose.model('Shipment', shipmentSchema);
