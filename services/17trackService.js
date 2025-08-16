// services/17trackService.js
const axios = require('axios');

class TrackingService {
    constructor() {
        this.apiKey = '97D5F874617F9BC647D6899B05A1205A';
        this.baseURL = 'https://api.17track.net/track/v2.4';
        this.headers = {
            '17token': this.apiKey,
            'Content-Type': 'application/json',
            'Accept': 'application/json'
        };
    }

    /**
     * Register tracking numbers for monitoring
     * @param {Array} trackingNumbers - Array of tracking number objects
     * @returns {Promise} API response
     */
    async registerTrackingNumbers(trackingNumbers) {
        try {
            console.log('📦 Registering tracking numbers with 17track:', trackingNumbers.length);

            const response = await axios.post(`${this.baseURL}/register`, trackingNumbers, {
                headers: this.headers,
                timeout: 30000
            });

            console.log('✅ Successfully registered tracking numbers');
            return response.data;
        } catch (error) {
            console.error('❌ Error registering tracking numbers:', error.response?.data || error.message);
            throw error;
        }
    }

    /**
     * Get tracking information for registered numbers
     * @param {Array} trackingNumbers - Array of tracking numbers to query
     * @returns {Promise} Tracking information
     */
    async getTrackingInfo(trackingNumbers) {
        try {
            console.log('🔍 Getting tracking info for:', trackingNumbers.length, 'packages');

            const response = await axios.post(`${this.baseURL}/gettrackinfo`, trackingNumbers, {
                headers: this.headers,
                timeout: 30000
            });

            console.log('✅ Successfully retrieved tracking info');
            return response.data;
        } catch (error) {
            console.error('❌ Error getting tracking info:', error.response?.data || error.message);
            throw error;
        }
    }

    /**
     * Get tracking status for multiple numbers
     * @param {Array} trackingNumbers - Array of tracking numbers
     * @returns {Promise} Status information
     */
    async getBatchStatus(trackingNumbers) {
        try {
            console.log('📊 Getting batch status for:', trackingNumbers.length, 'packages');

            const response = await axios.post(`${this.baseURL}/getstatusnumber`, trackingNumbers, {
                headers: this.headers,
                timeout: 30000
            });

            console.log('✅ Successfully retrieved batch status');
            return response.data;
        } catch (error) {
            console.error('❌ Error getting batch status:', error.response?.data || error.message);
            throw error;
        }
    }

    /**
     * Format tracking number object for API
     * @param {string} trackingNumber - The tracking number
     * @param {string} carrier - Carrier code (optional, auto-detect if not provided)
     * @returns {Object} Formatted tracking object
     */
    formatTrackingNumber(trackingNumber, carrier = null) {
        const trackingObj = {
            number: trackingNumber.trim()
        };

        if (carrier) {
            trackingObj.carrier = carrier;
        }

        return trackingObj;
    }

    /**
     * Parse tracking status response
     * @param {Object} statusData - Raw status data from API
     * @returns {Object} Parsed status information
     */
    parseTrackingStatus(statusData) {
        // Handle new API format where data is in track_info
        const trackInfo = statusData.track_info || statusData.track || {};
        const latestStatus = trackInfo.latest_status || {};
        const latestEvent = trackInfo.latest_event || {};

        // Convert status to numeric code for backward compatibility
        let statusCode = 'Unknown';
        let isDelivered = false;

        if (latestStatus.status) {
            switch (latestStatus.status.toLowerCase()) {
                case 'delivered':
                    statusCode = 40;
                    isDelivered = true;
                    break;
                case 'intransit':
                case 'in_transit':
                    statusCode = 10;
                    break;
                case 'exception':
                case 'alert':
                    statusCode = 50;
                    break;
                case 'expired':
                    statusCode = 20;
                    break;
                case 'undelivered':
                    statusCode = 35;
                    break;
                default:
                    statusCode = 0;
            }
        }

        return {
            trackingNumber: statusData.number,
            carrier: statusData.carrier,
            status: statusCode,
            statusDescription: latestEvent.description || this.getStatusDescription(statusCode),
            lastUpdate: latestEvent.time_iso,
            lastLocation: latestEvent.location,
            lastDescription: latestEvent.description,
            isDelivered: isDelivered,
            estimatedDelivery: trackInfo.time_metrics?.estimated_delivery_date?.to,
            events: trackInfo.tracking?.providers?.[0]?.events || []
        };
    }

    /**
     * Get human-readable status description
     * @param {number} statusCode - Status code from API
     * @returns {string} Human-readable status
     */
    getStatusDescription(statusCode) {
        const statusMap = {
            0: 'Not Found',
            10: 'In Transit',
            20: 'Expired',
            30: 'Pick Up',
            35: 'Undelivered',
            40: 'Delivered',
            50: 'Alert'
        };

        return statusMap[statusCode] || 'Unknown';
    }

    /**
     * Update line items with tracking information
     * @param {Array} lineItems - Line items to update
     * @param {Array} trackingData - Tracking data from API
     * @returns {Promise} Update results
     */
    async updateLineItemsWithTracking(lineItems, trackingData) {
        const LineItem = require('../models/LineItem');
        const updatePromises = [];

        for (const item of lineItems) {
            if (!item.trackingNumber) continue;

            const trackingInfo = trackingData.find(track =>
                track.number === item.trackingNumber
            );

            if (trackingInfo) {
                const parsedStatus = this.parseTrackingStatus(trackingInfo);

                const updateData = {
                    trackingStatus: parsedStatus.status,
                    trackingStatusDescription: parsedStatus.statusDescription,
                    trackingLastUpdate: parsedStatus.lastUpdate,
                    trackingLocation: parsedStatus.lastLocation,
                    trackingEstimatedDelivery: parsedStatus.estimatedDelivery,
                    updatedAt: new Date()
                };

                // If delivered, mark as received
                if (parsedStatus.isDelivered) {
                    updateData.received = true;
                    updateData.receivedDate = new Date();
                }

                updatePromises.push(
                    LineItem.findByIdAndUpdate(item._id, updateData)
                );
            }
        }

        return Promise.all(updatePromises);
    }
}

module.exports = new TrackingService();
