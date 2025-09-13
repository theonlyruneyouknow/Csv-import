const mongoose = require('mongoose');

const storySchema = new mongoose.Schema({
    title: {
        type: String,
        required: true,
        trim: true,
        maxlength: 200
    },
    content: {
        type: String,
        default: ''
    },
    summary: {
        type: String,
        trim: true,
        maxlength: 1000
    },
    project: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Project',
        required: true
    },
    order: {
        type: Number,
        default: 0
    },
    type: {
        type: String,
        enum: ['chapter', 'scene', 'short-story', 'poem', 'note', 'outline'],
        default: 'chapter'
    },
    status: {
        type: String,
        enum: ['draft', 'writing', 'editing', 'review', 'completed', 'archived'],
        default: 'draft'
    },
    wordCount: {
        type: Number,
        default: 0,
        min: 0
    },
    characterCount: {
        type: Number,
        default: 0,
        min: 0
    },
    tags: [{
        type: String,
        trim: true,
        maxlength: 50
    }],
    timeline: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Timeline'
    },
    timelinePosition: {
        date: Date,
        description: String,
        order: Number
    },
    characters: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Character'
    }],
    notes: {
        type: String,
        maxlength: 2000
    },
    author: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    lastEditedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    version: {
        type: Number,
        default: 1
    },
    versions: [{
        versionNumber: Number,
        content: String,
        timestamp: { type: Date, default: Date.now },
        editedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User'
        },
        changes: String // Summary of changes made
    }],
    comments: [{
        author: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: true
        },
        content: {
            type: String,
            required: true,
            maxlength: 1000
        },
        position: {
            start: Number, // Character position in text
            end: Number,
            selectedText: String
        },
        resolved: {
            type: Boolean,
            default: false
        },
        createdAt: {
            type: Date,
            default: Date.now
        }
    }],
    settings: {
        fontSize: { type: Number, default: 14 },
        fontFamily: { type: String, default: 'Times New Roman' },
        lineSpacing: { type: Number, default: 1.5 },
        wordWrap: { type: Boolean, default: true }
    }
}, {
    timestamps: true
});

// Pre-save middleware to update word and character counts
storySchema.pre('save', function(next) {
    if (this.isModified('content')) {
        this.wordCount = this.content ? this.content.trim().split(/\s+/).filter(word => word.length > 0).length : 0;
        this.characterCount = this.content ? this.content.length : 0;
        this.lastEditedBy = this.author; // Will be overridden if different user is editing
    }
    next();
});

// Method to create a new version
storySchema.methods.createVersion = function(editedBy, changes = '') {
    const newVersion = {
        versionNumber: this.version,
        content: this.content,
        editedBy: editedBy,
        changes: changes
    };
    
    this.versions.push(newVersion);
    this.version += 1;
    
    // Keep only last 10 versions to save space
    if (this.versions.length > 10) {
        this.versions = this.versions.slice(-10);
    }
    
    return this.save();
};

// Method to revert to a specific version
storySchema.methods.revertToVersion = function(versionNumber, revertedBy) {
    const version = this.versions.find(v => v.versionNumber === versionNumber);
    if (!version) {
        throw new Error('Version not found');
    }
    
    // Create a version of current state before reverting
    this.createVersion(revertedBy, `Reverted to version ${versionNumber}`);
    
    this.content = version.content;
    this.lastEditedBy = revertedBy;
    
    return this.save();
};

// Virtual for reading time estimation (average 200 words per minute)
storySchema.virtual('estimatedReadingTime').get(function() {
    return Math.ceil(this.wordCount / 200);
});

// Index for better performance
storySchema.index({ project: 1, order: 1 });
storySchema.index({ author: 1, status: 1 });
storySchema.index({ timeline: 1, 'timelinePosition.order': 1 });
storySchema.index({ createdAt: -1 });

module.exports = mongoose.model('Story', storySchema);
