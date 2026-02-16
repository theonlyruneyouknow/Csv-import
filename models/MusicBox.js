const mongoose = require('mongoose');

const musicBoxSchema = new mongoose.Schema({
    // File information
    filename: {
        type: String,
        required: true
    },
    originalFilename: {
        type: String,
        required: true
    },
    filePath: {
        type: String,
        required: true
    },
    fileType: {
        type: String,
        enum: ['audio', 'video'],
        required: true
    },
    mimeType: {
        type: String,
        required: true
    },
    fileSize: {
        type: Number,
        required: true
    },
    duration: {
        type: Number, // in seconds
        default: null
    },

    // Music information
    songName: {
        type: String,
        required: true,
        trim: true
    },
    artist: {
        type: String,
        required: true,
        trim: true
    },
    composer: {
        type: String,
        trim: true,
        default: ''
    },

    // Context information
    description: {
        type: String,
        default: ''
    },
    recordingDate: {
        type: Date,
        default: null
    },
    location: {
        type: String,
        trim: true,
        default: ''
    },

    // Upload information
    uploadedBy: {
        type: String,
        required: true
    },
    uploadedAt: {
        type: Date,
        default: Date.now
    },

    // Optional metadata
    genre: {
        type: String,
        trim: true,
        default: ''
    },
    tags: [{
        type: String,
        trim: true
    }],
    playCount: {
        type: Number,
        default: 0
    },
    isFavorite: {
        type: Boolean,
        default: false
    }
}, {
    timestamps: true
});

// Indexes for better query performance
musicBoxSchema.index({ songName: 'text', artist: 'text', composer: 'text' });
musicBoxSchema.index({ uploadedBy: 1, uploadedAt: -1 });
musicBoxSchema.index({ fileType: 1 });

// Virtual for formatted file size
musicBoxSchema.virtual('formattedFileSize').get(function() {
    const bytes = this.fileSize;
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
});

// Virtual for formatted duration
musicBoxSchema.virtual('formattedDuration').get(function() {
    if (!this.duration) return 'Unknown';
    const minutes = Math.floor(this.duration / 60);
    const seconds = Math.floor(this.duration % 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
});

module.exports = mongoose.model('MusicBox', musicBoxSchema);
