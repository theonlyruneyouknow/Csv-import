# Self-Managed Package Tracking System
## Migration from 17Track to Internal Tracking

This document explains the new self-managed tracking system that replaces the 17Track API integration.

---

## 📋 What Changed

### **BEFORE (17Track Integration)**
- External API dependency (17Track service)
- Required API key: `97D5F874617F9BC647D6899B05A1205A`
- Automatic tracking updates from external service
- Limited to 17Track's supported carriers
- API call limits and potential costs

### **NOW (Self-Managed)**
- No external API dependency
- Completely self-managed tracking
- Manual status updates with full control
- Automatic carrier detection
- Direct links to carrier tracking pages
- Unlimited tracking with no API costs

---

## 🚀 New Features

### 1. **Automatic Carrier Detection**
The system can automatically detect the carrier from the tracking number format:

- **FedEx**: 12, 15, or 20-digit numbers
- **UPS**: Starts with "1Z" + 16 alphanumeric characters
- **USPS**: 20 or 22-digit numbers, or starting with 94/92/93
- **DHL**: 10 or 11-digit numbers
- **OnTrac**: Starts with "C" + 14 digits

### 2. **Direct Carrier Links**
Automatically generates tracking URLs:
- FedEx: `https://www.fedex.com/fedextrack/?trknbr={number}`
- UPS: `https://www.ups.com/track?tracknum={number}`
- USPS: `https://tools.usps.com/go/TrackConfirmAction?tLabels={number}`
- DHL: `https://www.dhl.com/en/express/tracking.html?AWB={number}`
- OnTrac: `https://www.ontrac.com/tracking/?number={number}`

### 3. **Tracking History**
Every tracking update is saved with:
- Timestamp
- Status
- Location
- Description
- Updated by (username)

### 4. **Manual Status Updates**
Available statuses:
- Label Created
- Picked Up
- In Transit
- Out for Delivery
- Delivered
- Exception
- Delayed
- Lost/Damaged
- Returned to Sender
- Unknown

---

## 📁 New Files Created

### 1. `services/trackingService.js`
**Purpose**: Core tracking logic without external API

**Key Functions:**
- `detectCarrier(trackingNumber)` - Auto-detect carrier from number format
- `getTrackingURL(trackingNumber, carrier)` - Generate tracking link
- `validateTrackingNumber(trackingNumber, carrier)` - Validate format
- `formatTrackingData(lineItem)` - Format for display
- `generateStats(lineItems)` - Generate tracking statistics
- `estimateDelivery(carrier, shipDate, serviceLevel)` - Estimate delivery date

### 2. `routes/tracking.js`
**Purpose**: Tracking API routes

**Endpoints:**
```javascript
// Update tracking for a line item
PUT /purchase-orders/line-items/:lineItemId/tracking
Body: {
  trackingNumber: "123456789012",
  carrier: "FedEx",  // Optional - auto-detected if not provided
  status: "In Transit",
  location: "Memphis, TN",
  description: "Package in transit",
  estimatedDelivery: "2025-10-10"
}

// Get tracking info for a line item
GET /purchase-orders/line-items/:lineItemId/tracking

// Bulk update multiple line items
POST /purchase-orders/tracking/bulk-update
Body: {
  updates: [
    {
      lineItemId: "abc123",
      trackingNumber: "123456789012",
      carrier: "FedEx",
      status: "In Transit"
    },
    ...
  ]
}

// Tracking Dashboard
GET /purchase-orders/tracking-dashboard
Query params: ?status=all&carrier=all&dateRange=30

// Get tracking statistics
GET /purchase-orders/tracking/stats

// Validate tracking number
POST /purchase-orders/tracking/validate
Body: {
  trackingNumber: "123456789012",
  carrier: "FedEx"  // Optional
}
```

---

## 🗄️ Database Schema Updates

### LineItem Model - New Fields

```javascript
{
  // Existing tracking fields
  trackingNumber: String,
  trackingCarrier: String,
  trackingStatus: String,
  trackingStatusDescription: String,
  trackingLastUpdate: Date,
  trackingLocation: String,
  trackingEstimatedDelivery: Date,
  
  // NEW FIELDS
  trackingHistory: [{
    timestamp: Date,
    status: String,
    location: String,
    description: String,
    updatedBy: String
  }],
  trackingURL: String  // Direct link to carrier tracking page
}
```

---

## 🎯 How to Use

### Option 1: From Purchase Order Dashboard

1. Open a PO and expand line items
2. Click "Add Tracking" or edit existing tracking
3. Enter tracking number (carrier auto-detected)
4. Optionally add status, location, notes
5. Click "Update Tracking"
6. Tracking URL is automatically generated

### Option 2: From Tracking Dashboard

1. Navigate to `/purchase-orders/tracking-dashboard`
2. View all packages with tracking
3. Filter by status, carrier, or date range
4. See statistics:
   - Total items with tracking
   - Delivered count
   - In transit count
   - Exceptions
   - By carrier breakdown
   - By status breakdown

### Option 3: Bulk Update via API

```javascript
fetch('/purchase-orders/tracking/bulk-update', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    updates: [
      {
        lineItemId: "676abc123def",
        trackingNumber: "123456789012",
        status: "Delivered",
        location: "Customer Address"
      }
    ]
  })
});
```

