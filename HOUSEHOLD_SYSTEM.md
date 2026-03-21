# 🏠 Household-Based Food Management System

## Overview

The food management system has been restructured to enable household collaboration while maintaining a universal food items database.

## Architecture Changes

### **Universal Food Items Database**
- **GroceryItem** model now has an OPTIONAL `user` field
- When `user` is `null`, the item is available to ALL users (universal/system-wide)
- Users can still create personal items by setting the `user` field
- This creates a shared master database of food products that everyone benefits from

### **Household-Based Collaboration**
All food management modules now operate at the household level:
- **Shopping Lists** - Shared shopping trips and grocery planning
- **Pantry Inventory** - Track what's in the household pantry/fridge/freezer
- **Recipes** - Share and collaborate on family recipes
- **Meal Plans** - Plan meals together as a household

## Database Models

### Household Model (`models/Household.js`)
```javascript
{
  name: String,                    // "The Smith Family"
  description: String,
  type: enum,                      // 'family', 'roommates', 'couple', 'individual', 'other'
  createdBy: ObjectId (User),
  
  members: [{
    user: ObjectId (User),
    role: enum,                    // 'owner', 'admin', 'member'
    joinedAt: Date,
    canManageShopping: Boolean,
    canManagePantry: Boolean,
    canManageRecipes: Boolean,
    canManageMealPlans: Boolean,
    canInviteMembers: Boolean
  }],
  
  invitations: [{
    email: String,
    inviteCode: String (unique),
    status: enum,                  // 'pending', 'accepted', 'declined', 'expired'
    sentBy: ObjectId (User),
    sentAt: Date,
    expiresAt: Date               // 7 days from sentAt
  }],
  
  settings: {
    allowMemberInvites: Boolean,
    sharedShoppingLists: Boolean,
    sharedPantry: Boolean,
    sharedRecipes: Boolean,
    sharedMealPlans: Boolean
  }
}
```

### Updated Models

#### User Model
- Added `household` field (ObjectId reference to Household)
- Users belong to ONE household at a time

#### GroceryItem Model
- Changed `user` field from required to optional
- `user: null` = Universal item (system-wide)
- `user: ObjectId` = Personal item (user-specific)

#### ShoppingList Model
- Added required `household` field
- Lists are shared among all household members
- `createdBy` tracks who created the list

#### Recipe Model
- Added required `household` field
- Recipes are shared within the household
- `createdBy` tracks the original contributor

#### MealPlan Model
- Added required `household` field
- Meal plans are collaborative
- `createdBy` tracks who set up the plan

#### FoodItem Model (Pantry)
- Added required `household` field
- Pantry inventory is shared
- `createdBy` tracks who added items

## User Workflows

### First-Time Setup
1. New user signs up/logs in
2. Redirected to `/household/setup`
3. Options:
   - **Create New Household** - Becomes owner with full permissions
   - **Join Household** - Enter invitation code from existing member

### Creating a Household
1. User chooses "Create New"
2. Enters household name, type, and description
3. System:
   - Creates Household with user as owner
   - Adds user to household members with full permissions
   - Updates User.household reference
4. User redirected to food dashboard

### Joining a Household
1. User receives invitation code from existing member
2. User chooses "Join Existing"
3. Enters invitation code
4. System validates:
   - Code exists and is not expired
   - User doesn't already belong to a household
5. System:
   - Adds user to household members
   - Updates User.household reference
   - Marks invitation as accepted
6. User redirected to food dashboard

### Inviting Members
1. Household member with `canInviteMembers` permission
2. Goes to household dashboard
3. Enters new member's email
4. System generates unique invitation code
5. Code can be shared via:
   - Direct link: `/household/join?code=...`
   - Manual code entry
6. Invitations expire after 7 days

## Permission System

### Household Roles
- **Owner**: Full control, cannot leave (must transfer ownership first)
- **Admin**: Can manage members and all household features
- **Member**: Permissions set individually

### Module Permissions (per member)
- `canManageShopping` - Create/edit/delete shopping lists
- `canManagePantry` - Update pantry inventory
- `canManageRecipes` - Add/edit/delete recipes
- `canManageMealPlans` - Create/modify meal plans
- `canInviteMembers` - Send household invitations

## Routes

### Household Management (`/household`)
- `GET /household/setup` - First-time setup page
- `POST /household/create` - Create new household
- `POST /household/join` - Join via invite code
- `GET /household/dashboard` - Household management page
- `POST /household/invite` - Send invitation
- `GET /household/members` - List members and invitations
- `PUT /household/members/:userId` - Update member permissions
- `POST /household/leave` - Leave household (not for owners)

### Food Routes (require household)
All existing food routes will be updated to use `req.household` instead of `req.user`:
- Shopping lists filtered by `household`
- Recipes filtered by `household`
- Meal plans filtered by `household`
- Pantry items filtered by `household`
- Food items database remains universal (no filtering by user)

## Middleware

### `ensureHousehold`
```javascript
// Checks if user belongs to an active household
// Loads household data into req.household
// Redirects to /household/setup if no household
```

Apply to all food management routes:
```javascript
router.use('/food/*', ensureHousehold);
```

## Migration Strategy for Existing Data

### For Existing GroceryItems
```javascript
// Option 1: Make all existing items universal
GroceryItem.updateMany({}, { $set: { user: null } });

// Option 2: Keep user-specific items as personal
// No changes needed - they remain personal items
```

### For Existing Shopping Lists / Recipes / Meal Plans
```javascript
// Users need to:
// 1. Create or join a household
// 2. Existing data can be migrated to their household
// 3. Or remain in "legacy" mode until household is set up
```

## Benefits

### ✅ Collaboration
- Families share shopping lists and meal plans
- Roommates coordinate pantry management
- Everyone sees the same recipes

### ✅ Efficiency
- Universal food items database reduces duplication
- Everyone benefits from item additions (brands, sizes, categories)
- Shared shopping lists prevent duplicate purchases

### ✅ Flexibility
- Users can create personal households (type: 'individual')
- Households can be families, roommates, couples, or any unit
- Permission system allows customization per household

### ✅ Privacy
- Households are isolated - no cross-household access
- Food items database is universal but doesn't contain personal data
- Shopping/pantry/recipes/meals are household-specific

## Next Steps

1. **Update app.js** - Register household routes
2. **Update food routes** - Use `ensureHousehold` middleware
3. **Update route logic** - Query by `household` instead of `user`
4. **Create household dashboard view** - Manage members and settings
5. **Add household switcher** (future) - Allow users to belong to multiple households
6. **Migration script** - Help existing users set up households
7. **Email notifications** - Send invitation emails
8. **Household analytics** - Track household-wide statistics

## Example Usage

```javascript
// Creating a shopping list (new way)
const shoppingList = new ShoppingList({
  title: "Weekly Groceries",
  household: req.user.household,  // ← Household-based
  createdBy: req.user._id,
  items: [...]
});

// Querying shopping lists (new way)
const lists = await ShoppingList.find({
  household: req.user.household   // ← All household members see these
});

// Food items remain universal
const items = await GroceryItem.find({
  name: /milk/i,
  isActive: true
  // No user or household filter - universal database
});
```
