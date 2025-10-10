// services/trackingService.js
// Self-managed tracking service without external API dependencies

class TrackingService {
    constructor() {
        // Carrier tracking URL templates
        this.carriers = {
            'FedEx': {
                name: 'FedEx',
                urlTemplate: 'https://www.fedex.com/fedextrack/?trknbr={trackingNumber}',
                regex: /^(\d{12}|\d{15}|\d{20})$/
            },
            'UPS': {
                name: 'UPS',
                urlTemplate: 'https://www.ups.com/track?tracknum={trackingNumber}',
                regex: /^1Z[A-Z0-9]{16}$/
            },
            'USPS': {
                name: 'USPS',
                urlTemplate: 'https://tools.usps.com/go/TrackConfirmAction?tLabels={trackingNumber}',
                regex: /^(\d{20}|\d{22}|94\d{20}|92\d{20}|93\d{20})$/
            },
            'DHL': {
                name: 'DHL',
                urlTemplate: 'https://www.dhl.com/en/express/tracking.html?AWB={trackingNumber}',
                regex: /^\d{10,11}$/
            },
            'OnTrac': {
                name: 'OnTrac',
                urlTemplate: 'https://www.ontrac.com/tracking/?number={trackingNumber}',
                regex: /^C\d{14}$/
            },
            'Other': {
                name: 'Other',
                urlTemplate: null,
                regex: null
            }
        };

        // Common tracking statuses
        this.statuses = [
            'Label Created',
            'Picked Up',
            'In Transit',
            'Out for Delivery',
            'Delivered',
            'Exception',
            'Delayed',
            'Lost/Damaged',
            'Returned to Sender',
            'Unknown'
        ];
    }

    /**
     * Auto-detect carrier from tracking number format
     * @param {string} trackingNumber - The tracking number to analyze
     * @returns {string} Detected carrier name or 'Unknown'
     */
    detectCarrier(trackingNumber) {
        if (!trackingNumber) return 'Unknown';

        const cleaned = trackingNumber.trim().toUpperCase();

        // Check each carrier's regex pattern
        for (const [carrierKey, carrier] of Object.entries(this.carriers)) {
            if (carrier.regex && carrier.regex.test(cleaned)) {
                console.log(`🔍 Detected carrier: ${carrier.name} for tracking number: ${trackingNumber}`);
                return carrier.name;
            }
        }

        console.log(`⚠️ Could not detect carrier for tracking number: ${trackingNumber}`);
        return 'Unknown';
    }

    /**
     * Generate tracking URL for a carrier
     * @param {string} trackingNumber - The tracking number
     * @param {string} carrier - Carrier name
     * @returns {string|null} Tracking URL or null if not available
     */
    getTrackingURL(trackingNumber, carrier) {
        if (!trackingNumber || !carrier) return null;

        const carrierInfo = this.carriers[carrier];
        if (!carrierInfo || !carrierInfo.urlTemplate) return null;

        const url = carrierInfo.urlTemplate.replace('{trackingNumber}', trackingNumber.trim());
        return url;
    }

    /**
     * Validate tracking number format
     * @param {string} trackingNumber - The tracking number
     * @param {string} carrier - Carrier name
     * @returns {boolean} True if valid format
     */
    validateTrackingNumber(trackingNumber, carrier) {
        if (!trackingNumber) return false;

        const cleaned = trackingNumber.trim();

        // If carrier specified, check against that carrier's regex
        if (carrier && this.carriers[carrier]) {
            const carrierInfo = this.carriers[carrier];
            if (carrierInfo.regex) {
                return carrierInfo.regex.test(cleaned);
            }
        }

        // Otherwise, check if it matches any carrier
        return this.detectCarrier(cleaned) !== 'Unknown';
    }

    /**
     * Format tracking data for display
     * @param {Object} lineItem - Line item with tracking info
     * @returns {Object} Formatted tracking data
     */
    formatTrackingData(lineItem) {
        const trackingURL = this.getTrackingURL(lineItem.trackingNumber, lineItem.trackingCarrier);

        return {
            trackingNumber: lineItem.trackingNumber || 'N/A',
            carrier: lineItem.trackingCarrier || 'Unknown',
            status: lineItem.trackingStatus || 'No Status',
            statusDescription: lineItem.trackingStatusDescription || '',
            lastUpdate: lineItem.trackingLastUpdate || null,
            estimatedDelivery: lineItem.trackingEstimatedDelivery || null,
            location: lineItem.trackingLocation || '',
            trackingURL: trackingURL,
            hasTracking: !!lineItem.trackingNumber
        };
    }

