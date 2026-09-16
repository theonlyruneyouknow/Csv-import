const mongoose = require('mongoose');

const harvestProductReferenceSchema = new mongoose.Schema({
    vendorName: { type: String, default: '' },
    vendorKey: { type: String, required: true, index: true },
    sku: { type: String, default: '' },
    skuKey: { type: String, default: '', index: true },
    upc: { type: String, default: '' },
    upcKey: { type: String, default: '', index: true },
    description: { type: String, default: '' },
    descriptionKey: { type: String, default: '', index: true },
    confirmCount: { type: Number, default: 1 },
    createdBy: { type: String, default: '' },
    lastConfirmedBy: { type: String, default: '' },
    lastConfirmedAt: { type: Date, default: Date.now }
}, {
    timestamps: true
});

harvestProductReferenceSchema.index({ vendorKey: 1, upcKey: 1 });
harvestProductReferenceSchema.index({ vendorKey: 1, skuKey: 1 });
harvestProductReferenceSchema.index({ vendorKey: 1, descriptionKey: 1 });

module.exports = mongoose.model('HarvestProductReference', harvestProductReferenceSchema);
