# Dropship Filter Update - Location-Based Filtering

## 🎯 Update Summary

Updated the dropship filter to work with the **location field** from CSV imports. Now POs are automatically identified as dropship when their location contains "Dropship", and the filter works based on this field.

---

## ✨ What Changed

### **Before:**
- Dropship filter only checked the `isDropship` boolean flag
- Manual marking required for all dropship POs
- Location field was imported but not used for filtering

### **After:**
- Dropship filter checks **both** the location field AND the isDropship flag
- POs with location containing "Dropship" are **automatically** identified
- 🚚 truck button shows orange for POs with dropship location
- Filter toggle shows all POs with location="Dropship"

---

## 🔍 How It Works Now

### **Dropship Identification (Dual Check):**

A PO is considered "dropship" if **EITHER** of these is true:

1. **Location Field Contains "Dropship"** (from CSV import)
   - Example locations: "Dropship", "DROPSHIP", "dropship", "Dropship - Direct"
   - Case-insensitive match
   - Automatically detected on CSV import

2. **Manual Flag Set** (`isDropship = true`)
   - Manually toggled using the 🚚 button
   - Persisted in database

### **Filter Logic:**

```javascript
// Check location field (from CSV)
const location = (poData.location || '').toLowerCase();
const isDropshipByLocation = location.includes('dropship');

// Check manual flag
const isDropshipByFlag = poData.isDropship === true;

// PO is dropship if EITHER is true
const isDropship = isDropshipByLocation || isDropshipByFlag;
```

---

## 📊 CSV Import - Location Field

### **CSV Column Structure:**

| Column Index | Field Name | Example Value | Purpose |
|--------------|------------|---------------|---------|
| 0 | (Header) | - | Skipped |
| 1 | Date | "10/15/2025" | PO Date |
| 2 | PO Number | "10840" | Unique ID |
| 3 | Vendor | "121 Johnny's Seeds" | Vendor Info |
| 4 | NS Status | "Pending Receipt" | NetSuite Status |
| 5 | Amount | "$5,234.50" | PO Amount |
| **6** | **Location** | **"Dropship"** | **Location/Type** |

### **Location Field Examples:**

**Dropship POs:**
- `"Dropship"`
- `"DROPSHIP"`
- `"Dropship - Customer Direct"`
- `"Dropship Order"`

**Non-Dropship POs:**
- `"Warehouse"`
- `"Main Location"`
- `""`
- (empty/blank)

---

## 🎨 Visual Indicators

### **🚚 Truck Button:**

**Orange (Active):**
- Location contains "Dropship" **OR**
- isDropship flag is true
- Tooltip: "Dropship PO - Click to unmark"

**Gray (Inactive):**
- Location does NOT contain "Dropship" **AND**
- isDropship flag is false
- Tooltip: "Click to mark as dropship"

### **Toggle Switch Filter:**

**ON (Orange - "Dropship Only"):**
- Shows ONLY POs where:
  - Location contains "Dropship" **OR**
  - isDropship = true

**OFF (Gray - "Show All POs"):**
- Shows all POs regardless of location or flag

---

## 🔄 Workflow Examples

### **Scenario 1: CSV Import with Dropship Location**

```
1. Import CSV file with PO that has Location = "Dropship"
   ↓
2. PO automatically identified as dropship
   ↓
3. 🚚 button shows ORANGE automatically
   ↓
4. Toggle dropship filter ON
   ↓
5. PO appears in filtered list
```

### **Scenario 2: Manual Dropship Marking**

```
1. PO has Location = "Warehouse" (not dropship)
   ↓
2. User clicks gray 🚚 button
   ↓
3. isDropship flag set to true
   ↓
4. Button turns ORANGE
   ↓
5. PO now appears in dropship filter
```

### **Scenario 3: Mixed Criteria**

```
Some POs have:
- Location = "Dropship" → Auto-identified
- Location = "" but isDropship = true → Manually marked
- Location = "Dropship" AND isDropship = true → Both (redundant but valid)

Toggle filter ON shows ALL of these
```

---

## 📋 Filter Behavior

### **When Toggle is ON:**

**Shows:**
- ✅ POs with location containing "Dropship"
- ✅ POs with isDropship = true
- ✅ POs with both

**Hides:**
- ❌ POs with location NOT containing "Dropship" AND isDropship = false

### **When Toggle is OFF:**

**Shows:**
- ✅ ALL POs (dropship and non-dropship)

---

## 🔧 Technical Implementation

### **Frontend Filter (dashboard.ejs):**

```javascript
// Dropship filter - check both location field and isDropship flag
const location = (poData.location || '').toLowerCase();
const isDropshipByLocation = location.includes('dropship');
const isDropshipByFlag = poData.isDropship === true;
const isDropship = isDropshipByLocation || isDropshipByFlag;
const shouldShowBasedOnDropship = !showOnlyDropship || isDropship;
```

