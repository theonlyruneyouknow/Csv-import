# Mission Areas Import Guide

## Overview
The web import form now supports THREE types of imports:
1. **Missionaries** - Alumni data (39 SQL fields)
2. **Mission Areas** - Geographic areas where missionaries served
3. **Missionary-Area Relationships** - Links missionaries to their service areas

## Import Order (Important!)
You must import in this order:
1. Import Missionaries first (if not already done)
2. Import Areas
3. Import Missionary-Area relationships (links them together)

## Web Import Instructions

### Step 1: Access Import Page
Navigate to: `http://localhost:3001/ebm/import`

### Step 2: Select Import Type
Use the dropdown at the top to choose:
- **Missionaries (Alumni Data)** - for alumni table CSV
- **Mission Areas** - for areas list
- **Missionary-Area Relationships** - for linking table

### Step 3: Prepare Your CSV Files

#### For Areas Import
**SQL Query:**
```sql
SELECT DISTINCT area_id, area_nam 
FROM rmdb_ebm.alumni_areas 
WHERE area_nam IS NOT NULL AND area_nam != 'NULL'
ORDER BY area_id;
```

**CSV Format:**
```
area_id,area_nam
1,Banbury
2,Bedford
3,Birmingham
```

#### For Missionary-Area Relationships Import
**SQL Query:**
```sql
SELECT a_id, area_id, area_nam 
FROM rmdb_ebm.alumni_areas
WHERE a_id IS NOT NULL AND area_id IS NOT NULL
ORDER BY a_id, area_id;
```

**CSV Format:**
```
a_id,area_id,area_nam
0,1,Banbury
0,2,Bedford
1,3,Birmingham
```

### Step 4: Upload and Process
1. Select import type from dropdown
2. Click "Click to Upload CSV" button
3. Choose your CSV file
4. Click "Process File" button
5. Wait for results

## Results Display

### Missionaries Import Results
- ✅ Imported X new missionaries
- ↻ Updated X existing missionaries
- ❌ Errors (if any)

### Areas Import Results
- ✅ Imported X new areas
- ↻ Updated X existing areas
- ⊘ Skipped X blank/invalid records

### Missionary-Areas Import Results
- ✅ Linked X new connections
- ↷ Already linked X connections
- ⊘ Skipped X blank records
- ⚠️ Missionaries not found: X
- ⚠️ Areas not found: X

## Viewing Results

### See Areas on Missionary Detail Page
After importing areas and relationships:
1. Go to `/ebm/missionaries`
2. Click on any missionary
3. Scroll to "Areas Served" section
4. You'll see badges for each area they served in

## Troubleshooting

### "Missionaries not found"
- Make sure missionaries were imported first
- Check that alumId in CSV matches legacyData.alumId in database
- Run: `node import-alumni-csv.js "path-to-missionaries.csv"` first

### "Areas not found"
- Import areas before importing relationships
- Check that area_id values match between areas CSV and relationships CSV

### CSV Parse Errors
- Ensure CSV has proper headers (area_id, area_nam, a_id, etc.)
- Check for NULL values - they should be blank or actual "NULL" string
- Verify no extra commas or special characters

## Database Schema

### MissionArea Model
- `name` - Area name (e.g., "Banbury")
- `city` - City name
- `legacyAreaId` - Original SQL area_id for mapping
- `addedBy` - User who added it
- `verified` - Whether data is verified

### Missionary Model (Areas Section)
- `areasServed` - Array of MissionArea references
- Populated with area names when viewing details

## Command Line Alternative

If web import has issues, you can still use:
```powershell
# Import areas
node import-areas-csv.js "c:\path\to\areas.csv"

# Import relationships
node import-missionary-areas-csv.js "c:\path\to\missionary-areas.csv"
```

## Next Steps

After importing areas, you can:
1. View areas on missionary detail pages
2. Filter missionaries by area (coming soon)
3. Import companionships to link missionaries who served together
4. Build area statistics and reports
