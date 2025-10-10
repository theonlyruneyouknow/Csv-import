# FedEx API Integration Guide

## Overview

This application now supports real-time tracking updates directly from FedEx API. When configured, FedEx shipments will display live tracking information fetched directly from FedEx servers, with automatic updates to your database.

## Features

- **Live Tracking Data**: Fetch real-time tracking status directly from FedEx API
- **Automatic Updates**: Tracking information is automatically stored in your database
- **Tracking History**: Complete timeline of package movement
- **Smart Fallback**: If API is not configured, falls back to iframe view of carrier website
- **Multi-Carrier Support**: Architecture ready for UPS, USPS, and other carriers

## Setup Instructions

### Step 1: Create FedEx Developer Account

1. Go to [FedEx Developer Portal](https://developer.fedex.com/)
2. Click "Get Started" or "Sign Up"
3. Create a new account or sign in with your existing FedEx account
4. Complete the developer registration form

### Step 2: Create a New Project

1. Once logged in, click "Create Project" or "New Project"
2. Give your project a name (e.g., "Purchase Order Tracking")
3. Select the following APIs:
   - **Track API** (required for tracking)

### Step 3: Get API Credentials

1. In your project dashboard, navigate to "API Credentials"
2. You will see:
   - **Client ID** (API Key)
   - **Client Secret** (Secret Key)
3. Copy these credentials - you'll need them for Step 4

### Step 4: Configure Environment Variables

1. Open your `.env` file in the project root
2. Add the following lines:

```env
# FedEx API Configuration
FEDEX_CLIENT_ID=your_actual_client_id_here
FEDEX_CLIENT_SECRET=your_actual_client_secret_here
FEDEX_ACCOUNT_NUMBER=your_fedex_account_number
FEDEX_API_URL=https://apis.fedex.com
```

3. Replace the placeholder values with your actual credentials
4. **Important**: Keep your `.env` file secure and never commit it to version control

### Step 5: Test the Integration

1. Restart your application:
   ```bash
   node app.js
   ```

2. Navigate to a Purchase Order with a FedEx tracking number
3. Click the tracking number to open the tracking modal
4. You should see a "🔄 Refresh from FedEx API" button
5. Click it to fetch live tracking data

## API Endpoints

The integration adds the following endpoints:

### GET `/purchase-orders/tracking/:trackingNumber/live`

Fetches live tracking data from FedEx API and updates the database.

**Query Parameters:**
- `carrier` (optional): Carrier name (defaults to auto-detect)

**Response:**
```json
{
  "success": true,
  "trackingNumber": "123456789012",
  "carrier": "FedEx",
  "trackingInfo": {
    "status": "In Transit",
    "statusDescription": "Package is in transit",
    "lastUpdate": "2025-10-06T10:30:00Z",
    "lastLocation": "Memphis, TN",
    "estimatedDelivery": "2025-10-08T20:00:00Z",
    "history": [...]
  },
  "updated": true
}
```

## Database Updates

When live tracking data is fetched, the following fields are automatically updated in the `LineItem` collection:

- `trackingStatus`: Current status (e.g., "Delivered", "In Transit")
- `trackingStatusDescription`: Detailed status description
- `trackingLastUpdate`: Timestamp of last tracking update
- `trackingLocation`: Current or last known location
- `trackingEstimatedDelivery`: Estimated delivery date/time
- `trackingHistory`: Array of tracking events with timestamps

## User Interface

### Tracking Modal

When viewing tracking information:

1. **FedEx Packages**: 
   - Shows live data from FedEx API
   - Displays "🔄 Refresh from FedEx API" button
   - Shows message: "✨ Live API Tracking: This information is fetched directly from FedEx servers"

2. **Other Carriers**:
   - Shows database information
   - Provides "🖼️ View Carrier Page (In-App)" button
   - Provides "🌐 Open on Carrier Website" button

### Tracking History Timeline

The tracking modal displays a complete timeline of package movement:
- Most recent update highlighted
- Timestamp for each event
- Location information
- Status description
- Who updated the information (API or manual)

## Error Handling

The system gracefully handles various scenarios:

1. **API Not Configured**: Falls back to iframe view
2. **Invalid Tracking Number**: Shows error message
3. **API Rate Limiting**: Displays appropriate error
4. **Network Errors**: Shows error toast notification

## Future Carrier Support

The architecture is designed to easily add more carrier APIs:

### UPS API
- Requires UPS Developer Account
- Add `UPS_CLIENT_ID` and `UPS_CLIENT_SECRET` to `.env`
- Service file: `services/upsService.js` (to be created)

### USPS API
- Requires USPS Web Tools Account
- Add `USPS_USER_ID` to `.env`
- Service file: `services/uspsService.js` (to be created)

## Troubleshooting

### Issue: "FedEx API credentials not configured"

**Solution**: Verify that your `.env` file contains valid `FEDEX_CLIENT_ID` and `FEDEX_CLIENT_SECRET`

### Issue: "Failed to authenticate with FedEx API"

**Solutions**:
1. Verify credentials are correct
2. Check that your FedEx Developer account is active
3. Ensure your project has Track API enabled
4. Check internet connection

### Issue: Tracking data not updating

**Solutions**:
1. Click the "🔄 Refresh" button to fetch latest data
2. Check server logs for API errors
3. Verify tracking number format is correct (12, 15, or 20 digits)

## Security Best Practices

1. **Never commit `.env` file** to version control
2. **Rotate API keys regularly** (every 6-12 months)
3. **Use environment variables** for all sensitive data
4. **Monitor API usage** to stay within rate limits
5. **Keep credentials secure** and limit access

## API Rate Limits

FedEx API has rate limits. Monitor your usage:
- Check FedEx Developer Portal for your current limits
- Implement caching to reduce API calls
- Only refresh tracking when necessary

## Support

For FedEx API issues:
- [FedEx Developer Portal](https://developer.fedex.com/)
- [FedEx API Documentation](https://developer.fedex.com/api/en-us/catalog.html)
- FedEx Developer Support: Via developer portal

For application issues:
- Check server logs for error messages
- Review this guide
- Contact your development team

## License

This integration is part of your Purchase Order Management System. FedEx API usage is subject to FedEx's terms of service.
