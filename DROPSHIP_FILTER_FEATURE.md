# Dropship Filter Feature - October 29, 2025

## 🎯 Feature Overview

Added a **Dropship PO Filter** to the Purchase Orders dashboard that allows you to easily identify and filter dropship purchase orders without needing a separate dashboard. Each PO can now be marked as a dropship order with a visual indicator and filtered accordingly.

---

## ✨ What's New

### **1. Dropship Toggle Button (🚚)**
- Located in the PO Number column alongside other action buttons
- Click to mark/unmark a PO as dropship
- **Visual States:**
  - **Gray (inactive)**: Regular PO - not marked as dropship
  - **Orange (active)**: Dropship PO - clearly highlighted with glow effect

### **2. Dropship Filter Checkbox**
- New "Dropship POs Only" filter in the filter section
- Located after "Missing URLs Only" checkbox
- **State Persistence:** Filter preference saved in localStorage across page refreshes

### **3. Database Field**
- Added `isDropship` boolean field to PurchaseOrder model
- Added `dropshipNotes` field for special dropship-related notes
- Fields are indexed for efficient filtering

---

## 🎮 How to Use

### **Marking a PO as Dropship:**

```
1. Find the PO in the dashboard
   ↓
2. Look at the PO Number column
   ↓
3. Click the 🚚 truck button
   ↓
4. Button turns orange with glow effect
   ↓
5. Success message: "🚚 PO [number] marked as dropship"
```

### **Unmarking a Dropship PO:**

```
1. Click the orange 🚚 button on a dropship PO
   ↓
2. Button turns gray (inactive)
   ↓
3. Success message: "📦 PO [number] unmarked as dropship"
```

### **Filtering for Dropship POs:**

```
1. Check the "Dropship POs Only" checkbox in filters
   ↓
2. Dashboard shows ONLY dropship POs
   ↓
3. Uncheck to see all POs again
   ↓
4. Filter state persists across page refreshes
```

---

## 🎨 Visual Design

### **Dropship Button States:**

