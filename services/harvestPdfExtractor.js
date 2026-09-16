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

function parseDate(dateString) {
    if (!dateString) return null;
    const trimmed = String(dateString).trim();

    // Try common date patterns
    const patterns = [
        /(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})/,  // MM/DD/YYYY or MM-DD-YYYY
        /(\d{4})[\/\-](\d{1,2})[\/\-](\d{1,2})/,  // YYYY/MM/DD
        /(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+(\d{1,2}),?\s+(\d{4})/i  // Month DD, YYYY
    ];

    for (const pattern of patterns) {
        const match = trimmed.match(pattern);
        if (match) {
            const date = new Date(match[0]);
            if (!isNaN(date.getTime())) {
                return date;
            }
        }
    }

    return null;
}

// Known manufacturer UPC prefixes (first 6 digits) for validation/correction
const UPC_PREFIXES = {
    '793094': { name: 'Gen Hydro', category: 'Hydro' },
    '078340': { name: 'GreenGro', category: 'Soil' },
    '858783': { name: 'GreenGro', category: 'Soil' },
    '639277': { name: 'Common vendor', category: 'General' },
    // Add more known prefixes as discovered
};

function findKnownUpcInString(body) {
    /**
     * Search for known UPC prefixes in a string
     * Returns { found: true/false, prefix, position, upc }
     */
    for (const [prefix, info] of Object.entries(UPC_PREFIXES)) {
        const position = body.indexOf(prefix);
        if (position !== -1) {
            // Extract 12 digits starting from this prefix
            const upc = body.substring(position, position + 12);
            if (/^\d{12}$/.test(upc)) {
                return {
                    found: true,
                    prefix,
                    position,
                    upc,
                    manufacturer: info.name,
                    category: info.category
                };
            }
        }
    }

    return { found: false, prefix: null, position: -1, upc: '', manufacturer: null };
}

function correctUpcTo12Digits(upc) {
    if (!upc) return { value: '', corrected: false, method: null };

    const cleaned = String(upc).replace(/[^\d]/g, '');

    // Already 12 digits
    if (cleaned.length === 12) {
        return { value: cleaned, corrected: false, method: 'valid' };
    }

    // More than 12 digits - try to find valid 12-digit sequence
    if (cleaned.length > 12) {
        const prefix = cleaned.substring(0, 6);
        if (UPC_PREFIXES[prefix]) {
            // Try taking first 12 digits
            return { value: cleaned.substring(0, 12), corrected: true, method: 'trimmed_prefix' };
        }
        // Try taking last 12 digits
        return { value: cleaned.substring(cleaned.length - 12), corrected: true, method: 'trimmed_suffix' };
    }

    // Less than 12 digits - try padding
    if (cleaned.length < 12) {
        const prefix = cleaned.substring(0, Math.min(6, cleaned.length));
        if (UPC_PREFIXES[prefix]) {
            // Pad with zeros on the right
            const padded = cleaned + '0'.repeat(12 - cleaned.length);
            return { value: padded, corrected: true, method: 'padded_right' };
        }
    }

    // Return original if unable to correct
    return { value: cleaned, corrected: false, method: 'cannot_correct' };
}

function calculateMissingQuantityReceived(quantity, quantityReceived, unitPrice, amount) {
    // If we already have quantityReceived, return it
    if (quantityReceived !== null && quantityReceived !== undefined) {
        return { value: quantityReceived, calculated: false, method: null };
    }

    // PRIORITY: Calculate from extended amount (most reliable)
    if (amount !== null && unitPrice !== null && unitPrice !== 0) {
        const calculated = Math.round((amount / unitPrice) * 100) / 100;
        return { value: calculated, calculated: true, method: 'calculated_from_amount' };
    }

    // If we have quantity, assume most orders have same qty ordered = qty received
    if (quantity !== null && quantity !== undefined) {
        return { value: quantity, calculated: false, method: 'default_from_quantity' };
    }

    // Unable to determine
    return { value: null, calculated: false, method: null };
}

