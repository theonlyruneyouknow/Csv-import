/**
 * Change Tracking Utility
 * Automatically logs all PO modifications to the Notes field with timestamps
 */

const PurchaseOrder = require('../models/PurchaseOrder');

/**
 * Format a change log entry
 * @param {string} changeType - Type of change (e.g., 'URL', 'Status', 'Priority')
 * @param {any} oldValue - Previous value
 * @param {any} newValue - New value
 * @param {string} user - Username who made the change
 * @returns {string} Formatted change log entry
 */
function formatChangeLog(changeType, oldValue, newValue, user) {
    const timestamp = new Date().toLocaleString('en-US', {
        month: '2-digit',
        day: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        hour12: true
    });

    // Format values for display
    const formatValue = (val) => {
        if (val === null || val === undefined || val === '') return 'None';
        if (val instanceof Date) return val.toLocaleDateString('en-US');
        if (typeof val === 'boolean') return val ? 'Yes' : 'No';
        return String(val);
    };

    const oldFormatted = formatValue(oldValue);
    const newFormatted = formatValue(newValue);

    return `[${timestamp}] ${user || 'System'} - ${changeType}: ${oldFormatted} → ${newFormatted}`;
}

/**
 * Track a change to a Purchase Order
 * @param {string} poId - Purchase Order ID
 * @param {string} changeType - Type of change
 * @param {any} oldValue - Previous value
 * @param {any} newValue - New value
 * @param {string} user - Username who made the change
 * @returns {Promise<Object>} Updated PO document
 */
async function trackPOChange(poId, changeType, oldValue, newValue, user = 'System') {
    try {
        // Don't track if values are the same
        if (oldValue === newValue) {
            return null;
        }

        // Get current PO
        const po = await PurchaseOrder.findById(poId);
        if (!po) {
            throw new Error(`Purchase Order ${poId} not found`);
        }

        // Format the change log entry
        const changeLog = formatChangeLog(changeType, oldValue, newValue, user);

        // Append to notes (add separator if notes already exist)
        const separator = po.notes && po.notes.trim() ? '\n' : '';
        const updatedNotes = po.notes + separator + changeLog;

        // Update PO with new notes, lastUpdate timestamp, and lastUpdatedBy
        const updated = await PurchaseOrder.findByIdAndUpdate(
            poId,
            {
                notes: updatedNotes,
                lastUpdate: new Date(),
                lastUpdatedBy: user
            },
            { new: true }
        );

        console.log(`Change tracked for PO ${po.poNumber}: ${changeType}`);
        return updated;

    } catch (error) {
        console.error('Error tracking PO change:', error);
        throw error;
    }
}

/**
 * Track multiple changes in a single transaction (for bulk updates)
 * @param {string} poId - Purchase Order ID
 * @param {Array<Object>} changes - Array of {changeType, oldValue, newValue} objects
 * @param {string} user - Username who made the changes
 * @returns {Promise<Object>} Updated PO document
 */
async function trackMultipleChanges(poId, changes, user = 'System') {
    try {
        const po = await PurchaseOrder.findById(poId);
        if (!po) {
            throw new Error(`Purchase Order ${poId} not found`);
        }

        // Filter out unchanged values
        const actualChanges = changes.filter(c => c.oldValue !== c.newValue);
        if (actualChanges.length === 0) {
            return null;
        }

        // Format all change logs
        const changeLogs = actualChanges.map(change =>
            formatChangeLog(change.changeType, change.oldValue, change.newValue, user)
        );

        // Append all logs to notes
        const separator = po.notes && po.notes.trim() ? '\n' : '';
        const updatedNotes = po.notes + separator + changeLogs.join('\n');

        // Update PO
        const updated = await PurchaseOrder.findByIdAndUpdate(
            poId,
            {
                notes: updatedNotes,
                lastUpdate: new Date(),
                lastUpdatedBy: user
            },
            { new: true }
        );

        console.log(`${actualChanges.length} changes tracked for PO ${po.poNumber}`);
        return updated;

    } catch (error) {
        console.error('Error tracking multiple PO changes:', error);
        throw error;
    }
}

/**
 * Track line item changes
 * @param {string} poId - Purchase Order ID
 * @param {string} sku - SKU of the line item
 * @param {string} changeType - Type of change (e.g., 'Quantity Received', 'Status')
 * @param {any} oldValue - Previous value
 * @param {any} newValue - New value
 * @param {string} user - Username who made the change
 * @returns {Promise<Object>} Updated PO document
 */
async function trackLineItemChange(poId, sku, changeType, oldValue, newValue, user = 'System') {
    const fullChangeType = `Line Item [${sku}] ${changeType}`;
    return trackPOChange(poId, fullChangeType, oldValue, newValue, user);
}

module.exports = {
    trackPOChange,
    trackMultipleChanges,
    trackLineItemChange,
    formatChangeLog
};
