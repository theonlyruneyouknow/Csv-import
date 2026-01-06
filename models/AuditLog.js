const mongoose = require('mongoose');

const auditLogSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    username: {
        type: String,
        required: true
    },
    action: {
        type: String,
        required: true,
        enum: [
            // Authentication actions
            'LOGIN',
            'LOGOUT',
            'LOGIN_FAILED',
            
            // System actions
            'PAGE_VIEW',
            'PASSWORD_CHANGED',
            'ACCOUNT_LOCKED',
            
            // User management actions
            'USER_CREATED',
            'USER_UPDATED',
            'USER_APPROVED',
            'USER_SUSPENDED',
            'USER_DELETED',
            'USER_INVITED',
            'INVITATION_ACCEPTED',
            'INVITATION_RESENT',
            'INVITATION_CANCELLED',
            'PERMISSIONS_CHANGED',
            'PASSWORD_RESET_REQUESTED',
            'PASSWORD_RESET_COMPLETED',
            
            // Purchase Order actions
            'PO_VIEWED',
            'PO_CREATED',
            'PO_UPDATED',
            'PO_DELETED',
            'PO_STATUS_CHANGED',
            
            // Line Item actions
            'LINE_ITEM_CREATED',
            'LINE_ITEM_UPDATED',
            'LINE_ITEM_DELETED',
            'LINE_ITEM_STATUS_CHANGED',
            'LINE_ITEM_RECEIVED',
            'LINE_ITEM_SKU_UPDATED',
            'LINE_ITEM_NOTES_UPDATED',
            'LINE_ITEM_TRACKING_UPDATED',
            
            // Notes actions
            'NOTE_CREATED',
            'NOTE_UPDATED',
            'NOTE_DELETED',
            
            // Dropship actions
            'DROPSHIP_UPLOAD',
            'DROPSHIP_PROCESSED',
            'DROPSHIP_DOWNLOADED',
            
            // Vendor actions
            'VENDOR_CREATED',
            'VENDOR_UPDATED',
            'VENDOR_DELETED',
            
            // System actions
            'DATA_EXPORT',
            'DATA_IMPORT',
            'SYSTEM_CONFIG_CHANGED'
        ]
    },
    entityType: {
        type: String,
        enum: ['User', 'PurchaseOrder', 'LineItem', 'Note', 'OrganicVendor', 'Task', 'System'],
        required: true
    },
    entityId: {
        type: mongoose.Schema.Types.Mixed, // Can be ObjectId or string
        required: false // Some actions don't have specific entities
    },
    details: {
        before: mongoose.Schema.Types.Mixed, // Previous state
        after: mongoose.Schema.Types.Mixed,  // New state
        changes: mongoose.Schema.Types.Mixed, // Specific changes made
        metadata: mongoose.Schema.Types.Mixed // Additional context
    },
    ipAddress: {
        type: String,
        required: true
    },
    userAgent: {
        type: String,
        required: true
    },
    sessionId: {
        type: String
    },
    success: {
        type: Boolean,
        default: true
    },
    errorMessage: {
        type: String
    },
    duration: {
        type: Number // For tracking how long actions take
    }
}, {
    timestamps: true
});

// Indexes for efficient querying
auditLogSchema.index({ userId: 1, createdAt: -1 });
auditLogSchema.index({ action: 1, createdAt: -1 });
auditLogSchema.index({ entityType: 1, entityId: 1, createdAt: -1 });
auditLogSchema.index({ createdAt: -1 });
auditLogSchema.index({ ipAddress: 1, createdAt: -1 });

// Static method to log an action
auditLogSchema.statics.logAction = async function(params) {
    const {
        userId,
        username,
        action,
        entityType,
        entityId,
        details = {},
        req,
        success = true,
        errorMessage,
        duration
    } = params;

    try {
        const logEntry = new this({
            userId,
            username,
            action,
            entityType,
            entityId,
            details,
            ipAddress: req?.ip || req?.connection?.remoteAddress || 'unknown',
            userAgent: req?.get('User-Agent') || 'unknown',
            sessionId: req?.sessionID,
            success,
            errorMessage,
            duration
        });

        await logEntry.save();
        return logEntry;
    } catch (error) {
        console.error('Failed to log audit entry:', error);
        // Don't throw error to avoid disrupting main application flow
    }
};

// Static method to get user activity
auditLogSchema.statics.getUserActivity = function(userId, limit = 50) {
    return this.find({ userId })
        .sort({ createdAt: -1 })
        .limit(limit)
        .populate('userId', 'username firstName lastName');
};

// Static method to get entity history
auditLogSchema.statics.getEntityHistory = function(entityType, entityId, limit = 50) {
    return this.find({ entityType, entityId })
        .sort({ createdAt: -1 })
        .limit(limit)
        .populate('userId', 'username firstName lastName');
};

// Static method to get recent activity
auditLogSchema.statics.getRecentActivity = function(limit = 100) {
    return this.find()
        .sort({ createdAt: -1 })
        .limit(limit)
        .populate('userId', 'username firstName lastName');
};

// Static method to get failed login attempts
auditLogSchema.statics.getFailedLogins = function(hours = 24) {
    const since = new Date(Date.now() - hours * 60 * 60 * 1000);
    return this.find({
        action: 'LOGIN_FAILED',
        createdAt: { $gte: since }
    }).sort({ createdAt: -1 });
};

module.exports = mongoose.model('AuditLog', auditLogSchema);
