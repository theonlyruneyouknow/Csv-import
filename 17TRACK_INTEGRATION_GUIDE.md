# 17Track API Integration Testing Guide

## Overview
This guide will help you test the 17track API integration that has been added to your purchase order system.

## API Key Configuration
- **Your API Key**: `97D5F874617F9BC647D6899B05A1205A`
- **Base URL**: `https://api.17track.net/track/v2.4`
- **Location**: `services/17trackService.js`

## Available Endpoints

### 1. Tracking Dashboard
- **URL**: `http://localhost:3001/purchase-orders/tracking-dashboard`
- **Description**: Main dashboard showing tracking statistics and recent updates
- **Features**:
  - Statistics overview (total items, items with tracking, delivered, in transit)
  - Recent tracking updates table
  - Tracking issues alerts
  - Bulk update functionality

### 2. Register Tracking Numbers
- **Method**: POST
- **URL**: `/purchase-orders/tracking/register`
- **Body**:
```json
{
  "trackingNumbers": [
    {
      "number": "1234567890",
      "carrier": "usps"
    }
  ]
}
```

### 3. Get Tracking Status (Batch)
- **Method**: POST
- **URL**: `/purchase-orders/tracking/status`
- **Body**:
```json
{
  "trackingNumbers": [
    { "number": "1234567890" },
    { "number": "0987654321" }
  ]
}
```

### 4. Update All Line Items with Tracking
- **Method**: POST
- **URL**: `/purchase-orders/tracking/update-all`
- **Description**: Updates all line items that have tracking numbers

### 5. Update Tracking for Specific PO
- **Method**: POST
- **URL**: `/purchase-orders/{poId}/tracking/update`
- **Description**: Updates tracking for all line items in a specific PO

### 6. Add Tracking Number to Line Item
- **Method**: PUT
- **URL**: `/purchase-orders/line-items/{lineItemId}/tracking`
- **Body**:
```json
{
  "trackingNumber": "1234567890",
  "carrier": "usps"
}
```

### 7. Get Detailed Tracking Info
- **Method**: GET
- **URL**: `/purchase-orders/tracking/{trackingNumber}`
- **Description**: Gets detailed tracking information for a specific tracking number

## Database Changes

### LineItem Model Updates
New fields added to the LineItem schema:
- `trackingNumber`: String (indexed)
- `trackingCarrier`: String  
- `trackingStatus`: String (17track status code)
- `trackingStatusDescription`: String (human-readable status)
- `trackingLastUpdate`: Date
- `trackingLocation`: String (last known location)
- `trackingEstimatedDelivery`: Date

## Status Codes Reference

### 17Track Status Codes:
- `0`: Not Found
- `10`: In Transit
- `20`: Expired
- `30`: Pick Up
- `35`: Undelivered
- `40`: Delivered
- `50`: Alert

## Testing Steps

### Step 1: Basic API Connection Test
1. Open terminal/PowerShell
2. Test the service connection:
```powershell
# Test if service is accessible
curl -X POST "http://localhost:3001/purchase-orders/tracking/register" `
  -H "Content-Type: application/json" `
  -d '{"trackingNumbers": [{"number": "test123"}]}'
```

### Step 2: Add Test Tracking Numbers
1. Go to your Line Items Manager
2. Add tracking numbers to some line items
3. Use real tracking numbers for testing (like UPS, FedEx, USPS numbers)

### Step 3: Test Dashboard
1. Visit: `http://localhost:3001/purchase-orders/tracking-dashboard`
2. Check that statistics show correctly
3. Test the "Update All Tracking" button

### Step 4: Test Individual Updates
1. Find a line item with a tracking number
2. Use the API endpoint to update just that item
3. Verify the tracking information appears

## Common Issues & Troubleshooting

### API Key Issues
- Verify your API key is correct in `services/17trackService.js`
- Check 17track account limits and permissions

### Network Issues
- Ensure your server can make outbound HTTPS requests
- Check firewall settings if requests fail

### Database Issues
- Run database migration if tracking fields don't appear
- Check MongoDB connection if updates fail

## Sample Tracking Numbers for Testing

**USPS**: 9400111899561443156326
**UPS**: 1Z12345E0205271688
**FedEx**: 123456789012

**Note**: Use real tracking numbers from recent shipments for best results.

## API Documentation Reference

If you need more details about the 17track API:
- Documentation: https://api.17track.net/en/doc?version=v2.4
- Check the documentation for:
  - Complete carrier codes list
  - Additional endpoint parameters
  - Rate limiting information
  - Error code meanings

## Customization Options

### Adding More Carriers
Edit `services/17trackService.js` to add carrier-specific logic:
```javascript
formatTrackingNumber(trackingNumber, carrier = null) {
  // Add carrier detection logic here
  if (!carrier) {
    // Auto-detect carrier based on tracking number format
    if (trackingNumber.match(/^1Z/)) carrier = 'ups';
    else if (trackingNumber.match(/^\d{12}$/)) carrier = 'fedex';
    // Add more patterns as needed
  }
  return { number: trackingNumber, carrier };
}
```

### Custom Status Display
Modify the status parsing in the service or dashboard views to customize how tracking statuses are displayed to users.

## Next Steps

1. Test the basic functionality with the tracking dashboard
2. Add real tracking numbers to your line items
3. Use the bulk update feature to sync with 17track
4. Customize the dashboard or status displays as needed
5. Consider adding automated scheduled updates (cron jobs)

Let me know if you encounter any issues or need modifications to the integration!
