const mongoose = require('mongoose');

const greatestJoyMediaSchema = new mongoose.Schema({
    title: {
        type: String,
        required: true,
        trim: true
    },
    description: {
        type: String,
        trim: true
    },
    mediaType: {
        type: String,
        required: true,
        enum: ['photo', 'video'],
        default: 'photo'
    },
    url: {
        type: String,
        required: true
    },
    thumbnailUrl: {
        type: String
    },
    // Legacy single child field (kept for backwards compatibility)
    child: {
        name: {
            type: String,
            trim: true
        },
        birthDate: {
            type: Date
        },
        relationship: {
            type: String,
            enum: ['grandchild', 'great-grandchild'],
            default: 'grandchild'
        }
    },
    // New: Multiple people can be tagged in media
    people: [{
        name: {
            type: String,
            required: true,
            trim: true
        },
        relationship: {
            type: String,
            enum: [
                'self', 'spouse', 'partner',
                'parent', 'child', 'sibling',
                'grandparent', 'grandchild',
                'great-grandparent', 'great-grandchild',
                'aunt', 'uncle', 'niece', 'nephew',
                'cousin', 'friend', 'other'
            ]
        },
        birthDate: Date
    }],
    // Family circles this media belongs to
    circles: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'FamilyCircle'
    }],
    uploadedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    uploadDate: {
        type: Date,
        default: Date.now
    },
    captureDate: {
        type: Date,
        default: Date.now
    },
    tags: [{
        type: String,
        trim: true
    }],
    location: {
        type: String,
        trim: true
    },
    favorites: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    }],
    comments: [{
        user: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User'
        },
        text: {
            type: String,
            required: true
        },
        date: {
            type: Date,
            default: Date.now
        }
    }],
    visibility: {
        type: String,
        enum: ['private', 'circle', 'family', 'public'],
        default: 'circle'
    },
    album: {
        type: String,
        trim: true
    }
}, {
    timestamps: true
});

// Index for searching
greatestJoyMediaSchema.index({ 'child.name': 1, captureDate: -1 });
greatestJoyMediaSchema.index({ 'people.name': 1 });
greatestJoyMediaSchema.index({ circles: 1 });
greatestJoyMediaSchema.index({ uploadedBy: 1, uploadDate: -1 });
greatestJoyMediaSchema.index({ tags: 1 });
greatestJoyMediaSchema.index({ album: 1 });

module.exports = mongoose.model('GreatestJoyMedia', greatestJoyMediaSchema);
