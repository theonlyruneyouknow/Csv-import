const fs = require('fs/promises');
const path = require('path');
const harvestPdfExtractor = require('./harvestPdfExtractor');

const sourceDir = path.join(__dirname, '../uploads/harvest-documents');

let cachedSignature = null;
let cachedCatalog = null;

function normalizeText(value) {
    return String(value || '')
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, ' ')
        .trim();
}

function normalizeDigits(value) {
    return String(value || '').replace(/\D+/g, '').trim();
}

function tokenize(value) {
    return normalizeText(value).split(/\s+/).filter(Boolean);
}

function makeGroupKey(item) {
    const upcKey = normalizeDigits(item.upc);
    const descriptionKey = normalizeText(item.description);
    const skuKey = normalizeText(item.sku);
    return [upcKey || '-', descriptionKey || '-', skuKey || '-'].join('|');
}

function mergeClusterTarget(cluster, row) {
    cluster.count += 1;
    cluster.files.add(row.fileName);
    if (row.poNumber) cluster.poNumbers.add(row.poNumber);
    if (row.description) cluster.descriptions.add(row.description);
    if (row.upc) cluster.upcs.add(row.upc);
    if (row.sku) cluster.skus.add(row.sku);
    cluster.rows.push(row);
}

async function buildDirectorySignature() {
    const entries = await fs.readdir(sourceDir, { withFileTypes: true });
    const pdfFiles = entries
        .filter(entry => entry.isFile() && entry.name.toLowerCase().endsWith('.pdf'))
        .map(entry => entry.name)
        .sort((a, b) => a.localeCompare(b));

    const statParts = [];
    for (const fileName of pdfFiles) {
        const filePath = path.join(sourceDir, fileName);
        const stat = await fs.stat(filePath);
        statParts.push(`${fileName}:${stat.mtimeMs}:${stat.size}`);
    }

    return {
        pdfFiles,
        signature: statParts.join('|')
    };
}

function scoreConfirmedMatch(reviewItem, candidate) {
    const reviewUpc = normalizeDigits(reviewItem.upc);
    const reviewSku = normalizeText(reviewItem.sku);
    const reviewDescription = normalizeText(reviewItem.description);

    const candidateUpc = normalizeDigits(candidate.upc);
    const candidateSku = normalizeText(candidate.sku);
    const candidateDescription = normalizeText(candidate.description || candidate.product || '');

    let score = 0;
    const reasons = [];

    if (reviewUpc && candidateUpc && reviewUpc === candidateUpc) {
        return {
            score: 100,
            reasons: ['Exact UPC match']
        };
    }

    if (reviewSku && candidateSku && reviewSku === candidateSku) {
        score += 85;
        reasons.push('Exact SKU match');
    }

    if (reviewDescription && candidateDescription && reviewDescription === candidateDescription) {
        score += 70;
        reasons.push('Exact description match');
    } else if (reviewDescription && candidateDescription && (
        reviewDescription.includes(candidateDescription) || candidateDescription.includes(reviewDescription)
    )) {
        score += 45;
        reasons.push('Description overlap');
    }

    const reviewTokens = new Set(tokenize(reviewItem.description));
    const candidateTokens = new Set(tokenize(candidate.description || candidate.product || ''));
    const overlap = [...reviewTokens].filter(token => candidateTokens.has(token)).length;
    const union = new Set([...reviewTokens, ...candidateTokens]).size;

    if (union > 0 && overlap > 0) {
        score += Math.round((overlap / union) * 40);
        reasons.push(`${overlap} shared word${overlap === 1 ? '' : 's'}`);
    }

    if (candidate.count > 1) {
        score += Math.min(10, candidate.count * 2);
    }

    return {
        score: Math.max(0, Math.min(100, score)),
        reasons
    };
}

function findConfirmedMatches(reviewItem, confirmedRows, limit = 5) {
    const candidates = confirmedRows.map(candidate => {
        const match = scoreConfirmedMatch(reviewItem, candidate);
        return {
            ...candidate,
            score: match.score,
            reasons: match.reasons
        };
    });

    return candidates
        .filter(candidate => candidate.score > 0)
        .sort((a, b) => b.score - a.score || b.count - a.count || a.description.localeCompare(b.description))
        .slice(0, limit);
}

