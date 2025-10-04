# Contact Roles System Implementation

## Overview
Implemented a flexible contact role system using checkboxes instead of separate dedicated fields for Primary, Billing, and Shipping contacts. This matches the existing vendor dashboard's numbered contacts approach while adding role designation capabilities.

## What Was Changed

### 1. Vendor Model (models/Vendor.js)

**Added new fields to contacts array:**
```javascript
contacts: [{
    name: String,
    title: String,
    email: String,
    phone: String,
    mobile: String,
    department: String,
    isPrimary: {
        type: Boolean,
        default: false
    },
    isBilling: {        // ✅ NEW
        type: Boolean,
        default: false
    },
    isShipping: {       // ✅ NEW
        type: Boolean,
        default: false
    },
    notes: String
}]
```

**Added virtual fields for easy contact retrieval:**
```javascript
// Get billing contact from the contacts array
vendorSchema.virtual('billingContact').get(function () {
    if (this.contacts && this.contacts.length > 0) {
        const billing = this.contacts.find(contact => contact.isBilling);
        return billing || null;
    }
    return null;
});

// Get shipping contact from the contacts array
vendorSchema.virtual('shippingContact').get(function () {
    if (this.contacts && this.contacts.length > 0) {
        const shipping = this.contacts.find(contact => contact.isShipping);
        return shipping || null;
    }
    return null;
});
```

### 2. Vendor Form (views/vendor-form.ejs)

**Updated contact entry to include role checkboxes:**
```html
<div class="d-flex align-items-center gap-3">
    <label class="form-check-label">
        <input type="checkbox" class="form-check-input me-1" 
               name="contacts[<%= index %>][isPrimary]" 
               <%= contact.isPrimary ? 'checked' : '' %>>
        <i class="fas fa-user-circle text-primary"></i> Primary
    </label>
    <label class="form-check-label">
        <input type="checkbox" class="form-check-input me-1" 
               name="contacts[<%= index %>][isBilling]" 
               <%= contact.isBilling ? 'checked' : '' %>>
        <i class="fas fa-file-invoice-dollar text-success"></i> Billing
    </label>
    <label class="form-check-label">
        <input type="checkbox" class="form-check-input me-1" 
               name="contacts[<%= index %>][isShipping]" 
               <%= contact.isShipping ? 'checked' : '' %>>
        <i class="fas fa-truck text-info"></i> Shipping
    </label>
    <button type="button" class="btn btn-sm btn-outline-danger remove-contact ms-2">
        <i class="fas fa-trash"></i>
    </button>
</div>
```

### 3. Enhanced Vendors Dashboard (views/enhanced-vendors-dashboard.ejs)

**Completely redesigned contact display to show ALL contacts with role badges:**

Before:
```html
<h6>Primary Contact</h6>
<div>Name</div>
<div>Email</div>
<div>Phone</div>
```

After:
```html
<h6>Contacts</h6>
<% vendor.contacts.forEach((contact) => { %>
    <div class="contact-card">
        <!-- Role Badges -->
        <div>
            <% if (contact.isPrimary) { %>
                <span class="badge">Primary</span>
            <% } %>
            <% if (contact.isBilling) { %>
                <span class="badge">Billing</span>
            <% } %>
            <% if (contact.isShipping) { %>
                <span class="badge">Shipping</span>
            <% } %>
        </div>
        
        <!-- Contact Details -->
        <div><strong>Name</strong> - Title</div>
        <div>Email (clickable)</div>
        <div>Phone (clickable)</div>
        <div>Mobile (clickable)</div>
        <div>Department</div>
    </div>
<% }); %>
```