function parseAcknowledgementLineItemAdvanced(compact, extendedAmountLookup) {
    /**
     * Simplified parsing using extended amounts
     * 1. Extract UOM and prices
     * 2. Get extended amount from lookup (line number -> amount)
     * 3. Calculate Qty = Extended Amount / Unit Price
     * 4. Remove (digit count of qty) digits from end of string
     * 5. Last 12 digits = UPC
     * 6. Everything before = SKU
     */
    const startMatch = compact.match(/^(\d+)(.+)$/);
    if (!startMatch) {
        return null;
    }

    const lineNumber = toNumber(startMatch[1]);
    let body = startMatch[2];

    // Extract UOM and price chunk (anchor point)
    const uomMatch = body.match(/(EA|CS|CT|BX|PK|LB|RL|PC|PR|QT|GA|OZ|ML|KG|GM|FT|IN|BT)(\d[\d\.]+)$/i);
    if (!uomMatch) {
        return null;
    }

    const qtyUom = uomMatch[1].toUpperCase();
    const priceChunk = uomMatch[2];
    body = body.slice(0, body.length - uomMatch[0].length);

    const prices = parseTrailingPrices(priceChunk);

    // Use extended amount to calculate quantity
    let quantity = null;
    let quantityReceived = null;
    let amount = prices.amount;

    const extendedAmount = extendedAmountLookup ? extendedAmountLookup[lineNumber] : null;
    if (extendedAmount && prices.unitPrice) {
        quantity = Math.round(extendedAmount / prices.unitPrice);
        quantityReceived = quantity; // Same as ordered
        amount = extendedAmount;
        console.log(`[PDF Advanced] Line ${lineNumber}: Extended=${extendedAmount}, UnitPrice=${prices.unitPrice}, Qty=${quantity}`);
    }

    // Now remove (digit count of quantity) digits from the end of body
    let sku = body;
    let upc = '';

    if (quantity !== null) {
        const qtyDigitCount = String(quantity).length;
        // Remove that many digits from end
        const trimmedBody = body.slice(0, -qtyDigitCount);

        // Last 12 digits of trimmed = UPC
        if (trimmedBody.length >= 12) {
            const lastChars = trimmedBody.slice(-12);
            if (/^\d{12}$/.test(lastChars)) {
                upc = lastChars;
                sku = trimmedBody.slice(0, -12);
                console.log(`[PDF Advanced] Line ${lineNumber}: SKU="${sku.trim()}", UPC="${upc}", Qty=${quantity}, Amt=${amount}`);
            } else {
                sku = trimmedBody;
            }
        } else {
            sku = trimmedBody;
        }
    }

    return {
        lineNumber,
        sku: sku.trim(),
        upc,
        quantity,
        quantityReceived,
        qtyUom,
        retailPrice: prices.retailPrice,
        unitPrice: prices.unitPrice,
        amount,
        _metadata: {
            quantityReceivedCalculated: quantity !== null,
            quantityReceivedMethod: extendedAmount ? 'extended_amount_divided_by_unit_price' : 'none'
        }
    };
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

function extractExtendedAmounts(text) {
    /**
     * Extract extended amounts from PDF acknowledgement
     * The PDF structure is:
     *   Extended Amount Printed: 06/23/26 5:31 PM
     *   [header lines repeated]
     *   19.76
     *   48.42
     *   ...
     *   300.96
     *   2,562.06 <- Total (stop here)
     *   50.00 <- Freight
     *   2,612.06 <- Grand Total
     *   [line item details start: 1HGC72836...]
     */
    const extendedAmounts = {};

    // Find "Printed:" - this marks the start of amounts section
    const printedMatch = text.match(/Printed:\s*(\d{2}\/\d{2}\/\d{2}\s+\d{1,2}:\d{2}\s+[AP]M)/);
    if (!printedMatch) {
        console.log('[PDF Extractor] No "Printed:" line found');
        return extendedAmounts;
    }

    console.log(`[PDF Extractor] Found Printed line: ${printedMatch[0]}`);

    // Find the position after the last "Printed:" line
    const lastPrintedIndex = text.lastIndexOf(printedMatch[0]);
    const afterPrinted = text.substring(lastPrintedIndex + printedMatch[0].length);

    // Split into lines
    const lines = afterPrinted.split(/[\r\n]+/);

    let lineNumber = 1;
    let foundAmounts = 0;

    for (let i = 0; i < lines.length && foundAmounts < 500; i++) {
        const trimmed = lines[i].trim();

        // Skip empty lines and header-like text
        if (!trimmed || /^(Ln|#|Product|Customer|SKU|UPC|Quantity|U\/M|Retail|Unit|Price|Extended|Amount|Printed)/i.test(trimmed)) {
            continue;
        }

        // Stop at page markers or line item details (starts with 1-2 digits followed by letters)
        if (/^Page\s+\d+\s+of\s+\d+/i.test(trimmed) || /^\d{1,2}[A-Z]/i.test(trimmed)) {
            console.log(`[PDF Extractor] Stopped at line item: ${trimmed.substring(0, 50)}`);
            break;
        }

        // Stop if we see "Lines Total" or similar totals markers (these appear on same line as extended amount)
        if (/Lines\s+Total|Lines\s+Ordered|Freight|GrandTotal|Grand\s+Total/i.test(trimmed)) {
            console.log(`[PDF Extractor] Stopped at totals line: ${trimmed.substring(0, 50)}`);
            break;
        }

        // Try to parse as a decimal amount (currency format)
        const amountMatch = trimmed.match(/^(\d+(?:,\d{3})*(?:\.\d{2})?)(?:\s|$)/);
        if (amountMatch) {
            const amount = toNumber(amountMatch[1]);
            if (amount !== null && amount > 0) {
                extendedAmounts[lineNumber] = amount;
                foundAmounts++;
                console.log(`[PDF Extractor] Line ${lineNumber}: ${amount}`);
                lineNumber++;
            }
        }
    }

    console.log(`[PDF Extractor] RESULT: Extracted ${Object.keys(extendedAmounts).length} extended amounts`);
    return extendedAmounts;
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

function trailingDigitRun(value) {
    const match = String(value || '').match(/(\d+)$/);
    return match ? match[1].length : 0;
}

function findBestUpcSplit(body) {
    const candidates = [];

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
            const trailing = trailingDigitRun(prefix);

            candidates.push({ start, len, upcCandidate, prefix, tail, score, trailingDigits: trailing });
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

    // Extract extended amounts from PDF section (used for qty received calculation)
    const extendedAmountLookup = extractExtendedAmounts(text);
    console.log('[PDF Extractor] Extended amounts found:', Object.keys(extendedAmountLookup).length);

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

        // Use extended amount lookup to calculate quantity
        let quantity = null;
        let quantityReceived = null;
        let amount = prices.amount;

        const extendedAmount = extendedAmountLookup ? extendedAmountLookup[lineNumber] : null;
        if (extendedAmount && prices.unitPrice) {
            quantity = Math.round(extendedAmount / prices.unitPrice);
            quantityReceived = quantity;
            amount = extendedAmount;
            console.log(`[PDF Fallback] Line ${lineNumber}: Extended=${extendedAmount}, UnitPrice=${prices.unitPrice}, Qty=${quantity}`);
        }

        // Remove (digit count of quantity) digits from the end
        let sku = body;
        let upc = '';

        if (quantity !== null) {
            const qtyDigitCount = String(quantity).length;
            const trimmedBody = body.slice(0, -qtyDigitCount);

            // Last 12 digits = UPC
            if (trimmedBody.length >= 12) {
                const lastChars = trimmedBody.slice(-12);
                if (/^\d{12}$/.test(lastChars)) {
                    upc = lastChars;
                    sku = trimmedBody.slice(0, -12);
                } else {
                    sku = trimmedBody;
                }
            } else {
                sku = trimmedBody;
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
            amount
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

        // Try advanced parser first (with known UPC prefix matching)
        const parsedRow = parseAcknowledgementLineItemAdvanced(compact, extendedAmountLookup);

        if (!parsedRow) {
            console.log(`[PDF Extractor] Advanced parser returned null for: ${compact.substring(0, 50)}...`);
            // Fallback to original parser
            const fallbackRow = parseAcknowledgementCompactRow(compact);
            if (!fallbackRow) {
                continue;
            }

            let description = '';
            const nextLine = (lines[i + 1] || '').trim();
            if (nextLine && !/^\d+[A-Z]/.test(nextLine.replace(/\s+/g, ''))) {
                description = nextLine;
                i += 1;
            }

            console.log(`[PDF Extractor] Fallback: Line ${fallbackRow.lineNumber}, SKU: ${fallbackRow.sku}, Qty: ${fallbackRow.quantity}, QtyRcv: ${fallbackRow.quantityReceived}`);

            lineItems.push({
                lineNumber: fallbackRow.lineNumber,
                sku: fallbackRow.sku,
                upc: fallbackRow.upc,
                description,
                quantity: fallbackRow.quantity,
                quantityReceived: fallbackRow.quantityReceived,
                qtyUom: fallbackRow.qtyUom,
                retailPrice: fallbackRow.retailPrice,
                unitPrice: fallbackRow.unitPrice,
                amount: fallbackRow.amount
            });
        } else {
            // Advanced parser succeeded
            let description = '';
            const nextLine = (lines[i + 1] || '').trim();
            if (nextLine && !/^\d+[A-Z]/.test(nextLine.replace(/\s+/g, ''))) {
                description = nextLine;
                i += 1;
            }

            console.log(`[PDF Extractor] Advanced: Line ${parsedRow.lineNumber}, SKU: ${parsedRow.sku}, UPC: ${parsedRow.upc}, Qty: ${parsedRow.quantity}, QtyRcv: ${parsedRow.quantityReceived}, Amt: ${parsedRow.amount}`);

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
                amount: parsedRow.amount,
                shipDate: parsedRow.shipDate,
                upcValidation: parsedRow.upcValidation,
                _metadata: parsedRow._metadata
            });
        }

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
    const shipDateMatch = text.match(/(?:Ship\s*Date|Delivery\s*Date|Ships?)\s*[:\-]?\s*([A-Za-z0-9,\/-]+)/i);

    const ackLineItems = extractAcknowledgementLineItems(text);
    const genericLineItems = extractLineItems(text);
    const selectedLineItems = ackLineItems.length > 0 ? ackLineItems : genericLineItems;

    // Post-process line items: correct UPCs and calculate missing quantities
    const enhancedLineItems = selectedLineItems.map(item => {
        const shipDate = shipDateMatch ? parseDate(shipDateMatch[1]) : null;
        const upcResult = correctUpcTo12Digits(item.upc);
        const qtyResult = calculateMissingQuantityReceived(
            item.quantity,
            item.quantityReceived,
            item.unitPrice,
            item.amount
        );

        return {
            ...item,
            upc: upcResult.value,
            quantityReceived: qtyResult.value !== null ? qtyResult.value : item.quantityReceived,
            shipDate: shipDate,
            _metadata: {
                upcCorrected: upcResult.corrected,
                upcMethod: upcResult.method,
                quantityReceivedCalculated: qtyResult.calculated,
                quantityReceivedMethod: qtyResult.method
            }
        };
    });

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
        shipDate: shipDateMatch ? shipDateMatch[1].trim() : '',
        totalAmount: totalMatch ? toNumber(totalMatch[1]) : null,
        currency: 'USD',
        lineItems: enhancedLineItems,
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
            shipDate: '',
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
