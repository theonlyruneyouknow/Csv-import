// services/fedexService.js
// FedEx Tracking API Integration

const axios = require('axios');

class FedExService {
    constructor() {
        // FedEx API credentials (from environment variables)
        this.clientId = process.env.FEDEX_CLIENT_ID || '';
        this.clientSecret = process.env.FEDEX_CLIENT_SECRET || '';
        this.accountNumber = process.env.FEDEX_ACCOUNT_NUMBER || '';
        
        // FedEx API endpoints
        this.baseURL = process.env.FEDEX_API_URL || 'https://apis.fedex.com'; // Production URL
        this.authURL = `${this.baseURL}/oauth/token`;
        this.trackURL = `${this.baseURL}/track/v1/trackingnumbers`;
        
        // Token management
        this.accessToken = null;
        this.tokenExpiry = null;
    }

    /**
     * Check if API credentials are configured
     * @returns {boolean}
     */
    isConfigured() {
        return !!(this.clientId && this.clientSecret);
    }

    /**
     * Get OAuth access token
     * @returns {Promise<string>} Access token
     */
    async getAccessToken() {
        // Return cached token if still valid
        if (this.accessToken && this.tokenExpiry && new Date() < this.tokenExpiry) {
            return this.accessToken;
        }

        try {
            console.log('🔐 Requesting FedEx OAuth token...');

            const response = await axios.post(
                this.authURL,
                'grant_type=client_credentials&client_id=' + this.clientId + '&client_secret=' + this.clientSecret,
                {
                    headers: {
                        'Content-Type': 'application/x-www-form-urlencoded'
                    }
                }
            );

            this.accessToken = response.data.access_token;
            // Set expiry to 50 minutes (tokens typically expire in 60 minutes)
            this.tokenExpiry = new Date(Date.now() + 50 * 60 * 1000);

            console.log('✅ FedEx OAuth token obtained successfully');
            return this.accessToken;

        } catch (error) {
            console.error('❌ FedEx OAuth error:', error.response?.data || error.message);
            throw new Error('Failed to authenticate with FedEx API');
        }
    }

    /**
     * Track a package using FedEx API
     * @param {string} trackingNumber - FedEx tracking number
     * @returns {Promise<Object>} Tracking information
     */
    async trackPackage(trackingNumber) {
        if (!this.isConfigured()) {
            throw new Error('FedEx API credentials not configured');
        }

        try {
            const token = await this.getAccessToken();

            console.log(`📦 Tracking FedEx package: ${trackingNumber}`);

            const response = await axios.post(
                this.trackURL,
                {
                    includeDetailedScans: true,
                    trackingInfo: [
                        {
                            trackingNumberInfo: {
                                trackingNumber: trackingNumber
                            }
                        }
                    ]
                },
                {
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`,
                        'X-locale': 'en_US'
                    }
                }
            );

            // Parse the response
            const trackingData = this.parseTrackingResponse(response.data);
            console.log('✅ FedEx tracking data retrieved successfully');
            
            return trackingData;

        } catch (error) {
            console.error('❌ FedEx tracking error:', error.response?.data || error.message);
            
            // Return a formatted error response
            return {
                success: false,
                error: error.response?.data?.errors?.[0]?.message || error.message,
                trackingNumber: trackingNumber
            };
        }
    }

    /**
     * Parse FedEx API response into our standard format
     * @param {Object} apiResponse - Raw API response
     * @returns {Object} Formatted tracking data
     */
    parseTrackingResponse(apiResponse) {
        try {
            const output = apiResponse.output;
            if (!output || !output.completeTrackResults || output.completeTrackResults.length === 0) {
                return {
                    success: false,
                    error: 'No tracking information found'
                };
            }

            const trackResult = output.completeTrackResults[0];
            const trackingNumber = trackResult.trackingNumber;

            // Get the most recent scan event
            const scanEvents = trackResult.trackResults?.[0]?.scanEvents || [];
            const latestScan = scanEvents[0] || {};

            // Get delivery information
            const deliveryDetails = trackResult.trackResults?.[0]?.deliveryDetails || {};
            const latestStatusDetail = trackResult.trackResults?.[0]?.latestStatusDetail || {};

            // Build tracking history from scan events
            const history = scanEvents.map(event => ({
                timestamp: event.date ? new Date(event.date) : null,
                status: event.eventDescription || event.derivedStatus || '',
                location: this.formatLocation(event.scanLocation),
                description: event.eventDescription || ''
            }));

            // Determine current status
            const status = this.mapFedExStatus(latestStatusDetail.code || latestStatusDetail.description);

            return {
                success: true,
                trackingNumber: trackingNumber,
                carrier: 'FedEx',
                status: status,
                statusDescription: latestStatusDetail.description || status,
                lastUpdate: latestScan.date ? new Date(latestScan.date) : null,
                lastLocation: this.formatLocation(latestScan.scanLocation),
                estimatedDelivery: deliveryDetails.estimatedDeliveryTimeWindow?.window?.end 
                    ? new Date(deliveryDetails.estimatedDeliveryTimeWindow.window.end)
                    : null,
                actualDelivery: deliveryDetails.actualDeliveryTimestamp 
                    ? new Date(deliveryDetails.actualDeliveryTimestamp)
                    : null,
                recipientName: deliveryDetails.receivedByName || null,
                history: history,
                rawData: trackResult // Keep raw data for debugging
            };

        } catch (error) {
            console.error('❌ Error parsing FedEx response:', error);
            return {
                success: false,
                error: 'Failed to parse tracking response',
                details: error.message
            };
        }
    }

    /**
     * Format FedEx location object into readable string
     * @param {Object} location - FedEx location object
     * @returns {string} Formatted location string
     */
    formatLocation(location) {
        if (!location) return '';

        const parts = [];
        if (location.city) parts.push(location.city);
        if (location.stateOrProvinceCode) parts.push(location.stateOrProvinceCode);
        if (location.countryCode) parts.push(location.countryCode);

        return parts.join(', ');
    }

    /**
     * Map FedEx status codes to our standard statuses
     * @param {string} fedexStatus - FedEx status code or description
     * @returns {string} Standard status
     */
    mapFedExStatus(fedexStatus) {
        if (!fedexStatus) return 'Unknown';

        const statusLower = fedexStatus.toLowerCase();

        if (statusLower.includes('delivered')) return 'Delivered';
        if (statusLower.includes('out for delivery')) return 'Out for Delivery';
        if (statusLower.includes('in transit') || statusLower.includes('transit')) return 'In Transit';
        if (statusLower.includes('picked up')) return 'Picked Up';
        if (statusLower.includes('label') || statusLower.includes('created')) return 'Label Created';
        if (statusLower.includes('exception') || statusLower.includes('delay')) return 'Exception';
        if (statusLower.includes('return')) return 'Returned to Sender';

        return 'In Transit'; // Default fallback
    }

    /**
     * Validate FedEx tracking number format
     * @param {string} trackingNumber - Tracking number to validate
     * @returns {boolean} True if valid format
     */
    isValidTrackingNumber(trackingNumber) {
        if (!trackingNumber) return false;
        
        const cleaned = trackingNumber.trim();
        // FedEx tracking numbers: 12, 15, or 20 digits
        const fedexRegex = /^(\d{12}|\d{15}|\d{20})$/;
        
        return fedexRegex.test(cleaned);
    }
}

module.exports = new FedExService();
