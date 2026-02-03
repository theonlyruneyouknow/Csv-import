const mongoose = require('mongoose');

const missionAreaSchema = new mongoose.Schema({
    // Area Identification
    name: {
        type: String,
        required: true,
        trim: true
    },
    alternateNames: [{
        type: String,
        trim: true
    }],
    
    // Location Details
    city: {
        type: String,
        required: true,
        trim: true
    },
    county: {
        type: String,
        trim: true
    },
    region: {
        type: String,
        trim: true
    },
    country: {
        type: String,
        default: 'England',
        trim: true
    },
    
    // Geographic Coordinates
    coordinates: {
        latitude: Number,
        longitude: Number
    },
    
    // Area Type
    type: {
        type: String,
        enum: ['city', 'town', 'village', 'rural', 'ward', 'branch', 'multiple'],
        default: 'city'
    },
    
    // Time Period this area existed
    activeFrom: Date,
    activeTo: Date,
    isCurrentArea: {
        type: Boolean,
        default: true
    },
    
    // Area Details
    description: {
        type: String,
        maxlength: 2000
    },
    boundaries: {
        type: String,
        maxlength: 1000
    },
    
    // Congregations in this area
    congregations: [{
        name: String,
        type: {
            type: String,
            enum: ['ward', 'branch', 'group'],
            default: 'ward'
        },
        address: String,
        notes: String
    }],
    
    // Photos of the area
    photos: [{
        url: String,
        description: String,
        type: {
            type: String,
            enum: ['chapel', 'area', 'landmark', 'apartment', 'other'],
            default: 'area'
        },
        date: Date,
        uploadedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User'
        }
    }],
    
    // Statistics
    stats: {
        totalMissionariesServed: {
            type: Number,
            default: 0
        },
        totalCompanionships: {
            type: Number,
            default: 0
        },
        averageStayDuration: Number // in weeks
    },
    
    // Notes and History
    notes: {
        type: String,
        maxlength: 3000
    },
    history: {
        type: String,
        maxlength: 3000
    },
    memorableEvents: [{
        description: String,
        date: Date,
        addedBy: {
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
    
    // Legacy SQL Database Reference
    legacyAreaId: {
        type: String,
        unique: true,
        sparse: true
    },
    
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

// Virtual for full location name
missionAreaSchema.virtual('fullLocation').get(function() {
    const parts = [this.name, this.city];
    if (this.county) parts.push(this.county);
    return parts.join(', ');
});

// Method to update statistics
missionAreaSchema.methods.updateStats = async function() {
    const Companionship = mongoose.model('Companionship');
    
    const companionships = await Companionship.find({ area: this._id });
    this.stats.totalCompanionships = companionships.length;
    
    // Count unique missionaries
    const missionaryIds = new Set();
    let totalDuration = 0;
    
    companionships.forEach(comp => {
        comp.missionaries.forEach(m => {
            missionaryIds.add(m.missionary.toString());
        });
        if (comp.duration) {
            totalDuration += comp.duration;
        }
    });
    
    this.stats.totalMissionariesServed = missionaryIds.size;
    
    if (companionships.length > 0) {
        this.stats.averageStayDuration = Math.round(totalDuration / companionships.length);
    }
    
    return this.save();
};

// Method to add a photo
missionAreaSchema.methods.addPhoto = function(photoData) {
    this.photos.push(photoData);
    return this.save();
};

// Method to mark as verified
missionAreaSchema.methods.markVerified = function(userId) {
    this.verified = true;
    this.verifiedBy = userId;
    this.verifiedDate = new Date();
    return this.save();
};

// Static method to search areas
missionAreaSchema.statics.searchByLocation = function(searchTerm) {
    const regex = new RegExp(searchTerm, 'i');
    return this.find({
        $or: [
            { name: regex },
            { city: regex },
            { county: regex },
            { alternateNames: regex }
        ]
    }).sort({ name: 1 });
};

// Static method to get areas with most missionaries
missionAreaSchema.statics.getMostPopularAreas = function(limit = 10) {
    return this.find()
        .sort({ 'stats.totalMissionariesServed': -1 })
        .limit(limit);
};

// Indexes
missionAreaSchema.index({ name: 1, city: 1 });
missionAreaSchema.index({ city: 1 });
missionAreaSchema.index({ 'stats.totalMissionariesServed': -1 });
missionAreaSchema.index({ coordinates: '2dsphere' }); // For geospatial queries

module.exports = mongoose.model('MissionArea', missionAreaSchema);
