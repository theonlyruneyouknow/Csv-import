const fs = require('fs');
const pdfParseModule = require('pdf-parse');
const parsePdf = typeof pdfParseModule === 'function'
    ? pdfParseModule
    : pdfParseModule && typeof pdfParseModule.default === 'function'
        ? pdfParseModule.default
        : null;

function toNumber(value) {
    if (!value) return null;
    const cleaned = String(value).replace(/[$,]/g, '').trim();
    const parsed = parseFloat(cleaned);
    return Number.isFinite(parsed) ? parsed : null;
}

function calculateConfidence(extracted) {
    let score = 0;
    if (extracted.poNumber) score += 0.35;
    if (extracted.vendor) score += 0.2;
    if (extracted.totalAmount !== null) score += 0.2;
    if (extracted.orderDate) score += 0.1;
    if (extracted.lineItems.length > 0) score += 0.15;
    return Math.min(1, score);
}

function extractLineItems(text) {
    const lines = text.split(/\r?\n/).map(line => line.trim()).filter(Boolean);
    const lineItems = [];

    const linePattern = /^(\S+)\s+(.+?)\s+(\d+(?:\.\d+)?)\s+\$?(\d+(?:,\d{3})*(?:\.\d+)?)\s+\$?(\d+(?:,\d{3})*(?:\.\d+)?)$/;

    for (const line of lines) {
        const match = line.match(linePattern);
        if (!match) continue;

        const [, sku, description, qty, unitPrice, amount] = match;
        lineItems.push({
            sku,
            description,
            quantity: toNumber(qty),
            unitPrice: toNumber(unitPrice),
            amount: toNumber(amount)
        });

        if (lineItems.length >= 200) break;
    }

    return lineItems;
}

