const mongoose = require('mongoose');

const medicineSchema = new mongoose.Schema({
    // Basic Information
    name: {
        type: String,
        required: true,
        trim: true
    },
    genericName: {
        type: String,
        trim: true
    },
    brandName: {
        type: String,
        trim: true
    },
    
    // Medication Details
    strength: {
        type: String, // e.g., "10mg", "250mg/5ml"
        required: true
    },
    form: {
        type: String,
        enum: ['tablet', 'capsule', 'liquid', 'injection', 'cream', 'ointment', 'inhaler', 'patch', 'drops', 'spray', 'other'],
        required: true
    },
    color: String,
    shape: String,
    
    // Prescription Information
    prescriptionNumber: String,
    prescribedBy: {
        doctorName: String,
        clinicName: String,
        phoneNumber: String
    },
    
    // Dosage and Schedule
    dosage: {
        amount: {
            type: String, // e.g., "1 tablet", "5ml", "2 puffs"
            required: true
        },
        frequency: {
            type: String,
            enum: ['once-daily', 'twice-daily', 'three-times-daily', 'four-times-daily', 'every-other-day', 'weekly', 'as-needed', 'custom'],
            required: true
        },
        customSchedule: String, // For custom frequency
        timesToTake: [String], // e.g., ["08:00", "20:00"] for twice daily
        withFood: {
            type: String,
            enum: ['with-food', 'without-food', 'no-preference'],
            default: 'no-preference'
        },
        specialInstructions: String
    },
    
    // Supply Information
    quantity: {
        totalPills: Number,
        remainingPills: {
            type: Number,
            default: function() { return this.totalPills; }
        },
        unitSize: String // e.g., "30 tablets", "100ml bottle"
    },
    
    // Dates
    prescriptionDate: {
        type: Date,
        required: true
    },
    startDate: {
        type: Date,
        required: true
    },
    endDate: Date, // For courses with specific end dates
    lastTaken: Date,
    
    // Refill Information
    refillsRemaining: {
        type: Number,
        default: 0
    },
    totalRefillsAllowed: Number,
    reorderThreshold: {
        type: Number,
        default: 7 // Days before running out to reorder
    },
    
    // Pharmacy Information
    pharmacy: {
        name: String,
        address: String,
        phoneNumber: String,
        email: String,
        notes: String
    },
    
    // Status and Tracking
    status: {
        type: String,
        enum: ['active', 'paused', 'discontinued', 'completed'],
        default: 'active'
    },
    isActive: {
        type: Boolean,
        default: true
    },
    
    // Medical Information
    condition: String, // What this medication treats
    sideEffects: [String],
    allergicReactions: [String],
    interactions: [String], // Other medications this interacts with
    
    // Cost and Insurance
    cost: {
        copay: Number,
        insurance: String,
        totalCost: Number
    },
    
    // Reminders and Notifications
    reminders: {
        enabled: {
            type: Boolean,
            default: true
        },
        reminderTimes: [String], // Times to send reminders
        refillReminder: {
            type: Boolean,
            default: true
        },
        refillReminderDays: {
            type: Number,
            default: 7 // Days before running out
        }
    },
    
    // User and Timestamps
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    
    // Additional Notes
    notes: String,
    
    // Auto-calculated fields
    daysSupply: {
        type: Number,
        // Will be calculated based on quantity and dosage
    },
    estimatedRunOutDate: Date,
    needsRefill: {
        type: Boolean,
        default: false
    }
}, {
    timestamps: true
});

// Virtual for days until medication runs out
medicineSchema.virtual('daysUntilRunOut').get(function() {
    if (!this.quantity.remainingPills || !this.dosage.frequency) return null;
    
    const dailyUsage = this.calculateDailyUsage();
    if (dailyUsage <= 0) return null;
    
    return Math.floor(this.quantity.remainingPills / dailyUsage);
});

// Virtual for estimated run out date
medicineSchema.virtual('runOutDate').get(function() {
    const daysUntilRunOut = this.daysUntilRunOut;
    if (!daysUntilRunOut) return null;
    
    const today = new Date();
    const runOutDate = new Date(today);
    runOutDate.setDate(today.getDate() + daysUntilRunOut);
    return runOutDate;
});

// Virtual for refill status
medicineSchema.virtual('refillStatus').get(function() {
    const daysUntilRunOut = this.daysUntilRunOut;
    if (!daysUntilRunOut) return 'unknown';
    
    if (daysUntilRunOut <= this.reorderThreshold) {
        return 'needs-refill';
    } else if (daysUntilRunOut <= this.reorderThreshold * 2) {
        return 'refill-soon';
    } else {
        return 'good';
    }
});

// Method to calculate daily usage
medicineSchema.methods.calculateDailyUsage = function() {
    const frequency = this.dosage.frequency;
    const amount = parseFloat(this.dosage.amount.replace(/[^0-9.]/g, '')) || 1;
    
    switch (frequency) {
        case 'once-daily': return amount * 1;
        case 'twice-daily': return amount * 2;
        case 'three-times-daily': return amount * 3;
        case 'four-times-daily': return amount * 4;
        case 'every-other-day': return amount * 0.5;
        case 'weekly': return amount / 7;
        case 'as-needed': return 0; // Can't calculate for as-needed
        default: return amount; // Default to once daily
    }
};

// Method to record taking medication
medicineSchema.methods.recordDose = function(amountTaken = null) {
    const amount = amountTaken || parseFloat(this.dosage.amount.replace(/[^0-9.]/g, '')) || 1;
    
    this.lastTaken = new Date();
    this.quantity.remainingPills = Math.max(0, this.quantity.remainingPills - amount);
    
    // Update refill status
    const daysUntilRunOut = this.daysUntilRunOut;
    this.needsRefill = daysUntilRunOut <= this.reorderThreshold;
    
    return this.save();
};

// Method to add refill
medicineSchema.methods.addRefill = function(quantity, refillsRemaining = null) {
    this.quantity.remainingPills += quantity;
    this.quantity.totalPills = Math.max(this.quantity.totalPills, this.quantity.remainingPills);
    
    if (refillsRemaining !== null) {
        this.refillsRemaining = refillsRemaining;
    } else if (this.refillsRemaining > 0) {
        this.refillsRemaining -= 1;
    }
    
    this.needsRefill = false;
    
    return this.save();
};

// Pre-save middleware to calculate fields
medicineSchema.pre('save', function(next) {
    // Calculate days supply
    const dailyUsage = this.calculateDailyUsage();
    if (dailyUsage > 0) {
        this.daysSupply = Math.floor(this.quantity.totalPills / dailyUsage);
    }
    
    // Calculate estimated run out date
    const daysUntilRunOut = this.daysUntilRunOut;
    if (daysUntilRunOut) {
        const today = new Date();
        this.estimatedRunOutDate = new Date(today.setDate(today.getDate() + daysUntilRunOut));
    }
    
    // Update refill status
    this.needsRefill = daysUntilRunOut <= this.reorderThreshold;
    
    next();
});

// Indexes for performance
medicineSchema.index({ user: 1, status: 1 });
medicineSchema.index({ user: 1, needsRefill: 1 });
medicineSchema.index({ user: 1, estimatedRunOutDate: 1 });
medicineSchema.index({ 'reminders.enabled': 1, status: 1 });

module.exports = mongoose.model('Medicine', medicineSchema);
