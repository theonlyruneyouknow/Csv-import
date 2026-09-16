const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs').promises;
const multer = require('multer');

const HarvestIntakeDocument = require('../models/HarvestIntakeDocument');
const HarvestProductReference = require('../models/HarvestProductReference');
const PurchaseOrder = require('../models/PurchaseOrder');
const LineItem = require('../models/LineItem');
const Vendor = require('../models/Vendor');
const Dropshipment = require('../models/Dropshipment');
const gmailImapService = require('../services/gmailImapService');
const harvestPdfExtractor = require('../services/harvestPdfExtractor');
const { loadHarvestConfirmedCatalog } = require('../services/harvestConfirmedCatalog');

const uploadDir = path.join(__dirname, '../uploads/harvest-documents');

const storage = multer.diskStorage({
    destination: async (req, file, cb) => {
        try {
            await fs.mkdir(uploadDir, { recursive: true });
            cb(null, uploadDir);
        } catch (error) {
            cb(error);
        }
    },
    filename: (req, file, cb) => {
        const unique = Date.now() + '-' + Math.round(Math.random() * 1e9);
        cb(null, `${unique}-${file.originalname}`);
    }
});

const uploadPdf = multer({
    storage,
    limits: {
        fileSize: 25 * 1024 * 1024
    },
    fileFilter: (req, file, cb) => {
        const isPdf = path.extname(file.originalname).toLowerCase() === '.pdf' || file.mimetype === 'application/pdf';
        if (!isPdf) {
            return cb(new Error('Only PDF files are supported for Harvest intake.'));
        }
        cb(null, true);
    }
});

async function buildMatchSummary(extracted) {
    const summary = {
        purchaseOrderId: null,
        purchaseOrderNumber: '',
        vendorMatched: false,
        totalLineItemsInSystem: 0,
        receivedLineItemsInSystem: 0,
        completionPercent: 0,
        openQuantityBySku: []
    };

    if (!extracted.poNumber) {
        return summary;
    }

    const po = await PurchaseOrder.findOne({ poNumber: extracted.poNumber });
    if (!po) {
        return summary;
    }

    const lineItems = await LineItem.find({
        poNumber: po.poNumber,
        isHidden: { $ne: true }
    }).select('sku quantityExpected quantityReceived received');

    const totalLineItems = lineItems.length;
    const receivedLineItems = lineItems.filter(item => item.received).length;
    const completionPercent = totalLineItems > 0
        ? Math.round((receivedLineItems / totalLineItems) * 100)
        : 0;

    const openQuantityBySku = lineItems
        .map(item => {
            const expected = Number(item.quantityExpected || 0);
            const received = Number(item.quantityReceived || 0);
            const open = Math.max(0, expected - received);
            return {
                sku: item.sku || '',
                openQuantity: open
            };
        })
        .filter(item => item.sku && item.openQuantity > 0)
        .sort((a, b) => b.openQuantity - a.openQuantity)
        .slice(0, 15);

    summary.purchaseOrderId = po._id;
    summary.purchaseOrderNumber = po.poNumber;
    summary.vendorMatched = Boolean(
        extracted.vendor && po.vendor &&
        po.vendor.toLowerCase().includes(extracted.vendor.toLowerCase())
    );
    summary.totalLineItemsInSystem = totalLineItems;
    summary.receivedLineItemsInSystem = receivedLineItems;
    summary.completionPercent = completionPercent;
    summary.openQuantityBySku = openQuantityBySku;

    return summary;
}

function normalizeText(value) {
    return String(value || '')
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, ' ')
        .trim();
}

function clampConfidence(value) {
    if (!Number.isFinite(value)) return 0;
    return Math.max(0, Math.min(1, value));
}

function normalizeUpc(value) {
    return String(value || '').replace(/\D+/g, '').trim();
}

function normalizeSku(value) {
    return String(value || '').trim().toUpperCase();
}

function normalizeFileNameKey(value) {
    return String(value || '')
        .trim()
        .toLowerCase()
        .replace(/\s+/g, ' ');
}

