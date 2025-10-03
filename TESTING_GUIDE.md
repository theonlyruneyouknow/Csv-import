# Quick Start Testing Guide - Enhanced Vendors Dashboard

## 🚀 Getting Started

### Start the Server
```powershell
# Navigate to project directory
cd c:\Users\15419\OneDrive\Documents\GitHub\Rune-github\Csv-import

# Stop any running node processes
Stop-Process -Name node -Force -ErrorAction SilentlyContinue
Start-Sleep 2

# Start the server
node app.js
```

### Access the Dashboard
Open browser and navigate to: `http://localhost:3002/enhanced-vendors`

---

## ✅ Quick Testing Checklist

### 1. Main Dashboard (2 minutes)
- [ ] Dashboard loads successfully
- [ ] Statistics show at top (Total, Organic, Active, Inactive, With Contact)
- [ ] Vendor cards display in grid layout
- [ ] Organic vendors have **green left border**
- [ ] Contact information shows (email, phone, address)
- [ ] Badges show (Organic, Active/Inactive, Vendor Type)

### 2. Filters (1 minute)
- [ ] Search box works (type vendor name or email)
- [ ] Status dropdown filters (Active/Inactive)
- [ ] Organic filter works (All/Organic Only/Non-Organic)
- [ ] "Apply Filters" button submits
- [ ] "Reset" button clears filters

### 3. Organic Features (2 minutes)
- [ ] Find vendor with organic certification (green border)
- [ ] Click "Show Organic Info" button
- [ ] Organic section expands below
- [ ] See certification details (status, agency, dates)
- [ ] "View Certificate" button present (if has certificate)
- [ ] "USDA Database" link present (if has URL)
- [ ] "View Organic Seeds" button present (if has seeds)
- [ ] Click "Hide Organic Info" to collapse

### 4. Vendor Detail Page (3 minutes)
- [ ] Click "View Full Details" on any vendor
- [ ] Vendor detail page loads
- [ ] See vendor name in header
- [ ] Quick stats show (POs, Line Items, Total Spend)
- [ ] Click **Overview** tab - see vendor info, contact, address
- [ ] Click **Contact Information** tab - see primary, billing, shipping contacts
- [ ] Click **Organic Certification** tab (if organic) - see cert details, seeds
- [ ] Click **Purchase Orders** tab - see PO table
- [ ] Click **Documents** tab - see available documents
- [ ] Click "Back to Vendors" button - returns to dashboard

### 5. Navigation (1 minute)
- [ ] Click "📊 Dashboards" dropdown in header
- [ ] See list of all dashboards
- [ ] "🌟 Enhanced Vendors" is marked active
- [ ] Click another dashboard (e.g., Purchase Orders)
- [ ] Navigate back to Enhanced Vendors

---

## 🔍 What to Look For

### ✅ Good Signs:
- Cards display in neat grid
- Hover effects work (cards lift slightly)
- Colors are consistent (purple, green, blue, red)
- All text is readable
- Contact information displays properly
- Organic sections expand/collapse smoothly
- Navigation works between pages
- Responsive on smaller screens

### ⚠️ Issues to Report:
- Cards don't display
- Contact info missing
- Organic sections don't expand
- Navigation broken
- Filters don't work
- Detail page doesn't load
- Statistics show 0 or wrong numbers
- Styling looks broken

---

## 🎯 Key Features to Verify

### Main Dashboard Features:
1. **Statistics Bar** - Shows totals at top
2. **Filter Section** - Search and dropdown filters
3. **Vendor Cards** - Clean card layout with all info
4. **Contact Info** - Email, phone, address visible
5. **Organic Badge** - Green "🌱 Organic Certified" badge
6. **Expandable Sections** - Click to show/hide organic details
7. **Action Buttons** - View Details, Edit, Show Organic

### Detail Page Features:
1. **Header** - Vendor name, code, badges, stats
2. **Tabs** - 5 tabs (Overview, Contact, Organic, Orders, Documents)
3. **Overview Tab** - All basic vendor info
4. **Contact Tab** - All contact persons and methods
5. **Organic Tab** - Full certification details + seeds
6. **Orders Tab** - Table of purchase orders
7. **Documents Tab** - Certificate and profile links

---

## 📱 Mobile Testing (Optional)

### Resize browser to mobile width or use device:
- [ ] Cards stack vertically
- [ ] Navigation collapses or adapts
- [ ] Tabs scroll horizontally if needed
- [ ] Buttons are touchable
- [ ] Text remains readable
- [ ] No horizontal scroll (except intentional)

---

## 🐛 Common Issues & Solutions

### Issue: Dashboard shows "No Vendors Found"
**Solution**: Check filters - click "Reset" to clear all filters

### Issue: Organic section doesn't expand
**Solution**: Check browser console for JavaScript errors

### Issue: Contact info shows "N/A"
**Solution**: Normal - vendor may not have contact info in database

### Issue: Detail page shows 404
**Solution**: Verify route is registered in app.js

### Issue: Statistics show 0
**Solution**: Check database has vendors and POs

---

## 📊 Test Data Validation

### Expected Data:
- **Total Vendors**: Should match vendor count in database
- **Organic Certified**: Should match organic vendors count
- **With Contact Info**: Should match vendors with contactInfo field
- **PO Count per Vendor**: Should match actual PO count

### How to Verify:
```javascript
// In MongoDB shell or Compass:
db.vendors.countDocuments()  // Total vendors
db.organicvendors.countDocuments()  // Organic count
db.purchaseorders.countDocuments({ linkedVendor: ObjectId("...") })  // PO count
```

---

## ✨ Success Criteria

### Minimum for "Pass":
- ✅ Dashboard loads without errors
- ✅ Vendors display in cards
- ✅ Contact information shows
- ✅ Organic vendors identifiable
- ✅ Filters work
- ✅ Detail pages load
- ✅ Navigation works

### Ideal "Perfect":
- ✅ All of above +
- ✅ Organic sections expand smoothly
- ✅ All statistics accurate
- ✅ Mobile responsive
- ✅ All tabs work on detail page
- ✅ Professional appearance
- ✅ Fast performance

---

## 📝 Testing Notes Template

Use this to record your findings:

```
Date: _______________
Tester: _______________

MAIN DASHBOARD:
- Loads: [ ] Yes [ ] No
- Statistics correct: [ ] Yes [ ] No
- Filters work: [ ] Yes [ ] No
- Cards display: [ ] Yes [ ] No
- Contact info shows: [ ] Yes [ ] No
- Organic features work: [ ] Yes [ ] No

DETAIL PAGE:
- Loads: [ ] Yes [ ] No
- All tabs work: [ ] Yes [ ] No
- Data accurate: [ ] Yes [ ] No
- Navigation works: [ ] Yes [ ] No

ISSUES FOUND:
1. _______________________________
2. _______________________________
3. _______________________________

OVERALL RATING: ___/10

NOTES:
_________________________________
_________________________________
```

---

## 🎉 Ready to Test!

**Start here**: http://localhost:3002/enhanced-vendors

**Documentation**: See `ENHANCED_VENDORS_COMPLETE.md` for full details

**Questions?**: Check the console logs or browser developer tools for errors

---

*Happy Testing! 🚀*
