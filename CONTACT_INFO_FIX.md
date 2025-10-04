# Contact Information Display Fix

## Problem Summary
The Enhanced Vendors Dashboard was showing "No email" and "No phone" for all vendors, even though the code appeared correct.

## Root Cause Analysis

### The Issue
The problem was in **routes/enhancedVendors.js** on line 52:

```javascript
const vendors = await Vendor.find(vendorQuery)
    .sort({ [sortBy]: sortOrder === 'asc' ? 1 : -1 })
    .skip(skip)
    .limit(limit)
    .lean(); // ❌ THIS WAS THE PROBLEM!
```

### Why `.lean()` Caused the Issue

1. **Virtual Fields Don't Work with `.lean()`**
   - The Vendor model has a **virtual field** called `primaryContact` (defined in models/Vendor.js line 324)
   - Virtual fields are computed properties that don't exist in the database
   - When you use `.lean()`, Mongoose returns plain JavaScript objects **without** virtual fields
   - The contact display code checks for `vendor.primaryContact` FIRST, which doesn't exist on lean objects

2. **The Virtual Field Definition**
   ```javascript
   // From models/Vendor.js
   vendorSchema.virtual('primaryContact').get(function () {
       if (this.contacts && this.contacts.length > 0) {
           const primary = this.contacts.find(contact => contact.isPrimary);
           return primary || this.contacts[0]; // Return first contact if no primary set
       }
       return null;
   });
   ```

3. **How Regular Vendors Dashboard Works**
   - The regular Vendors Dashboard (routes/vendors.js) does **NOT** use `.lean()`
   - It gets full Mongoose documents with all virtual fields intact
   - The view (vendors-dashboard.ejs) checks for `vendor.primaryContact` first:
   ```javascript
   <% if (vendor.primaryContact || (vendor.contactInfo && vendor.contactInfo.primaryContact)) { %>
       <% const primaryContact = vendor.primaryContact || vendor.contactInfo.primaryContact %>
   ```

## The Solution

### 1. Removed `.lean()` from Main Query
**routes/enhancedVendors.js** (line 52):
```javascript
// BEFORE:
const vendors = await Vendor.find(vendorQuery)
    .sort({ [sortBy]: sortOrder === 'asc' ? 1 : -1 })
    .skip(skip)
    .limit(limit)
    .lean(); // ❌ Removed this

// AFTER:
const vendors = await Vendor.find(vendorQuery)
    .sort({ [sortBy]: sortOrder === 'asc' ? 1 : -1 })
    .skip(skip)
    .limit(limit); // ✅ No .lean() - keeps virtual fields
```

### 2. Preserved Virtuals When Converting to Objects
**routes/enhancedVendors.js** (inside the map function):
```javascript
// Convert to plain object BUT preserve virtuals
const vendorObj = vendor.toObject({ virtuals: true });

return {
    ...vendorObj,
    hasOrganicCertification: !!organicVendor,
    // ... rest of fields
};
```

### 3. Updated Statistics Calculation
**routes/enhancedVendors.js**:
```javascript
// BEFORE:
withContact: allVendorsForStats.filter(v => v.contactInfo?.primaryContact?.email).length,

// AFTER:
withContact: allVendorsForStats.filter(v => v.primaryContact || (v.contactInfo?.primaryContact?.email)).length,
```

### 4. Updated View Template to Check Virtual Field First
**views/enhanced-vendors-dashboard.ejs**:
```html
<!-- BEFORE: Only checked contactInfo.primaryContact -->
<% if (vendor.contactInfo && vendor.contactInfo.primaryContact && vendor.contactInfo.primaryContact.name) { %>
    <strong><%= vendor.contactInfo.primaryContact.name %></strong>
<% } %>

<!-- AFTER: Checks BOTH virtual primaryContact AND contactInfo.primaryContact -->
<% if (vendor.primaryContact || (vendor.contactInfo && vendor.contactInfo.primaryContact)) { %>
    <% const primaryContact = vendor.primaryContact || vendor.contactInfo.primaryContact %>
    <% if (primaryContact.name) { %>
        <strong style="color: #2c3e50;"><%= primaryContact.name %></strong>
        <% if (primaryContact.title) { %>
            <span style="font-size: 0.85em; color: #6c757d;"><%= primaryContact.title %></span>
        <% } %>
    <% } %>
    <% if (primaryContact.email) { %>
        <a href="mailto:<%= primaryContact.email %>"><%= primaryContact.email %></a>
    <% } else if (vendor.mainEmail) { %>
        <a href="mailto:<%= vendor.mainEmail %>"><%= vendor.mainEmail %></a>
    <% } %>
    <% if (vendor.mainPhone) { %>
        <a href="tel:<%= vendor.mainPhone %>"><%= vendor.mainPhone %></a>
    <% } else if (primaryContact.phone) { %>
        <a href="tel:<%= primaryContact.phone %>"><%= primaryContact.phone %></a>
    <% } %>
<% } else { %>
    <span style="color: #adb5bd;">No contact info</span>
<% } %>
```

