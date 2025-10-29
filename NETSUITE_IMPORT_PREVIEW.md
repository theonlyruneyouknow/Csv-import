# NetSuite Import Preview Feature - October 28, 2025

## 🎯 Feature Overview

Added a **Preview Changes** feature to the NetSuite line items import that allows you to see exactly what will change BEFORE committing the import to the database. This helps catch errors and verify data accuracy.

**Plus:** Both the Import modal and Preview modal now have scrolling functionality for easier navigation with large datasets.

---

## ✨ What's New

### **📋 Preview Button**
- New **"Preview Changes"** button in the NetSuite Import modal
- Located between "Cancel" and "Import Line Items" buttons
- Shows a detailed preview without modifying the database

### **🖱️ Scrollable Modals**
Both modals now feature smart scrolling:
- **Import Modal**: Scrollable body area for long NetSuite data pastes
- **Preview Modal**: Scrollable table with sticky headers for reviewing many line items
- Fixed headers and action buttons remain visible while scrolling

### **Preview Modal**
Displays comprehensive information about the proposed changes:
- **Summary Statistics**: New, Updated, Removed, Unchanged, Total items
- **Warnings & Errors**: Data quality issues, mismatches, missing information
- **Detailed Comparison Table**: Side-by-side view of current vs. new data
- **Visual Indicators**: Color-coded rows showing change types

---

## 🎮 How to Use

### **Standard Workflow:**

```
1. Open PO Dashboard
   ↓
2. Click "Update Line Items" on a PO (or use Imports menu)
   ↓
3. Paste NetSuite data into modal
   ↓
4. Click "📋 Preview Changes" (NEW!)
   ↓
5. Review the preview:
   - Check summary counts
   - Read any warnings/errors
   - Verify changes in table
   ↓
6. If everything looks good:
   - Click "✓ Confirm & Import"
   ↓
7. If there are problems:
   - Click "Cancel"
   - Fix the data
   - Try again
```

### **When to Use Preview:**

✅ **Always use preview when:**
- Updating existing line items (not adding new)
- Item counts don't match expectations
- You're unsure about the data quality
- Working with important/high-value POs
- Learning the import process

---

## 📊 Preview Features

### **1. Summary Statistics**

Displayed at the top in colorful boxes:

- **New Items** (Green): Items that will be added
- **Updated Items** (Yellow): Items with changed quantities/prices
- **Removed Items** (Red): Items not in new data (replace mode only)
- **Unchanged Items** (Gray): Items with no changes
- **Total Items**: Overall count

### **2. Warnings & Errors**

**⚠️ Warnings (Yellow Box):**
- History count mismatch
- No target PO specified
- Items skipped due to missing data
- Data format issues

**❌ Errors (Red Box):**
- Fatal issues that will prevent import
- Invalid data formats
- Missing required fields

### **3. Preview Table**

**Columns:**
- **Status**: Icon showing change type (🆕 ✏️ 🗑️ ✓)
- **Item**: Item code
- **Description**: Item description/memo
- **Quantity**: Ordered quantity (with before/after if changed)
- **Received**: Received quantity
- **Billed**: Billed quantity  
- **Rate**: Unit price (with before/after if changed)
- **Changes**: Description of what changed

**Color Coding:**
- 🟢 **Green Background**: New items being added
- 🟡 **Yellow Background**: Existing items being updated
- 🔴 **Red Background**: Items being removed (strikethrough)
- ⚪ **Gray Background**: Unchanged items

**Change Indicators:**
When a value changes, you'll see:
```
Old Value → New Value
  5        →   10
```

---

## 🔍 Common Scenarios

### **Scenario 1: History Count Mismatch**

**Preview shows:**
```
⚠️ Warning: History count mismatch
Current has 25 items, import has 23 items
```

**Meaning:** You're updating a PO that currently has 25 line items, but your import data only has 23 items.

**Action:**
- Review which 2 items are missing
- Check preview table for red (removed) items
- Verify if this is expected
- If not, check your NetSuite data copy

### **Scenario 2: All Items Showing as "New"**

**Preview shows:**
```
New Items: 25
Updated Items: 0
```

**Meaning:** The system doesn't recognize any existing items (item codes don't match).

**Action:**
- Check if you selected the correct PO
- Verify item codes match existing data
- Check if "Add to existing" is incorrectly checked

### **Scenario 3: Quantity Mismatches**

**Preview shows updated items with:**
```
Quantity: 100 → 150
```

**Meaning:** The import will change quantity from 100 to 150.

**Action:**
- Verify this change is correct in NetSuite
- Check if partial receipts were recorded
- Confirm this matches your expectations

---

## 💡 Best Practices

### **1. Always Preview First**
✅ Make it a habit to click "Preview" before "Import"
✅ Especially important for updates (vs. new imports)

### **2. Check the Warnings**
✅ Read all warnings carefully
✅ Understand why the warning appears
✅ Investigate any unexpected warnings

### **3. Verify History Count**
✅ Current count should match import count (usually)
✅ If different, identify which items changed
✅ Ensure removed items are intentional

### **4. Review Price Changes**
✅ Look for unexpected rate changes
✅ Verify price updates match NetSuite
✅ Watch for decimal point errors

