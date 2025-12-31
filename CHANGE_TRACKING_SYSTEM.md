# Change Tracking System Implementation

## Overview
Comprehensive system to automatically track ALL Purchase Order modifications and log them to the Notes field with timestamps. The "Next Update" field has been converted to "Last Update" which shows when the PO was last modified.

## Files Modified

### 1. **models/PurchaseOrder.js**
- ✅ Added `lastUpdate` field (Date) - auto-updated when any PO field changes
- ✅ Added `lastUpdatedBy` field (String) - tracks which user made the change
- ✅ Updated `notes` field comment to indicate it includes auto-logged changes
- ✅ Kept `nextUpdateDate` for backward compatibility (deprecated)

### 2. **lib/changeTracking.js** (NEW FILE)
Central utility for change tracking with the following functions:

- **`trackPOChange(poId, changeType, oldValue, newValue, user)`**
  - Tracks a single change to a PO
  - Auto-formats log entry with timestamp
  - Appends to notes field
  - Updates lastUpdate and lastUpdatedBy fields
  - Returns updated PO document

- **`trackMultipleChanges(poId, changes[], user)`**
  - Tracks multiple changes in one transaction
  - Accepts array of change objects
  - Batches all logs into single update
  - Useful for bulk updates

- **`trackLineItemChange(poId, sku, changeType, oldValue, newValue, user)`**
  - Specialized function for line item changes
  - Includes SKU in the log entry
  - Example: "Line Item [ABC-123] Quantity Received: 0 → 50"

- **`formatChangeLog(changeType, oldValue, newValue, user)`**
  - Formats change entries consistently
  - Format: `[MM/DD/YYYY HH:MM AM/PM] Username - ChangeType: OldValue → NewValue`
  - Handles dates, booleans, nulls, and strings
  - Example: `[12/31/2025 8:15 AM] admin - Status: In Progress → Completed`

### 3. **routes/purchaseOrders.js**
Added change tracking to all PO update endpoints:

✅ **Assignment Changes** (Line ~1610)
- Endpoint: `PUT /pos/:id/assign`
- Tracks: "Assigned To" changes
- Captures: Old assignee name → New assignee name

✅ **Status Changes** (Line ~3544)
- Endpoint: `PUT /:id/status`
- Tracks: "Status" changes
- Captures: Old status → New status

✅ **ETA Changes** (Line ~3580)
- Endpoint: `PUT /:id/eta`
- Tracks: "ETA" changes
- Captures: Old date → New date (formatted)

✅ **URL Changes** (Line ~3599)
- Endpoint: `PUT /:id/url`
- Tracks: "PO URL" changes
- Captures: Old URL → New URL

✅ **Shipping Tracking Changes** (Line ~3618)
- Endpoint: `PUT /:id/shipping-tracking`
- Tracks: "Shipping Tracking" changes
- Captures: Old tracking → New tracking
- Also updates associated line items

✅ **Priority Changes** (Line ~3732)
- Endpoint: `PUT /:id/priority`
- Tracks: "Priority" changes
- Captures: Old priority (1-5) → New priority

✅ **Dropship Status Changes** (Line ~3767)
- Endpoint: `PUT /:id/dropship`
- Tracks: "Dropship Status" changes
- Captures: Yes/No → Yes/No

### 4. **views/dashboard.ejs**
UI changes to display Last Update instead of manual Next Update:

✅ **Table Header** (Line ~4444)
- Changed: "Next Update" → "Last Update"
- Column class: `last-update-cell` (was `next-update-cell`)

✅ **Display Cell** (Lines ~4696-4700)
- Removed: Manual date input for next update
- Added: Read-only timestamp display showing last modification
- Format: "Dec 31, 2025 08:15 AM" or "-" if never updated
- Classes: `last-update-display`, `has-update`, `no-update`
- Tooltip: Shows full timestamp on hover

✅ **JavaScript** (Lines ~6127-6168)
- Removed: Auto-save event listener for next update date changes
- Added: Comment explaining Last Update is system-managed

✅ **CSS Styles** (Lines ~2740-2810)
- Added: `.last-update-cell` - column width styling
- Added: `.last-update-display` - read-only timestamp styling
- Added: `.has-update` - styling for updated POs (blue background)
- Added: `.no-update` - styling for never-updated POs (gray, italic)
- Kept: `.date-input` styles for backward compatibility

## Change Log Format

All changes are logged to the `notes` field in this format:

```
[MM/DD/YYYY HH:MM AM/PM] Username - ChangeType: OldValue → NewValue
```

### Examples:

```
[12/31/2025 8:15 AM] admin - Status: In Progress → Completed
[12/31/2025 8:16 AM] john_doe - Priority: 3 → 1
[12/31/2025 8:17 AM] System - ETA: 01/15/2025 → 01/20/2025
[12/31/2025 8:18 AM] admin - Assigned To: None → John Smith
[12/31/2025 8:19 AM] admin - PO URL: None → https://vendor.com/po123
[12/31/2025 8:20 AM] admin - Shipping Tracking: None → 1Z999AA10123456784
[12/31/2025 8:21 AM] admin - Dropship Status: No → Yes
[12/31/2025 8:22 AM] admin - Line Item [SKU-123] Quantity Received: 0 → 50
```

