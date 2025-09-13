const mongoose = require('mongoose');

const timelineSchema = new mongoose.Schema({
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
    project: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Project',
        required: true
    },
    type: {
        type: String,
        enum: ['chronological', 'thematic', 'character-arc', 'plot', 'custom'],
        default: 'chronological'
    },
    startDate: {
        type: Date
    },
    endDate: {
        type: Date
    },
    events: [{
        title: {
            type: String,
            required: true,
            trim: true,
            maxlength: 200
        },
        description: {
            type: String,
            maxlength: 1000
        },
        date: {
            type: Date
        },
        order: {
            type: Number,
            default: 0
        },
        type: {
            type: String,
            enum: ['plot-point', 'character-development', 'setting', 'conflict', 'resolution', 'other'],
            default: 'plot-point'
        },
        importance: {
            type: String,
            enum: ['low', 'medium', 'high', 'critical'],
            default: 'medium'
        },
        characters: [{
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Character'
        }],
        relatedStories: [{
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Story'
        }],
        notes: {
            type: String,
            maxlength: 2000
        },
        color: {
            type: String,
            default: '#007bff' // Bootstrap primary color
        }
    }],
    author: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    isActive: {
        type: Boolean,
        default: true
    }
}, {
    timestamps: true
});

// Method to add event in chronological order
timelineSchema.methods.addEvent = function(eventData) {
    this.events.push(eventData);
    
    // Sort events by date if chronological timeline
    if (this.type === 'chronological' && eventData.date) {
        this.events.sort((a, b) => {
            if (!a.date) return 1;
            if (!b.date) return -1;
            return new Date(a.date) - new Date(b.date);
        });
        
        // Update order based on sorted position
        this.events.forEach((event, index) => {
            event.order = index;
        });
    }
    
    return this.save();
};

// Method to reorder events
timelineSchema.methods.reorderEvents = function(eventOrders) {
    eventOrders.forEach(({ eventId, newOrder }) => {
        const event = this.events.id(eventId);
        if (event) {
            event.order = newOrder;
        }
    });
    
    // Sort by new order
    this.events.sort((a, b) => a.order - b.order);
    
    return this.save();
};

// Virtual for duration (if dates are set)
timelineSchema.virtual('duration').get(function() {
    if (!this.startDate || !this.endDate) return null;
    
    const diffTime = Math.abs(this.endDate - this.startDate);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays < 30) return `${diffDays} days`;
    if (diffDays < 365) return `${Math.round(diffDays / 30)} months`;
    return `${Math.round(diffDays / 365)} years`;
});

// Index for better performance
timelineSchema.index({ project: 1, isActive: 1 });
timelineSchema.index({ author: 1 });
timelineSchema.index({ type: 1 });

module.exports = mongoose.model('Timeline', timelineSchema);
