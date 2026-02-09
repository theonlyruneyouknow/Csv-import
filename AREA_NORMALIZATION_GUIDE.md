# EBM Area Normalization System

## Problem Statement

Your missionary data contains non-normalized area names. Missionaries entered area names with different spellings/variations, creating data quality issues.

### Data Structure
- **a_id**: Unique ID for each spelling variant (e.g., "Banbury", "banbury", "Banbury Area")
- **area_id**: Normalized/grouped ID representing the same physical area (multiple a_ids → one area_id)
- **area_name**: The actual name string as entered by the missionary

### Example
```
a_id=100, area_id=1, area_name="Banbury"
a_id=101, area_id=1, area_name="banbury"
a_id=102, area_id=1, area_name="Banbury Area"
→ All three are the same physical area but with different spellings
```

## Solution Implemented

### 1. Updated Database Schema
**File:** `models/MissionArea.js`

Added new fields to track normalization:
- `legacyAId` - Individual spelling variant ID (unique)
- `legacyAreaId` - Normalized group ID (not unique)
- `isCanonical` - Boolean flag marking the preferred spelling
- `canonicalAreaRef` - Reference to the canonical version
- `variantCount` - Number of variants in this group

### 2. Updated Import Logic
**File:** `routes/ebm.js`

#### Areas Import (`importAreas`)
- Now imports ALL a_id variants as separate documents
- Uses `a_id` as the primary identifier (`legacyAId`)
- Stores `area_id` as the grouping identifier (`legacyAreaId`)
- Skips rows with `a_id='0'` or `a_id='NULL'`
- Creates individual records for each spelling variant

#### Missionary-Areas Import (`importMissionaryAreas`)
- Supports linking by specific `a_id` (preferred)
- Falls back to `area_id` for backwards compatibility
- Creates two lookup maps:
  - `areaByAIdMap` - Lookup by specific variant
  - `areaByAreaIdMap` - Lookup by normalized group
- Links missionaries to the EXACT spelling they entered

### 3. Normalization Tool
**File:** `normalize-area-names.js`

Interactive command-line tool with 5 options:

#### Option 1: Review All Groups
- Shows each area_id group with multiple spellings
- Lets you manually select the canonical spelling
- Example:
  ```
  area_id: 1 (3 variants)
    1. "Banbury" (a_id: 100)
    2. "banbury" (a_id: 101)
    3. "Banbury Area" (a_id: 102)
  Select canonical version (1-3): 1
  ```

#### Option 2: Auto-Select
- Automatically selects first alphabetically sorted spelling
- Fast way to establish initial canonical names
- Can be refined later manually

#### Option 3: Generate Report
- Shows statistics and all groups needing normalization
- Lists variants without area_id (need manual mapping)
- No changes made - report only

#### Option 4: Mark Specific Canonical
- Quickly mark a single area as canonical by a_id
- Useful for one-off corrections

#### Option 5: Clear All Canonical Flags
- Reset all canonical flags to start over

## Import Workflow

### Step 1: Clear Existing Data (Optional)
```bash
node clear-ebm-areas.js
```

### Step 2: Import Areas (All Variants)
1. Go to http://localhost:3001/ebm/import
2. Select "Mission Areas"
3. Upload CSV with columns: `a_id, area_id, area_name`
4. System imports ALL variants (not collapsed by area_id)
5. Results show: "Imported X area variants"

Expected: 642 rows → ~500+ variants imported (some skipped for NULL)

### Step 3: Establish Canonical Names
```bash
node normalize-area-names.js
```

Choose option 2 (Auto-Select) for quick setup, then option 1 to refine.

### Step 4: Import Missionary-Area Relationships
1. Go to http://localhost:3001/ebm/import
2. Select "Missionary-Area Relationships"
3. Upload CSV with columns: `alum_id, area_id`
   - Or ideally: `alum_id, area_a_id` (for exact variant matching)
4. System links missionaries to specific spellings
5. Falls back to area_id if a_id not provided

## CSV File Formats

### Areas CSV
```csv
a_id,area_id,area_name
100,1,Banbury
101,1,banbury
102,1,Banbury Area
200,2,Bedford
201,2,Bedford-Bloxton
```

### Missionary-Areas CSV (Current Format)
```csv
alum_id,area_id
18,1
26,1
27,2
```

### Missionary-Areas CSV (Ideal Format - Future)
```csv
alum_id,area_a_id
18,100
26,101
27,200
```
This preserves the EXACT spelling the missionary entered.

## Displaying Normalized Names

When displaying areas:
1. **Preserve original data**: Missionary linked to specific a_id
2. **Display canonical name**: Look up isCanonical=true variant in same area_id group
3. **Show variant**: Optionally show "as entered: 'banbury'"

Example display logic:
```javascript
// Get missionary's areas
const missionaryAreas = await missionary.populate('areasServed');

for (const area of missionaryAreas) {
    if (area.isCanonical) {
        // Show canonical name
        console.log(area.name);
    } else {
        // Find canonical version
        const canonical = await MissionArea.findOne({
            legacyAreaId: area.legacyAreaId,
            isCanonical: true
        });
        console.log(`${canonical.name} (as entered: "${area.name}")`);
    }
}
```

## Benefits

1. **Data Preservation**: Original missionary-entered spellings preserved
2. **Clean Display**: Users see standardized, canonical names
3. **Flexibility**: Easy to update canonical choice without breaking links
4. **Backwards Compatible**: System works with both a_id and area_id
5. **Audit Trail**: Can always see what missionaries originally entered

## Commands Reference

```bash
# Import all area variants
# Use web interface: http://localhost:3001/ebm/import → Mission Areas

# Run normalization tool
node normalize-area-names.js

# Import missionary-area relationships
# Use web interface: http://localhost:3001/ebm/import → Missionary-Area Relationships

# Check current state
# Browse to: http://localhost:3001/ebm/areas
```

## Future Enhancements

1. **Web UI for normalization**: Add interface to mark canonical names
2. **Fuzzy matching**: Suggest similar spellings to group
3. **Bulk operations**: Merge similar spellings automatically
4. **History tracking**: Log canonical name changes
5. **Area merging**: Combine duplicate areas after verifying

## Troubleshooting

### Areas Not Importing
- Check that a_id is not '0' or 'NULL'
- Verify area_name is not 'Null' or empty
- Check logs for specific skip reasons

### Relationships Not Linking
- Ensure areas imported first (Step 2 before Step 4)
- Check that missionaries exist with legacyData.alumId
- Verify area_id values match between files

### Multiple Canonical Names
- Only one variant per area_id should have isCanonical=true
- Run normalize tool to fix

## Data Quality Checks

Current import shows:
- ✅ 2,458 missionaries with legacy IDs
- ✅ 300 areas imported (should be ~500+ after using a_id)
- ✅ 7,624 relationships linked
- ⚠️ 384 variants with area_id='NULL' (need manual mapping)
- ⚠️ 554 missionaries in CSV not in database (expected - not all imported yet)
