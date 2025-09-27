// models/EmailContact.js
const mongoose = require('mongoose');

const emailContactSchema = new mongoose.Schema({
    name: {
        first: { type: String, required: true },
        last: { type: String, required: true },
        display: String // Auto-generated from first + last
    },
    email: {
        type: String,
        required: true,
        unique: true,
        lowercase: true,
        validate: {
            validator: function(v) {
                return /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/.test(v);
            },
            message: 'Please enter a valid email address'
        }
    },
    company: {
        name: String,
        department: String,
        position: String
    },
    phone: {
        primary: String,
        mobile: String,
        office: String
    },
    addresses: [{
        type: { type: String, enum: ['business', 'shipping', 'billing'], default: 'business' },
        street: String,
        city: String,
        state: String,
        zipCode: String,
        country: { type: String, default: 'USA' }
    }],
    categories: [{
        type: String,
        enum: ['vendor', 'customer', 'supplier', 'internal', 'prospect', 'partner']
    }],
    tags: [String], // Custom tags for organization
    preferences: {
        emailFormat: { type: String, enum: ['html', 'text'], default: 'html' },
        timezone: { type: String, default: 'America/New_York' },
        language: { type: String, default: 'en' },
        marketingOptIn: { type: Boolean, default: false },
        notificationOptIn: { type: Boolean, default: true }
    },
    metadata: {
        source: { type: String, enum: ['manual', 'import', 'vendor_sync', 'form'], default: 'manual' },
        addedBy: String, // Username who added the contact
        lastEmailSent: Date,
        lastEmailReceived: Date,
        totalEmailsSent: { type: Number, default: 0 },
        totalEmailsReceived: { type: Number, default: 0 }
    },
    vendorIntegration: {
        vendorId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'OrganicVendor'
        },
        isPrimaryContact: { type: Boolean, default: false },
        role: { type: String, enum: ['primary', 'billing', 'shipping', 'technical', 'sales'] },
        vendorAccountNumber: String
    },
    status: {
        type: String,
        enum: ['active', 'inactive', 'bounced', 'unsubscribed', 'blocked'],
        default: 'active'
    },
    notes: String,
    customFields: mongoose.Schema.Types.Mixed, // For flexible additional data
    lastActivity: Date,
    emailStats: {
        opens: { type: Number, default: 0 },
        clicks: { type: Number, default: 0 },
        bounces: { type: Number, default: 0 },
        lastOpen: Date,
        lastClick: Date
    }
}, {
    timestamps: true
});

// Indexes for performance
emailContactSchema.index({ email: 1 });
emailContactSchema.index({ 'name.display': 1 });
emailContactSchema.index({ 'company.name': 1 });
emailContactSchema.index({ categories: 1 });
emailContactSchema.index({ tags: 1 });
emailContactSchema.index({ status: 1 });
emailContactSchema.index({ 'vendorIntegration.vendorId': 1 });
emailContactSchema.index({ 
    'name.first': 'text', 
    'name.last': 'text', 
    email: 'text', 
    'company.name': 'text' 
});

// Virtual for full name
emailContactSchema.virtual('fullName').get(function() {
    return `${this.name.first} ${this.name.last}`;
});

// Pre-save middleware to set display name
emailContactSchema.pre('save', function(next) {
    if (this.name.first && this.name.last) {
        this.name.display = `${this.name.first} ${this.name.last}`;
    }
    this.lastActivity = new Date();
    next();
});

// Method to format contact for email display
emailContactSchema.methods.toEmailFormat = function() {
    return {
        name: this.name.display,
        email: this.email,
        company: this.company.name
    };
};

// Method to check if contact is a vendor
emailContactSchema.methods.isVendor = function() {
    return this.categories.includes('vendor') || this.vendorIntegration.vendorId;
};

// Static method to search contacts
emailContactSchema.statics.searchContacts = function(query, options = {}) {
    const searchCriteria = {};
    
    if (query.text) {
        searchCriteria.$text = { $search: query.text };
    }
    
    if (query.category) {
        searchCriteria.categories = query.category;
    }
    
    if (query.status) {
        searchCriteria.status = query.status;
    }
    
    if (query.company) {
        searchCriteria['company.name'] = new RegExp(query.company, 'i');
    }
    
    if (query.tags && query.tags.length > 0) {
        searchCriteria.tags = { $in: query.tags };
    }
    
    return this.find(searchCriteria)
        .sort(options.sort || { 'name.display': 1 })
        .limit(options.limit || 100)
        .skip(options.skip || 0)
        .populate('vendorIntegration.vendorId', 'name email');
};

// Static method to get vendor contacts
emailContactSchema.statics.getVendorContacts = function(vendorId) {
    return this.find({ 
        'vendorIntegration.vendorId': vendorId,
        status: 'active'
    }).sort({ 'vendorIntegration.isPrimaryContact': -1, 'name.display': 1 });
};

// Static method to sync with vendor database
emailContactSchema.statics.syncWithVendors = async function() {
    const OrganicVendor = mongoose.model('OrganicVendor');
    const vendors = await OrganicVendor.find({});
    
    const syncResults = [];
    
    for (const vendor of vendors) {
        if (vendor.email) {
            try {
                const existingContact = await this.findOne({ email: vendor.email.toLowerCase() });
                
                if (!existingContact) {
                    // Create new contact from vendor
                    const newContact = new this({
                        name: {
                            first: vendor.contactName?.split(' ')[0] || vendor.name || 'Unknown',
                            last: vendor.contactName?.split(' ').slice(1).join(' ') || 'Contact'
                        },
                        email: vendor.email.toLowerCase(),
                        company: {
                            name: vendor.name
                        },
                        categories: ['vendor'],
                        vendorIntegration: {
                            vendorId: vendor._id,
                            isPrimaryContact: true,
                            role: 'primary'
                        },
                        metadata: {
                            source: 'vendor_sync'
                        }
                    });
                    
                    await newContact.save();
                    syncResults.push({ action: 'created', vendor: vendor.name, email: vendor.email });
                } else if (!existingContact.vendorIntegration.vendorId) {
                    // Update existing contact with vendor info
                    existingContact.vendorIntegration.vendorId = vendor._id;
                    existingContact.vendorIntegration.isPrimaryContact = true;
                    existingContact.vendorIntegration.role = 'primary';
                    if (!existingContact.categories.includes('vendor')) {
                        existingContact.categories.push('vendor');
                    }
                    await existingContact.save();
                    syncResults.push({ action: 'updated', vendor: vendor.name, email: vendor.email });
                }
            } catch (error) {
                syncResults.push({ action: 'error', vendor: vendor.name, email: vendor.email, error: error.message });
            }
        }
    }
    
    return syncResults;
};

module.exports = mongoose.model('EmailContact', emailContactSchema);
