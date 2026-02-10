const mongoose = require('mongoose');

const accomplishmentReportSchema = new mongoose.Schema({
    reportDate: {
        type: Date,
        required: true,
        index: true
    },
    startDate: {
        type: Date,
        required: true
    },
    endDate: {
        type: Date,
        required: true
    },
    generatedBy: {
        type: String,
        required: true
    },
    tasks: [{
        taskId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Task'
        },
        title: String,
        description: String,
        category: String,
        priority: String,
        completedAt: Date,
        assignedTo: String
    }],
    totalTasks: {
        type: Number,
        default: 0
    },
    reportContent: {
        type: String // Markdown content
    },
    notes: {
        type: String,
        default: ''
    },
    createdAt: {
        type: Date,
        default: Date.now
    },
    updatedAt: {
        type: Date,
        default: Date.now
    }
});

accomplishmentReportSchema.index({ reportDate: -1, generatedBy: 1 });

accomplishmentReportSchema.pre('save', function(next) {
    this.updatedAt = Date.now();
    this.totalTasks = this.tasks.length;
    next();
});

module.exports = mongoose.model('AccomplishmentReport', accomplishmentReportSchema);