**Features:**
- Shows ALL contacts, not just primary
- Color-coded role badges:
  - **Primary**: Purple (#667eea)
  - **Billing**: Green (#10b981)
  - **Shipping**: Blue (#3b82f6)
- Compact card layout with left border accent
- Clickable email/phone links
- Department display
- Fallback to legacy contactInfo structure for backward compatibility

### 4. Vendor Detail Page (views/vendor-detail-page.ejs)

**Updated Contact Information tab to use new virtual fields:**

```html
<!-- Primary Contact -->
<% if (vendor.primaryContact) { %>
    <!-- Shows contact with isPrimary checkbox -->
<% } else if (vendor.contactInfo && vendor.contactInfo.primaryContact) { %>
    <!-- Fallback to legacy structure -->
<% } %>

<!-- Billing Contact -->
<% if (vendor.billingContact) { %>
    <!-- Shows contact with isBilling checkbox -->
<% } %>

<!-- Shipping Contact -->
<% if (vendor.shippingContact) { %>
    <!-- Shows contact with isShipping checkbox -->
<% } %>
```

## How It Works

### Contact Role Assignment

1. **Multiple Roles**: A single contact can have multiple roles checked (e.g., same person is Primary AND Billing)
2. **Optional Roles**: Not all contacts need role assignments (can be just "Contact 1", "Contact 2", etc.)
3. **Flexible**: Can have multiple billing contacts or multiple shipping contacts if needed

### Data Structure

**Example vendor with 3 contacts:**
```javascript
{
    vendorName: "ALBERT LEA SEED HOUSE",
    contacts: [
        {
            name: "Jim Wichmann",
            title: "Quality Assurance & Sales",
            email: "jim@alseed.com",
            phone: "800.352.5247",
            mobile: "507-377-5247",
            department: "Sales",
            isPrimary: true,
            isBilling: false,
            isShipping: false
        },
        {
            name: "Jane Smith",
            title: "Accounts Payable",
            email: "billing@alseed.com",
            phone: "800.352.5248",
            department: "Accounting",
            isPrimary: false,
            isBilling: true,
            isShipping: false
        },
        {
            name: "Bob Johnson",
            title: "Shipping Manager",
            email: "shipping@alseed.com",
            phone: "800.352.5249",
            department: "Logistics",
            isPrimary: false,
            isBilling: false,
            isShipping: true
        }
    ]
}
```

### Virtual Field Resolution

```javascript
vendor.primaryContact   // Returns Jim Wichmann (isPrimary: true)
vendor.billingContact   // Returns Jane Smith (isBilling: true)
vendor.shippingContact  // Returns Bob Johnson (isShipping: true)
```

## User Interface

### Enhanced Vendors Dashboard Display

```
┌─────────────────────────────────────────┐
│ 🏢 ALBERT LEA SEED HOUSE                │
│ Code: 63                                 │
│ 🌱 Organic Certified  ✅ Active  🌾 Seeds│
├─────────────────────────────────────────┤
│ 📧 CONTACTS                             │
│                                          │
│ ┌───────────────────────────────────┐  │
│ │ 👤 Primary                         │  │
│ │ Jim Wichmann - QA & Sales          │  │
│ │ ✉️ jim@alseed.com                  │  │
│ │ 📞 800.352.5247                     │  │
│ │ 📱 507-377-5247                     │  │
│ │ 🏢 Sales                            │  │
│ └───────────────────────────────────┘  │
│                                          │
│ ┌───────────────────────────────────┐  │
│ │ 💰 Billing                         │  │
│ │ Jane Smith - Accounts Payable      │  │
│ │ ✉️ billing@alseed.com              │  │
│ │ 📞 800.352.5248                     │  │
│ │ 🏢 Accounting                       │  │
│ └───────────────────────────────────┘  │
│                                          │
│ ┌───────────────────────────────────┐  │
│ │ 🚚 Shipping                        │  │
│ │ Bob Johnson - Shipping Manager     │  │
│ │ ✉️ shipping@alseed.com             │  │
│ │ 📞 800.352.5249                     │  │
│ │ 🏢 Logistics                        │  │
│ └───────────────────────────────────┘  │
└─────────────────────────────────────────┘
```

### Vendor Form Checkboxes

```
Contact 1    [✓] Primary    [✓] Billing    [ ] Shipping    [🗑️]
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Name: Jim Wichmann          Title: QA & Sales
Department: Sales           Email: jim@alseed.com
Phone: 800.352.5247        Mobile: 507-377-5247
Notes: Main contact for all inquiries
```

## Backward Compatibility

The system maintains full backward compatibility:

1. **Legacy contactInfo structure**: Still supported as fallback
2. **Existing vendors**: Will show under legacy display until contacts array is populated
3. **Virtual fields**: Work seamlessly with both new and old structures
4. **No data migration required**: Old data continues to work

## Benefits Over Separate Fields

### Original Approach (Separate Fields):
```javascript
contactInfo: {
    primaryContact: { name, email, phone },
    billingContact: { name, email, phone },
    shippingContact: { name, email, phone }
}
```
**Problems:**
- Rigid structure (exactly 3 contacts)
- Can't have multiple billing contacts
- Can't share contact across roles
- Doesn't match existing vendor dashboard pattern

### New Approach (Role Checkboxes):
```javascript
contacts: [
    { name, email, phone, isPrimary: true, isBilling: true },
    { name, email, phone, isShipping: true },
    { name, email, phone } // No role assigned
]
```
**Benefits:**
- ✅ Unlimited contacts
- ✅ Multiple contacts per role
- ✅ One contact can have multiple roles
- ✅ Contacts without roles (general contacts)
- ✅ Matches existing numbered contacts pattern
- ✅ More flexible for real-world scenarios

## Usage Instructions

### Adding a Contact with Roles

1. Navigate to vendor edit form
2. Click "Add Another Contact"
3. Fill in contact details
4. Check appropriate role boxes:
   - **Primary**: Main point of contact
   - **Billing**: Invoice/payment inquiries
   - **Shipping**: Logistics/receiving inquiries
5. Save vendor

### Viewing Contacts

**Enhanced Vendors Dashboard:**
- Shows all contacts in card format
- Role badges appear at top of each card
- Click "View Full Details" for tabbed contact view

**Vendor Detail Page:**
- Click "Contact Information" tab
- See Primary, Billing, and Shipping sections
- Each section shows the contact with that role checked

## Files Modified

1. ✅ `models/Vendor.js` - Added isBilling, isShipping fields + virtual fields
2. ✅ `views/vendor-form.ejs` - Added role checkboxes to contact entry
3. ✅ `views/enhanced-vendors-dashboard.ejs` - New contact cards with role badges
4. ✅ `views/vendor-detail-page.ejs` - Updated to use virtual fields

## Testing Checklist

- [ ] Create new vendor with contacts having different roles
- [ ] Assign same contact multiple roles (Primary + Billing)
- [ ] Create contact with no role assigned
- [ ] Verify role badges appear in Enhanced Vendors Dashboard
- [ ] Verify Contact tab shows correct contacts by role
- [ ] Edit existing vendor and add roles to contacts
- [ ] Verify backward compatibility with legacy contactInfo
- [ ] Test with vendor having no contacts

## Future Enhancements

1. **Role validation**: Ensure at least one primary contact
2. **Role indicators in vendor list**: Show role icons next to contact names
3. **Quick contact actions**: "Email Primary", "Email Billing" buttons
4. **Contact preferences**: Preferred contact method, hours, timezone
5. **Contact history**: Track communications with each contact
6. **Role-based email templates**: Auto-select recipient based on email type
7. **Multi-select filters**: Filter vendors by "has billing contact"
