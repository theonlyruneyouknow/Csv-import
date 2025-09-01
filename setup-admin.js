const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
require('dotenv').config();

// Define User schema directly here
const userSchema = new mongoose.Schema({
    username: {
        type: String,
        required: true,
        unique: true,
        trim: true,
        minlength: 3,
        maxlength: 50
    },
    email: {
        type: String,
        required: true,
        unique: true,
        lowercase: true,
        trim: true
    },
    password: {
        type: String,
        required: true,
        minlength: 6
    },
    firstName: {
        type: String,
        required: true,
        trim: true
    },
    lastName: {
        type: String,
        required: true,
        trim: true
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
        manageOrganicVendors: { type: Boolean, default: false }
    },
    emailVerified: {
        type: Boolean,
        default: false
    },
    approvedAt: {
        type: Date
    }
}, {
    timestamps: true
});

// Hash password before saving
userSchema.pre('save', async function(next) {
    if (!this.isModified('password')) return next();
    
    const saltRounds = 12;
    this.password = await bcrypt.hash(this.password, saltRounds);
    next();
});

// Set default permissions based on role
userSchema.methods.setDefaultPermissions = function() {
    if (this.role === 'admin') {
        this.permissions = {
            viewDashboard: true,
            editLineItems: true,
            managePOs: true,
            manageUsers: true,
            viewReports: true,
            manageDropship: true,
            manageOrganicVendors: true
        };
    } else if (this.role === 'manager') {
        this.permissions = {
            viewDashboard: true,
            editLineItems: true,
            managePOs: true,
            manageUsers: false,
            viewReports: true,
            manageDropship: true,
            manageOrganicVendors: true
        };
    }
};

const User = mongoose.model('User', userSchema);

async function createAdminUser() {
    try {
        await mongoose.connect(process.env.MONGODB_URI, {
            useNewUrlParser: true,
            useUnifiedTopology: true
        });
        
        console.log('✅ Connected to MongoDB');
        
        // Check if admin user already exists
        const existingAdmin = await User.findOne({ 
            $or: [
                { username: 'admin' },
                { email: 'admin@tsc.com' }
            ]
        });
        
        if (existingAdmin) {
            console.log('ℹ️  Admin user already exists:', existingAdmin.username);
            console.log('📧 Email:', existingAdmin.email);
            console.log('🛡️  Role:', existingAdmin.role);
            console.log('✅ Status:', existingAdmin.status);
            await mongoose.disconnect();
            return;
        }
        
        // Create admin user
        const adminUser = new User({
            username: 'admin',
            email: 'admin@tsc.com',
            password: 'admin123', // Will be hashed automatically
            firstName: 'System',
            lastName: 'Administrator',
            role: 'admin',
            status: 'approved',
            emailVerified: true,
            approvedAt: new Date()
        });
        
        // Set admin permissions
        adminUser.setDefaultPermissions();
        
        await adminUser.save();
        
        console.log('✅ Admin user created successfully!');
        console.log('📧 Email:', adminUser.email);
        console.log('👤 Username:', adminUser.username);
        console.log('🔑 Password: admin123');
        console.log('🛡️  Role:', adminUser.role);
        console.log('✅ Status:', adminUser.status);
        
        await mongoose.disconnect();
        console.log('✅ Disconnected from MongoDB');
        
    } catch (error) {
        console.error('❌ Error creating admin user:', error);
        await mongoose.disconnect();
        process.exit(1);
    }
}

createAdminUser();
