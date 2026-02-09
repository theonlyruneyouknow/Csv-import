const mongoose = require('mongoose');

const missionarySchema = new mongoose.Schema({
    // Basic Information
    firstName: {
        type: String,
        required: true,
        trim: true
    },
    middleName: {
        type: String,
        trim: true
    },
    lastName: {
        type: String,
        required: true,
        trim: true
    },
    maidenName: {
        type: String,
        trim: true
    },
    preferredName: {
        type: String,
        trim: true
    },
    
    // Mission Service
    missionName: {
        type: String,
        default: 'England Birmingham Mission',
        trim: true
    },
    missionId: {
        type: String,
        trim: true
    },
    missionTitle: {
        type: String,
        trim: true
    },
    serviceStartDate: {
        type: Date
    },
    serviceEndDate: {
        type: Date
    },
    serviceDuration: {
        type: Number, // in months
        min: 0
    },
    
    // Contact Information
    email: {
        type: String,
        trim: true,
        lowercase: true
    },
    badEmail: {
        type: Boolean,
        default: false
    },
    phone: {
        type: String,
        trim: true
    },
    homepage: {
        type: String,
        trim: true
    },
    
    // Current Address
    currentAddress: {
        address1: String,
        address2: String,
        city: String,
        state: String,
        zip: String,
        country: {
            type: String,
            default: 'USA'
        },
        phone: String
    },
    
    // Legacy fields for backward compatibility
    currentCity: {
        type: String,
        trim: true
    },
    currentState: {
        type: String,
        trim: true
    },
    currentCountry: {
        type: String,
        trim: true,
        default: 'USA'
    },
    
    // Permanent Address
    permanentAddress: {
        address1: String,
        address2: String,
        city: String,
        state: String,
        zip: String,
        country: String,
        phone: String
    },
    
    // Family Information
    spouse: {
        name: String,
        maidenName: String,
        marriageDate: Date
    },
    children: [{
        name: String,
        birthYear: Number,
        gender: {
            type: String,
            enum: ['male', 'female', 'unknown'],
            default: 'unknown'
        }
    }],
    
    // Photos
    missionPhoto: {
        url: String,
        uploadDate: Date,
        description: String,
        year: Number
    },
    currentPhoto: {
        url: String,
        uploadDate: Date,
        description: String,
        year: Number
    },
    additionalPhotos: [{
        url: String,
        uploadDate: Date,
        description: String,
        year: Number,
        type: {
            type: String,
            enum: ['mission', 'current', 'family', 'event', 'other'],
            default: 'other'
        }
    }],
    
    // Social Media
    socialMedia: {
        facebook: {
            profileUrl: String,
            profileId: String,
            inGroup1: { type: Boolean, default: false },
            inGroup2: { type: Boolean, default: false }
        },
        linkedin: String,
        instagram: String,
        twitter: String
    },
    
    // Areas Served
    areasServed: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'MissionArea'
    }],
    
    // Missionary Log (formerly called "areabook" in database)
    // This is the missionary's personal log/journal about their mission service
    // Contains their own notes about companions, areas, and experiences
    // Note: In the UI, this is now called "Missionary Log" to distinguish it from
    // the "Areabook" which refers to the historical record of an area
    areabook: {
        type: String,
        trim: true,
        maxlength: 10000
    },
    
    // Companionships - References to Companionship documents
    companionships: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Companionship'
    }],
    
    // Data Quality & Tracking
    dataStatus: {
        type: String,
        enum: ['complete', 'partial', 'minimal', 'unverified'],
        default: 'partial'
    },
    verifiedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    verifiedDate: Date,
    needsVerification: {
        type: Boolean,
        default: true
    },
    missingData: [{
        field: String,
        priority: {
            type: String,
            enum: ['low', 'medium', 'high'],
            default: 'medium'
        }
    }],
    
    // Work Information
    occupation: String,
    work: {
        type: String,
        trim: true
    },
    workUrl: {
        type: String,
        trim: true
    },
    education: String,
    
    // Notes and Additional Info
    notes: {
        type: String,
        maxlength: 5000
    },
    other: {
        type: String,
        maxlength: 5000
    },
    interests: [String],
    
    // Legacy SQL Database References (ALL fields from original SQL database)
    legacyData: {
        alumId: String,
        personId: String,
        userId: String,
        password: String,        // Legacy password hash from SQL
        lastNow: String,         // Previous/maiden name from SQL 'last_now' field
        addDate: Date,
        lastUpdate: Date,
        lang1Counter: Number,
        lang2Counter: Number
    },
    
    // Source tracking
    dataSources: [{
        source: {
            type: String,
            enum: ['facebook-group-1', 'facebook-group-2', 'manual-entry', 'import', 'missionary-list', 'photo', 'other']
        },
        date: Date,
        notes: String
    }],
    
    // System fields
    addedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    lastEditedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    isActive: {
        type: Boolean,
        default: true
    }
}, {
    timestamps: true
});

