/**
 * Vendor Utilities for splitting and normalizing vendor data
 * 
 * This utility handles the common pattern where vendor data comes in as:
 * - "121 CROOKHAM CO" -> vendorNumber: "121", vendorName: "CROOKHAM CO"
 * - "205 KIMBERLY SEEDS INTERNATIONAL, LLC" -> vendorNumber: "205", vendorName: "KIMBERLY SEEDS INTERNATIONAL, LLC"
 * - "741 J&M Industries, Inc" -> vendorNumber: "741", vendorName: "J&M Industries, Inc"
 */

/**
 * Split a combined vendor string into vendor number and vendor name
 * @param {string} vendorString - The combined vendor string (e.g., "121 CROOKHAM CO")
 * @returns {object} Object with vendorNumber and vendorName properties
 */
function splitVendorData(vendorString) {
    if (!vendorString || typeof vendorString !== 'string') {
        return {
            vendorNumber: '',
            vendorName: '',
            originalVendor: vendorString || ''
        };
    }

    const trimmed = vendorString.trim();
    
    // Pattern: Look for number at the beginning followed by space and name
    // Examples: "121 CROOKHAM CO", "205 KIMBERLY SEEDS", "741 J&M Industries"
    const match = trimmed.match(/^(\d+)\s+(.+)$/);
    
    if (match) {
        return {
            vendorNumber: match[1],
            vendorName: match[2].trim(),
            originalVendor: vendorString
        };
    }
    
    // If no number pattern found, treat entire string as vendor name
    return {
        vendorNumber: '',
        vendorName: trimmed,
        originalVendor: vendorString
    };
}

/**
 * Normalize vendor name for better matching
 * @param {string} vendorName - The vendor name to normalize
 * @returns {string} Normalized vendor name
 */
function normalizeVendorName(vendorName) {
    if (!vendorName || typeof vendorName !== 'string') {
        return '';
    }
    
    return vendorName
        .trim()
        .toLowerCase()
        .replace(/[.,]/g, '') // Remove periods and commas
        .replace(/\s+/g, ' ') // Normalize whitespace
        .replace(/\b(llc|inc|corp|co|ltd|company)\b/g, '') // Remove common suffixes
        .trim();
}

/**
 * Create vendor matching patterns for improved lookup
 * @param {string} vendorString - Original vendor string
 * @returns {object} Object with various matching patterns
 */
function createVendorMatchingPatterns(vendorString) {
    const split = splitVendorData(vendorString);
    const normalized = normalizeVendorName(split.vendorName);
    
    return {
        original: vendorString,
        vendorNumber: split.vendorNumber,
        vendorName: split.vendorName,
        normalizedName: normalized,
        // Patterns for MongoDB matching
        exactPatterns: [
            split.vendorName,
            split.vendorNumber,
            vendorString
        ].filter(Boolean),
        regexPatterns: [
            split.vendorName ? `^${escapeRegex(split.vendorName)}$` : null,
            split.vendorNumber ? `^${escapeRegex(split.vendorNumber)}$` : null,
            normalized ? escapeRegex(normalized) : null
        ].filter(Boolean)
    };
}

/**
 * Escape special regex characters
 * @param {string} string - String to escape
 * @returns {string} Escaped string
 */
function escapeRegex(string) {
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Extract vendor code suggestions from vendor name
 * @param {string} vendorName - The vendor name
 * @param {string} vendorNumber - The vendor number (if available)
 * @returns {array} Array of suggested vendor codes
 */
function generateVendorCodeSuggestions(vendorName, vendorNumber = '') {
    const suggestions = [];
    
    // If we have a vendor number, use it as primary suggestion
    if (vendorNumber) {
        suggestions.push(vendorNumber);
    }
    
    if (!vendorName || typeof vendorName !== 'string') {
        return suggestions;
    }
    
    const words = vendorName.trim().split(/\s+/);
    
    // Single word: take first 3-4 characters
    if (words.length === 1) {
        const word = words[0].replace(/[^A-Za-z0-9]/g, '');
        if (word.length >= 3) {
            suggestions.push(word.substring(0, 4).toUpperCase());
        }
    } else {
        // Multiple words: take first letter of each word, max 5 characters
        let acronym = '';
        words.forEach(word => {
            const cleaned = word.replace(/[^A-Za-z0-9]/g, '');
            if (acronym.length < 5 && cleaned.length > 0) {
                acronym += cleaned.charAt(0);
            }
        });
        if (acronym.length >= 2) {
            suggestions.push(acronym.toUpperCase());
        }
        
        // Also try first word + number from vendor number
        if (vendorNumber && words[0]) {
            const firstWord = words[0].replace(/[^A-Za-z]/g, '').substring(0, 3);
            if (firstWord.length >= 2) {
                suggestions.push((firstWord + vendorNumber).toUpperCase());
            }
        }
    }
    
    return [...new Set(suggestions)]; // Remove duplicates
}

/**
 * Batch process multiple vendor strings
 * @param {array} vendorStrings - Array of vendor strings to process
 * @returns {array} Array of processed vendor objects
 */
function batchSplitVendors(vendorStrings) {
    if (!Array.isArray(vendorStrings)) {
        return [];
    }
    
    return vendorStrings.map(vendorString => {
        const split = splitVendorData(vendorString);
        const patterns = createVendorMatchingPatterns(vendorString);
        const codeSuggestions = generateVendorCodeSuggestions(split.vendorName, split.vendorNumber);
        
        return {
            ...split,
            matchingPatterns: patterns,
            codeSuggestions: codeSuggestions
        };
    });
}

module.exports = {
    splitVendorData,
    normalizeVendorName,
    createVendorMatchingPatterns,
    generateVendorCodeSuggestions,
    batchSplitVendors,
    escapeRegex
};
