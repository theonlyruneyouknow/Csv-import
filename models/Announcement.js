const mongoose = require('mongoose');

const announcementSchema = new mongoose.Schema({
    title: {
        type: String,
        required: true,
        maxlength: 200,
        trim: true
    },
    content: {
        type: String,
        required: true,
        maxlength: 2000,
        trim: true
    },
    startDate: {
        type: Date,
        required: true,
        default: Date.now
    },
    endDate: {
        type: Date,
        required: true,
        validate: {
            validator: function(value) {
                return value > this.startDate;
            },
            message: 'End date must be after start date'
        }
    },
    isActive: {
        type: Boolean,
        default: true
    },
    priority: {
        type: Number,
        default: 0,
        min: 0,
        max: 10
    },
    category: {
        type: String,
        enum: ['general', 'worship', 'fellowship', 'service', 'youth', 'education', 'special'],
        default: 'general'
    },
    createdBy: {
        type: String,
        default: 'admin'
    },
    createdAt: {
        type: Date,
        default: Date.now
    },
    updatedAt: {
        type: Date,
        default: Date.now
    }
});

// Index for efficient querying
announcementSchema.index({ startDate: 1, endDate: 1, isActive: 1 });
announcementSchema.index({ category: 1 });
announcementSchema.index({ priority: -1 });

// Virtual to check if announcement is currently active based on dates
announcementSchema.virtual('isCurrentlyActive').get(function() {
    const now = new Date();
    return this.isActive && 
           this.startDate <= now && 
           this.endDate >= now;
});

// Virtual to get time remaining
announcementSchema.virtual('timeRemaining').get(function() {
    const now = new Date();
    const timeDiff = this.endDate - now;
    
    if (timeDiff <= 0) return 'Expired';
    
    const days = Math.floor(timeDiff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((timeDiff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    
    if (days > 0) {
        return `${days} day${days !== 1 ? 's' : ''} remaining`;
    } else if (hours > 0) {
        return `${hours} hour${hours !== 1 ? 's' : ''} remaining`;
    } else {
        return 'Less than 1 hour remaining';
    }
});

// Static method to get currently active announcements
announcementSchema.statics.getActiveAnnouncements = function(category = null) {
    const now = new Date();
    const query = {
        isActive: true,
        startDate: { $lte: now },
        endDate: { $gte: now }
    };
    
    if (category) {
        query.category = category;
    }
    
    return this.find(query).sort({ priority: -1, createdAt: -1 });
};

// Instance method to deactivate announcement
announcementSchema.methods.deactivate = function() {
    this.isActive = false;
    this.updatedAt = new Date();
    return this.save();
};

// Pre-save middleware to update updatedAt
announcementSchema.pre('save', function(next) {
    if (this.isModified() && !this.isNew) {
        this.updatedAt = new Date();
    }
    next();
});

// Static method to clean up expired announcements
announcementSchema.statics.cleanupExpired = function() {
    const now = new Date();
    const thirtyDaysAgo = new Date(now - (30 * 24 * 60 * 60 * 1000));
    
    // Deactivate expired announcements
    return this.updateMany(
        { 
            isActive: true,
            endDate: { $lt: now }
        },
        { 
            isActive: false,
            updatedAt: now
        }
    ).then(() => {
        // Optionally delete very old inactive announcements (30+ days past expiration)
        return this.deleteMany({
            isActive: false,
            endDate: { $lt: thirtyDaysAgo }
        });
    });
};

// Ensure virtual fields are serialized
announcementSchema.set('toJSON', { virtuals: true });
announcementSchema.set('toObject', { virtuals: true });

module.exports = mongoose.model('Announcement', announcementSchema);
