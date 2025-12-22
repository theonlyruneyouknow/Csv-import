const mongoose = require('mongoose');

const autoReportSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        trim: true,
        unique: true
    },
    description: {
        type: String,
        trim: true
    },
    reportConfigId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'ReportConfig',
        required: true
    },
    cacheFileName: {
        type: String,
        required: true,
        unique: true
    },
    urlPath: {
        type: String,
        required: true,
        unique: true
    },
    isActive: {
        type: Boolean,
        default: true
    },
    generationFrequency: {
        type: String,
        default: 'hourly',
        enum: ['hourly', 'daily', 'custom']
    },
    cronExpression: {
        type: String,
        default: '0 * * * *' // Every hour at :00
    },
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    createdByUsername: {
        type: String,
        required: true
    },
    lastGenerated: {
        type: Date
    },
    lastError: {
        type: String
    }
}, {
    timestamps: true
});

// Validate URL path format
autoReportSchema.pre('save', function(next) {
    // Ensure urlPath starts with /purchase-orders/reports/
    if (!this.urlPath.startsWith('/purchase-orders/reports/')) {
        this.urlPath = '/purchase-orders/reports/' + this.urlPath.replace(/^\/+/, '');
    }
    
    // Generate cache filename from name if not provided
    if (!this.cacheFileName) {
        const slug = this.name.toLowerCase()
            .replace(/[^a-z0-9]+/g, '-')
            .replace(/^-+|-+$/g, '');
        this.cacheFileName = `${slug}-report.xlsx`;
    }
    
    next();
});

// Instance method to check if user can access this auto-report
autoReportSchema.methods.canAccess = function(user) {
    if (!user) return false;
    if (user.role === 'admin') return true;
    return this.createdBy.toString() === user._id.toString();
};

// Instance method to check if user can modify this auto-report
autoReportSchema.methods.canModify = function(user) {
    if (!user) return false;
    if (user.role === 'admin') return true;
    return this.createdBy.toString() === user._id.toString();
};

module.exports = mongoose.model('AutoReport', autoReportSchema);
