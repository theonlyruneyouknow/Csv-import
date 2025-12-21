# Saved Report Configurations - User Guide

## Overview
Your report filter configurations can now be saved to the database and shared across all computers. No more localStorage limitations!

## Features

### ✅ What You Can Do
- **Save configurations** - Column selections, filters, and sorting preferences
- **Access from anywhere** - Your saved configs work on any computer
- **Share with team** - Make configs public for everyone to use
- **Private by default** - Your saved configs are private unless you choose to share
- **Admin controls** - Admins can see all configs and make any config public/private

---

## API Endpoints

### 1. Get All Configs for a Report
```
GET /api/report-configs/:reportType
```
**Report Types:**
- `unreceived-items`
- `waiting-for-approval`
- `dashboard`
- `custom`

**Response:**
```json
{
  "success": true,
  "configs": [
    {
      "_id": "...",
      "name": "Urgent Seed Orders",
      "reportType": "unreceived-items",
      "config": { "columns": [...], "types": [...], "statuses": [...] },
      "isPublic": true,
      "createdByUsername": "admin",
      "description": "Shows all urgent seed items",
      "usageCount": 15,
      "canModify": true,
      "isOwner": false
    }
  ]
}
```

---

### 2. Save a New Configuration
```
POST /api/report-configs
```
**Body:**
```json
{
  "name": "My Custom View",
  "reportType": "unreceived-items",
  "config": {
    "columns": [{ "id": "poNumber", "checked": true }],
    "types": [{ "value": "Seed", "checked": true }],
    "statuses": [{ "value": "Ordered", "checked": true }],
    "urgencies": [{ "value": "High", "checked": true }]
  },
  "isPublic": false,
  "description": "Optional description"
}
```

---

### 3. Update Configuration
```
PUT /api/report-configs/:id
```
**Body:** (all fields optional)
```json
{
  "name": "Updated Name",
  "config": { ... },
  "isPublic": true,
  "description": "Updated description"
}
```

---

### 4. Delete Configuration
```
DELETE /api/report-configs/:id
```

---

### 5. Load and Use Configuration
```
POST /api/report-configs/:id/use
```
Records usage statistics and returns the configuration.

---

### 6. Admin: Make Config Public
```
POST /api/report-configs/:id/make-public
```
**Admin only** - Converts any private config to public

---

### 7. Admin: Make Config Private
```
POST /api/report-configs/:id/make-private
```
**Admin only** - Converts any public config to private

---

### 8. Migrate localStorage to Database
```
POST /api/report-configs/migrate-from-localstorage
```
**Body:**
```json
{
  "reportType": "unreceivedItems",
  "favorites": [
    { "name": "Config 1", "config": { ... } },
    { "name": "Config 2", "config": { ... } }
  ]
}
```

---

## Migration Instructions

### Step 1: Open Your Browser Console
On the page with saved favorites (unreceived-items or waiting-for-approval):
1. Press **F12** to open Developer Tools
2. Click **Console** tab

### Step 2: Load Migration Script
```javascript
// Copy and paste this into console:
async function migrateLocalStorageFavorites(reportType) {
    const storageKey = `${reportType}Favorites`;
    const favorites = JSON.parse(localStorage.getItem(storageKey) || '[]');
    
    if (favorites.length === 0) {
        console.log(`No favorites found for ${reportType}`);
        return;
    }
    
    console.log(`Found ${favorites.length} favorites`);
    
    const response = await fetch('/api/report-configs/migrate-from-localstorage', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reportType: reportType, favorites: favorites })
    });
    
    const result = await response.json();
    console.log('Result:', result);
    
    if (result.success && confirm('Migration successful! Clear localStorage?')) {
        localStorage.removeItem(storageKey);
        console.log('localStorage cleared');
    }
}
```

### Step 3: Run Migration
```javascript
// For Unreceived Items:
migrateLocalStorageFavorites('unreceivedItems');

// For Waiting for Approval:
migrateLocalStorageFavorites('waitingForApproval');
```

---

## JavaScript Integration Example

### Load Configs
```javascript
async function loadSavedConfigs() {
    try {
        const response = await fetch('/api/report-configs/unreceived-items');
        const data = await response.json();
        
        if (data.success) {
            // data.configs contains all accessible configs
            data.configs.forEach(config => {
                console.log(`${config.name} (${config.isPublic ? 'Public' : 'Private'})`);
            });
        }
    } catch (error) {
        console.error('Error loading configs:', error);
    }
}
```

### Save Config
```javascript
async function saveConfig(name, currentConfig, isPublic = false) {
    try {
        const response = await fetch('/api/report-configs', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                name: name,
                reportType: 'unreceived-items',
                config: currentConfig,
                isPublic: isPublic
            })
        });
        
        const data = await response.json();
        
        if (data.success) {
            alert(`✅ Saved: ${data.config.name}`);
        } else {
            alert(`❌ Error: ${data.error}`);
        }
    } catch (error) {
        console.error('Error saving config:', error);
    }
}
```

### Apply Config
```javascript
async function applyConfig(configId) {
    try {
        const response = await fetch(`/api/report-configs/${configId}/use`, {
            method: 'POST'
        });
        
        const data = await response.json();
        
        if (data.success) {
            // data.config contains the configuration to apply
            applyFiltersAndColumns(data.config);
        }
    } catch (error) {
        console.error('Error applying config:', error);
    }
}
```

---

## Permissions

### Regular Users
- ✅ Can save private configurations
- ✅ Can view and use their own configs
- ✅ Can view and use public configs
- ✅ Can edit/delete their own configs
- ❌ Cannot see other users' private configs
- ❌ Cannot make configs public

### Admins
- ✅ All regular user permissions
- ✅ Can view ALL configs (public + private)
- ✅ Can edit/delete any config
- ✅ Can make any config public or private
- ✅ Can override privacy settings

---

## Database Schema

```javascript
{
  name: String,                    // "Urgent Seed Orders"
  reportType: String,              // "unreceived-items" | "waiting-for-approval" | "dashboard" | "custom"
  config: {
    columns: [{ id: String, checked: Boolean }],
    types: [{ value: String, checked: Boolean }],
    statuses: [{ value: String, checked: Boolean }],
    urgencies: [{ value: String, checked: Boolean }],
    customFilters: Mixed           // For future expansion
  },
  isPublic: Boolean,               // Default: false
  createdBy: ObjectId,             // User reference
  createdByUsername: String,       // For display
  description: String,             // Optional
  usageCount: Number,              // Auto-incremented
  lastUsed: Date,                  // Auto-updated
  createdAt: Date,
  updatedAt: Date
}
```

---

## Next Steps

1. **Migrate your existing localStorage favorites** using the console script
2. **Update your report pages** to load from database instead of localStorage
3. **Add UI controls** for:
   - Public/Private toggle when saving
   - Admin controls to make configs public
   - Display of config creator and usage stats

---

## Benefits

✅ **Cross-computer access** - Use your configs from any device  
✅ **Team collaboration** - Share useful configurations  
✅ **Admin oversight** - Admins can curate best practices  
✅ **Usage tracking** - See which configs are most popular  
✅ **No data loss** - Configs survive browser cache clears  

---

## Support

For questions or issues, contact your system administrator.