### **Visual Indicator (EJS Template):**

```html
<button
    class="dropship-toggle-btn <%= (po.isDropship || (po.location && po.location.toLowerCase().includes('dropship'))) ? 'is-dropship' : '' %>"
    data-is-dropship="<%= (po.isDropship || (po.location && po.location.toLowerCase().includes('dropship'))) ? 'true' : 'false' %>"
    title="<%= (po.isDropship || (po.location && po.location.toLowerCase().includes('dropship'))) ? 'Dropship PO - Click to unmark' : 'Click to mark as dropship' %>">
    🚚
</button>
```

### **CSV Import (purchaseOrders.js - Line 218):**

```javascript
location: row[6],  // Column 7 from CSV
```

---

## 💡 Best Practices

### **1. Use CSV Location Field**
✅ Set location to "Dropship" in your NetSuite exports
✅ Automatic identification on import
✅ No manual marking needed
✅ Consistent across imports

### **2. Manual Marking (Fallback)**
✅ Use 🚚 button for POs without location data
✅ Use when location field is blank or unclear
✅ Flag persists across CSV re-imports

### **3. Filter Usage**
✅ Toggle ON to focus on dropship workflow
✅ Combine with vendor filter for specific dropship vendors
✅ Combine with status filter for dropship PO management

### **4. CSV Preparation**
✅ Ensure location column is populated in exports
✅ Use consistent naming: "Dropship", not "DS" or "Direct"
✅ Include location column in all CSV imports

---

## 📊 Expected Results

After importing a CSV with dropship locations, you should see:

**Immediate Effects:**
- 🚚 buttons automatically orange for dropship POs
- Filter toggle shows correct count of dropship POs
- No manual marking needed for location-based dropship

**Filter Behavior:**
- Toggle ON: Shows only dropship POs (from location OR flag)
- Toggle OFF: Shows all POs
- Console log shows: "X non-dropship hidden"

---

## 🐛 Troubleshooting

### **Issue: PO not showing as dropship**

**Check:**
1. Is location field populated? (View in dashboard)
2. Does location contain "dropship" (case-insensitive)?
3. Is location field being imported correctly?
4. Try manually marking with 🚚 button as fallback

### **Issue: All POs showing as dropship**

**Check:**
1. Is filter toggle ON? (Turn OFF to see all)
2. Check location values in database
3. Verify CSV location column is correct

### **Issue: Location not importing**

**Check:**
1. CSV has location in column 7 (index 6)
2. CSV structure matches expected format
3. Check server logs during import for location field

---

## 🔄 Migration Notes

### **Existing POs:**

**Before Update:**
- Only POs manually marked with isDropship = true show in filter

**After Update:**
- POs with location="Dropship" automatically show (even if isDropship = false)
- Manually marked POs still work (isDropship = true)
- Both criteria work together (OR logic)

### **No Data Loss:**
- Existing isDropship flags are preserved
- Location field was already being imported
- Filter now uses both fields
- Backward compatible

---

## ✅ Testing Checklist

- [x] Location field checked in dropship filter logic
- [x] 🚚 button shows orange for location="Dropship"
- [x] 🚚 button shows orange for isDropship=true
- [x] Filter toggle works with location field
- [x] Filter toggle works with isDropship flag
- [x] Filter toggle works with both (OR logic)
- [x] Case-insensitive matching for location
- [x] Partial match (contains) for location
- [x] Server restarted successfully
- [x] Backward compatible with existing manual flags

---

## 📝 Example Scenarios

### **Scenario A: Pure Location-Based**
```
PO 10840:
  location: "Dropship"
  isDropship: false
  
Result: Shows as dropship ✅
Reason: Location contains "dropship"
Button: Orange 🚚
```

### **Scenario B: Pure Flag-Based**
```
PO 10841:
  location: "Warehouse"
  isDropship: true
  
Result: Shows as dropship ✅
Reason: isDropship flag is true
Button: Orange 🚚
```

### **Scenario C: Both**
```
PO 10842:
  location: "Dropship"
  isDropship: true
  
Result: Shows as dropship ✅
Reason: Both criteria met (redundant)
Button: Orange 🚚
```

### **Scenario D: Neither**
```
PO 10843:
  location: "Main Warehouse"
  isDropship: false
  
Result: NOT dropship ❌
Reason: Neither criterion met
Button: Gray 🚚
```

---

**Status:** ✅ COMPLETE AND READY FOR USE  
**Version:** 2.0 (Location-Based)  
**Date:** October 29, 2025  
**Server:** Running at http://localhost:3002

---

## 🎯 Quick Reference

**Import CSV with location column** → POs automatically identified  
**Toggle filter ON** → See all dropship POs (location OR flag)  
**Toggle filter OFF** → See all POs  
**🚚 Orange button** → Dropship PO (auto or manual)  
**🚚 Gray button** → Regular PO  
**Manual marking** → Still works for POs without location data