// Virtual for full name
missionarySchema.virtual('fullName').get(function() {
    if (this.middleName) {
        return `${this.firstName} ${this.middleName} ${this.lastName}`;
    }
    return `${this.firstName} ${this.lastName}`;
});

// Virtual for display name (with maiden name if applicable)
missionarySchema.virtual('displayName').get(function() {
    if (this.maidenName) {
        return `${this.firstName} ${this.lastName} (${this.maidenName})`;
    }
    if (this.preferredName) {
        return `${this.preferredName} ${this.lastName}`;
    }
    return this.fullName;
});

// Virtual for completeness percentage
missionarySchema.virtual('completenessPercent').get(function() {
    const fields = [
        this.firstName, this.lastName, this.serviceStartDate, this.serviceEndDate,
        this.email, this.phone, this.currentCity, this.currentState,
        this.spouse?.name, this.missionPhoto?.url, this.currentPhoto?.url
    ];
    const filled = fields.filter(f => f !== null && f !== undefined && f !== '').length;
    return Math.round((filled / fields.length) * 100);
});

// Method to add a companion
missionarySchema.methods.addCompanionship = function(companionshipId) {
    if (!this.companionships.includes(companionshipId)) {
        this.companionships.push(companionshipId);
        return this.save();
    }
};

// Method to add an area served
missionarySchema.methods.addArea = function(areaId) {
    if (!this.areasServed.includes(areaId)) {
        this.areasServed.push(areaId);
        return this.save();
    }
};

// Method to update data status
missionarySchema.methods.updateDataStatus = function() {
    const completeness = this.completenessPercent;
    
    if (completeness >= 80 && this.verifiedDate) {
        this.dataStatus = 'complete';
    } else if (completeness >= 50) {
        this.dataStatus = 'partial';
    } else if (completeness >= 20) {
        this.dataStatus = 'minimal';
    } else {
        this.dataStatus = 'unverified';
    }
    
    return this.save();
};

// Method to mark as verified
missionarySchema.methods.markVerified = function(userId) {
    this.verifiedBy = userId;
    this.verifiedDate = new Date();
    this.needsVerification = false;
    return this.updateDataStatus();
};

// Static method to find missionaries needing verification
missionarySchema.statics.findNeedingVerification = function() {
    return this.find({ needsVerification: true, isActive: true })
        .sort({ updatedAt: -1 });
};

// Static method to find by name (fuzzy search)
missionarySchema.statics.searchByName = function(searchTerm) {
    const regex = new RegExp(searchTerm, 'i');
    return this.find({
        $or: [
            { firstName: regex },
            { lastName: regex },
            { maidenName: regex },
            { preferredName: regex }
        ],
        isActive: true
    });
};

// Indexes for performance
missionarySchema.index({ firstName: 1, lastName: 1 });
missionarySchema.index({ lastName: 1 });
missionarySchema.index({ email: 1 });
missionarySchema.index({ serviceStartDate: 1 });
missionarySchema.index({ dataStatus: 1, needsVerification: 1 });
missionarySchema.index({ 'socialMedia.facebook.profileId': 1 });

module.exports = mongoose.model('Missionary', missionarySchema);