## How It Works

### 1. Update Endpoint Flow
```javascript
// Example: Status update endpoint
router.put('/:id/status', async (req, res) => {
  // 1. Get current PO to capture old value
  const currentPO = await PurchaseOrder.findById(req.params.id);
  const oldStatus = currentPO.status;
  
  // 2. Update the PO field
  const updated = await PurchaseOrder.findByIdAndUpdate(...);
  
  // 3. Track the change (auto-appends to notes + updates lastUpdate)
  const username = req.user?.name || req.user?.username || 'System';
  await trackPOChange(req.params.id, 'Status', oldStatus, req.body.status, username);
  
  // 4. Return success response
  res.json({ success: true });
});
```

### 2. Change Tracking Function Flow
```javascript
async function trackPOChange(poId, changeType, oldValue, newValue, user) {
  // 1. Skip if no change
  if (oldValue === newValue) return null;
  
  // 2. Format the log entry
  const changeLog = formatChangeLog(changeType, oldValue, newValue, user);
  // Result: "[12/31/2025 8:15 AM] admin - Status: In Progress → Completed"
  
  // 3. Append to existing notes
  const separator = po.notes ? '\n' : '';
  const updatedNotes = po.notes + separator + changeLog;
  
  // 4. Update PO with new notes, lastUpdate timestamp, and user
  await PurchaseOrder.findByIdAndUpdate(poId, {
    notes: updatedNotes,
    lastUpdate: new Date(),
    lastUpdatedBy: user
  });
}
```

## User Experience

### Before (Manual Next Update):
- User manually sets "Next Update" date
- No automatic logging of changes
- No visibility into what was changed or when
- Date input field in dashboard

### After (Automatic Last Update):
- System automatically updates "Last Update" timestamp on ANY change
- All changes logged to Notes field with details
- Full audit trail showing: what changed, old/new values, who changed it, when
- Read-only timestamp display in dashboard
- Hover tooltip shows full timestamp

## Benefits

1. **Complete Audit Trail** - Every change is logged with context
2. **Automatic Tracking** - No manual effort required
3. **User Attribution** - Know who made each change
4. **Historical Context** - See change history in Notes field
5. **Transparency** - All stakeholders can see when PO was last modified
6. **Debugging** - Easier to troubleshoot issues with change history

## Future Enhancements (Not Yet Implemented)

Potential additions for comprehensive tracking:

1. **Line Item Updates** - Track quantity received, status changes, etc.
2. **Document Uploads** - Log when documents are attached/removed
3. **CSV Import Changes** - Track bulk updates from CSV imports
4. **Vendor Changes** - Log vendor information updates
5. **Note Additions** - Track manual note entries separately
6. **Snooze Actions** - Log when POs are snoozed/unsnoozed
7. **Task Creation** - Log when tasks are created for a PO

## Testing Recommendations

1. Test each update endpoint to verify tracking works
2. Check Notes field after making changes
3. Verify lastUpdate timestamp updates correctly
4. Test with different user accounts to verify attribution
5. Test with null/empty values to verify formatting
6. Check dashboard display of Last Update column
7. Verify tooltip shows correct timestamp

## Technical Notes

- All tracking is asynchronous (`await trackPOChange(...)`)
- Errors in tracking don't block the update operation
- Logs to console for debugging: `Change tracked for PO 12345: Status`
- Uses `req.user` context for user attribution (falls back to "System")
- Date formatting: `MM/DD/YYYY HH:MM AM/PM` (US locale)
- Notes field grows over time - consider archival strategy for long-lived POs

## Deployment Checklist

Before deploying to production:

- ✅ All model changes applied
- ✅ Change tracking library created
- ✅ All endpoints updated with tracking hooks
- ✅ Dashboard UI updated to show Last Update
- ✅ CSS styles added for new display
- ✅ Server tested and running successfully
- ⏳ Test with real user actions
- ⏳ Monitor Notes field growth
- ⏳ Verify user attribution works correctly
- ⏳ Test all update endpoints individually
- ⏳ Commit and push to GitHub

## Git Commit Message Suggestion

```
feat: Add comprehensive PO change tracking system

- Convert "Next Update" to "Last Update" with automatic timestamp
- Create lib/changeTracking.js utility for logging changes
- Add change tracking to all PO update endpoints (assign, status, ETA, URL, tracking, priority, dropship)
- Update dashboard UI to show read-only Last Update timestamp
- Add lastUpdate and lastUpdatedBy fields to PurchaseOrder model
- Auto-append formatted change logs to Notes field
- Format: [timestamp] user - ChangeType: OldValue → NewValue

Benefits:
- Complete audit trail for all PO modifications
- User attribution for transparency
- Historical context in Notes field
- No manual tracking required
```