function extractAcknowledgementLineItems(text) {
    const lines = text.split(/\r?\n/);
    const lineItems = [];

    const pageIndex = lines.findIndex(line => /Page\s+\d+\s+of\s+\d+/i.test(line));
    if (pageIndex < 0) {
        return lineItems;
    }

    const ackIndex = lines.findIndex((line, index) => index >= pageIndex && /ACKNOWLEDGEMENT/i.test(line));
    if (ackIndex < 0) {
        return lineItems;
    }

    function parseTrailingPrices(priceChunk) {
        const values = [];
        const decimalMatches = priceChunk.match(/\d+\.\d{2}/g) || [];
        decimalMatches.forEach(item => values.push(toNumber(item)));

        if (decimalMatches.length === 1) {
            const rest = priceChunk.replace(decimalMatches[0], '');
            if (/^\d{3,}$/.test(rest)) {
                values.push(toNumber(`${rest.slice(0, -2)}.${rest.slice(-2)}`));
            }
        }

        return {
            retailPrice: values[0] ?? null,
            unitPrice: values[1] ?? null,
            amount: values[2] ?? null
        };
    }

    function splitTailQuantities(tail) {
        if (!tail) {
            return { quantity: null, quantityReceived: null };
        }

        if (tail.length === 1) {
            return { quantity: toNumber(tail), quantityReceived: null };
        }

        if (tail.length === 2) {
            return { quantity: toNumber(tail), quantityReceived: null };
        }

        if (tail.length <= 5) {
            return { quantity: toNumber(tail), quantityReceived: null };
        }

        const half = Math.floor(tail.length / 2);
        const left = tail.slice(0, half);
        const right = tail.slice(half);
        if (left.length <= 5 && right.length <= 5) {
            return { quantity: toNumber(left), quantityReceived: toNumber(right) };
        }

        return { quantity: toNumber(tail), quantityReceived: null };
    }

    function findBestUpcSplit(body) {
        const candidates = [];

        function trailingDigitRun(value) {
            const match = String(value || '').match(/(\d+)$/);
            return match ? match[1].length : 0;
        }

        for (let start = 0; start < body.length; start += 1) {
            for (let len = 14; len >= 12; len -= 1) {
                const end = start + len;
                if (end > body.length) continue;

                const upcCandidate = body.slice(start, end);
                if (!/^\d{12,14}$/.test(upcCandidate)) continue;

                const prefix = body.slice(0, start);
                const tail = body.slice(end);
                if (!prefix || !/[A-Z]/i.test(prefix)) continue;
                if (tail.length > 6) continue;

                let score = 0;
                // Prefer splits that preserve SKU boundaries and realistic qty tails.
                score += (14 - Math.abs(14 - len)) * 10;
                if (len === 14) score += 6;
                score += Math.max(0, 6 - tail.length) * 4;
                if (tail.length >= 1 && tail.length <= 3) score += 12;
                if (tail.length === 0) score += 10;
                if (tail.length === 4) score += 10;
                if (/^[0-1]/.test(upcCandidate)) score += 2;
                if (/^00/.test(upcCandidate)) score -= 8;
                if (/[A-Z]$/i.test(prefix)) score += 10;
                if (/^[A-Z0-9-]+$/i.test(prefix)) score += 2;
                const trailingDigits = trailingDigitRun(prefix);

                candidates.push({ start, len, upcCandidate, prefix, tail, score, trailingDigits });
            }
        }

        if (candidates.length === 0) {
            return null;
        }

        candidates.sort((a, b) => b.score - a.score);

        const best = candidates[0];
        if (best.tail.length === 0 && best.trailingDigits >= 4) {
            const alternative = candidates
                .filter(c => c.tail.length === 1 && c.trailingDigits <= 3 && c.score >= best.score - 12)
                .sort((a, b) => b.score - a.score)[0];

            if (alternative) {
                return alternative;
            }
        }

        return best;
    }

    function parseAcknowledgementCompactRow(compact) {
        const startMatch = compact.match(/^(\d+)(.+)$/);
        if (!startMatch) {
            return null;
        }

        const lineNumber = toNumber(startMatch[1]);
        let body = startMatch[2];

        const uomMatch = body.match(/(EA|CS|CT|BX|PK|LB|RL|PC|PR|QT|GA|OZ|ML|KG|GM|FT|IN|BT)(\d[\d\.]+)$/i);
        if (!uomMatch) {
            return null;
        }

        const qtyUom = uomMatch[1].toUpperCase();
        const priceChunk = uomMatch[2];
        body = body.slice(0, body.length - uomMatch[0].length);

        const prices = parseTrailingPrices(priceChunk);

        let sku = body;
        let upc = '';
        let quantity = null;
        let quantityReceived = null;

        const split = findBestUpcSplit(body);
        if (split) {
            sku = split.prefix;
            upc = split.upcCandidate;
            const qtySplit = splitTailQuantities(split.tail);
            quantity = qtySplit.quantity;
            quantityReceived = qtySplit.quantityReceived;
        }

        if (!upc) {
            const digitsAtEnd = body.match(/(\d{1,4})$/);
            if (digitsAtEnd && /[A-Z]/i.test(body)) {
                const trailing = digitsAtEnd[1];
                const tail2 = trailing.slice(-2);
                const tail3 = trailing.slice(-3);
                const q2 = toNumber(tail2);
                const q3 = toNumber(tail3);

                if (tail2.length === 2 && q2 !== null && q2 > 0 && q2 <= 99 && body.length > 8) {
                    sku = body.slice(0, -2);
                    quantity = q2;
                } else if (tail3.length === 3 && q3 !== null && q3 > 0 && q3 <= 999 && body.length > 9) {
                    sku = body.slice(0, -3);
                    quantity = q3;
                } else {
                    const qtyAtEndMatch = body.match(/^(.*?)(\d{1,5})$/);
                    if (qtyAtEndMatch && /[A-Z]/i.test(qtyAtEndMatch[1])) {
                        sku = qtyAtEndMatch[1];
                        quantity = toNumber(qtyAtEndMatch[2]);
                    }
                }
            }
        }

        return {
            lineNumber,
            sku,
            upc,
            quantity,
            quantityReceived,
            qtyUom,
            retailPrice: prices.retailPrice,
            unitPrice: prices.unitPrice,
            amount: prices.amount
        };
    }

    for (let i = ackIndex + 1; i < lines.length; i += 1) {
        const compact = String(lines[i] || '').replace(/\s+/g, '');
        if (!compact) {
            continue;
        }

        if (/LinesTotal|GrandTotal/i.test(compact)) {
            break;
        }

        const parsedRow = parseAcknowledgementCompactRow(compact);
        if (!parsedRow) {
            continue;
        }

        let description = '';
        const nextLine = (lines[i + 1] || '').trim();
        if (nextLine && !/^\d+[A-Z]/.test(nextLine.replace(/\s+/g, ''))) {
            description = nextLine;
            i += 1;
        }

        lineItems.push({
            lineNumber: parsedRow.lineNumber,
            sku: parsedRow.sku,
            upc: parsedRow.upc,
            description,
            quantity: parsedRow.quantity,
            quantityReceived: parsedRow.quantityReceived,
            qtyUom: parsedRow.qtyUom,
            retailPrice: parsedRow.retailPrice,
            unitPrice: parsedRow.unitPrice,
            amount: parsedRow.amount
        });

        if (lineItems.length >= 500) {
            break;
        }
    }

    return lineItems;
}

