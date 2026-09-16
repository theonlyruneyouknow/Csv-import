const mongoose = require('mongoose');

const harvestLineItemSchema = new mongoose.Schema({
    lineNumber: { type: Number, default: null },
    sku: { type: String, default: '' },
    upc: { type: String, default: '' },
    description: { type: String, default: '' },
    quantity: { type: Number, default: null },
    quantityReceived: { type: Number, default: null },
    qtyUom: { type: String, default: '' },
    retailPrice: { type: Number, default: null },
    unitPrice: { type: Number, default: null },
    amount: { type: Number, default: null },
    shipDate: { type: Date, default: null },
    isConfirmedProduct: { type: Boolean, default: false },
    productReferenceId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'HarvestProductReference',
        default: null
    },
    confirmedBy: { type: String, default: '' },
    confirmedAt: { type: Date, default: null }
}, { _id: false });

const harvestLineItemMatchSchema = new mongoose.Schema({
    parsedIndex: { type: Number, default: -1 },
    parsedSku: { type: String, default: '' },
    parsedDescription: { type: String, default: '' },
    parsedQuantity: { type: Number, default: null },
    matchedLineItemId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'LineItem',
        default: null
    },
    matchedPoId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'PurchaseOrder',
        default: null
    },
    matchedPoNumber: { type: String, default: '' },
    matchedSku: { type: String, default: '' },
    expectedQuantity: { type: Number, default: null },
    receivedQuantity: { type: Number, default: null },
    openQuantity: { type: Number, default: null },
    quantityDelta: { type: Number, default: null },
    matchType: {
        type: String,
        enum: ['sku', 'description', 'unmatched'],
        default: 'unmatched'
    },
    confidence: { type: Number, default: 0 }
}, { _id: false });

const harvestIntakeDocumentSchema = new mongoose.Schema({
    sourceType: {
        type: String,
        enum: ['manual_upload', 'gmail_attachment'],
        required: true
    },
    status: {
        type: String,
        enum: ['processed', 'needs_review', 'reconciled'],
        default: 'processed',
        index: true
    },
    file: {
        originalName: { type: String, required: true },
        originalNameKey: { type: String, default: '', index: true },
        savedName: { type: String, required: true },
        filePath: { type: String, required: true },
        mimeType: { type: String, default: 'application/pdf' },
        size: { type: Number, default: 0 },
        revisionNumber: { type: Number, default: 1 }
    },
    emailMetadata: {
        mailbox: { type: String, default: '' },
        uid: { type: Number, default: null },
        from: { type: String, default: '' },
        subject: { type: String, default: '' },
        receivedAt: { type: Date, default: null },
        attachmentName: { type: String, default: '' }
    },
    extracted: {
        poNumber: { type: String, default: '', index: true },
        acknowledgementNumber: { type: String, default: '', index: true },
        orderNumber: { type: String, default: '', index: true },
        vendor: { type: String, default: '' },
        customerName: { type: String, default: '' },
        customerEmail: { type: String, default: '' },
        externalOrderRef: { type: String, default: '' },
        orderDate: { type: String, default: '' },
        totalAmount: { type: Number, default: null },
        currency: { type: String, default: 'USD' },
        lineItems: { type: [harvestLineItemSchema], default: [] },
        confidence: { type: Number, default: 0 },
        rawTextPreview: { type: String, default: '' }
    },
    matchSummary: {
        purchaseOrderId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'PurchaseOrder',
            default: null
        },
        purchaseOrderNumber: { type: String, default: '' },
        vendorMatched: { type: Boolean, default: false },
        totalLineItemsInSystem: { type: Number, default: 0 },
        receivedLineItemsInSystem: { type: Number, default: 0 },
        completionPercent: { type: Number, default: 0 },
        openQuantityBySku: {
            type: [{
                sku: String,
                openQuantity: Number
            }],
            default: []
        }
    },
    entityLinks: {
        purchaseOrderId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'PurchaseOrder',
            default: null
        },
        purchaseOrderNumber: { type: String, default: '' },
        vendorId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Vendor',
            default: null
        },
        vendorName: { type: String, default: '' },
        dropshipmentIds: [{
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Dropshipment'
        }],
        customerName: { type: String, default: '' },
        customerEmail: { type: String, default: '' },
        linkConfidence: { type: Number, default: 0 }
    },
    lineItemMatches: {
        type: [harvestLineItemMatchSchema],
        default: []
    },
    uiPreferences: {
        autoJumpEnabled: { type: Boolean, default: null }
    },
    documentKey: { type: String, default: '', index: true },
    isLatestRevision: { type: Boolean, default: true, index: true },
    supersedesDocumentId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'HarvestIntakeDocument',
        default: null
    },
    supersededByDocumentId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'HarvestIntakeDocument',
        default: null
    },
    createdBy: { type: String, default: '' },
    notes: { type: String, default: '' }
}, {
    timestamps: true
});

harvestIntakeDocumentSchema.index({ createdAt: -1 });
harvestIntakeDocumentSchema.index({ 'emailMetadata.uid': 1, 'emailMetadata.mailbox': 1 });
harvestIntakeDocumentSchema.index({ documentKey: 1, isLatestRevision: 1, createdAt: -1 });

module.exports = mongoose.model('HarvestIntakeDocument', harvestIntakeDocumentSchema);