function escapeRegex(value) {
    return String(value || '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function isTruthyFlag(value) {
    const normalized = String(value || '').trim().toLowerCase();
    return ['1', 'true', 'yes', 'on'].includes(normalized);
}

function getVendorKey(extracted) {
    const vendorRaw = extracted && extracted.vendor ? extracted.vendor : '';
    const vendorKey = normalizeText(vendorRaw);
    return vendorKey || 'unknown-vendor';
}

function countUnconfirmedLineItems(doc) {
    const lineItems = doc && doc.extracted && Array.isArray(doc.extracted.lineItems)
        ? doc.extracted.lineItems
        : [];

    return lineItems.filter(item => {
        const hasProductData = Boolean(
            String(item.sku || '').trim() ||
            String(item.upc || '').trim() ||
            String(item.description || '').trim()
        );
        return hasProductData && item.isConfirmedProduct !== true;
    }).length;
}

async function findNextDocumentWithUnconfirmedItems(currentDoc) {
    if (!currentDoc) {
        return null;
    }

    const currentCreatedAt = currentDoc.createdAt ? new Date(currentDoc.createdAt) : null;
    const currentId = currentDoc._id;

    const candidates = await HarvestIntakeDocument.find({
        _id: { $ne: currentId },
        $or: [
            { isLatestRevision: true },
            { isLatestRevision: { $exists: false } }
        ]
    })
        .sort({ createdAt: -1 })
        .select('_id createdAt extracted.lineItems file.originalName extracted.poNumber extracted.acknowledgementNumber extracted.orderNumber');

    for (const candidate of candidates) {
        if (currentCreatedAt) {
            const candidateCreatedAt = candidate.createdAt ? new Date(candidate.createdAt) : null;
            if (candidateCreatedAt && candidateCreatedAt >= currentCreatedAt) {
                continue;
            }
        }

        const unconfirmedLineCount = countUnconfirmedLineItems(candidate);
        if (unconfirmedLineCount > 0) {
            return {
                documentId: candidate._id,
                createdAt: candidate.createdAt,
                fileName: candidate.file && candidate.file.originalName ? candidate.file.originalName : '',
                poNumber: candidate.extracted && candidate.extracted.poNumber ? candidate.extracted.poNumber : '',
                acknowledgementNumber: candidate.extracted && candidate.extracted.acknowledgementNumber ? candidate.extracted.acknowledgementNumber : '',
                orderNumber: candidate.extracted && candidate.extracted.orderNumber ? candidate.extracted.orderNumber : '',
                unconfirmedLineCount
            };
        }
    }

    return null;
}

async function applyProductReferences(extracted) {
    if (!extracted || !Array.isArray(extracted.lineItems) || extracted.lineItems.length === 0) {
        return extracted;
    }

    const vendorKey = getVendorKey(extracted);
    const skuKeys = [];
    const upcKeys = [];
    const descriptionKeys = [];

    extracted.lineItems.forEach(item => {
        const skuKey = normalizeSku(item.sku);
        const upcKey = normalizeUpc(item.upc);
        const descriptionKey = normalizeText(item.description);
        if (skuKey) skuKeys.push(skuKey);
        if (upcKey) upcKeys.push(upcKey);
        if (descriptionKey) descriptionKeys.push(descriptionKey);
    });

    const orQuery = [];
    if (skuKeys.length > 0) orQuery.push({ skuKey: { $in: [...new Set(skuKeys)] } });
    if (upcKeys.length > 0) orQuery.push({ upcKey: { $in: [...new Set(upcKeys)] } });
    if (descriptionKeys.length > 0) orQuery.push({ descriptionKey: { $in: [...new Set(descriptionKeys)] } });

    if (orQuery.length === 0) {
        return extracted;
    }

    const refs = await HarvestProductReference.find({
        vendorKey,
        $or: orQuery
    }).sort({ confirmCount: -1, updatedAt: -1 }).lean();

    const byUpc = new Map();
    const bySku = new Map();
    const byDescription = new Map();
    refs.forEach(ref => {
        if (ref.upcKey && !byUpc.has(ref.upcKey)) byUpc.set(ref.upcKey, ref);
        if (ref.skuKey && !bySku.has(ref.skuKey)) bySku.set(ref.skuKey, ref);
        if (ref.descriptionKey && !byDescription.has(ref.descriptionKey)) byDescription.set(ref.descriptionKey, ref);
    });

    extracted.lineItems = extracted.lineItems.map(item => {
        const upcKey = normalizeUpc(item.upc);
        const skuKey = normalizeSku(item.sku);
        const descriptionKey = normalizeText(item.description);

        const ref = (upcKey && byUpc.get(upcKey)) ||
            (skuKey && bySku.get(skuKey)) ||
            (descriptionKey && byDescription.get(descriptionKey)) ||
            null;

        if (!ref) {
            return item;
        }

        return {
            ...item,
            sku: ref.sku || item.sku || '',
            upc: ref.upc || item.upc || '',
            description: ref.description || item.description || '',
            isConfirmedProduct: true,
            productReferenceId: ref._id,
            confirmedBy: ref.lastConfirmedBy || '',
            confirmedAt: ref.lastConfirmedAt || null
        };
    });

    return extracted;
}

async function buildEntityLinksAndLineItemMatches(extracted, matchSummary) {
    const links = {
        purchaseOrderId: matchSummary.purchaseOrderId || null,
        purchaseOrderNumber: matchSummary.purchaseOrderNumber || extracted.poNumber || '',
        vendorId: null,
        vendorName: extracted.vendor || '',
        dropshipmentIds: [],
        customerName: extracted.customerName || '',
        customerEmail: extracted.customerEmail || '',
        linkConfidence: 0
    };

    const lineItemMatches = [];

    let po = null;
    if (matchSummary.purchaseOrderId) {
        po = await PurchaseOrder.findById(matchSummary.purchaseOrderId).select('poNumber vendor vendorName');
    }

    if (!po && extracted.poNumber) {
        po = await PurchaseOrder.findOne({ poNumber: extracted.poNumber }).select('poNumber vendor vendorName');
    }

    if (po) {
        links.purchaseOrderId = po._id;
        links.purchaseOrderNumber = po.poNumber;
        if (!links.vendorName) {
            links.vendorName = po.vendorName || po.vendor || '';
        }
    }

    if (links.vendorName) {
        const normalizedVendor = normalizeText(links.vendorName);
        if (normalizedVendor) {
            const vendor = await Vendor.findOne({
                $or: [
                    { vendorName: new RegExp(`^${normalizedVendor.replace(/\s+/g, '\\s+')}$`, 'i') },
                    { vendorName: new RegExp(normalizedVendor, 'i') }
                ]
            }).select('_id vendorName');

            if (vendor) {
                links.vendorId = vendor._id;
                links.vendorName = vendor.vendorName;
            }
        }
    }

    const dropshipQuery = [];
    if (links.purchaseOrderNumber) {
        dropshipQuery.push({ poNumber: links.purchaseOrderNumber });
    }
    if (links.customerEmail) {
        dropshipQuery.push({ customerEmail: links.customerEmail });
    }
    if (links.customerName) {
        dropshipQuery.push({ customerName: new RegExp(links.customerName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i') });
    }

    if (dropshipQuery.length > 0) {
        const dropshipments = await Dropshipment.find({ $or: dropshipQuery }).select('_id customerName customerEmail').limit(5);
        links.dropshipmentIds = dropshipments.map(row => row._id);

        if (!links.customerName) {
            const candidateName = dropshipments.find(row => row.customerName)?.customerName;
            if (candidateName) links.customerName = candidateName;
        }
        if (!links.customerEmail) {
            const candidateEmail = dropshipments.find(row => row.customerEmail)?.customerEmail;
            if (candidateEmail) links.customerEmail = candidateEmail;
        }
    }

    let dbLineItems = [];
    if (links.purchaseOrderNumber) {
        dbLineItems = await LineItem.find({
            poNumber: links.purchaseOrderNumber,
            isHidden: { $ne: true }
        }).select('_id poId poNumber sku memo quantityExpected quantityReceived');
    }

    const remaining = [...dbLineItems];
    (extracted.lineItems || []).forEach((parsedItem, index) => {
        const parsedSku = String(parsedItem.sku || '').trim();
        const parsedDescription = String(parsedItem.description || '').trim();
        const parsedQty = Number.isFinite(parsedItem.quantity) ? parsedItem.quantity : null;

        let matched = null;
        let matchType = 'unmatched';
        let confidence = 0.05;

        if (parsedSku) {
            const skuNorm = normalizeText(parsedSku);
            const bySkuIndex = remaining.findIndex(item => normalizeText(item.sku) === skuNorm);
            if (bySkuIndex >= 0) {
                matched = remaining.splice(bySkuIndex, 1)[0];
                matchType = 'sku';
                confidence = 0.95;
            }
        }

        if (!matched && parsedDescription) {
            const descNorm = normalizeText(parsedDescription);
            const byDescIndex = remaining.findIndex(item => normalizeText(item.memo).includes(descNorm) || descNorm.includes(normalizeText(item.memo)));
            if (byDescIndex >= 0) {
                matched = remaining.splice(byDescIndex, 1)[0];
                matchType = 'description';
                confidence = 0.7;
            }
        }

        let expected = matched && Number.isFinite(matched.quantityExpected) ? matched.quantityExpected : null;
        let received = matched && Number.isFinite(matched.quantityReceived) ? matched.quantityReceived : null;
        let openQty = expected !== null ? Math.max(0, expected - Number(received || 0)) : null;
        let qtyDelta = expected !== null && parsedQty !== null ? parsedQty - expected : null;

        if (qtyDelta !== null && Math.abs(qtyDelta) <= 0.001) {
            confidence = Math.max(confidence, 0.98);
        }

        lineItemMatches.push({
            parsedIndex: index,
            parsedSku,
            parsedDescription,
            parsedQuantity: parsedQty,
            matchedLineItemId: matched ? matched._id : null,
            matchedPoId: matched ? matched.poId : (links.purchaseOrderId || null),
            matchedPoNumber: matched ? matched.poNumber : links.purchaseOrderNumber,
            matchedSku: matched ? (matched.sku || '') : '',
            expectedQuantity: expected,
            receivedQuantity: received,
            openQuantity: openQty,
            quantityDelta: qtyDelta,
            matchType,
            confidence: clampConfidence(confidence)
        });
    });

    let score = 0;
    if (links.purchaseOrderId) score += 0.45;
    if (links.vendorId) score += 0.2;
    if (links.dropshipmentIds.length > 0) score += 0.15;
    if (lineItemMatches.some(item => item.matchType !== 'unmatched')) score += 0.2;
    links.linkConfidence = clampConfidence(score);

    return {
        entityLinks: links,
        lineItemMatches
    };
}

async function saveIngestDocument({
    sourceType,
    file,
    createdBy,
    emailMetadata = null,
    allowIncrement = false
}) {
    const originalNameKey = normalizeFileNameKey(file.originalName);
    const originalName = String(file.originalName || '').trim();
    const duplicateMatchers = [];

    if (originalNameKey) {
        duplicateMatchers.push({ documentKey: originalNameKey });
    }
    if (originalName) {
        duplicateMatchers.push({
            'file.originalName': new RegExp(`^${escapeRegex(originalName)}$`, 'i')
        });
    }

    const latestExisting = duplicateMatchers.length > 0
        ? await HarvestIntakeDocument.findOne({
            $and: [
                { $or: duplicateMatchers },
                {
                    $or: [
                        { isLatestRevision: true },
                        { isLatestRevision: { $exists: false } }
                    ]
                }
            ]
        }).sort({ 'file.revisionNumber': -1, createdAt: -1 })
        : null;

    if (latestExisting && !allowIncrement) {
        const duplicateError = new Error('A document with this filename already exists. Use "Upload as updated version" to add a new revision.');
        duplicateError.code = 'DUPLICATE_FILENAME';
        duplicateError.existingDocumentId = latestExisting._id;
        duplicateError.existingRevisionNumber = latestExisting.file && latestExisting.file.revisionNumber
            ? latestExisting.file.revisionNumber
            : 1;
        throw duplicateError;
    }

    const revisionNumber = latestExisting
        ? Number(latestExisting.file && latestExisting.file.revisionNumber ? latestExisting.file.revisionNumber : 1) + 1
        : 1;

    const extractedRaw = await harvestPdfExtractor.extractFromFile(file.filePath);
    const extracted = await applyProductReferences(extractedRaw);
    const matchSummary = await buildMatchSummary(extracted);
    const linkage = await buildEntityLinksAndLineItemMatches(extracted, matchSummary);

    const status = matchSummary.purchaseOrderId ? 'processed' : 'needs_review';

    const doc = new HarvestIntakeDocument({
        sourceType,
        status,
        file: {
            ...file,
            originalNameKey,
            revisionNumber
        },
        emailMetadata: emailMetadata || undefined,
        extracted,
        matchSummary,
        entityLinks: linkage.entityLinks,
        lineItemMatches: linkage.lineItemMatches,
        documentKey: originalNameKey,
        isLatestRevision: true,
        supersedesDocumentId: latestExisting ? latestExisting._id : null,
        createdBy
    });

    await doc.save();

    if (latestExisting) {
        await HarvestIntakeDocument.updateOne(
            { _id: latestExisting._id },
            {
                $set: {
                    isLatestRevision: false,
                    supersededByDocumentId: doc._id
                }
            }
        );
    }

    return doc;
}

async function reparseExistingDocument(doc) {
    const safePath = resolveSafeHarvestFilePath(doc.file && doc.file.filePath);
    if (!safePath) {
        throw new Error('Invalid document file path');
    }

    await fs.access(safePath);

    const extractedRaw = await harvestPdfExtractor.extractFromFile(safePath);
    const extracted = await applyProductReferences(extractedRaw);
    const matchSummary = await buildMatchSummary(extracted);
    const linkage = await buildEntityLinksAndLineItemMatches(extracted, matchSummary);

    doc.extracted = extracted;
    doc.matchSummary = matchSummary;
    doc.entityLinks = linkage.entityLinks;
    doc.lineItemMatches = linkage.lineItemMatches;
    doc.status = matchSummary.purchaseOrderId ? 'processed' : 'needs_review';

    await doc.save();
    return doc;
}

function resolveSafeHarvestFilePath(storedPath) {
    if (!storedPath) {
        return null;
    }

    const resolvedPath = path.resolve(storedPath);
    const resolvedUploadDir = path.resolve(uploadDir);

    if (!resolvedPath.startsWith(resolvedUploadDir)) {
        return null;
    }

    return resolvedPath;
}

// Harvest home route redirects to dashboard
router.get('/', (req, res) => {
    res.redirect('/harvest/dashboard');
});

// Harvest dashboard (initial module page)
router.get('/dashboard', async (req, res) => {
    try {
        const docsRaw = await HarvestIntakeDocument.find()
            .sort({ createdAt: -1 })
            .limit(30)
            .populate('matchSummary.purchaseOrderId', 'poNumber vendor amount');

        const docs = docsRaw.map(row => {
            const doc = typeof row.toObject === 'function' ? row.toObject() : row;
            const lineItems = doc.extracted && Array.isArray(doc.extracted.lineItems)
                ? doc.extracted.lineItems
                : [];

            const unconfirmedLineCount = lineItems.filter(item => {
                const hasProductData = Boolean(
                    String(item.sku || '').trim() ||
                    String(item.upc || '').trim() ||
                    String(item.description || '').trim()
                );
                return hasProductData && item.isConfirmedProduct !== true;
            }).length;

            return {
                ...doc,
                unconfirmedLineCount
            };
        });

        const reviewDoc = docs.find(doc => (doc.unconfirmedLineCount || 0) > 0) || null;

        const [totalDocs, matchedDocs, needsReviewDocs, confirmationStats] = await Promise.all([
            HarvestIntakeDocument.countDocuments(),
            HarvestIntakeDocument.countDocuments({ 'matchSummary.purchaseOrderId': { $ne: null } }),
            HarvestIntakeDocument.countDocuments({ status: 'needs_review' }),
            HarvestIntakeDocument.aggregate([
                {
                    $match: {
                        $or: [
                            { isLatestRevision: true },
                            { isLatestRevision: { $exists: false } }
                        ]
                    }
                },
                {
                    $unwind: {
                        path: '$extracted.lineItems',
                        preserveNullAndEmptyArrays: false
                    }
                },
                {
                    $match: {
                        $and: [
                            {
                                $or: [
                                    { 'extracted.lineItems.sku': { $exists: true, $ne: '' } },
                                    { 'extracted.lineItems.upc': { $exists: true, $ne: '' } },
                                    { 'extracted.lineItems.description': { $exists: true, $ne: '' } }
                                ]
                            },
                            {
                                $or: [
                                    { 'extracted.lineItems.isConfirmedProduct': { $exists: false } },
                                    { 'extracted.lineItems.isConfirmedProduct': { $ne: true } }
                                ]
                            }
                        ]
                    }
                },
                {
                    $group: {
                        _id: null,
                        totalUnconfirmedProducts: { $sum: 1 },
                        docs: { $addToSet: '$_id' }
                    }
                },
                {
                    $project: {
                        _id: 0,
                        totalUnconfirmedProducts: 1,
                        docsNeedingConfirmation: { $size: '$docs' }
                    }
                }
            ])
        ]);

        const confirmationSummary = confirmationStats && confirmationStats[0]
            ? confirmationStats[0]
            : { totalUnconfirmedProducts: 0, docsNeedingConfirmation: 0 };

        const openLineItemSummary = await LineItem.aggregate([
            {
                $match: {
                    isHidden: { $ne: true },
                    sku: { $exists: true, $ne: '' }
                }
            },
            {
                $project: {
                    sku: 1,
                    openQty: {
                        $max: [
                            0,
                            {
                                $subtract: [
                                    { $ifNull: ['$quantityExpected', 0] },
                                    { $ifNull: ['$quantityReceived', 0] }
                                ]
                            }
                        ]
                    }
                }
            },
            {
                $match: {
                    openQty: { $gt: 0 }
                }
            },
            {
                $group: {
                    _id: '$sku',
                    openQty: { $sum: '$openQty' }
                }
            },
            { $sort: { openQty: -1 } },
            { $limit: 10 }
        ]);

        res.render('harvest-dashboard', {
            title: 'Harvest Dashboard',
            user: req.user,
            docs,
            reviewDoc,
            stats: {
                totalDocs,
                matchedDocs,
                needsReviewDocs,
                totalUnconfirmedProducts: confirmationSummary.totalUnconfirmedProducts,
                docsNeedingConfirmation: confirmationSummary.docsNeedingConfirmation
            },
            openLineItemSummary
        });
    } catch (error) {
        console.error('Harvest dashboard error:', error);
        res.status(500).send('Error loading Harvest dashboard');
    }
});

router.get('/document/:id', async (req, res) => {
    try {
        const doc = await HarvestIntakeDocument.findById(req.params.id)
            .populate('matchSummary.purchaseOrderId', 'poNumber vendor amount');

        if (!doc) {
            return res.status(404).send('Harvest document not found');
        }

        const safePath = resolveSafeHarvestFilePath(doc.file && doc.file.filePath);
        let parsedText = doc.extracted && doc.extracted.rawTextPreview
            ? doc.extracted.rawTextPreview
            : '';

        if (safePath && !parsedText) {
            try {
                const fullText = await harvestPdfExtractor.extractRawTextFromFile(safePath);
                parsedText = fullText.substring(0, 10000);
            } catch (parseError) {
                parsedText = `Unable to load parsed text: ${parseError.message}`;
            }
        }

        const nextDocWithUnconfirmed = await findNextDocumentWithUnconfirmedItems(doc);
        const confirmedCatalog = await loadHarvestConfirmedCatalog();
        const lineItems = doc.extracted && Array.isArray(doc.extracted.lineItems)
            ? doc.extracted.lineItems
            : [];

        const reviewItems = lineItems
            .map((item, index) => ({
                ...item,
                lineIndex: index,
                suggestions: confirmedCatalog.findConfirmedMatches(item, 5)
            }))
            .filter(item => {
                const hasProductData = Boolean(
                    String(item.sku || '').trim() ||
                    String(item.upc || '').trim() ||
                    String(item.description || '').trim()
                );

                return hasProductData && item.isConfirmedProduct !== true;
            });

        res.render('harvest-document-view', {
            title: 'Harvest Intake Document',
            user: req.user,
            doc,
            parsedText,
            hasSafePdf: Boolean(safePath),
            savedAutoJumpEnabled: doc.uiPreferences && typeof doc.uiPreferences.autoJumpEnabled === 'boolean'
                ? doc.uiPreferences.autoJumpEnabled
                : null,
            nextDocWithUnconfirmed,
            confirmedCatalog,
            reviewItems
        });
    } catch (error) {
        console.error('Harvest document detail error:', error);
        res.status(500).send('Error loading Harvest document');
    }
});

router.get('/document/:id/pdf', async (req, res) => {
    try {
        const doc = await HarvestIntakeDocument.findById(req.params.id).select('file');
        if (!doc) {
            return res.status(404).send('Harvest document not found');
        }

        const safePath = resolveSafeHarvestFilePath(doc.file && doc.file.filePath);
        if (!safePath) {
            return res.status(400).send('Invalid document file path');
        }

        await fs.access(safePath);
        res.type('application/pdf');
        return res.sendFile(safePath);
    } catch (error) {
        if (error && error.code === 'ENOENT') {
            return res.status(404).send('PDF file not found on disk');
        }

        console.error('Harvest document PDF error:', error);
        return res.status(500).send('Error loading PDF file');
    }
});

router.post('/document/:id/reparse', async (req, res) => {
    try {
        const doc = await HarvestIntakeDocument.findById(req.params.id);
        if (!doc) {
            return res.status(404).json({ success: false, error: 'Harvest document not found' });
        }

        const updated = await reparseExistingDocument(doc);

        // Analyze what was extracted
        const lineItems = updated.extracted?.lineItems || [];
        const itemsWithQtyOrdered = lineItems.filter(item => item.quantity !== null && item.quantity !== undefined).length;
        const itemsWithQtyReceived = lineItems.filter(item => item.quantityReceived !== null && item.quantityReceived !== undefined).length;
        const itemsWithAmount = lineItems.filter(item => item.amount !== null && item.amount !== undefined).length;
        const itemsWithPrice = lineItems.filter(item => item.unitPrice !== null && item.unitPrice !== undefined).length;

        return res.json({
            success: true,
            message: 'Document re-parsed successfully',
            documentId: updated._id,
            extracted: {
                poNumber: updated.extracted.poNumber || '',
                acknowledgementNumber: updated.extracted.acknowledgementNumber || '',
                orderNumber: updated.extracted.orderNumber || '',
                lineItemCount: Array.isArray(updated.extracted.lineItems) ? updated.extracted.lineItems.length : 0,
                dataQuality: {
                    itemsWithQtyOrdered,
                    itemsWithQtyReceived,
                    itemsWithAmount,
                    itemsWithPrice
                },
                sampleItems: lineItems.slice(0, 3).map(item => ({
                    lineNum: item.lineNumber,
                    desc: (item.description || '').substring(0, 30),
                    qty: item.quantity,
                    qtyRcv: item.quantityReceived,
                    amt: item.amount,
                    price: item.unitPrice
                }))
            }
        });
    } catch (error) {
        console.error('Harvest reparse error:', error);
        return res.status(500).json({ success: false, error: error.message });
    }
});

// Debug: Get full extracted data for a document
router.get('/document/:id/debug-extracted', async (req, res) => {
    try {
        const doc = await HarvestIntakeDocument.findById(req.params.id);
        if (!doc) {
            return res.status(404).json({ error: 'Document not found' });
        }

        const lineItems = doc.extracted?.lineItems || [];
        return res.json({
            documentId: doc._id,
            poNumber: doc.extracted?.poNumber,
            acknowledgementNumber: doc.extracted?.acknowledgementNumber,
            totalLineItems: lineItems.length,
            items: lineItems.map((item, idx) => ({
                index: idx + 1,
                lineNumber: item.lineNumber,
                description: item.description,
                upc: item.upc,
                sku: item.sku,
                quantity: item.quantity,
                quantityReceived: item.quantityReceived,
                qtyUom: item.qtyUom,
                retailPrice: item.retailPrice,
                unitPrice: item.unitPrice,
                amount: item.amount,
                _metadata: item._metadata
            }))
        });
    } catch (error) {
        console.error('Debug endpoint error:', error);
        res.status(500).json({ error: error.message });
    }
});

// Debug: Get raw PDF text (for troubleshooting extraction)
router.get('/document/:id/debug-raw-text', async (req, res) => {
    try {
        const doc = await HarvestIntakeDocument.findById(req.params.id);
        if (!doc) {
            return res.status(404).json({ error: 'Document not found' });
        }

        const safePath = resolveSafeHarvestFilePath(doc.file && doc.file.filePath);
        if (!safePath) {
            return res.status(400).json({ error: 'Invalid file path' });
        }

        const rawText = await harvestPdfExtractor.extractRawTextFromFile(safePath);

        // Find and highlight the Extended Amount section
        const extendedIndex = rawText.indexOf('Extended');
        const snippet = extendedIndex >= 0
            ? rawText.substring(Math.max(0, extendedIndex - 200), Math.min(rawText.length, extendedIndex + 1000))
            : '[EXTENDED AMOUNT SECTION NOT FOUND]';

        return res.json({
            fileName: doc.file?.fileName || 'unknown',
            totalChars: rawText.length,
            hasExtendedAmountSection: rawText.includes('Extended'),
            extendedAmountSnippet: snippet,
            fullText: rawText  // Send full text for inspection
        });
    } catch (error) {
        console.error('Debug raw text error:', error);
        res.status(500).json({ error: error.message });
    }
});

router.post('/document/:id/confirm-product', async (req, res) => {
    try {
        const doc = await HarvestIntakeDocument.findById(req.params.id);
        if (!doc) {
            return res.status(404).json({ success: false, error: 'Harvest document not found' });
        }

        const lineIndex = Number(req.body.lineIndex);
        const lineItems = doc.extracted && Array.isArray(doc.extracted.lineItems)
            ? doc.extracted.lineItems
            : [];

        if (!Number.isInteger(lineIndex) || lineIndex < 0 || lineIndex >= lineItems.length) {
            return res.status(400).json({ success: false, error: 'Invalid line item index.' });
        }

        const sku = String(req.body.sku || '').trim();
        const upc = normalizeUpc(req.body.upc || '');
        const description = String(req.body.description || '').trim();

        if (!sku && !upc && !description) {
            return res.status(400).json({ success: false, error: 'Provide at least one of SKU, UPC, or description.' });
        }

        const vendorName = (doc.extracted && doc.extracted.vendor) ? doc.extracted.vendor : '';
        const vendorKey = getVendorKey(doc.extracted || {});
        const skuKey = normalizeSku(sku);
        const descriptionKey = normalizeText(description);

        const referenceQuery = {
            vendorKey,
            $or: []
        };

        if (upc) referenceQuery.$or.push({ upcKey: upc });
        if (skuKey) referenceQuery.$or.push({ skuKey });
        if (descriptionKey) referenceQuery.$or.push({ descriptionKey });

        if (referenceQuery.$or.length === 0) {
            return res.status(400).json({ success: false, error: 'Could not derive reference key.' });
        }

        let ref = await HarvestProductReference.findOne(referenceQuery);
        const username = req.user ? req.user.username : 'Unknown User';

        if (!ref) {
            ref = new HarvestProductReference({
                vendorName,
                vendorKey,
                sku,
                skuKey,
                upc,
                upcKey: upc,
                description,
                descriptionKey,
                createdBy: username,
                lastConfirmedBy: username,
                lastConfirmedAt: new Date(),
                confirmCount: 1
            });
        } else {
            ref.vendorName = vendorName || ref.vendorName;
            ref.sku = sku || ref.sku;
            ref.skuKey = skuKey || ref.skuKey;
            ref.upc = upc || ref.upc;
            ref.upcKey = upc || ref.upcKey;
            ref.description = description || ref.description;
            ref.descriptionKey = descriptionKey || ref.descriptionKey;
            ref.confirmCount = Number(ref.confirmCount || 0) + 1;
            ref.lastConfirmedBy = username;
            ref.lastConfirmedAt = new Date();
        }

        await ref.save();

        const current = lineItems[lineIndex] || {};
        lineItems[lineIndex] = {
            ...current,
            sku: sku || current.sku || '',
            upc: upc || current.upc || '',
            description: description || current.description || '',
            isConfirmedProduct: true,
            productReferenceId: ref._id,
            confirmedBy: username,
            confirmedAt: new Date()
        };

        doc.extracted.lineItems = lineItems;

        const matchSummary = await buildMatchSummary(doc.extracted);
        const linkage = await buildEntityLinksAndLineItemMatches(doc.extracted, matchSummary);
        doc.matchSummary = matchSummary;
        doc.entityLinks = linkage.entityLinks;
        doc.lineItemMatches = linkage.lineItemMatches;
        doc.status = matchSummary.purchaseOrderId ? 'processed' : 'needs_review';

        await doc.save();

        return res.json({
            success: true,
            message: 'Product confirmation saved.',
            referenceId: ref._id,
            lineIndex
        });
    } catch (error) {
        console.error('Harvest confirm-product error:', error);
        return res.status(500).json({ success: false, error: error.message });
    }
});

router.post('/document/:id/preferences', async (req, res) => {
    try {
        const doc = await HarvestIntakeDocument.findById(req.params.id).select('_id uiPreferences');
        if (!doc) {
            return res.status(404).json({ success: false, error: 'Harvest document not found' });
        }

        if (typeof req.body.autoJumpEnabled !== 'boolean') {
            return res.status(400).json({ success: false, error: 'autoJumpEnabled must be a boolean.' });
        }

        doc.uiPreferences = doc.uiPreferences || {};
        doc.uiPreferences.autoJumpEnabled = req.body.autoJumpEnabled;
        await doc.save();

        return res.json({
            success: true,
            message: 'Document preferences saved.',
            autoJumpEnabled: doc.uiPreferences.autoJumpEnabled
        });
    } catch (error) {
        console.error('Harvest preferences save error:', error);
        return res.status(500).json({ success: false, error: error.message });
    }
});

router.get('/document/:id/next-unconfirmed', async (req, res) => {
    try {
        const doc = await HarvestIntakeDocument.findById(req.params.id)
            .select('_id createdAt extracted.lineItems file.originalName extracted.poNumber extracted.acknowledgementNumber extracted.orderNumber');

        if (!doc) {
            return res.status(404).json({ success: false, error: 'Harvest document not found' });
        }

        const nextDoc = await findNextDocumentWithUnconfirmedItems(doc);
        return res.json({ success: true, nextDoc });
    } catch (error) {
        console.error('Harvest next-unconfirmed lookup error:', error);
        return res.status(500).json({ success: false, error: error.message });
    }
});

router.post('/upload-pdf', uploadPdf.array('pdfFile', 30), async (req, res) => {
    try {
        const files = Array.isArray(req.files) ? req.files : [];
        if (files.length === 0) {
            return res.status(400).json({ success: false, error: 'At least one PDF file is required.' });
        }

        const allowIncrement = isTruthyFlag(req.body.allowIncrement);

        const processed = [];
        const errors = [];

        for (const upload of files) {
            try {
                const doc = await saveIngestDocument({
                    sourceType: 'manual_upload',
                    file: {
                        originalName: upload.originalname,
                        savedName: upload.filename,
                        filePath: upload.path,
                        mimeType: upload.mimetype,
                        size: upload.size
                    },
                    createdBy: req.user ? req.user.username : 'Unknown User',
                    allowIncrement
                });

                processed.push({
                    fileName: upload.originalname,
                    documentId: doc._id,
                    revisionNumber: doc.file && doc.file.revisionNumber ? doc.file.revisionNumber : 1,
                    extracted: {
                        poNumber: doc.extracted.poNumber,
                        acknowledgementNumber: doc.extracted.acknowledgementNumber,
                        orderNumber: doc.extracted.orderNumber,
                        vendor: doc.extracted.vendor,
                        confidence: doc.extracted.confidence
                    },
                    matchedPo: doc.matchSummary.purchaseOrderNumber || null
                });
            } catch (error) {
                try {
                    await fs.unlink(upload.path);
                } catch (unlinkError) {
                    console.warn('Harvest upload cleanup warning:', unlinkError.message);
                }

                if (error && error.code === 'DUPLICATE_FILENAME') {
                    errors.push({
                        fileName: upload.originalname,
                        duplicate: true,
                        error: error.message,
                        existingDocumentId: error.existingDocumentId,
                        existingRevisionNumber: error.existingRevisionNumber
                    });
                } else {
                    errors.push({
                        fileName: upload.originalname,
                        duplicate: false,
                        error: error && error.message ? error.message : 'Unknown error while processing file.'
                    });
                }
            }
        }

        const duplicateCount = errors.filter(row => row.duplicate).length;
        const response = {
            success: processed.length > 0,
            message: `Processed ${processed.length} of ${files.length} file(s).`,
            processedCount: processed.length,
            failedCount: errors.length,
            duplicateCount,
            documents: processed,
            errors
        };

        if (files.length === 1 && processed.length === 1 && errors.length === 0) {
            const firstDoc = processed[0];
            response.documentId = firstDoc.documentId;
            response.revisionNumber = firstDoc.revisionNumber;
            response.extracted = firstDoc.extracted;
            response.matchedPo = firstDoc.matchedPo;
        }

        const statusCode = processed.length > 0 ? 200 : 409;
        return res.status(statusCode).json(response);
    } catch (error) {
        const files = Array.isArray(req.files) ? req.files : [];
        await Promise.all(files.map(async upload => {
            try {
                await fs.unlink(upload.path);
            } catch (unlinkError) {
                console.warn('Harvest upload cleanup warning:', unlinkError.message);
            }
        }));

        if (error && error.code === 'DUPLICATE_FILENAME') {
            return res.status(409).json({
                success: false,
                error: error.message,
                duplicate: true,
                existingDocumentId: error.existingDocumentId,
                existingRevisionNumber: error.existingRevisionNumber
            });
        }

        console.error('Harvest upload error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

router.post('/ingest-gmail/:uid', async (req, res) => {
    let writtenFilePath = null;
    try {
        const uid = parseInt(req.params.uid, 10);
        const mailbox = req.body.mailbox || 'INBOX';
        const preferredAttachmentName = (req.body.attachmentName || '').trim();
        const allowIncrement = isTruthyFlag(req.body.allowIncrement);

        if (!Number.isInteger(uid)) {
            return res.status(400).json({ success: false, error: 'Invalid Gmail UID.' });
        }

        await gmailImapService.openMailbox(mailbox);
        const email = await gmailImapService.getEmailByUID(uid);

        if (!email) {
            return res.status(404).json({ success: false, error: 'Email not found.' });
        }

        const attachments = Array.isArray(email.attachments) ? email.attachments : [];
        let pdfAttachment = null;

        if (preferredAttachmentName) {
            pdfAttachment = attachments.find(att =>
                att.filename === preferredAttachmentName &&
                String(att.contentType || '').includes('pdf')
            );
        }

        if (!pdfAttachment) {
            pdfAttachment = attachments.find(att =>
                String(att.contentType || '').includes('pdf') ||
                String(att.filename || '').toLowerCase().endsWith('.pdf')
            );
        }

        if (!pdfAttachment || !pdfAttachment.content) {
            return res.status(400).json({
                success: false,
                error: 'No PDF attachment found in that email.'
            });
        }

        await fs.mkdir(uploadDir, { recursive: true });
        const safeName = (pdfAttachment.filename || `gmail-${uid}.pdf`).replace(/[^a-zA-Z0-9._-]/g, '_');
        const savedName = `${Date.now()}-${safeName}`;
        const filePath = path.join(uploadDir, savedName);
        writtenFilePath = filePath;

        await fs.writeFile(filePath, pdfAttachment.content);

        const doc = await saveIngestDocument({
            sourceType: 'gmail_attachment',
            file: {
                originalName: pdfAttachment.filename || safeName,
                savedName,
                filePath,
                mimeType: pdfAttachment.contentType || 'application/pdf',
                size: pdfAttachment.size || pdfAttachment.content.length
            },
            createdBy: req.user ? req.user.username : 'Unknown User',
            emailMetadata: {
                mailbox,
                uid,
                from: email.from || '',
                subject: email.subject || '',
                receivedAt: email.date || null,
                attachmentName: pdfAttachment.filename || ''
            },
            allowIncrement
        });

        res.json({
            success: true,
            message: `Gmail PDF attachment ingested successfully (revision ${doc.file && doc.file.revisionNumber ? doc.file.revisionNumber : 1})`,
            documentId: doc._id,
            revisionNumber: doc.file && doc.file.revisionNumber ? doc.file.revisionNumber : 1,
            extractedPoNumber: doc.extracted.poNumber || null,
            acknowledgementNumber: doc.extracted.acknowledgementNumber || null,
            orderNumber: doc.extracted.orderNumber || null,
            matchedPo: doc.matchSummary.purchaseOrderNumber || null,
            links: {
                vendorId: doc.entityLinks && doc.entityLinks.vendorId ? doc.entityLinks.vendorId : null,
                customerName: doc.entityLinks ? doc.entityLinks.customerName : '',
                customerEmail: doc.entityLinks ? doc.entityLinks.customerEmail : '',
                dropshipmentCount: doc.entityLinks && Array.isArray(doc.entityLinks.dropshipmentIds)
                    ? doc.entityLinks.dropshipmentIds.length
                    : 0,
                matchedLineItems: Array.isArray(doc.lineItemMatches)
                    ? doc.lineItemMatches.filter(item => item.matchType !== 'unmatched').length
                    : 0
            }
        });
    } catch (error) {
        if (writtenFilePath) {
            try {
                await fs.unlink(writtenFilePath);
            } catch (unlinkError) {
                console.warn('Harvest Gmail ingest cleanup warning:', unlinkError.message);
            }
        }

        if (error && error.code === 'DUPLICATE_FILENAME') {
            return res.status(409).json({
                success: false,
                error: error.message,
                duplicate: true,
                existingDocumentId: error.existingDocumentId,
                existingRevisionNumber: error.existingRevisionNumber
            });
        }

        console.error('Harvest Gmail ingest error:', error);
        res.status(500).json({ success: false, error: error.message });
    } finally {
        gmailImapService.disconnect();
    }
});

router.get('/api/reconciliation-summary', async (req, res) => {
    try {
        const [docsTotal, docsMatched, openSkuSummary, recentDocs] = await Promise.all([
            HarvestIntakeDocument.countDocuments(),
            HarvestIntakeDocument.countDocuments({ 'matchSummary.purchaseOrderId': { $ne: null } }),
            LineItem.aggregate([
                {
                    $match: {
                        isHidden: { $ne: true },
                        sku: { $exists: true, $ne: '' }
                    }
                },
                {
                    $project: {
                        sku: 1,
                        poNumber: 1,
                        openQty: {
                            $max: [
                                0,
                                {
                                    $subtract: [
                                        { $ifNull: ['$quantityExpected', 0] },
                                        { $ifNull: ['$quantityReceived', 0] }
                                    ]
                                }
                            ]
                        }
                    }
                },
                {
                    $match: {
                        openQty: { $gt: 0 }
                    }
                },
                {
                    $group: {
                        _id: '$sku',
                        totalOpenQty: { $sum: '$openQty' },
                        poCount: { $addToSet: '$poNumber' }
                    }
                },
                {
                    $project: {
                        _id: 0,
                        sku: '$_id',
                        totalOpenQty: 1,
                        poCount: { $size: '$poCount' }
                    }
                },
                { $sort: { totalOpenQty: -1 } },
                { $limit: 15 }
            ]),
            HarvestIntakeDocument.find().sort({ createdAt: -1 }).limit(5).select('extracted.poNumber extracted.vendor createdAt status')
        ]);

        res.json({
            success: true,
            generatedAt: new Date(),
            intake: {
                totalDocuments: docsTotal,
                matchedToPO: docsMatched,
                unmatched: Math.max(0, docsTotal - docsMatched)
            },
            receivingRisk: {
                topOpenSkus: openSkuSummary
            },
            recentIntake: recentDocs
        });
    } catch (error) {
        console.error('Harvest reconciliation summary error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

router.get('/products', async (req, res) => {
    try {
        const docs = await HarvestIntakeDocument.find()
            .select('extracted.lineItems extracted.acknowledgementNumber extracted.poNumber extracted.orderNumber extracted.vendor')
            .lean();

        // Flatten all line items with their document metadata
        const allProducts = [];
        docs.forEach(doc => {
            const ackNumber = doc.extracted?.acknowledgementNumber || doc.extracted?.poNumber || doc.extracted?.orderNumber || '-';
            const vendor = doc.extracted?.vendor || '';

            if (doc.extracted?.lineItems && Array.isArray(doc.extracted.lineItems)) {
                doc.extracted.lineItems.forEach(item => {
                    allProducts.push({
                        product: item.description || '-',
                        upc: item.upc || '-',
                        sku: item.sku || '-',
                        qtyOrdered: item.quantity !== null ? item.quantity : '-',
                        qtyReceived: item.quantityReceived !== null ? item.quantityReceived : '-',
                        acknowledgementNumber: ackNumber,
                        vendor,
                        isConfirmed: item.isConfirmedProduct === true,
                        description: item.description || ''
                    });
                });
            }
        });

        // Sort by description (product) ascending
        allProducts.sort((a, b) => (a.product || '').localeCompare(b.product || ''));

        res.render('harvest-products', {
            title: 'All Products',
            user: req.user,
            products: allProducts,
            totalProducts: allProducts.length,
            confirmedCount: allProducts.filter(p => p.isConfirmed).length,
            unconfirmedCount: allProducts.filter(p => !p.isConfirmed).length
        });
    } catch (error) {
        console.error('Harvest products page error:', error);
        res.status(500).send('Error loading products');
    }
});

router.post('/products/confirm', async (req, res) => {
    try {
        const { oldDescription, oldUpc, oldSku, newDescription, newUpc, newSku } = req.body;
        const username = req.user ? req.user.username : 'Unknown User';

        if (!oldDescription && !oldUpc && !oldSku) {
            return res.status(400).json({ success: false, error: 'Must provide at least old description, UPC, or SKU.' });
        }

        console.log(`[CONFIRM] Searching for OLD values: description="${oldDescription}", upc="${oldUpc}", sku="${oldSku}"`);
        console.log(`[CONFIRM] Will update to NEW values: description="${newDescription}", upc="${newUpc}", sku="${newSku}"`);

        // Find all documents with line items matching the OLD criteria
        const docs = await HarvestIntakeDocument.find({
            $or: [
                oldDescription ? { 'extracted.lineItems.description': oldDescription } : null,
                oldUpc ? { 'extracted.lineItems.upc': oldUpc } : null,
                oldSku ? { 'extracted.lineItems.sku': oldSku } : null
            ].filter(q => q !== null)
        });

        console.log(`[CONFIRM] Found ${docs.length} documents to check`);

        let confirmedCount = 0;
        let docsSaved = 0;

        for (const doc of docs) {
            if (!doc.extracted?.lineItems) continue;

            let itemsChangedInDoc = 0;

            for (let i = 0; i < doc.extracted.lineItems.length; i++) {
                const item = doc.extracted.lineItems[i];
                let isMatch = false;

                // Check if item matches OLD values
                if (oldDescription && (item.description || '').trim() === (oldDescription || '').trim()) {
                    isMatch = true;
                }
                if (oldUpc && item.upc === oldUpc && oldUpc) {
                    isMatch = true;
                }
                if (oldSku && item.sku === oldSku && oldSku) {
                    isMatch = true;
                }

                if (isMatch && !item.isConfirmedProduct) {
                    console.log(`[CONFIRM] Confirming item: OLD=${item.description}/${item.upc}/${item.sku}`);

                    // Update to new values
                    if (newDescription) doc.extracted.lineItems[i].description = newDescription;
                    if (newUpc) doc.extracted.lineItems[i].upc = newUpc;
                    if (newSku) doc.extracted.lineItems[i].sku = newSku;

                    // Mark as confirmed
                    doc.extracted.lineItems[i].isConfirmedProduct = true;
                    doc.extracted.lineItems[i].confirmedBy = username;
                    doc.extracted.lineItems[i].confirmedAt = new Date();

                    console.log(`[CONFIRM] \t→ NEW=${newDescription || item.description}/${newUpc || item.upc}/${newSku || item.sku}`);
                    confirmedCount++;
                    itemsChangedInDoc++;
                } else if (isMatch && item.isConfirmedProduct) {
                    console.log(`[CONFIRM] Item already confirmed: ${item.description} (UPC: ${item.upc}, SKU: ${item.sku})`);
                }
            }

            if (itemsChangedInDoc > 0) {
                await doc.save();
                docsSaved++;
                console.log(`[CONFIRM] Saved document (${itemsChangedInDoc} items updated)`);
            }
        }

        console.log(`[CONFIRM] Total: ${confirmedCount} items confirmed, ${docsSaved} documents saved`);

        return res.json({
            success: true,
            message: `Confirmed ${confirmedCount} item(s).`,
            confirmedCount
        });
    } catch (error) {
        console.error('Harvest confirm product error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

router.post('/products/update-confirmed', async (req, res) => {
    try {
        const { oldDescription, oldUpc, oldSku, newDescription, newUpc, newSku } = req.body;
        const username = req.user ? req.user.username : 'Unknown User';

        if ((!oldDescription && !oldUpc && !oldSku) || (!newDescription && !newUpc && !newSku)) {
            return res.status(400).json({ success: false, error: 'Must provide old and new values.' });
        }

        // Find all documents with line items matching the OLD criteria
        const docs = await HarvestIntakeDocument.find({
            $or: [
                oldDescription ? { 'extracted.lineItems.description': oldDescription } : null,
                oldUpc ? { 'extracted.lineItems.upc': oldUpc } : null,
                oldSku ? { 'extracted.lineItems.sku': oldSku } : null
            ].filter(q => q !== null)
        });

        let updatedCount = 0;

        for (const doc of docs) {
            if (!doc.extracted?.lineItems) continue;

            for (let i = 0; i < doc.extracted.lineItems.length; i++) {
                const item = doc.extracted.lineItems[i];
                let isMatch = false;

                if (oldDescription && (item.description || '').trim() === (oldDescription || '').trim()) {
                    isMatch = true;
                }
                if (oldUpc && item.upc === oldUpc && oldUpc) {
                    isMatch = true;
                }
                if (oldSku && item.sku === oldSku && oldSku) {
                    isMatch = true;
                }

                if (isMatch) {
                    // Update with new values
                    if (newDescription) doc.extracted.lineItems[i].description = newDescription;
                    if (newUpc) doc.extracted.lineItems[i].upc = newUpc;
                    if (newSku) doc.extracted.lineItems[i].sku = newSku;

                    // Keep confirmed status, update last edit timestamp
                    doc.extracted.lineItems[i].confirmedBy = username;
                    doc.extracted.lineItems[i].confirmedAt = new Date();
                    updatedCount++;
                }
            }

            if (updatedCount > 0) {
                await doc.save();
            }
        }

        return res.json({
            success: true,
            message: `Updated ${updatedCount} item(s).`,
            updatedCount
        });
    } catch (error) {
        console.error('Harvest update confirmed product error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

module.exports = router;
