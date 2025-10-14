# How to Register Apps in the App Availability System

## Overview

The **App Availability System** controls which apps appear in the START menu for each organization. This is how you register apps and make them available.

---

## The Two-Step Process

### Step 1: Register the App (Database)

First, create a record in the `apps` table that represents your app.

**For Payments (existing functionality):**
```bash
npx convex run seedApps:seedSystemApps --sessionId "YOUR_SESSION_ID"
```

This creates:
- ✅ Payments app record in `apps` table
- ✅ Web Publishing app record in `apps` table

**For future apps:**
Add them to `convex/seedApps.ts` or create via mutation:
```typescript
await ctx.db.insert("apps", {
  code: "my-new-app",           // Unique identifier
  name: "My New App",           // Display name
  description: "What it does",  // Description
  icon: "🎯",                   // Emoji icon
  category: "marketing",        // Category
  plans: ["pro", "business"],   // Which plans can use it
  creatorOrgId: systemOrgId,    // Who created it
  dataScope: "installer-owned", // Data isolation
  status: "active",             // Active = visible to admins
  version: "1.0.0",
  createdAt: Date.now(),
  updatedAt: Date.now(),
});
```

---

### Step 2: Enable for Organizations (UI)

After the app is registered, super admins control which orgs can see it:

1. **Login as super admin**
2. **Open "Manage" window** (START → Programs → Manage)
3. **Click "App Availability" tab** (4th tab)
4. **Toggle apps on/off** for each organization

The matrix shows:
- **Rows:** Organizations
- **Columns:** Apps (Payments, Web Publishing, etc.)
- **Cells:** ✅ = enabled, ❌ = disabled

---

## How It Works

### Database Tables

1. **`apps`** - Registry of all apps
   - Contains: code, name, description, icon, etc.
   - Super admins see ALL apps here

2. **`appAvailabilities`** - Controls visibility
   - Join table: `organizationId` + `appId` + `isAvailable`
   - Super admins manage this via UI

3. **`appInstallations`** - Tracks actual installations
   - Automatically created when app is enabled
   - Contains: status, permissions, config

### Start Menu Filtering

When a user opens the START menu:

1. **Query:** `getAvailableApps(sessionId, organizationId)`
2. **Returns:** Only apps with `isAvailable=true` for that org
3. **Filter:** START menu only shows returned apps

**Super admins bypass:** They see ALL active apps regardless of availability.

---

## Example: Adding a New App

### 1. Build the functionality
```typescript
// convex/crmApp.ts
export const getContacts = query({ ... });
export const createContact = mutation({ ... });
```

### 2. Create the UI
```typescript
// src/components/window-content/crm-window.tsx
export function CrmWindow() { ... }
```

### 3. Register the app
```typescript
// convex/seedApps.ts (add to seedSystemApps)
const crmAppId = await ctx.db.insert("apps", {
  code: "crm",
  name: "CRM",
  description: "Contact and deal management",
  icon: "👥",
  category: "collaboration",
  plans: ["business", "enterprise"],
  creatorOrgId: systemOrgId,
  dataScope: "installer-owned",
  status: "active",
  version: "1.0.0",
  createdAt: Date.now(),
  updatedAt: Date.now(),
});
```

### 4. Add to START menu (conditionally)
```typescript
// src/app/page.tsx
{isAppAvailable("crm") && (
  <DropdownMenuItem onClick={() => openWindow("crm")}>
    👥 CRM
  </DropdownMenuItem>
)}
```

### 5. Enable for organizations
- Super admin opens App Availability tab
- Toggles CRM on for specific orgs
- Those orgs now see CRM in their START menu

---

## Current Apps

### Payments
- **Status:** ✅ Functionality exists (checkoutOntology.ts)
- **Registration:** ⚠️ Needs to run `seedSystemApps`
- **UI:** ✅ Payments window exists
- **Menu:** ✅ START → Programs → Payments

### Web Publishing (Future)
- **Status:** 📋 Planned
- **Registration:** ⚠️ Needs to run `seedSystemApps`
- **UI:** ❌ Not built yet
- **Menu:** ❌ Not in START menu yet

---

## Testing Checklist

After registering an app:

- [ ] Verify app exists in `apps` table (Convex dashboard)
- [ ] Open App Availability tab as super admin
- [ ] See app in column headers
- [ ] Toggle app on for test org
- [ ] Login as user from test org
- [ ] Verify app appears in START menu
- [ ] Toggle app off for test org
- [ ] Refresh page
- [ ] Verify app disappears from START menu

---

## Troubleshooting

### App doesn't appear in START menu

1. **Check:** Is app registered in `apps` table?
   - Convex dashboard → Data → apps
   - Should have `code`, `name`, `status="active"`

2. **Check:** Is app enabled for the organization?
   - Convex dashboard → Data → appAvailabilities
   - Should have record with `isAvailable=true`

3. **Check:** Is START menu filtering correctly?
   - Inspect `getAvailableApps` query in Network tab
   - Should return the app in results

### App Availability tab is empty

1. **Check:** Are you logged in as super admin?
   - Regular users can't see this tab
   - Check your role in `users` table

2. **Check:** Are apps registered?
   - Run `seedSystemApps` mutation
   - Verify apps exist in database

3. **Check:** Is Convex dev running?
   - Terminal should show "Convex functions ready!"
   - Functions should be registered

---

## Future Enhancements

- **App Store UI:** Let orgs "purchase" or "request" apps
- **Auto-enable:** Enable apps after payment
- **App Categories:** Group apps by category in START menu
- **App Permissions:** Granular permissions within each app

---

**Created:** 2025-10-10
**Last Updated:** 2025-10-10
