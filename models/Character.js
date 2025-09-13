const mongoose = require('mongoose');

const characterSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        trim: true,
        maxlength: 100
    },
    fullName: {
        type: String,
        trim: true,
        maxlength: 200
    },
    nickname: {
        type: String,
        trim: true,
        maxlength: 100
    },
    project: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Project',
        required: true
    },
    role: {
        type: String,
        enum: ['protagonist', 'antagonist', 'supporting', 'minor', 'narrator', 'other'],
        default: 'supporting'
    },
    description: {
        type: String,
        maxlength: 2000
    },
    physicalDescription: {
        age: Number,
        height: String,
        weight: String,
        eyeColor: String,
        hairColor: String,
        build: String,
        distinguishingFeatures: String
    },
    personality: {
        traits: [String],
        strengths: [String],
        weaknesses: [String],
        fears: [String],
        motivations: [String],
        goals: [String]
    },
    background: {
        birthDate: Date,
        birthPlace: String,
        family: [{
            name: String,
            relationship: String,
            description: String
        }],
        education: String,
        occupation: String,
        socialClass: String,
        religion: String,
        politicalViews: String
    },
    relationships: [{
        character: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Character'
        },
        relationshipType: {
            type: String,
            enum: ['family', 'romantic', 'friend', 'enemy', 'mentor', 'colleague', 'other']
        },
        description: String,
        status: {
            type: String,
            enum: ['current', 'past', 'complicated'],
            default: 'current'
        }
    }],
    arc: {
        startingPoint: String,
        growthAreas: [String],
        keyMoments: [{
            event: String,
            chapter: {
                type: mongoose.Schema.Types.ObjectId,
                ref: 'Story'
            },
            impact: String
        }],
        endingPoint: String
    },
    appearance: [{
        story: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Story'
        },
        description: String,
        importance: {
            type: String,
            enum: ['main', 'secondary', 'mentioned'],
            default: 'secondary'
        }
    }],
    notes: {
        type: String,
        maxlength: 5000
    },
    images: [{
        url: String,
        description: String,
        type: {
            type: String,
            enum: ['portrait', 'reference', 'concept'],
            default: 'reference'
        }
    }],
    tags: [{
        type: String,
        trim: true,
        maxlength: 50
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

// Virtual for display name
characterSchema.virtual('displayName').get(function() {
    if (this.nickname) return `${this.name} "${this.nickname}"`;
    return this.name;
});

// Method to add relationship
characterSchema.methods.addRelationship = function(characterId, relationshipType, description, status = 'current') {
    // Check if relationship already exists
    const existingRelationship = this.relationships.find(rel => 
        rel.character.toString() === characterId.toString()
    );
    
    if (existingRelationship) {
        existingRelationship.relationshipType = relationshipType;
        existingRelationship.description = description;
        existingRelationship.status = status;
    } else {
        this.relationships.push({
            character: characterId,
            relationshipType,
            description,
            status
        });
    }
    
    return this.save();
};

// Method to track appearance in story
characterSchema.methods.addAppearance = function(storyId, description, importance = 'secondary') {
    // Check if already appears in this story
    const existingAppearance = this.appearance.find(app => 
        app.story.toString() === storyId.toString()
    );
    
    if (existingAppearance) {
        existingAppearance.description = description;
        existingAppearance.importance = importance;
    } else {
        this.appearance.push({
            story: storyId,
            description,
            importance
        });
    }
    
    return this.save();
};

// Method to add character arc moment
characterSchema.methods.addArcMoment = function(event, chapterId, impact) {
    this.arc.keyMoments.push({
        event,
        chapter: chapterId,
        impact
    });
    
    return this.save();
};

// Index for better performance
characterSchema.index({ project: 1, isActive: 1 });
characterSchema.index({ author: 1 });
characterSchema.index({ role: 1 });
characterSchema.index({ name: 1 });

module.exports = mongoose.model('Character', characterSchema);