### **5. Check Item Codes**
✅ Ensure item codes match exactly
✅ Look for trailing spaces or typos
✅ Verify vendor descriptions are correct

---

## 🔧 Technical Details

### **Backend API**

**Endpoint:** `POST /api/preview-netsuite-import`

**Request:**
```json
{
  "data": "NetSuite tab-separated data",
  "targetPOId": "PO MongoDB ID (optional)",
  "addToExisting": false
}
```

**Response:**
```json
{
  "success": true,
  "summary": {
    "newItems": 5,
    "updatedItems": 18,
    "removedItems": 2,
    "unchangedItems": 0,
    "totalItems": 25
  },
  "items": [
    {
      "item": "BR114",
      "memo": "ASPABROC",
      "quantityExpected": 250,
      "rate": 26.25,
      "changeType": "updated-item",
      "changes": "quantityExpected",
      "old": {
        "quantityExpected": 200
      }
    }
  ],
  "warnings": ["History count mismatch: Current has 25 items, import has 23 items"],
  "errors": [],
  "targetPO": {
    "poNumber": "10840",
    "vendor": "Johnny's Selected Seeds"
  },
  "mode": "replace"
}
```

### **Change Detection Logic**

1. **New Item**: Item code doesn't exist in current PO
2. **Updated Item**: Item exists, but quantity/price/description changed
3. **Removed Item**: Item exists in current PO but not in import data (replace mode only)
4. **Unchanged Item**: Item exists with identical values

### **Files Modified**

1. **views/dashboard.ejs**
   - Added Preview button
   - Added preview modal HTML
   - Added preview CSS styles  
   - Added JavaScript preview functions
   - Functions: `previewNetSuiteImport()`, `displayPreview()`, `confirmAndImport()`

2. **routes/purchaseOrders.js**
   - Added `/api/preview-netsuite-import` endpoint
   - Parses NetSuite data without saving
   - Compares with existing line items
   - Returns detailed comparison

---

## 📋 Example Use Case

### **Problem:**
You're updating PO 10840 which has 25 line items. After pasting NetSuite data, you're not sure if everything is correct.

### **Solution with Preview:**

1. **Click Preview**
2. **See Summary:**
   - New: 0
   - Updated: 23
   - Removed: 2 ⚠️
   - Unchanged: 0

3. **Check Warnings:**
   - "History count mismatch: Current has 25 items, import has 23 items"

4. **Review Table:**
   - Scroll to red (removed) items
   - Find: "FL2948 MEXICAN SUNFLOWER" - being removed
   - Find: "BR114 ASPABROC" - being removed

5. **Investigate:**
   - Check NetSuite: These 2 items were actually cancelled
   - Confirm this is correct
   
6. **Decision:**
   - ✅ Proceed with import (items should be removed)
   - **OR**
   - ❌ Cancel and check with vendor first

---

## ⚠️ Important Notes

### **Preview Does NOT:**
- ❌ Save any changes to the database
- ❌ Modify existing line items
- ❌ Create new line items
- ❌ Send any notifications

### **Preview DOES:**
- ✅ Parse your NetSuite data
- ✅ Compare with existing data
- ✅ Show you what WILL happen
- ✅ Identify potential issues
- ✅ Help you make informed decisions

### **After Preview:**
- Changes are NOT saved until you click "Confirm & Import"
- You can cancel and fix data without consequences
- You can preview as many times as needed
- Each preview is independent (no side effects)

---

## 🐛 Troubleshooting

### **Preview shows all "New" when updating:**
**Cause:** Item codes don't match existing items
**Fix:** Verify you selected the correct PO, check item code format

### **Preview shows "No target PO specified":**
**Cause:** Didn't select a PO from dropdown
**Fix:** Select the target PO before previewing

### **Warning: "History count mismatch":**
**Cause:** Different number of items in current vs. import
**Fix:** This is often normal (items added/removed), review the changes

### **Items showing as "Removed" unexpectedly:**
**Cause:** Items exist in PO but not in your paste data
**Fix:** Check if you copied all items from NetSuite

---

## 🚀 Future Enhancements

Potential improvements:
1. **Diff highlighting** - Show exactly which fields changed
2. **Export preview** - Download preview as CSV/Excel
3. **Approval workflow** - Require manager approval for large changes
4. **History logging** - Track all previews and imports
5. **Auto-fix suggestions** - Recommend corrections for common errors
6. **Batch preview** - Preview multiple POs at once

---

## ✅ Testing Checklist

- [x] Preview button appears in import modal
- [x] Preview parses NetSuite data correctly
- [x] Summary counts are accurate
- [x] Warnings display for mismatches
- [x] Table shows all items with correct colors
- [x] Change indicators show old → new values
- [x] "Confirm & Import" proceeds with actual import
- [x] "Cancel" closes preview without changes
- [x] Works with both "replace" and "add to existing" modes
- [x] Handles missing target PO gracefully

---

**Status:** ✅ COMPLETE AND READY FOR TESTING  
**Version:** 1.0  
**Date:** October 28, 2025  
**Server:** Running at http://localhost:3002