async function loadHarvestConfirmedCatalog({ forceReload = false } = {}) {
    const { pdfFiles, signature } = await buildDirectorySignature();

    if (!forceReload && cachedCatalog && cachedSignature === signature) {
        return cachedCatalog;
    }

    const allRows = [];
    const byGroup = new Map();
    const byDescription = new Map();
    const bySku = new Map();
    const byUpc = new Map();
    const parseErrors = [];
    const docsWithItems = [];

    for (const fileName of pdfFiles) {
        const filePath = path.join(sourceDir, fileName);

        try {
            const extracted = await harvestPdfExtractor.extractFromFile(filePath);
            const lineItems = Array.isArray(extracted.lineItems) ? extracted.lineItems : [];

            if (lineItems.length > 0) {
                docsWithItems.push({
                    fileName,
                    poNumber: extracted.poNumber || '',
                    vendor: extracted.vendor || '',
                    lineItemCount: lineItems.length
                });
            }

            lineItems.forEach((item, index) => {
                const row = {
                    fileName,
                    poNumber: extracted.poNumber || '',
                    vendor: extracted.vendor || '',
                    lineNumber: item.lineNumber ?? index + 1,
                    sku: item.sku || '',
                    upc: item.upc || '',
                    description: item.description || '',
                    quantity: item.quantity ?? null,
                    qtyUom: item.qtyUom || '',
                    retailPrice: item.retailPrice ?? null,
                    unitPrice: item.unitPrice ?? null,
                    amount: item.amount ?? null
                };

                allRows.push(row);

                const groupKey = makeGroupKey(item);
                if (!byGroup.has(groupKey)) {
                    byGroup.set(groupKey, {
                        product: item.description || item.sku || '',
                        description: item.description || '',
                        upc: item.upc || '',
                        sku: item.sku || '',
                        count: 0,
                        poNumbers: new Set(),
                        files: new Set(),
                        descriptions: new Set(),
                        upcs: new Set(),
                        skus: new Set(),
                        rows: []
                    });
                }

                const group = byGroup.get(groupKey);
                mergeClusterTarget(group, row);

                const descriptionKey = normalizeText(item.description);
                if (descriptionKey) {
                    if (!byDescription.has(descriptionKey)) {
                        byDescription.set(descriptionKey, {
                            description: item.description || '',
                            count: 0,
                            files: new Set(),
                            poNumbers: new Set(),
                            descriptions: new Set(),
                            upcs: new Set(),
                            skus: new Set(),
                            rows: []
                        });
                    }
                    mergeClusterTarget(byDescription.get(descriptionKey), row);
                }

                const skuKey = normalizeText(item.sku);
                if (skuKey) {
                    if (!bySku.has(skuKey)) {
                        bySku.set(skuKey, {
                            sku: item.sku || '',
                            count: 0,
                            files: new Set(),
                            poNumbers: new Set(),
                            descriptions: new Set(),
                            upcs: new Set(),
                            skus: new Set(),
                            rows: []
                        });
                    }
                    mergeClusterTarget(bySku.get(skuKey), row);
                }

                const upcKey = normalizeDigits(item.upc);
                if (upcKey) {
                    if (!byUpc.has(upcKey)) {
                        byUpc.set(upcKey, {
                            upc: item.upc || '',
                            descriptionSet: new Set(),
                            skuSet: new Set(),
                            poNumbers: new Set(),
                            files: new Set(),
                            count: 0
                        });
                    }

                    const upcGroup = byUpc.get(upcKey);
                    upcGroup.count += 1;
                    if (item.description) upcGroup.descriptionSet.add(item.description);
                    if (item.sku) upcGroup.skuSet.add(item.sku);
                    if (extracted.poNumber) upcGroup.poNumbers.add(extracted.poNumber);
                    upcGroup.files.add(fileName);
                }
            });
        } catch (error) {
            parseErrors.push({ fileName, error: error.message });
        }
    }

    const confirmedRows = [...byGroup.values()]
        .sort((a, b) => {
            const aKey = `${normalizeText(a.description)}|${normalizeDigits(a.upc)}|${normalizeText(a.sku)}`;
            const bKey = `${normalizeText(b.description)}|${normalizeDigits(b.upc)}|${normalizeText(b.sku)}`;
            return aKey.localeCompare(bKey) || b.count - a.count;
        });

    const repeatedDescriptions = confirmedRows
        .filter(group => group.count > 1)
        .sort((a, b) => b.count - a.count);

    const repeatedUpcs = [...byUpc.values()]
        .filter(group => group.count > 1)
        .sort((a, b) => b.count - a.count);

    const descriptionReviewQueue = [...byDescription.values()]
        .filter(group => group.count > 1 && (group.upcs.size > 1 || group.skus.size > 1))
        .sort((a, b) => b.count - a.count || b.upcs.size - a.upcs.size || b.skus.size - a.skus.size);

    const upcReviewQueue = [...byUpc.values()]
        .filter(group => group.count > 1 && group.descriptionSet.size > 1)
        .sort((a, b) => b.count - a.count || b.descriptionSet.size - a.descriptionSet.size);

    const skuReviewQueue = [...bySku.values()]
        .filter(group => group.count > 1 && (group.upcs.size > 1 || group.descriptions.size > 1))
        .sort((a, b) => b.count - a.count || b.upcs.size - a.upcs.size || b.descriptions.size - a.descriptions.size);

    const catalog = {
        pdfFiles,
        totalRows: allRows.length,
        uniqueItems: confirmedRows.length,
        uniqueUpcs: byUpc.size,
        parseErrors,
        docsWithItems,
        confirmedRows,
        repeatedDescriptions,
        repeatedUpcs,
        descriptionReviewQueue,
        upcReviewQueue,
        skuReviewQueue,
        groupedRows: confirmedRows,
        findConfirmedMatches: (reviewItem, limit = 5) => findConfirmedMatches(reviewItem, confirmedRows, limit)
    };

    cachedSignature = signature;
    cachedCatalog = catalog;
    return catalog;
}

module.exports = {
    loadHarvestConfirmedCatalog,
    findConfirmedMatches,
    normalizeText,
    normalizeDigits
};