    /**
     * Get available carriers list
     * @returns {Array} List of carrier names
     */
    getCarriers() {
        return Object.keys(this.carriers);
    }

    /**
     * Get available statuses list
     * @returns {Array} List of status options
     */
    getStatuses() {
        return this.statuses;
    }

    /**
     * Fetch live tracking data from carrier APIs (when available)
     * @param {string} trackingNumber - Tracking number
     * @param {string} carrier - Carrier name
     * @returns {Promise<Object>} Live tracking data or null if API not available
     */
    async fetchLiveTracking(trackingNumber, carrier) {
        if (!trackingNumber || !carrier) {
            return { success: false, error: 'Missing tracking number or carrier' };
        }

        try {
            // Check if we have API integration for this carrier
            if (carrier.toLowerCase() === 'fedex') {
                const fedexService = require('./fedexService');
                
                // Check if FedEx API is configured
                if (!fedexService.isConfigured()) {
                    console.log('⚠️ FedEx API not configured, using fallback');
                    return { 
                        success: false, 
                        error: 'FedEx API credentials not configured',
                        useIframe: true 
                    };
                }

                // Fetch from FedEx API
                console.log('🚀 Fetching live tracking from FedEx API...');
                const trackingData = await fedexService.trackPackage(trackingNumber);
                return trackingData;
            }

            // Add more carrier APIs here in the future (UPS, USPS, etc.)
            // For now, other carriers use iframe fallback
            return { 
                success: false, 
                error: 'No API integration for this carrier',
                useIframe: true 
            };

        } catch (error) {
            console.error('❌ Error fetching live tracking:', error);
            return { 
                success: false, 
                error: error.message,
                useIframe: true 
            };
        }
    }

    /**
     * Create tracking history entry
     * @param {string} status - Status update
     * @param {string} location - Current location
     * @param {string} description - Update description
     * @returns {Object} History entry
     */
    createHistoryEntry(status, location, description) {
        return {
            timestamp: new Date(),
            status: status,
            location: location || '',
            description: description || '',
            updatedBy: 'Manual Update'
        };
    }

    /**
     * Estimate delivery date based on carrier and origin
     * @param {string} carrier - Carrier name
     * @param {Date} shipDate - Ship date
     * @param {string} serviceLevel - Service level (Ground, 2Day, Overnight, etc.)
     * @returns {Date} Estimated delivery date
     */
    estimateDelivery(carrier, shipDate, serviceLevel = 'Ground') {
        const ship = shipDate ? new Date(shipDate) : new Date();
        let daysToAdd = 5; // Default ground shipping

        // Adjust based on service level
        switch (serviceLevel.toLowerCase()) {
            case 'overnight':
            case 'next day':
                daysToAdd = 1;
                break;
            case '2day':
            case 'second day':
                daysToAdd = 2;
                break;
            case '3day':
            case 'third day':
                daysToAdd = 3;
                break;
            case 'ground':
            default:
                daysToAdd = 5;
        }

        const deliveryDate = new Date(ship);
        deliveryDate.setDate(deliveryDate.getDate() + daysToAdd);

        // Skip weekends for most carriers
        while (deliveryDate.getDay() === 0 || deliveryDate.getDay() === 6) {
            deliveryDate.setDate(deliveryDate.getDate() + 1);
        }

        return deliveryDate;
    }

    /**
     * Generate tracking summary statistics
     * @param {Array} lineItems - Array of line items
     * @returns {Object} Tracking statistics
     */
    generateStats(lineItems) {
        const stats = {
            total: lineItems.length,
            withTracking: 0,
            byStatus: {},
            byCarrier: {},
            delivered: 0,
            inTransit: 0,
            exceptions: 0,
            noTracking: 0
        };

        lineItems.forEach(item => {
            if (item.trackingNumber) {
                stats.withTracking++;

                // Count by status
                const status = item.trackingStatus || 'No Status';
                stats.byStatus[status] = (stats.byStatus[status] || 0) + 1;

                // Count by carrier
                const carrier = item.trackingCarrier || 'Unknown';
                stats.byCarrier[carrier] = (stats.byCarrier[carrier] || 0) + 1;

                // Special status counts
                if (status.toLowerCase().includes('delivered')) {
                    stats.delivered++;
                } else if (status.toLowerCase().includes('transit') || status.toLowerCase().includes('picked')) {
                    stats.inTransit++;
                } else if (status.toLowerCase().includes('exception') || status.toLowerCase().includes('delayed')) {
                    stats.exceptions++;
                }
            } else {
                stats.noTracking++;
            }
        });

        return stats;
    }
}

module.exports = new TrackingService();