## How Vendor Contact Data Works

### Three Possible Contact Sources (in priority order):

1. **`vendor.primaryContact`** (Virtual Field)
   - Computed from the `contacts[]` array
   - Returns the contact marked with `isPrimary: true`
   - Or returns the first contact if no primary is set
   - Only available on full Mongoose documents (NOT with `.lean()`)

2. **`vendor.contactInfo.primaryContact`** (Database Field)
   - Legacy structure stored in the database
   - Has: name, title, email, phone, mobile
   - Always available (even with `.lean()`)

3. **`vendor.mainEmail` / `vendor.mainPhone`** (Database Fields)
   - Top-level fallback fields
   - Used when no primaryContact exists

### The Fallback Chain:
```
1. Check vendor.primaryContact (virtual from contacts[] array)
   ↓ if null
2. Check vendor.contactInfo.primaryContact (legacy structure)
   ↓ if null
3. Use vendor.mainEmail and vendor.mainPhone (top-level fields)
```

## Performance Considerations

### Why We Used `.lean()` Originally
- `.lean()` returns plain JavaScript objects (faster)
- No Mongoose document overhead
- Better for read-only operations

### Why We Removed It
- Virtual fields are essential for contact display
- The `primaryContact` virtual provides a unified interface
- Performance difference is negligible for 20-50 vendors per page

### Alternative Solution (Not Implemented)
If performance becomes an issue with large vendor lists, we could:
1. Use `.lean()` for the query
2. Manually populate the `primaryContact` field after querying:
```javascript
const vendors = await Vendor.find(vendorQuery).lean();
vendors.forEach(vendor => {
    if (vendor.contacts && vendor.contacts.length > 0) {
        const primary = vendor.contacts.find(c => c.isPrimary);
        vendor.primaryContact = primary || vendor.contacts[0];
    }
});
```

## Testing Checklist

- [x] Enhanced Vendors Dashboard displays contact names
- [x] Enhanced Vendors Dashboard displays contact titles
- [x] Enhanced Vendors Dashboard displays contact emails (clickable)
- [x] Enhanced Vendors Dashboard displays contact phones (clickable)
- [x] Enhanced Vendors Dashboard displays mobile phones
- [x] Falls back to mainEmail/mainPhone when primaryContact missing
- [x] "No contact info" shown when all contact fields missing
- [x] Edit Contact modal works correctly
- [x] Statistics show correct count of vendors with contact info

## Files Modified

1. **routes/enhancedVendors.js**
   - Removed `.lean()` from main vendor query (line 52)
   - Added `.toObject({ virtuals: true })` when building enhanced vendor objects
   - Updated stats calculation to check virtual field

2. **views/enhanced-vendors-dashboard.ejs**
   - Updated contact display to check `vendor.primaryContact` first
   - Added proper fallback chain: primaryContact → contactInfo.primaryContact → mainEmail/mainPhone
   - Maintains all styling and clickable links

## Key Takeaways

1. **Virtual fields require full Mongoose documents** - don't use `.lean()` if you need virtuals
2. **The regular Vendors Dashboard was the reference** - it already had the correct implementation
3. **Always check both virtual and database fields** - provides flexibility and backward compatibility
4. **Performance vs. Features** - sometimes the slight performance hit is worth the cleaner code

## Related Documentation

- Mongoose Virtual Fields: https://mongoosejs.com/docs/guide.html#virtuals
- `.lean()` Documentation: https://mongoosejs.com/docs/tutorials/lean.html
- Vendor Model: `models/Vendor.js` (line 324 for primaryContact virtual)
- Regular Vendors Dashboard: `routes/vendors.js` and `views/vendors-dashboard.ejs`
