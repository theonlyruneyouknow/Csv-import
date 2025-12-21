const mongoose = require('mongoose');

const reportConfigSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        trim: true
    },
    reportType: {
        type: String,
        required: true,
        enum: ['unreceived-items', 'waiting-for-approval', 'dashboard', 'custom'],
        index: true
    },
    config: {
        columns: [{
            id: String,
            checked: Boolean
        }],
        types: [{
            value: String,
            checked: Boolean
        }],
        statuses: [{
            value: String,
            checked: Boolean
        }],
        urgencies: [{
            value: String,
            checked: Boolean
        }],
        // Additional filters can be added here
        customFilters: mongoose.Schema.Types.Mixed
    },
    isPublic: {
        type: Boolean,
        default: false,
        index: true
    },
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true
    },
    createdByUsername: {
        type: String,
        required: true
    },
    description: {
        type: String,
        trim: true
    },
    usageCount: {
        type: Number,
        default: 0
    },
    lastUsed: {
        type: Date
    }
}, {
    timestamps: true
});

// Index for efficient queries
reportConfigSchema.index({ reportType: 1, isPublic: 1 });
reportConfigSchema.index({ createdBy: 1, reportType: 1 });

// Method to check if user can access this config
reportConfigSchema.methods.canAccess = function(user) {
    if (!user) return false;
    
    // Admins can access everything
    if (user.role === 'admin') return true;
    
    // Public configs are accessible to all authenticated users
    if (this.isPublic) return true;
    
    // Creator can always access their own configs
    if (this.createdBy.toString() === user._id.toString()) return true;
    
    return false;
};

// Method to check if user can modify this config
reportConfigSchema.methods.canModify = function(user) {
    if (!user) return false;
    
    // Admins can modify everything
    if (user.role === 'admin') return true;
    
    // Creator can modify their own configs
    if (this.createdBy.toString() === user._id.toString()) return true;
    
    return false;
};

// Static method to get accessible configs for a user
reportConfigSchema.statics.getAccessibleConfigs = async function(user, reportType) {
    if (!user) return [];
    
    const query = { reportType };
    
    if (user.role === 'admin') {
        // Admins see everything
        return this.find(query).sort({ isPublic: -1, name: 1 });
    } else {
        // Regular users see public configs + their own
        query.$or = [
            { isPublic: true },
            { createdBy: user._id }
        ];
        return this.find(query).sort({ isPublic: -1, name: 1 });
    }
};

// Increment usage counter
reportConfigSchema.methods.recordUsage = async function() {
    this.usageCount += 1;
    this.lastUsed = new Date();
    await this.save();
};

module.exports = mongoose.model('ReportConfig', reportConfigSchema);