---

## 📊 Tracking Dashboard Features

### Statistics Cards
- Total Line Items
- Items with Tracking
- Delivered
- In Transit
- Exceptions
- No Tracking

### Recent Updates Table
Shows last 50 updates with:
- PO Number (clickable link)
- Item/SKU
- Tracking Number (clickable carrier link)
- Carrier
- Status (color-coded badge)
- Location
- Last Update
- Estimated Delivery

### Filters
- **Status**: All, Delivered, In Transit, Exceptions, etc.
- **Carrier**: All, FedEx, UPS, USPS, DHL, OnTrac
- **Date Range**: 7 days, 30 days, 90 days, All

---

## 🔧 Configuration

### Adding Custom Carriers

Edit `services/trackingService.js`:

```javascript
this.carriers = {
  'YourCarrier': {
    name: 'YourCarrier',
    urlTemplate: 'https://track.yourcarrier.com?number={trackingNumber}',
    regex: /^[A-Z]{2}\d{10}$/  // Your carrier's tracking number format
  },
  ...existing carriers
};
```

### Adding Custom Statuses

Edit `services/trackingService.js`:

```javascript
this.statuses = [
  'Label Created',
  'Picked Up',
  // ... existing statuses
  'Your Custom Status'  // Add here
];
```

---

## 🔄 Migration Steps

### If You Have Existing 17Track Data:

**The existing tracking data in your database is preserved!** The new system uses the same database fields:
- `trackingNumber`
- `trackingCarrier`
- `trackingStatus`
- `trackingLocation`
- `trackingEstimatedDelivery`

**New additions:**
- `trackingHistory` - Empty array for existing items, populated on updates
- `trackingURL` - Generated automatically when tracking number exists

### To Generate URLs for Existing Tracking Numbers:

```javascript
// Run this script once to add URLs to existing tracking numbers
const LineItem = require('./models/LineItem');
const trackingService = require('./services/trackingService');

async function migrateTrackingURLs() {
  const items = await LineItem.find({ 
    trackingNumber: { $exists: true, $ne: '' },
    trackingURL: { $exists: false }
  });
  
  for (const item of items) {
    const url = trackingService.getTrackingURL(
      item.trackingNumber,
      item.trackingCarrier
    );
    
    if (url) {
      item.trackingURL = url;
      await item.save();
    }
  }
  
  console.log(`✅ Updated ${items.length} tracking URLs`);
}
```

---

## ❌ What Was Removed

### Files No Longer Needed:
- `services/17trackService.js` - Keep for reference, but not used
- `17TRACK_INTEGRATION_GUIDE.md` - Outdated documentation

### Routes Replaced:
Old 17Track routes in `routes/purchaseOrders.js`:
- `POST /tracking/register` - No longer needed (no API registration)
- `POST /tracking/status` - Replaced with manual status updates
- `POST /tracking/update-all` - Replaced with `/tracking/bulk-update`

These routes can be removed or deprecated.

---

## ✅ Advantages of New System

1. **No API Costs** - Completely free
2. **No Rate Limits** - Update as often as needed
3. **Full Control** - Manage statuses exactly as you want
4. **Privacy** - No data sent to third parties
5. **Reliability** - No dependency on external service uptime
6. **Customizable** - Add carriers, statuses, and fields easily
7. **Tracking History** - Full audit trail of updates
8. **Direct Links** - Click to carrier's official tracking page

---

## 🎨 UI Integration

### In Line Item Display:

```html
<div class="tracking-info">
  <% if (item.trackingNumber) { %>
    <div class="tracking-number">
      <strong>Tracking:</strong>
      <% if (item.trackingURL) { %>
        <a href="<%= item.trackingURL %>" target="_blank">
          <%= item.trackingNumber %>
          <i class="fas fa-external-link-alt"></i>
        </a>
      <% } else { %>
        <%= item.trackingNumber %>
      <% } %>
    </div>
    <div class="tracking-carrier">
      <span class="badge bg-secondary"><%= item.trackingCarrier %></span>
    </div>
    <div class="tracking-status">
      <span class="badge bg-<%= getStatusColor(item.trackingStatus) %>">
        <%= item.trackingStatus || 'No Status' %>
      </span>
    </div>
  <% } else { %>
    <button onclick="addTracking('<%= item._id %>')">
      <i class="fas fa-plus"></i> Add Tracking
    </button>
  <% } %>
</div>
```

---

## 📞 Support

If you need to:
- Add a new carrier
- Modify tracking statuses
- Customize the dashboard
- Import existing tracking data
- Create reports

Just ask! The system is fully customizable and all code is in your control.

---

## 🎯 Next Steps

1. ✅ **System is ready to use** - All code is in place
2. **Test the tracking dashboard**: Visit `/purchase-orders/tracking-dashboard`
3. **Add tracking to a line item**: Test the update flow
4. **Verify carrier auto-detection**: Enter tracking numbers without specifying carrier
5. **Check tracking history**: Update a tracking status multiple times

The new system is **completely operational** and **backward compatible** with your existing tracking data!
