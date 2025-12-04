const mongoose = require('mongoose');

const dropshipmentSchema = new mongoose.Schema({
    poNumber: {
        type: String,
        required: true,
        index: true
    },
    poId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'PurchaseOrder'
    },
    vendor: {
        type: String,
        required: true,
        index: true
    },
    customerName: {
        type: String,
        required: true
    },
    customerEmail: {
        type: String
    },
    customerPhone: {
        type: String
    },
    shippingAddress: {
        street: String,
        city: String,
        state: String,
        zip: String,
        country: { type: String, default: 'USA' }
    },
    orderDate: {
        type: Date,
        default: Date.now
    },
    items: [{
        sku: String,
        description: String,
        quantity: Number,
        price: Number
    }],
    trackingNumber: {
        type: String,
        index: true
    },
    carrier: {
        type: String,
        enum: ['USPS', 'FedEx', 'UPS', 'DHL', 'Other'],
        default: 'USPS'
    },
    trackingUrl: {
        type: String
    },
    shippingStatus: {
        type: String,
        enum: ['Pending', 'Awaiting Tracking', 'Shipped', 'In Transit', 'Out for Delivery', 'Delivered', 'Exception', 'Cancelled'],
        default: 'Awaiting Tracking',
        index: true
    },
    estimatedDelivery: {
        type: Date
    },
    actualDelivery: {
        type: Date
    },
    lastTrackingUpdate: {
        type: Date
    },
    trackingHistory: [{
        status: String,
        location: String,
        timestamp: Date,
        description: String,
        checkedAt: { type: Date, default: Date.now }
    }],
    notes: {
        type: String
    },
    internalNotes: {
        type: String
    },
    createdBy: {
        type: String
    },
    updatedBy: {
        type: String
    },
    aiLastChecked: {
        type: Date
    },
    aiCheckStatus: {
        type: String
    }
}, {
    timestamps: true
});

// Index for efficient queries
dropshipmentSchema.index({ poNumber: 1, vendor: 1 });
dropshipmentSchema.index({ trackingNumber: 1 });
dropshipmentSchema.index({ shippingStatus: 1, orderDate: -1 });
dropshipmentSchema.index({ carrier: 1, shippingStatus: 1 });

// Virtual for tracking URL generation
dropshipmentSchema.virtual('autoTrackingUrl').get(function () {
    if (!this.trackingNumber) return null;

    const trackingUrls = {
        'USPS': `https://tools.usps.com/go/TrackConfirmAction?tLabels=${this.trackingNumber}`,
        'FedEx': `https://www.fedex.com/fedextrack/?trknbr=${this.trackingNumber}`,
        'UPS': `https://www.ups.com/track?loc=en_US&tracknum=${this.trackingNumber}`,
        'DHL': `https://www.dhl.com/en/express/tracking.html?AWB=${this.trackingNumber}`,
        'Other': this.trackingUrl || null
    };

    return this.trackingUrl || trackingUrls[this.carrier] || null;
});

// Method to update tracking status
dropshipmentSchema.methods.updateTrackingStatus = function (status, location, description) {
    this.trackingHistory.push({
        status,
        location,
        description,
        timestamp: new Date(),
        checkedAt: new Date()
    });

    this.shippingStatus = status;
    this.lastTrackingUpdate = new Date();

    if (status === 'Delivered' && !this.actualDelivery) {
        this.actualDelivery = new Date();
    }

    return this.save();
};

module.exports = mongoose.model('Dropshipment', dropshipmentSchema);
