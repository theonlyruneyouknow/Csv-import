const mongoose = require('mongoose');

const familyCircleSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        trim: true
    },
    description: {
        type: String,
        trim: true
    },
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    members: [{
        user: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User'
        },
        role: {
            type: String,
            enum: ['admin', 'member'],
            default: 'member'
        },
        joinedDate: {
            type: Date,
            default: Date.now
        }
    }],
    familyMembers: [{
        name: {
            type: String,
            required: true,
            trim: true
        },
        relationship: {
            type: String,
            enum: [
                'grandchild', 'great-grandchild', 'child', 'grandparent',
                'great-grandparent', 'parent', 'sibling', 'spouse',
                'aunt', 'uncle', 'cousin', 'niece', 'nephew',
                'in-law', 'step-relative', 'friend', 'other'
            ],
            required: true
        },
        gender: {
            type: String,
            enum: ['male', 'female', 'other', 'prefer-not-to-say'],
            default: 'prefer-not-to-say'
        },
        birthDate: {
            type: Date
        },
        notes: {
            type: String,
            trim: true
        },
        addedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User'
        },
        addedDate: {
            type: Date,
            default: Date.now
        }
    }],
    invitations: [{
        email: {
            type: String,
            required: true
        },
        invitedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User'
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
        sentDate: {
            type: Date,
            default: Date.now
        },
        expiresAt: {
            type: Date,
            default: () => new Date(+new Date() + 30*24*60*60*1000) // 30 days
        }
    }],
    settings: {
        allowMemberInvites: {
            type: Boolean,
            default: false
        },
        defaultMediaVisibility: {
            type: String,
            enum: ['private', 'circle', 'public'],
            default: 'circle'
        }
    }
}, {
    timestamps: true
});

familyCircleSchema.index({ 'members.user': 1 });
familyCircleSchema.index({ 'invitations.email': 1 });
familyCircleSchema.index({ 'invitations.inviteCode': 1 });

module.exports = mongoose.model('FamilyCircle', familyCircleSchema);
