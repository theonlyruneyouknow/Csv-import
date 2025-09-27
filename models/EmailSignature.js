// models/EmailSignature.js
const mongoose = require('mongoose');

const emailSignatureSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        trim: true
    },
    userId: {
        type: String,
        required: true // Username who owns this signature
    },
    isDefault: {
        type: Boolean,
        default: false
    },
    content: {
        html: {
            type: String,
            required: true
        },
        text: String // Plain text fallback
    },
    variables: {
        name: String,
        title: String,
        company: String,
        email: String,
        phone: String,
        website: String,
        address: String,
        mobile: String,
        department: String,
        customFields: mongoose.Schema.Types.Mixed
    },
    template: {
        type: String,
        enum: ['simple', 'professional', 'modern', 'minimal', 'branded', 'custom'],
        default: 'simple'
    },
    design: {
        colors: {
            primary: { type: String, default: '#000000' },
            secondary: { type: String, default: '#666666' },
            accent: { type: String, default: '#007bff' }
        },
        fonts: {
            primary: { type: String, default: 'Arial, sans-serif' },
            size: { type: Number, default: 14 }
        },
        layout: {
            alignment: { type: String, enum: ['left', 'center', 'right'], default: 'left' },
            spacing: { type: Number, default: 10 }
        },
        logo: {
            url: String,
            width: { type: Number, default: 120 },
            height: { type: Number, default: 60 },
            position: { type: String, enum: ['left', 'right', 'top', 'bottom'], default: 'left' }
        }
    },
    socialLinks: [{
        platform: { type: String, enum: ['linkedin', 'twitter', 'facebook', 'instagram', 'youtube'] },
        url: String,
        iconStyle: { type: String, enum: ['color', 'gray', 'outline'], default: 'color' }
    }],
    disclaimer: {
        text: String,
        fontSize: { type: Number, default: 11 },
        color: { type: String, default: '#999999' }
    },
    usage: {
        totalUses: { type: Number, default: 0 },
        lastUsed: Date
    },
    status: {
        type: String,
        enum: ['active', 'inactive', 'archived'],
        default: 'active'
    }
}, {
    timestamps: true
});

// Indexes
emailSignatureSchema.index({ userId: 1, isDefault: 1 });
emailSignatureSchema.index({ userId: 1, name: 1 });
emailSignatureSchema.index({ status: 1 });

// Pre-save middleware to ensure only one default signature per user
emailSignatureSchema.pre('save', async function(next) {
    if (this.isDefault && this.isModified('isDefault')) {
        // Remove default status from other signatures for this user
        await this.constructor.updateMany(
            { userId: this.userId, _id: { $ne: this._id } },
            { $set: { isDefault: false } }
        );
    }
    next();
});

// Method to render signature with variables
emailSignatureSchema.methods.render = function(customVariables = {}) {
    const variables = { ...this.variables.toObject(), ...customVariables };
    let html = this.content.html;
    let text = this.content.text || '';
    
    // Replace variables in HTML
    Object.keys(variables).forEach(key => {
        if (variables[key]) {
            const regex = new RegExp(`{{${key}}}`, 'g');
            html = html.replace(regex, variables[key]);
            text = text.replace(regex, variables[key]);
        }
    });
    
    // Remove unused variables
    html = html.replace(/\{\{.*?\}\}/g, '');
    text = text.replace(/\{\{.*?\}\}/g, '');
    
    return {
        html: html.trim(),
        text: text.trim()
    };
};

// Method to increment usage
emailSignatureSchema.methods.incrementUsage = async function() {
    this.usage.totalUses += 1;
    this.usage.lastUsed = new Date();
    await this.save();
};

// Static method to get user's default signature
emailSignatureSchema.statics.getDefault = function(userId) {
    return this.findOne({ userId, isDefault: true, status: 'active' });
};

// Static method to get all user signatures
emailSignatureSchema.statics.getUserSignatures = function(userId) {
    return this.find({ userId, status: 'active' }).sort({ isDefault: -1, name: 1 });
};

// Static method to create predefined templates
emailSignatureSchema.statics.createPredefinedTemplates = async function(userId, userInfo = {}) {
    const templates = [
        {
            name: 'Simple Professional',
            template: 'simple',
            content: {
                html: `
                    <div style="font-family: Arial, sans-serif; font-size: 14px; color: #000;">
                        <strong>{{name}}</strong><br>
                        {{title}}<br>
                        {{company}}<br>
                        <br>
                        Email: <a href="mailto:{{email}}" style="color: #007bff;">{{email}}</a><br>
                        Phone: {{phone}}<br>
                        {{website ? '<a href="' + website + '" style="color: #007bff;">' + website + '</a>' : ''}}
                    </div>
                `,
                text: `{{name}}\n{{title}}\n{{company}}\n\nEmail: {{email}}\nPhone: {{phone}}\n{{website}}`
            }
        },
        {
            name: 'Modern Card',
            template: 'modern',
            content: {
                html: `
                    <table style="border-collapse: collapse; font-family: Arial, sans-serif;">
                        <tr>
                            <td style="padding: 15px; border-left: 3px solid #007bff; background: #f8f9fa;">
                                <div style="font-size: 16px; font-weight: bold; color: #000; margin-bottom: 5px;">{{name}}</div>
                                <div style="font-size: 14px; color: #666; margin-bottom: 3px;">{{title}}</div>
                                <div style="font-size: 14px; color: #666; margin-bottom: 10px;">{{company}}</div>
                                <div style="font-size: 13px; color: #000;">
                                    <a href="mailto:{{email}}" style="color: #007bff; text-decoration: none;">{{email}}</a> | 
                                    <span>{{phone}}</span>
                                </div>
                            </td>
                        </tr>
                    </table>
                `
            }
        },
        {
            name: 'Minimal Clean',
            template: 'minimal',
            content: {
                html: `
                    <div style="font-family: 'Helvetica Neue', Arial, sans-serif; font-size: 13px; line-height: 1.4; color: #333;">
                        <div style="margin-bottom: 8px;">
                            <span style="font-weight: 600;">{{name}}</span>
                            {{title ? ' | ' + title : ''}}
                        </div>
                        <div style="color: #666;">
                            {{company}}<br>
                            <a href="mailto:{{email}}" style="color: #333; text-decoration: none;">{{email}}</a> • {{phone}}
                        </div>
                    </div>
                `
            }
        }
    ];
    
    const signatures = [];
    for (let i = 0; i < templates.length; i++) {
        const template = templates[i];
        const signature = new this({
            name: template.name,
            userId,
            template: template.template,
            content: template.content,
            variables: userInfo,
            isDefault: i === 0 // First one is default
        });
        signatures.push(await signature.save());
    }
    
    return signatures;
};

module.exports = mongoose.model('EmailSignature', emailSignatureSchema);
