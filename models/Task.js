const mongoose = require('mongoose');

const taskSchema = new mongoose.Schema({
    title: {
        type: String,
        required: true,
        trim: true
    },
    description: {
        type: String,
        default: ''
    },
    priority: {
        type: String,
        enum: ['low', 'medium', 'high', 'critical'],
        default: 'medium'
    },
    status: {
        type: String,
        enum: ['pending', 'in-progress', 'completed', 'cancelled', 'on-hold'],
        default: 'pending'
    },
    category: {
        type: String,
        enum: ['seed-sourcing', 'po-management', 'vendor-contact', 'quality-check', 'inventory', 'shipping', 'general'],
        default: 'general'
    },
    dueDate: {
        type: Date,
        required: true
    },
    reminderDate: {
        type: Date
    },
    assignedTo: {
        type: String,
        default: ''
    },
    createdBy: {
        type: String,
        required: true
    },
    
    // Connections to other entities
    relatedPOs: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'PurchaseOrder'
    }],
    relatedPONumbers: [{
        type: String
    }],
    relatedVendors: [{
        type: String
    }],
    relatedSeeds: [{
        itemName: String,
        sku: String,
        quantity: Number,
        notes: String
    }],
    relatedContacts: [{
        name: String,
        company: String,
        email: String,
        phone: String,
        role: String,
        internal: {
            type: Boolean,
            default: false
        }
    }],
    
    // Task tracking
    tags: [String],
    estimatedHours: {
        type: Number,
        default: 0
    },
    actualHours: {
        type: Number,
        default: 0
    },
    notes: [{
        note: String,
        addedBy: String,
        addedAt: {
            type: Date,
            default: Date.now
        }
    }],
    
    // System fields
    createdAt: {
        type: Date,
        default: Date.now
    },
    updatedAt: {
        type: Date,
        default: Date.now
    },
    completedAt: {
        type: Date
    }
});

taskSchema.index({ dueDate: 1 });
taskSchema.index({ priority: 1, status: 1 });
taskSchema.index({ assignedTo: 1 });
taskSchema.index({ category: 1 });
taskSchema.index({ status: 1, dueDate: 1 });

taskSchema.pre('save', function(next) {
    this.updatedAt = Date.now();
    if (this.status === 'completed' && !this.completedAt) {
        this.completedAt = Date.now();
    }
    next();
});

taskSchema.virtual('isOverdue').get(function() {
    return this.dueDate < new Date() && this.status !== 'completed';
});

taskSchema.virtual('daysUntilDue').get(function() {
    const now = new Date();
    const due = new Date(this.dueDate);
    const diffTime = due - now;
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
});

module.exports = mongoose.model('Task', taskSchema);
