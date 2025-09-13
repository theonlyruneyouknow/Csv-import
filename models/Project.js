const mongoose = require('mongoose');

const projectSchema = new mongoose.Schema({
    title: {
        type: String,
        required: true,
        trim: true,
        maxlength: 200
    },
    description: {
        type: String,
        trim: true,
        maxlength: 1000
    },
    type: {
        type: String,
        enum: ['book', 'collection', 'short-story', 'memoir', 'screenplay', 'poetry', 'other'],
        required: true
    },
    genre: {
        type: String,
        trim: true,
        maxlength: 100
    },
    status: {
        type: String,
        enum: ['planning', 'writing', 'editing', 'reviewing', 'completed', 'published', 'archived'],
        default: 'planning'
    },
    targetWordCount: {
        type: Number,
        min: 0
    },
    currentWordCount: {
        type: Number,
        default: 0,
        min: 0
    },
    deadline: {
        type: Date
    },
    tags: [{
        type: String,
        trim: true,
        maxlength: 50
    }],
    notes: {
        type: String,
        maxlength: 5000
    },
    coverImage: {
        type: String, // URL or file path
        trim: true
    },
    author: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    collaborators: [{
        user: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User'
        },
        role: {
            type: String,
            enum: ['co-author', 'editor', 'reviewer', 'contributor'],
            default: 'contributor'
        },
        permissions: {
            canEdit: { type: Boolean, default: false },
            canComment: { type: Boolean, default: true },
            canView: { type: Boolean, default: true }
        }
    }],
    settings: {
        isPublic: { type: Boolean, default: false },
        allowComments: { type: Boolean, default: true },
        autoSave: { type: Boolean, default: true },
        versionControl: { type: Boolean, default: true }
    },
    publishingInfo: {
        publisher: String,
        publishDate: Date,
        isbn: String,
        edition: String
    }
}, {
    timestamps: true
});

// Virtual for completion percentage
projectSchema.virtual('completionPercentage').get(function() {
    if (!this.targetWordCount || this.targetWordCount === 0) return 0;
    return Math.min(Math.round((this.currentWordCount / this.targetWordCount) * 100), 100);
});

// Update word count when stories change
projectSchema.methods.updateWordCount = async function() {
    const Story = mongoose.model('Story');
    const stories = await Story.find({ project: this._id });
    this.currentWordCount = stories.reduce((total, story) => total + (story.wordCount || 0), 0);
    return this.save();
};

// Index for better performance
projectSchema.index({ author: 1, status: 1 });
projectSchema.index({ type: 1, genre: 1 });
projectSchema.index({ createdAt: -1 });

module.exports = mongoose.model('Project', projectSchema);
