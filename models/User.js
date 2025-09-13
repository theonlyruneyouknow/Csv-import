const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
    username: {
        type: String,
        required: true,
        unique: true,
        trim: true,
        minlength: 3,
        maxlength: 30
    },
    email: {
        type: String,
        required: true,
        unique: true,
        trim: true,
        lowercase: true,
        match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Please enter a valid email']
    },
    password: {
        type: String,
        required: true,
        minlength: 6
    },
    firstName: {
        type: String,
        required: true,
        trim: true,
        maxlength: 50
    },
    lastName: {
        type: String,
        required: true,
        trim: true,
        maxlength: 50
    },
    role: {
        type: String,
        enum: ['admin', 'manager', 'user', 'viewer'],
        default: 'user'
    },
    status: {
        type: String,
        enum: ['pending', 'approved', 'suspended', 'rejected'],
        default: 'pending'
    },
    permissions: {
        viewDashboard: { type: Boolean, default: true },
        editLineItems: { type: Boolean, default: false },
        managePOs: { type: Boolean, default: false },
        manageUsers: { type: Boolean, default: false },
        viewReports: { type: Boolean, default: false },
        manageDropship: { type: Boolean, default: false },
        manageOrganicVendors: { type: Boolean, default: false },
        // Module access permissions
        accessReceiving: { type: Boolean, default: false },
        accessTasks: { type: Boolean, default: false },
        accessDropship: { type: Boolean, default: false },
        accessFoodManagement: { type: Boolean, default: false },
        accessStoryManagement: { type: Boolean, default: false },
        accessOrganicVendors: { type: Boolean, default: false },
        // Tool access permissions
        accessLineItemsManager: { type: Boolean, default: false },
        accessTrackingDashboard: { type: Boolean, default: false },
        accessNotesManager: { type: Boolean, default: false },
        accessFileUpload: { type: Boolean, default: false },
        accessTroubleSeed: { type: Boolean, default: false },
        accessOrphanedItems: { type: Boolean, default: false }
    },
    lastLogin: {
        type: Date
    },
    loginAttempts: {
        type: Number,
        default: 0
    },
    lockUntil: {
        type: Date
    },
    emailVerified: {
        type: Boolean,
        default: false
    },
    emailVerificationToken: {
        type: String
    },
    passwordResetToken: {
        type: String
    },
    passwordResetExpires: {
        type: Date
    },
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    approvedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    approvedAt: {
        type: Date
    },
    rejectedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    rejectedAt: {
        type: Date
    },
    rejectionReason: {
        type: String
    }
}, {
    timestamps: true
});

// Indexes (username and email already have unique: true, so only add status index)
userSchema.index({ status: 1 });

// Virtual for account locked
userSchema.virtual('isLocked').get(function() {
    return !!(this.lockUntil && this.lockUntil > Date.now());
});

// Password hashing middleware
userSchema.pre('save', async function(next) {
    if (!this.isModified('password')) return next();
    
    try {
        const salt = await bcrypt.genSalt(12);
        this.password = await bcrypt.hash(this.password, salt);
        next();
    } catch (error) {
        next(error);
    }
});

// Compare password method
userSchema.methods.comparePassword = async function(candidatePassword) {
    return bcrypt.compare(candidatePassword, this.password);
};

// Generate email verification token
userSchema.methods.generateEmailVerificationToken = function() {
    const crypto = require('crypto');
    this.emailVerificationToken = crypto.randomBytes(32).toString('hex');
    return this.emailVerificationToken;
};

// Generate password reset token
userSchema.methods.generatePasswordResetToken = function() {
    const crypto = require('crypto');
    this.passwordResetToken = crypto.randomBytes(32).toString('hex');
    this.passwordResetExpires = Date.now() + 3600000; // 1 hour
    return this.passwordResetToken;
};

// Increment login attempts
userSchema.methods.incLoginAttempts = function() {
    // If we have a previous lock that has expired, restart at 1
    if (this.lockUntil && this.lockUntil < Date.now()) {
        return this.updateOne({
            $unset: { lockUntil: 1 },
            $set: { loginAttempts: 1 }
        });
    }
    
    const updates = { $inc: { loginAttempts: 1 } };
    
    // Lock account after 5 failed attempts for 2 hours
    if (this.loginAttempts + 1 >= 5 && !this.isLocked) {
        updates.$set = { lockUntil: Date.now() + 2 * 60 * 60 * 1000 }; // 2 hours
    }
    
    return this.updateOne(updates);
};

// Reset login attempts
userSchema.methods.resetLoginAttempts = function() {
    return this.updateOne({
        $unset: { loginAttempts: 1, lockUntil: 1 }
    });
};

// Get full name
userSchema.virtual('fullName').get(function() {
    return `${this.firstName} ${this.lastName}`;
});

// Check if user has permission
userSchema.methods.hasPermission = function(permission) {
    if (this.role === 'admin') return true;
    return this.permissions[permission] || false;
};

// Set default permissions based on role
userSchema.methods.setDefaultPermissions = function() {
    switch (this.role) {
        case 'admin':
            Object.keys(this.permissions).forEach(key => {
                this.permissions[key] = true;
            });
            break;
        case 'manager':
            this.permissions.viewDashboard = true;
            this.permissions.editLineItems = true;
            this.permissions.managePOs = true;
            this.permissions.viewReports = true;
            this.permissions.manageDropship = true;
            this.permissions.manageOrganicVendors = true;
            break;
        case 'user':
            this.permissions.viewDashboard = true;
            this.permissions.editLineItems = true;
            this.permissions.viewReports = true;
            break;
        case 'viewer':
            this.permissions.viewDashboard = true;
            break;
    }
};

module.exports = mongoose.model('User', userSchema);