function extractFromText(text) {
    const acknowledgementMatch = text.match(/(?:^|\n)\s*([A-Z0-9\-]+)\s+ACKNOWLEDGEMENT\b/i);
    const poMatch = text.match(/(?:PO\s*(?:#|Number|No\.?|:)\s*)([A-Z0-9\-]+)/i);
    const orderNumberMatch = text.match(/Order\s*#\s*([A-Z0-9\-]+)/i);
    const vendorMatch = text.match(/(?:Vendor|Supplier|From)\s*[:\-]\s*([^\n\r]+)/i);
    const customerMatch = text.match(/(?:Customer|Ship\s*To|Bill\s*To)\s*[:\-]\s*([^\n\r]+)/i);
    const customerEmailMatch = text.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i);
    const orderRefMatch = text.match(/(?:Order\s*(?:#|Number|No\.?|Ref(?:erence)?)\s*[:\-]?\s*)([A-Z0-9\-]+)/i);
    const dateMatch = text.match(/(?:Order\s*Date|Date)\s*[:\-]\s*([A-Za-z0-9,\/-]+)/i);
    const totalMatch = text.match(/(?:Total|Order\s*Total|Grand\s*Total)\s*[:\-]?\s*\$?([0-9,]+(?:\.[0-9]{2})?)/i);

    const ackLineItems = extractAcknowledgementLineItems(text);
    const genericLineItems = extractLineItems(text);
    const selectedLineItems = ackLineItems.length > 0 ? ackLineItems : genericLineItems;

    const extracted = {
        poNumber: acknowledgementMatch
            ? acknowledgementMatch[1].trim()
            : (orderNumberMatch
                ? orderNumberMatch[1].trim()
                : (poMatch ? poMatch[1].trim() : '')),
        acknowledgementNumber: acknowledgementMatch ? acknowledgementMatch[1].trim() : '',
        orderNumber: orderNumberMatch ? orderNumberMatch[1].trim() : '',
        vendor: vendorMatch ? vendorMatch[1].trim() : '',
        customerName: customerMatch ? customerMatch[1].trim() : '',
        customerEmail: customerEmailMatch ? customerEmailMatch[0].trim() : '',
        externalOrderRef: orderRefMatch
            ? orderRefMatch[1].trim()
            : (orderNumberMatch ? orderNumberMatch[1].trim() : ''),
        orderDate: dateMatch ? dateMatch[1].trim() : '',
        totalAmount: totalMatch ? toNumber(totalMatch[1]) : null,
        currency: 'USD',
        lineItems: selectedLineItems,
        rawTextPreview: text.substring(0, 2000)
    };

    extracted.confidence = calculateConfidence(extracted);

    return extracted;
}

async function extractFromFile(filePath) {
    if (!parsePdf) {
        throw new Error('PDF parser is not available. Check pdf-parse installation.');
    }

    const buffer = await fs.promises.readFile(filePath);
    const parsed = await parsePdf(buffer);
    const text = parsed && parsed.text ? parsed.text : '';

    if (!text || !text.trim()) {
        return {
            poNumber: '',
            acknowledgementNumber: '',
            orderNumber: '',
            vendor: '',
            customerName: '',
            customerEmail: '',
            externalOrderRef: '',
            orderDate: '',
            totalAmount: null,
            currency: 'USD',
            lineItems: [],
            rawTextPreview: '',
            confidence: 0
        };
    }

    return extractFromText(text);
}

async function extractRawTextFromFile(filePath) {
    if (!parsePdf) {
        throw new Error('PDF parser is not available. Check pdf-parse installation.');
    }

    const buffer = await fs.promises.readFile(filePath);
    const parsed = await parsePdf(buffer);
    return parsed && parsed.text ? parsed.text : '';
}

module.exports = {
    extractFromFile,
    extractFromText,
    extractRawTextFromFile
};
