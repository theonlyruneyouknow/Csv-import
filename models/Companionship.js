const mongoose = require('mongoose');

const companionshipSchema = new mongoose.Schema({
    // Missionaries in this companionship
    missionaries: [{
        missionary: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Missionary',
            required: true
        },
        role: {
            type: String,
            enum: ['senior', 'junior', 'district-leader', 'zone-leader', 'trainer', 'trainee'],
            default: 'junior'
        }
    }],
    
    // Area Information
    area: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'MissionArea',
        required: true
    },
    
    // Time Period
    startDate: {
        type: Date,
        required: true
    },
    endDate: {
        type: Date
    },
    duration: {
        type: Number, // in weeks
        min: 0
    },
    
    // Leadership Roles
    isDistrictLeadership: {
        type: Boolean,
        default: false
    },
    isZoneLeadership: {
        type: Boolean,
        default: false
    },
    isTraining: {
        type: Boolean,
        default: false
    },
    
    // Memories & Notes
    notes: {
        type: String,
        maxlength: 2000
    },
    highlights: [{
        description: String,
        date: Date
    }],
    
    // Photos from this companionship
    photos: [{
        url: String,
        description: String,
        date: Date,
        uploadedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User'
        }
    }],
    
    // Data Quality
    verified: {
        type: Boolean,
        default: false
    },
    verifiedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    verifiedDate: Date,
    
    // System fields
    addedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    lastEditedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    }
}, {
    timestamps: true
});

// Pre-save middleware to calculate duration
companionshipSchema.pre('save', function(next) {
    if (this.startDate && this.endDate) {
        const diffTime = Math.abs(this.endDate - this.startDate);
        this.duration = Math.ceil(diffTime / (1000 * 60 * 60 * 24 * 7)); // weeks
    }
    next();
});

// Method to add a missionary to the companionship
companionshipSchema.methods.addMissionary = function(missionaryId, role = 'junior') {
    const exists = this.missionaries.find(m => m.missionary.toString() === missionaryId.toString());
    if (!exists) {
        this.missionaries.push({ missionary: missionaryId, role });
        return this.save();
    }
};

// Method to verify companionship
companionshipSchema.methods.markVerified = function(userId) {
    this.verified = true;
    this.verifiedBy = userId;
    this.verifiedDate = new Date();
    return this.save();
};

// Static method to find companionships by missionary
companionshipSchema.statics.findByMissionary = function(missionaryId) {
    return this.find({ 'missionaries.missionary': missionaryId })
        .populate('missionaries.missionary', 'firstName lastName')
        .populate('area', 'name city')
        .sort({ startDate: -1 });
};

// Static method to find companions of a missionary
companionshipSchema.statics.findCompanionsOf = async function(missionaryId) {
    const companionships = await this.find({ 'missionaries.missionary': missionaryId })
        .populate('missionaries.missionary', 'firstName lastName missionPhoto currentPhoto');
    
    const companions = [];
    companionships.forEach(comp => {
        comp.missionaries.forEach(m => {
            if (m.missionary._id.toString() !== missionaryId.toString()) {
                companions.push({
                    missionary: m.missionary,
                    companionship: {
                        area: comp.area,
                        startDate: comp.startDate,
                        endDate: comp.endDate,
                        role: m.role
                    }
                });
            }
        });
    });
    
    return companions;
};

// Indexes
companionshipSchema.index({ 'missionaries.missionary': 1 });
companionshipSchema.index({ area: 1 });
companionshipSchema.index({ startDate: -1 });
companionshipSchema.index({ verified: 1 });

module.exports = mongoose.model('Companionship', companionshipSchema);
