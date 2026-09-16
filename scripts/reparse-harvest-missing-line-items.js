require('dotenv').config();
const mongoose = require('mongoose');
const Doc = require('../models/HarvestIntakeDocument');
const parser = require('../services/harvestPdfExtractor');
const PurchaseOrder = require('../models/PurchaseOrder');
const LineItem = require('../models/LineItem');
const Vendor = require('../models/Vendor');
const Dropshipment = require('../models/Dropshipment');

function n(v) {
    return String(v || '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
}

function c(v) {
    return Math.max(0, Math.min(1, Number.isFinite(v) ? v : 0));
}

async function buildMatchSummary(ex) {
    const s = {
        purchaseOrderId: null,
        purchaseOrderNumber: '',
        vendorMatched: false,
        totalLineItemsInSystem: 0,
        receivedLineItemsInSystem: 0,
        completionPercent: 0,
        openQuantityBySku: []
    };

    if (!ex.poNumber) return s;

    const po = await PurchaseOrder.findOne({ poNumber: ex.poNumber });
    if (!po) return s;

    const lis = await LineItem.find({ poNumber: po.poNumber, isHidden: { $ne: true } })
        .select('sku quantityExpected quantityReceived received');

    const total = lis.length;
    const received = lis.filter(i => i.received).length;

    s.purchaseOrderId = po._id;
    s.purchaseOrderNumber = po.poNumber;
    s.vendorMatched = Boolean(ex.vendor && po.vendor && po.vendor.toLowerCase().includes(ex.vendor.toLowerCase()));
    s.totalLineItemsInSystem = total;
    s.receivedLineItemsInSystem = received;
    s.completionPercent = total > 0 ? Math.round((received / total) * 100) : 0;
    s.openQuantityBySku = lis
        .map(i => ({
            sku: i.sku || '',
            openQuantity: Math.max(0, Number(i.quantityExpected || 0) - Number(i.quantityReceived || 0))
        }))
        .filter(i => i.sku && i.openQuantity > 0)
        .sort((a, b) => b.openQuantity - a.openQuantity)
        .slice(0, 15);

    return s;
}

async function buildLinks(ex, ms) {
    const links = {
        purchaseOrderId: ms.purchaseOrderId || null,
        purchaseOrderNumber: ms.purchaseOrderNumber || ex.poNumber || '',
        vendorId: null,
        vendorName: ex.vendor || '',
        dropshipmentIds: [],
        customerName: ex.customerName || '',
        customerEmail: ex.customerEmail || '',
        linkConfidence: 0
    };

    const lineItemMatches = [];

    let po = null;
    if (ms.purchaseOrderId) {
        po = await PurchaseOrder.findById(ms.purchaseOrderId).select('poNumber vendor vendorName');
    }

    if (!po && ex.poNumber) {
        po = await PurchaseOrder.findOne({ poNumber: ex.poNumber }).select('poNumber vendor vendorName');
    }

    if (po) {
        links.purchaseOrderId = po._id;
        links.purchaseOrderNumber = po.poNumber;
        if (!links.vendorName) links.vendorName = po.vendorName || po.vendor || '';
    }

    if (links.vendorName) {
        const nv = n(links.vendorName);
        if (nv) {
            const vendor = await Vendor.findOne({
                $or: [
                    { vendorName: new RegExp('^' + nv.replace(/\s+/g, '\\s+') + '$', 'i') },
                    { vendorName: new RegExp(nv, 'i') }
                ]
            }).select('_id vendorName');

            if (vendor) {
                links.vendorId = vendor._id;
                links.vendorName = vendor.vendorName;
            }
        }
    }

    const dq = [];
    if (links.purchaseOrderNumber) dq.push({ poNumber: links.purchaseOrderNumber });
    if (links.customerEmail) dq.push({ customerEmail: links.customerEmail });
    if (links.customerName) {
        dq.push({ customerName: new RegExp(links.customerName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i') });
    }

    if (dq.length) {
        const ds = await Dropshipment.find({ $or: dq }).select('_id customerName customerEmail').limit(5);
        links.dropshipmentIds = ds.map(d => d._id);
    }

    let dbLineItems = [];
    if (links.purchaseOrderNumber) {
        dbLineItems = await LineItem.find({
            poNumber: links.purchaseOrderNumber,
            isHidden: { $ne: true }
        }).select('_id poId poNumber sku memo quantityExpected quantityReceived');
    }

    const remaining = [...dbLineItems];
    (ex.lineItems || []).forEach((item, idx) => {
        const sku = String(item.sku || '').trim();
        const desc = String(item.description || '').trim();
        const qty = Number.isFinite(item.quantity) ? item.quantity : null;

        let matched = null;
        let matchType = 'unmatched';
        let confidence = 0.05;

        if (sku) {
            const i = remaining.findIndex(row => n(row.sku) === n(sku));
            if (i >= 0) {
                matched = remaining.splice(i, 1)[0];
                matchType = 'sku';
                confidence = 0.95;
            }
        }

        if (!matched && desc) {
            const dn = n(desc);
            const i = remaining.findIndex(row => n(row.memo).includes(dn) || dn.includes(n(row.memo)));
            if (i >= 0) {
                matched = remaining.splice(i, 1)[0];
                matchType = 'description';
                confidence = 0.7;
            }
        }

        const expected = matched && Number.isFinite(matched.quantityExpected) ? matched.quantityExpected : null;
        const received = matched && Number.isFinite(matched.quantityReceived) ? matched.quantityReceived : null;
        const open = expected !== null ? Math.max(0, expected - Number(received || 0)) : null;
        const delta = expected !== null && qty !== null ? qty - expected : null;

        lineItemMatches.push({
            parsedIndex: idx,
            parsedSku: sku,
            parsedDescription: desc,
            parsedQuantity: qty,
            matchedLineItemId: matched ? matched._id : null,
            matchedPoId: matched ? matched.poId : (links.purchaseOrderId || null),
            matchedPoNumber: matched ? matched.poNumber : links.purchaseOrderNumber,
            matchedSku: matched ? (matched.sku || '') : '',
            expectedQuantity: expected,
            receivedQuantity: received,
            openQuantity: open,
            quantityDelta: delta,
            matchType,
            confidence: c(confidence)
        });
    });

    let score = 0;
    if (links.purchaseOrderId) score += 0.45;
    if (links.vendorId) score += 0.2;
    if (links.dropshipmentIds.length > 0) score += 0.15;
    if (lineItemMatches.some(i => i.matchType !== 'unmatched')) score += 0.2;
    links.linkConfidence = c(score);

    return { entityLinks: links, lineItemMatches };
}

async function run() {
    await mongoose.connect(process.env.MONGODB_URI);

    const docs = await Doc.find({ 'extracted.lineItems.0': { $exists: false } })
        .sort({ createdAt: -1 })
        .limit(200);

    let updated = 0;

    for (const doc of docs) {
        try {
            const extracted = await parser.extractFromFile(doc.file.filePath);
            const matchSummary = await buildMatchSummary(extracted);
            const linkage = await buildLinks(extracted, matchSummary);

            doc.extracted = extracted;
            doc.matchSummary = matchSummary;
            doc.entityLinks = linkage.entityLinks;
            doc.lineItemMatches = linkage.lineItemMatches;
            doc.status = matchSummary.purchaseOrderId ? 'processed' : 'needs_review';

            await doc.save();
            updated += 1;
            console.log('UPDATED', String(doc._id), extracted.poNumber || '-', (extracted.lineItems || []).length);
        } catch (error) {
            console.log('SKIP', String(doc._id), error.message);
        }
    }

    console.log('TOTAL_UPDATED', updated);
    await mongoose.disconnect();
}

run().catch(async (error) => {
    console.error(error);
    try {
        await mongoose.disconnect();
    } catch (_) {
        // no-op
    }
    process.exit(1);
});
