# Dashboard Button Debug Report

## Problem Description
The buttons on the Purchase Orders dashboard (dashboard.ejs) stopped working after recent changes to tracking-dashboard.ejs.

## Investigation Steps

### 1. Function Definitions Check
Both files define these functions in `<head>`:
- `toggleAccordion(accordionId, event)`
- `toggleImportsDropdown(event)`  
- `closeAllDropdowns()`

**Finding:** These are defined per-page, so they shouldn't conflict unless there's a shared layout or partial.

### 2. Possible Causes

#### A. JavaScript Syntax Error
If we introduced a syntax error in tracking-dashboard.ejs, it could have broken something shared.

#### B. Shared Script File
Check if there's a shared JavaScript file that got modified.

#### C. Browser Caching
Old JavaScript may be cached - need hard refresh.

#### D. Missing Event Parameter
Some buttons might be calling `toggleAccordion('id')` without the `event` parameter.

### 3. What to Check

**In dashboard.ejs:**
- Line 3090: `onclick="toggleAccordion('managersAccordion', event)"` ✅ Has event
- Line 3165: `onclick="toggleAccordion('optionsAccordion', event)"` ✅ Has event
- Line 3215: `onclick="toggleImportsDropdown(event)"` ✅ Has event

**In tracking-dashboard.ejs:**
- Line 514: `onclick="toggleAccordion('dashboardsAccordion', event)"` ✅ Has event
- Line 531: `onclick="toggleImportsDropdown(event)"` ✅ Has event

### 4. Console Errors to Look For

Open browser console (F12) on dashboard and look for:
- `Uncaught ReferenceError: toggleAccordion is not defined`
- `Uncaught TypeError: Cannot read property 'stopPropagation' of undefined`
- Any other JavaScript errors

### 5. Quick Fix Attempts

Try these in order:

1. **Hard Refresh** - Ctrl+Shift+R on the dashboard page
2. **Clear Cache** - Clear browser cache completely
3. **Incognito** - Test in incognito/private window
4. **Check Console** - F12 → Console tab for errors

### 6. Differences Found

Let me check if there's a difference in how the functions are implemented...

**dashboard.ejs** (line 2955-3006):
- Has detailed console.log statements
- More complex closeAllDropdowns logic

**tracking-dashboard.ejs** (line 13-41):
- Simpler implementation
- Fewer console logs

**This shouldn't cause issues** since they're on different pages.

### 7. Hypothesis

Since you said this happened after our work on tracking-dashboard, and the files don't share code, the most likely causes are:

1. **Browser caching the old broken state** during our multiple server restarts
2. **A JavaScript error we introduced** that's logged in console
3. **Server serving a cached/corrupted version** of dashboard.ejs

### Next Steps

Please provide:
1. What specific buttons aren't working (navigation buttons, action buttons, all buttons?)
2. Any error messages in browser console (F12)
3. Does the same issue happen in incognito mode?
4. Does it work on other dashboards (Tasks, Line Items Manager)?

This will help pinpoint the exact issue.
