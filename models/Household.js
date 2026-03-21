const mongoose = require('mongoose');

const householdSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        trim: true,
        maxlength: 100
    },
    
    description: {
        type: String,
        trim: true,
        maxlength: 500
    },
    
    // Type of household unit
    type: {
        type: String,
        enum: ['family', 'roommates', 'couple', 'individual', 'other'],
        default: 'family'
    },
    
    // Creator/owner
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    
    // Members of the household
    members: [{
        user: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: true
        },
        role: {
            type: String,
            enum: ['owner', 'admin', 'member'],
            default: 'member'
        },
        joinedAt: {
            type: Date,
            default: Date.now
        },
        canManageShopping: {
            type: Boolean,
            default: true
        },
        canManagePantry: {
            type: Boolean,
            default: true
        },
        canManageRecipes: {
            type: Boolean,
            default: true
        },
        canManageMealPlans: {
            type: Boolean,
            default: true
        },
        canInviteMembers: {
            type: Boolean,
            default: false
        }
    }],
    
    // Pending invitations
    invitations: [{
        email: {
            type: String,
            required: true,
            trim: true,
            lowercase: true
        },
        inviteCode: {
            type: String,
            required: true,
            unique: true
        },
        status: {
            type: String,
            enum: ['pending', 'accepted', 'declined', 'expired'],
            default: 'pending'
        },
        sentBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: true
        },
        sentAt: {
            type: Date,
            default: Date.now
        },
        expiresAt: {
            type: Date,
            default: () => new Date(+new Date() + 7*24*60*60*1000) // 7 days
        },
        acceptedAt: Date,
        message: String
    }],
    
    // Household settings
    settings: {
        allowMemberInvites: {
            type: Boolean,
            default: false
        },
        sharedShoppingLists: {
            type: Boolean,
            default: true
        },
        sharedPantry: {
            type: Boolean,
            default: true
        },
        sharedRecipes: {
            type: Boolean,
            default: true
        },
        sharedMealPlans: {
            type: Boolean,
            default: true
        }
    },
    
    isActive: {
        type: Boolean,
        default: true
    }
}, {
    timestamps: true
});

// Indexes
householdSchema.index({ 'members.user': 1 });
householdSchema.index({ 'invitations.email': 1 });
householdSchema.index({ 'invitations.inviteCode': 1 });
householdSchema.index({ createdBy: 1 });
householdSchema.index({ isActive: 1 });

// Method to check if user is a member
householdSchema.methods.isMember = function(userId) {
    return this.members.some(m => m.user.toString() === userId.toString());
};

// Method to check if user has specific permission
householdSchema.methods.hasPermission = function(userId, permission) {
    const member = this.members.find(m => m.user.toString() === userId.toString());
    if (!member) return false;
    
    // Owners and admins have all permissions
    if (member.role === 'owner' || member.role === 'admin') return true;
    
    // Check specific permission
    return member[permission] || false;
};

// Method to get user's role
householdSchema.methods.getMemberRole = function(userId) {
    const member = this.members.find(m => m.user.toString() === userId.toString());
    return member ? member.role : null;
};

module.exports = mongoose.model('Household', householdSchema);
