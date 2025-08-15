# NetSuite PO Form Import Guide

## Overview
The new NetSuite import functionality allows you to directly import line items from NetSuite PO forms into your purchase order dashboard.

## Features Added

### 1. Line Items Column
- **New column** in the purchase orders table showing line item counts
- **📦 Number** button when line items exist (shows count and opens line items view)
- **📥 Import** button when no line items exist (opens NetSuite import modal)

### 2. NetSuite Import Option
- **Added to Imports dropdown** in the navigation: "🏢 NetSuite PO Form"
- **Import modal** with paste area for NetSuite data
- **Auto-detection** of target purchase order or manual selection

### 3. Data Processing
- **Parses tab-separated** NetSuite PO form data
- **Extracts required fields** while ignoring unnecessary columns (rate, units, on hand, available, amount, match bill to receipt, history)
- **Creates line items** with proper status tracking
- **Associates with POs** by vendor name or manual selection

## How to Use

### Step 1: Get NetSuite PO Form Data
1. Open your purchase order in NetSuite
2. Navigate to the line items section
3. Copy the entire table including headers (Ctrl+A, Ctrl+C)

### Step 2: Import via Dashboard
**Option A - From Navigation:**
1. Click **📁 Import** in the top navigation
2. Select **🏢 NetSuite PO Form**
3. Paste your data and import

**Option B - From PO Row:**
1. Find a PO with no line items
2. Click the **📥 Import** button in the Line Items column
3. This pre-selects the target PO

### Step 3: Review Import
- The system will show how many items were imported
- Line items will appear in the PO's line items view
- The **📦 Number** button will show the count

## Data Format Expected

```
Item	Vendor Name	Quantity	Description	VENDOR DESC	Rate	Units	On Hand	Available	Received	Billed	Amount	Match Bill To Receipt	Expected Receipt Date	Bill Variance Status	Closed	Expected Arrival Date	History
BR114 : BR114/OR.M		250	ASPABROC (ordering)	ASPABROC (ordering)	26.25	M	58.142	58.142	0	0	6,562.50		3/13/2025				History
```

## Fields Imported

### Required Fields:
- **Item** - SKU/Item code
- **Quantity** - Order quantity
- **Description** - Item description

### Optional Fields:
- **Vendor Name** - Used for PO matching
- **VENDOR DESC** - Vendor's description
- **Received** - Quantity received
- **Billed** - Quantity billed
- **Expected Receipt Date** - When item is expected
- **Expected Arrival Date** - When item should arrive
- **Closed** - Whether item is closed (T/F)

### Ignored Fields:
- Rate, Units, On Hand, Available, Amount, Match Bill To Receipt, History

## Auto-Detection Logic

1. **By Target PO**: If manually selected, uses that PO
2. **By Vendor Name**: Matches vendor name from data to existing POs
3. **Most Recent**: If multiple matches, uses most recent PO

## Benefits

- **Faster Data Entry**: No manual line item creation
- **Accurate Data**: Direct from NetSuite reduces errors
- **Status Tracking**: Automatically sets item status based on received quantities
- **Visual Indicators**: Easy to see which POs have line items and counts
- **Flexible Import**: Can import to specific POs or auto-detect

## Troubleshooting

### Import Failed
- Check data format (tab-separated)
- Ensure headers are present
- Verify at least Item, Quantity, Description columns exist

### No PO Found
- Manually select target PO from dropdown
- Check vendor name spelling matches existing PO
- Create PO first if it doesn't exist

### Partial Import
- System skips empty rows and "History" entries
- Check console for details on skipped items
- Missing essential data (Item/Description) will be skipped