**Inactive (Regular PO):**
- Background: Light gray (#e0e0e0)
- Opacity: 60%
- No shadow
- Tooltip: "Click to mark as dropship"

**Active (Dropship PO):**
- Background: Orange (#ff9800)
- Opacity: 100%
- Glow effect: Orange shadow
- Tooltip: "Dropship PO - Click to unmark"

**Hover Effect:**
- Scale increases to 105%
- Full opacity
- Smoother orange color (#f57c00) when active

---

## 📊 Use Cases

### **Scenario 1: Identify All Dropship Orders**

**Problem:** Need to see all dropship POs to coordinate deliveries.

**Solution:**
1. Check "Dropship POs Only" filter
2. Dashboard shows only dropship POs
3. Review tracking and status for each
4. Coordinate with dropship vendors

### **Scenario 2: Mark New Dropship PO**

**Problem:** Just imported a new PO that needs to be marked as dropship.

**Solution:**
1. Find the PO in the dashboard
2. Click the gray 🚚 button
3. PO is now marked and highlighted
4. If dropship filter is active, PO remains visible

### **Scenario 3: Regular PO vs Dropship Workflow**

**Regular PO:**
- Standard receiving process
- Ship to warehouse
- Standard line item tracking

**Dropship PO:**
- Ship directly to customer
- Different tracking requirements
- Special coordination needed
- Easily identified by orange 🚚 button

---

## 💡 Best Practices

### **1. Mark POs Immediately**
✅ Mark POs as dropship when creating/importing them
✅ Helps team members quickly identify special handling required
✅ Prevents confusion with regular inventory POs

### **2. Use Filter for Daily Work**
✅ Check dropship filter to focus on dropship orders
✅ Uncheck when you need to see all POs
✅ Filter state saves automatically

### **3. Coordinate with Tracking**
✅ Dropship POs often need more careful tracking
✅ Use tracking features to monitor delivery
✅ Update tracking numbers promptly

### **4. Combine with Other Filters**
✅ Combine dropship filter with vendor filter
✅ Combine with priority filter for urgent dropships
✅ Combine with status filter for workflow management

---

## 🔧 Technical Details

### **Database Schema**

**PurchaseOrder Model:**
```javascript
{
  isDropship: {
    type: Boolean,
    default: false,
    index: true  // For efficient filtering
  },
  dropshipNotes: {
    type: String,
    default: ''
  }
}
```

### **API Endpoint**

**Update Dropship Status:**
```
PUT /purchase-orders/:id/dropship
```

**Request Body:**
```json
{
  "isDropship": true
}
```

**Response:**
```json
{
  "success": true,
  "isDropship": true,
  "poNumber": "10840"
}
```

### **Filter Logic**

```javascript
// Dropship filter - only show dropship POs if checkbox is checked
const isDropship = poData.isDropship === true;
const shouldShowBasedOnDropship = !showOnlyDropship || isDropship;
```

### **LocalStorage Persistence**

```javascript
// Filter state saved as:
localStorage.setItem('filter_showOnlyDropship', 'true' | 'false');

// Restored on page load automatically
```

---

## 🗂️ Files Modified

### **1. models/PurchaseOrder.js**
- Added `isDropship` field (Boolean, indexed)
- Added `dropshipNotes` field (String)

### **2. views/dashboard.ejs**
- Added dropship toggle button in PO number column
- Added dropship filter checkbox in filters section
- Added CSS styling for dropship button states
- Added JavaScript `toggleDropshipStatus()` function
- Added dropship filter logic to `applyFilters()`
- Added localStorage persistence for filter state
- Updated `clearAllFilters()` to include dropship filter

### **3. routes/purchaseOrders.js**
- Added `PUT /:id/dropship` endpoint
- Validates boolean input
- Updates PO dropship status
- Returns success confirmation

---

## 📋 Filter Combinations

The dropship filter works seamlessly with all existing filters:

| Filter Combination | Result |
|-------------------|--------|
| Dropship Only | Shows all dropship POs |
| Dropship + Vendor | Shows dropship POs from specific vendor |
| Dropship + Priority 1 | Shows high-priority dropship POs |
| Dropship + "No URL" | Shows dropship POs missing tracking URLs |
| Dropship + Status | Shows dropship POs with specific status |
| Dropship + Search | Shows dropship POs matching search term |

---

## ⚙️ Button Location

**PO Number Column contains:**
1. 🔗 URL button (add/edit PO URL)
2. 📋 Copy button (copy PO number)
3. 📎 Attachments button (manage files)
4. **🚚 Dropship button (NEW - toggle dropship status)**

**Button Order:** Link → Copy → Attachments → **Dropship**

---

## 🔄 Workflow Integration

### **CSV Import:**
- Newly imported POs default to `isDropship: false`
- Manually mark dropship POs after import
- Use dropship filter to verify markings

### **NetSuite Import:**
- Same behavior as CSV import
- Mark as dropship after confirming PO type
- Preview feature shows all imported POs

### **Manual PO Creation:**
- Create PO first
- Mark as dropship using toggle button
- Add dropship-specific notes if needed

---

## ⚠️ Important Notes

### **Dropship Button Behavior:**
- ✅ Immediately updates database
- ✅ Shows success toast notification
- ✅ Updates button visual state
- ✅ Re-applies filters automatically
- ✅ Persists across page refreshes

### **Filter Behavior:**
- ✅ When checked: Shows ONLY dropship POs
- ✅ When unchecked: Shows all POs (including dropship)
- ✅ State saved in localStorage
- ✅ Cleared with "Clear Filters" button

### **Data Persistence:**
- ✅ Dropship status stored in MongoDB
- ✅ Filter preference stored in browser localStorage
- ✅ No data loss on page refresh
- ✅ Survives server restarts

---

## 🚀 Future Enhancements

Potential improvements:
1. **Bulk Operations** - Mark multiple POs as dropship at once
2. **Auto-Detection** - Detect dropship POs from vendor patterns
3. **Dropship Dashboard** - Dedicated view for dropship workflow
4. **Customer Integration** - Link dropship POs to customer orders
5. **Dropship Analytics** - Track dropship performance metrics
6. **Email Notifications** - Alert when dropship PO status changes
7. **Dropship Notes Field** - Add specialized notes for dropship coordination

---

## ✅ Testing Checklist

- [x] Dropship button appears in PO number column
- [x] Clicking button toggles dropship status
- [x] Button visual state updates correctly
- [x] API endpoint updates database
- [x] Dropship filter checkbox added
- [x] Filter shows only dropship POs when checked
- [x] Filter state persists in localStorage
- [x] "Clear Filters" clears dropship filter
- [x] Success toast notifications display
- [x] Filter works with other filters
- [x] Database schema updated with fields
- [x] Server logs dropship status changes

---

## 📝 Example Log Output

```
🚚 Updated dropship status for PO 10840: YES
🚚 Updated dropship status for PO 10841: NO
🔍 Filter results: 5 visible, 0 "Not my concern" hidden, 0 "Pending Bill" hidden, 0 with URLs hidden, 15 non-dropship hidden
```

---

**Status:** ✅ COMPLETE AND READY FOR USE  
**Version:** 1.0  
**Date:** October 29, 2025  
**Server:** Running at http://localhost:3002

---

## 🎯 Quick Reference

**Mark as Dropship:** Click gray 🚚 button → Turns orange  
**Unmark Dropship:** Click orange 🚚 button → Turns gray  
**View Only Dropship:** Check "Dropship POs Only" checkbox  
**View All POs:** Uncheck "Dropship POs Only" checkbox  
**Clear All Filters:** Click "Clear Filters" button
