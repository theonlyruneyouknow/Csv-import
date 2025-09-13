const mongoose = require('mongoose');

const medicationLogSchema = new mongoose.Schema({
    // Reference to the medicine
    medicine: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Medicine',
        required: true
    },
    
    // When the dose was taken
    takenAt: {
        type: Date,
        required: true,
        default: Date.now
    },
    
    // Dose information
    doseTaken: {
        amount: {
            type: String,
            required: true // e.g., "1 tablet", "5ml"
        },
        actualAmount: Number, // Numeric amount for calculations
        wasScheduled: {
            type: Boolean,
            default: false // Was this a scheduled dose or an as-needed dose?
        },
        scheduledTime: String, // What time was this supposed to be taken?
        actualTime: String // What time was it actually taken?
    },
    
    // Context
    takenWith: {
        type: String,
        enum: ['food', 'water', 'milk', 'empty-stomach', 'other'],
        default: 'water'
    },
    
    // Tracking
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    
    // Optional notes
    notes: String,
    
    // Side effects or reactions noted
    sideEffects: [String],
    effectiveness: {
        type: Number,
        min: 1,
        max: 10 // 1-10 scale of how effective the dose was
    },
    
    // Adherence tracking
    wasLate: {
        type: Boolean,
        default: false
    },
    minutesLate: Number,
    
    // Method of recording
    recordedBy: {
        type: String,
        enum: ['user', 'caregiver', 'automatic', 'import'],
        default: 'user'
    },
    
    // Location where taken (optional)
    location: String
}, {
    timestamps: true
});

// Indexes for performance
medicationLogSchema.index({ medicine: 1, takenAt: -1 });
medicationLogSchema.index({ user: 1, takenAt: -1 });
medicationLogSchema.index({ user: 1, medicine: 1, takenAt: -1 });

// Virtual for adherence calculation
medicationLogSchema.virtual('adherenceScore').get(function() {
    if (this.wasLate && this.minutesLate > 60) return 0.7; // Late by more than 1 hour
    if (this.wasLate && this.minutesLate > 30) return 0.8; // Late by 30-60 minutes
    if (this.wasLate && this.minutesLate > 15) return 0.9; // Late by 15-30 minutes
    return 1.0; // On time or within 15 minutes
});

// Static method to get adherence for a medicine over a period
medicationLogSchema.statics.getAdherence = async function(medicineId, userId, days = 30) {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);
    
    const logs = await this.find({
        medicine: medicineId,
        user: userId,
        takenAt: { $gte: startDate },
        'doseTaken.wasScheduled': true
    });
    
    if (logs.length === 0) return { percentage: 0, totalDoses: 0, takenDoses: 0 };
    
    const totalAdherenceScore = logs.reduce((sum, log) => sum + log.adherenceScore, 0);
    const adherencePercentage = (totalAdherenceScore / logs.length) * 100;
    
    return {
        percentage: Math.round(adherencePercentage),
        totalDoses: logs.length,
        takenDoses: logs.filter(log => log.adherenceScore > 0).length,
        averageEffectiveness: logs
            .filter(log => log.effectiveness)
            .reduce((sum, log, _, arr) => sum + log.effectiveness / arr.length, 0)
    };
};

module.exports = mongoose.model('MedicationLog', medicationLogSchema);
