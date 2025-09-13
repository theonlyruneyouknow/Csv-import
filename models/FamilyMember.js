const mongoose = require('mongoose');

const familyMemberSchema = new mongoose.Schema({
    // User who owns this family
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true
    },
    
    // Basic Information
    firstName: {
        type: String,
        required: true,
        trim: true,
        maxlength: 50
    },
    
    lastName: {
        type: String,
        required: true,
        trim: true,
        maxlength: 50
    },
    
    // Relationship to the user
    relationship: {
        type: String,
        required: true,
        enum: [
            'self',
            'spouse',
            'partner',
            'child',
            'parent',
            'sibling',
            'grandparent',
            'grandchild',
            'other'
        ],
        default: 'self'
    },
    
    // Personal Details
    dateOfBirth: {
        type: Date
    },
    
    gender: {
        type: String,
        enum: ['male', 'female', 'other', 'prefer-not-to-say'],
        default: 'prefer-not-to-say'
    },
    
    // Contact Information
    email: {
        type: String,
        trim: true,
        lowercase: true,
        sparse: true, // Allows multiple null values
        match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Please enter a valid email']
    },
    
    phone: {
        type: String,
        trim: true
    },
    
    // Medical Information
    allergies: [{
        allergen: String,
        severity: {
            type: String,
            enum: ['mild', 'moderate', 'severe', 'life-threatening'],
            default: 'moderate'
        },
        notes: String
    }],
    
    medicalConditions: [{
        condition: String,
        diagnosedDate: Date,
        notes: String
    }],
    
    emergencyContact: {
        name: String,
        relationship: String,
        phone: String,
        email: String
    },
    
    // Healthcare Providers
    primaryDoctor: {
        name: String,
        specialty: String,
        phone: String,
        email: String,
        address: String
    },
    
    // Insurance Information
    insurance: {
        provider: String,
        policyNumber: String,
        groupNumber: String,
        notes: String
    },
    
    // Settings
    isActive: {
        type: Boolean,
        default: true
    },
    
    // Profile photo
    profilePhoto: {
        type: String // URL or file path
    },
    
    // Notes
    notes: {
        type: String,
        maxlength: 1000
    },
    
    // Privacy settings
    canViewMedications: {
        type: Boolean,
        default: true
    },
    
    canEditMedications: {
        type: Boolean,
        default: false // Only the user can edit by default
    }
}, {
    timestamps: true
});

// Indexes
familyMemberSchema.index({ user: 1, relationship: 1 });
familyMemberSchema.index({ user: 1, isActive: 1 });

// Virtual for full name
familyMemberSchema.virtual('fullName').get(function() {
    return `${this.firstName} ${this.lastName}`;
});

// Virtual for age calculation
familyMemberSchema.virtual('age').get(function() {
    if (!this.dateOfBirth) return null;
    const today = new Date();
    const birthDate = new Date(this.dateOfBirth);
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
        age--;
    }
    
    return age;
});

// Virtual for formatted phone number
familyMemberSchema.virtual('formattedPhone').get(function() {
    if (!this.phone) return null;
    
    // Remove all non-digits
    const cleaned = this.phone.replace(/\D/g, '');
    
    // Format as (XXX) XXX-XXXX for US numbers
    if (cleaned.length === 10) {
        return `(${cleaned.slice(0, 3)}) ${cleaned.slice(3, 6)}-${cleaned.slice(6)}`;
    }
    
    return this.phone;
});

// Method to check if member is a minor (under 18)
familyMemberSchema.methods.isMinor = function() {
    return this.age !== null && this.age < 18;
};

// Method to get display name with relationship
familyMemberSchema.methods.getDisplayName = function() {
    if (this.relationship === 'self') {
        return `${this.fullName} (You)`;
    }
    return `${this.fullName} (${this.relationship.charAt(0).toUpperCase() + this.relationship.slice(1)})`;
};

// Method to check if member has specific allergy
familyMemberSchema.methods.hasAllergy = function(allergen) {
    return this.allergies.some(allergy => 
        allergy.allergen.toLowerCase().includes(allergen.toLowerCase())
    );
};

// Method to get active medical conditions
familyMemberSchema.methods.getActiveMedicalConditions = function() {
    return this.medicalConditions.filter(condition => condition.condition);
};

// Static method to find family members for a user
familyMemberSchema.statics.findByUser = function(userId, includeInactive = false) {
    const query = { user: userId };
    if (!includeInactive) {
        query.isActive = true;
    }
    return this.find(query).sort({ relationship: 1, firstName: 1 });
};

// Static method to find or create 'self' member
familyMemberSchema.statics.findOrCreateSelf = async function(userId, userInfo = {}) {
    let selfMember = await this.findOne({ user: userId, relationship: 'self' });
    
    if (!selfMember) {
        selfMember = new this({
            user: userId,
            firstName: userInfo.firstName || 'User',
            lastName: userInfo.lastName || 'Name',
            relationship: 'self',
            isActive: true
        });
        await selfMember.save();
    }
    
    return selfMember;
};

// Pre-save middleware to ensure only one 'self' member per user
familyMemberSchema.pre('save', async function(next) {
    if (this.relationship === 'self' && this.isNew) {
        const existingSelf = await this.constructor.findOne({
            user: this.user,
            relationship: 'self',
            _id: { $ne: this._id }
        });
        
        if (existingSelf) {
            const error = new Error('Only one "self" family member allowed per user');
            return next(error);
        }
    }
    next();
});

// Ensure virtuals are included in JSON output
familyMemberSchema.set('toJSON', { virtuals: true });
familyMemberSchema.set('toObject', { virtuals: true });

module.exports = mongoose.model('FamilyMember', familyMemberSchema);
