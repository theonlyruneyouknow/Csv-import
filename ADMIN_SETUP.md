# 🔧 Administrator Setup Guide

## Overview
As the system creator, you need administrator privileges to test and manage the household food management system.

## Quick Setup

### Step 1: List Available Users
```bash
node setup-admin.js
```
This shows all users in the database with their current roles and status.

### Step 2: Promote Your Account to Admin
```bash
node setup-admin.js <your-username>
# or
node setup-admin.js <your-email>
```

**Example:**
```bash
node setup-admin.js runet
# or
node setup-admin.js runet@example.com
```

## What This Does

The setup script will:

1. ✅ **Promote you to Administrator**
   - Sets role to `admin`
   - Sets status to `approved`
   - Verifies your email

2. ✅ **Enable All Permissions**
   - View Dashboard
   - Edit Line Items
   - Manage Purchase Orders
   - Manage Users
   - View Reports
   - Manage Dropship
   - Access all modules (Food, Medicine, Tasks, etc.)
   - Access all tools

3. ✅ **Set Up Your Household**
   - Creates a household named "{YourName}'s Household"
   - Makes you the owner with full permissions
   - Enables all food management features:
     - Shopping Lists
     - Pantry Management
     - Recipes
     - Meal Planning

## After Setup

Once you're an administrator with a household, you can:

### Test the Household System
- ✓ Create/edit universal food items (set user: null)
- ✓ Manage shopping lists for your household
- ✓ Track pantry inventory
- ✓ Create and share recipes
- ✓ Plan meals for your household

### Invite Others to Test
1. Go to `/household/dashboard`
2. Send invitations to other test users
3. They'll receive invitation codes valid for 7 days

### Create Additional Test Accounts
1. Create new user accounts via signup
2. Run `node setup-admin.js <username>` to make them admins
3. Or invite them to your household as regular members

### Manage Permissions
As admin, you can:
- Approve/reject user signups
- Promote users to managers or admins
- Manage household member permissions
- Create universal food items for everyone

## Permission Levels

### System Level (User.role)
- **admin** - Full system access, can manage everything
- **manager** - Can manage operations but not users
- **user** - Standard access to assigned modules
- **viewer** - Read-only access

### Household Level (Household.members.role)
- **owner** - Created the household, full control
- **admin** - Can manage members and all features
- **member** - Permissions set individually

### Module Permissions (per member)
- `canManageShopping` - Create/edit shopping lists
- `canManagePantry` - Update pantry inventory
- `canManageRecipes` - Add/edit recipes
- `canManageMealPlans` - Create meal plans
- `canInviteMembers` - Send household invitations

## Troubleshooting

### "User not found"
- Check the username/email spelling
- Run `node setup-admin.js` to see all users
- Make sure you've created an account first

### "Already member of household"
- The script will update your permissions to owner
- Your household access will be verified

### Database Connection Error
- Check MongoDB is running
- Verify .env file has correct MONGODB_URI
- Default: `mongodb://localhost/purchase-orders`

## Testing Checklist

Once you're set up as admin, test these features:

### Food Items Database
- [ ] Create universal food items (user: null)
- [ ] Create personal food items (user: your ID)
- [ ] Add categories with icons and colors
- [ ] Add parent-child item variations
- [ ] Set custom units (half gal, qt, etc.)

### Household Features
- [ ] View household dashboard
- [ ] Invite a test member
- [ ] Test join via invitation code
- [ ] Update member permissions
- [ ] Create shopping list
- [ ] Add items to pantry
- [ ] Create recipe
- [ ] Create meal plan

### Universal vs Household Data
- [ ] Verify food items are searchable by all users
- [ ] Verify shopping lists are household-specific
- [ ] Verify recipes are household-specific
- [ ] Verify pantry is household-specific

## Need Help?

Run the script with no arguments to see available users and usage:
```bash
node setup-admin.js
```

Or check the documentation:
- [HOUSEHOLD_SYSTEM.md](HOUSEHOLD_SYSTEM.md) - Complete household system guide
- [models/Household.js](models/Household.js) - Household model schema
- [models/User.js](models/User.js) - User model with permissions
