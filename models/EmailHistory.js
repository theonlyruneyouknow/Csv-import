// models/EmailHistory.js
const mongoose = require('mongoose');

const emailHistorySchema = new mongoose.Schema({
    messageId: {
        type: String,
        required: true,
        unique: true
    },
    sender: {
        email: { type: String, required: true },
        name: { type: String }
    },
    recipients: [{
        email: { type: String, required: true },
        name: { type: String },
        type: { type: String, enum: ['to', 'cc', 'bcc'], default: 'to' }
    }],
    subject: {
        type: String,
        required: true
    },
    content: {
        html: String,
        text: String
    },
    template: {
        name: String,
        variables: mongoose.Schema.Types.Mixed
    },
    attachments: [{
        filename: String,
        originalName: String,
        path: String,
        size: Number,
        mimetype: String
    }],
    priority: {
        type: String,
        enum: ['low', 'normal', 'high', 'urgent'],
        default: 'normal'
    },
    status: {
        type: String,
        enum: ['sent', 'failed', 'queued', 'delivered', 'bounced'],
        default: 'sent'
    },
    metadata: {
        sentBy: String, // Username who sent the email
        ipAddress: String,
        userAgent: String,
        relatedOrder: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'PurchaseOrder'
        },
        relatedVendor: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'OrganicVendor'
        },
        emailType: {
            type: String,
            enum: ['manual', 'automated', 'template', 'order_status', 'vendor_communication'],
            default: 'manual'
        }
    },
    timestamps: {
        created: { type: Date, default: Date.now },
        sent: Date,
        delivered: Date,
        opened: Date,
        lastClicked: Date
    },
    tracking: {
        opens: { type: Number, default: 0 },
        clicks: { type: Number, default: 0 },
        trackingEnabled: { type: Boolean, default: false },
        trackingPixelId: String
    },
    response: {
        accepted: [String],
        rejected: [String],
        messageId: String,
        response: String
    },
    tags: [String], // For categorization
    notes: String
}, {
    timestamps: true // Adds createdAt and updatedAt
});

// Indexes for better query performance
emailHistorySchema.index({ 'sender.email': 1, createdAt: -1 });
emailHistorySchema.index({ 'recipients.email': 1, createdAt: -1 });
emailHistorySchema.index({ 'metadata.sentBy': 1, createdAt: -1 });
emailHistorySchema.index({ 'metadata.relatedOrder': 1 });
emailHistorySchema.index({ 'metadata.relatedVendor': 1 });
emailHistorySchema.index({ 'metadata.emailType': 1, createdAt: -1 });
emailHistorySchema.index({ subject: 'text', 'content.text': 'text' }); // Text search

// Virtual for formatted sent date
emailHistorySchema.virtual('formattedSentDate').get(function() {
    if (this.timestamps.sent) {
        return new Date(this.timestamps.sent).toLocaleString();
    }
    return new Date(this.createdAt).toLocaleString();
});

// Method to check if email was recently sent (within last hour)
emailHistorySchema.methods.isRecent = function() {
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    return this.createdAt > oneHourAgo;
};

// Static method to get email statistics
emailHistorySchema.statics.getStats = async function(dateRange = 30) {
    const startDate = new Date(Date.now() - dateRange * 24 * 60 * 60 * 1000);
    
    return await this.aggregate([
        { $match: { createdAt: { $gte: startDate } } },
        {
            $group: {
                _id: null,
                totalEmails: { $sum: 1 },
                sentEmails: { $sum: { $cond: [{ $eq: ['$status', 'sent'] }, 1, 0] } },
                failedEmails: { $sum: { $cond: [{ $eq: ['$status', 'failed'] }, 1, 0] } },
                totalOpens: { $sum: '$tracking.opens' },
                totalClicks: { $sum: '$tracking.clicks' },
                avgEmailsPerDay: { $avg: 1 },
                templateUsage: {
                    $addToSet: '$template.name'
                }
            }
        }
    ]);
};

// Static method to search emails
emailHistorySchema.statics.searchEmails = function(query, options = {}) {
    const searchCriteria = {};
    
    if (query.text) {
        searchCriteria.$text = { $search: query.text };
    }
    
    if (query.sender) {
        searchCriteria['sender.email'] = new RegExp(query.sender, 'i');
    }
    
    if (query.recipient) {
        searchCriteria['recipients.email'] = new RegExp(query.recipient, 'i');
    }
    
    if (query.dateFrom || query.dateTo) {
        searchCriteria.createdAt = {};
        if (query.dateFrom) searchCriteria.createdAt.$gte = new Date(query.dateFrom);
        if (query.dateTo) searchCriteria.createdAt.$lte = new Date(query.dateTo);
    }
    
    if (query.status) {
        searchCriteria.status = query.status;
    }
    
    if (query.emailType) {
        searchCriteria['metadata.emailType'] = query.emailType;
    }
    
    return this.find(searchCriteria)
        .sort(options.sort || { createdAt: -1 })
        .limit(options.limit || 50)
        .skip(options.skip || 0)
        .populate('metadata.relatedOrder', 'orderNumber vendorName')
        .populate('metadata.relatedVendor', 'name email');
};

module.exports = mongoose.model('EmailHistory', emailHistorySchema);
