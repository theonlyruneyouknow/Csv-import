const mongoose = require('mongoose');

const emailTemplateSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        trim: true,
        unique: true
    },
    description: {
        type: String,
        trim: true
    },
    category: {
        type: String,
        required: true,
        enum: ['eta_request', 'overdue_followup', 'general_inquiry', 'custom'],
        default: 'custom'
    },
    subject: {
        type: String,
        required: true,
        trim: true
    },
    bodyTemplate: {
        type: String,
        required: true
    },
    variables: [{
        name: String,
        description: String,
        required: {
            type: Boolean,
            default: false
        }
    }],
    isDefault: {
        type: Boolean,
        default: false
    },
    isActive: {
        type: Boolean,
        default: true
    },
    usage: {
        count: {
            type: Number,
            default: 0
        },
        lastUsed: Date
    },
    createdBy: {
        type: String,
        required: true
    },
    createdAt: {
        type: Date,
        default: Date.now
    },
    updatedAt: {
        type: Date,
        default: Date.now
    },
    updatedBy: {
        type: String
    }
});

// Update the updatedAt field before saving
emailTemplateSchema.pre('save', function(next) {
    this.updatedAt = Date.now();
    next();
});

// Create default templates when the model is loaded
emailTemplateSchema.statics.createDefaultTemplates = async function() {
    const defaultTemplates = [
        {
            name: 'ETA Request - Standard',
            description: 'Standard template for requesting ETAs on outstanding items',
            category: 'eta_request',
            subject: 'UPDATE NEEDED - Purchase Order {{poNumber}} - Outstanding Items',
            bodyTemplate: `Dear {{vendor}},

I hope this email finds you well. I am writing to request an update on Purchase Order {{poNumber}}, which currently shows as "Partially Received" in our system.

We have identified several items that require immediate attention:

{{#if noEtaItems}}
DELIVERY DELAYS (No ETA Provided):
{{#each noEtaItems}}
• {{memo}}{{#if sku}} (SKU: {{sku}}){{/if}}
{{/each}}

We urgently need estimated delivery dates for these items to update our customers and plan accordingly.

{{/if}}{{#if overdueItems}}
OVERDUE ITEMS:
{{#each overdueItems}}
• {{memo}}{{#if sku}} (SKU: {{sku}}){{/if}} - Expected: {{eta}}
{{/each}}

These items are past their expected delivery dates. Please provide immediate updates.

{{/if}}{{#if needsFollowupItems}}
ITEMS REQUIRING FOLLOW-UP:
{{#each needsFollowupItems}}
• {{memo}}{{#if sku}} (SKU: {{sku}}){{/if}}
{{/each}}

These items need your immediate attention and response.

{{/if}}Could you please provide:
1. Updated delivery dates for delayed items
2. Status updates for overdue items
3. Alternative products for any discontinued items
4. Any other issues preventing completion of this order

This information is critical for our operations and customer commitments. Please respond within 24-48 hours.

Thank you for your prompt attention to this matter.

Best regards,
{{senderName}}
{{senderTitle}}
{{senderContact}}

---
Purchase Order: {{poNumber}}
Total Outstanding Items: {{totalItems}}
Generated: {{currentDate}} {{currentTime}}`,
            variables: [
                { name: 'poNumber', description: 'Purchase Order Number', required: true },
                { name: 'vendor', description: 'Vendor Name', required: true },
                { name: 'noEtaItems', description: 'Items without ETA', required: false },
                { name: 'overdueItems', description: 'Overdue Items', required: false },
                { name: 'needsFollowupItems', description: 'Items needing followup', required: false },
                { name: 'senderName', description: 'Sender Name', required: false },
                { name: 'senderTitle', description: 'Sender Title', required: false },
                { name: 'senderContact', description: 'Sender Contact Info', required: false },
                { name: 'totalItems', description: 'Total Outstanding Items', required: false },
                { name: 'currentDate', description: 'Current Date', required: false },
                { name: 'currentTime', description: 'Current Time', required: false }
            ],
            isDefault: true,
            createdBy: 'system'
        },
        {
            name: 'Follow-up - Urgent',
            description: 'Urgent follow-up template for overdue items',
            category: 'overdue_followup',
            subject: 'URGENT - Purchase Order {{poNumber}} - Overdue Items Requiring Immediate Response',
            bodyTemplate: `Dear {{vendor}},

This is an URGENT follow-up regarding Purchase Order {{poNumber}}.

CRITICAL OVERDUE ITEMS:
{{#each overdueItems}}
• {{memo}}{{#if sku}} (SKU: {{sku}}){{/if}} - Originally Expected: {{eta}}
{{/each}}

These items are significantly past their delivery dates and are causing operational disruptions. We require:

1. IMMEDIATE status update on all overdue items
2. Firm delivery commitments with realistic dates
3. Explanation for delays and corrective actions being taken

Please respond within 24 hours with specific delivery dates or we may need to consider alternative suppliers.

Urgent attention required.

Best regards,
{{senderName}}
{{senderTitle}}
{{senderContact}}

---
PO: {{poNumber}} | Generated: {{currentDate}}`,
            variables: [
                { name: 'poNumber', description: 'Purchase Order Number', required: true },
                { name: 'vendor', description: 'Vendor Name', required: true },
                { name: 'overdueItems', description: 'Overdue Items', required: true },
                { name: 'senderName', description: 'Sender Name', required: false },
                { name: 'senderTitle', description: 'Sender Title', required: false },
                { name: 'senderContact', description: 'Sender Contact Info', required: false },
                { name: 'currentDate', description: 'Current Date', required: false }
            ],
            isDefault: false,
            createdBy: 'system'
        },
        {
            name: 'General Inquiry - Friendly',
            description: 'Friendly general inquiry template',
            category: 'general_inquiry',
            subject: 'Status Check - Purchase Order {{poNumber}}',
            bodyTemplate: `Hi {{vendor}},

Hope you're doing well! I wanted to check in on the status of Purchase Order {{poNumber}}.

We have some items that we'd love to get updates on:

{{#each allItems}}
• {{memo}}{{#if sku}} (SKU: {{sku}}){{/if}}
{{/each}}

When you get a chance, could you please let us know:
- Current status of these items
- Expected delivery timeframes
- Any potential issues we should be aware of

No rush if things are on track - just keeping our records updated!

Thanks as always for your partnership.

Best,
{{senderName}}

---
PO: {{poNumber}} | {{currentDate}}`,
            variables: [
                { name: 'poNumber', description: 'Purchase Order Number', required: true },
                { name: 'vendor', description: 'Vendor Name', required: true },
                { name: 'allItems', description: 'All Outstanding Items', required: false },
                { name: 'senderName', description: 'Sender Name', required: false },
                { name: 'currentDate', description: 'Current Date', required: false }
            ],
            isDefault: false,
            createdBy: 'system'
        }
    ];

    for (const template of defaultTemplates) {
        await this.findOneAndUpdate(
            { name: template.name },
            template,
            { upsert: true, new: true }
        );
    }
};

module.exports = mongoose.model('EmailTemplate', emailTemplateSchema);
