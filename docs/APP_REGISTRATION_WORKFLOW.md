# App Registration Workflow

This document describes the complete workflow for adding a new app to the l4yercak3 platform. Follow these steps in order to ensure the app is properly registered across all system components.

## Overview

Adding a new app requires updates to:
1. **Backend** - Database registration and licensing
2. **Frontend** - Window registry, program menu, and all apps window
3. **Translations** - App name and window title translations
4. **Seeds** - Running database seeds to persist changes

---

## Step 1: Backend - Register App in Database

**File:** `convex/seedApps.ts`

### 1a. Add to `seedSystemApps` mutation

Find the `seedSystemApps` mutation and add your app registration:

```typescript
// Check if app already exists
const existingApp = await ctx.db
  .query("apps")
  .withIndex("by_code", (q) => q.eq("code", "your-app-code"))
  .first();

let appId;
if (existingApp) {
  appId = existingApp._id;
  console.log("App already exists:", appId);
} else {
  appId = await ctx.db.insert("apps", {
    code: "your-app-code",           // Unique identifier (matches window ID)
    name: "Your App Name",
    description: "Description of what the app does",
    icon: "🎁",                       // Emoji icon
    category: "collaboration",        // See categories below
    plans: ["pro", "business", "enterprise"],  // Which plans include this app
    creatorOrgId: systemOrg._id,
    dataScope: "installer-owned",     // See data scopes below
    status: "active",
    version: "1.0.0",
    createdAt: Date.now(),
    updatedAt: Date.now(),
  });
  console.log("Created app:", appId);
}
```

### 1b. (Optional) Create standalone registration mutation

For convenience, create a dedicated mutation to register just your app:

```typescript
export const registerYourAppApp = mutation({
  handler: async (ctx) => {
    // Find or create system organization
    let systemOrg = await ctx.db
      .query("organizations")
      .filter((q) => q.eq(q.field("slug"), "system"))
      .first();

    if (!systemOrg) {
      // Fallback to first organization
      const firstOrg = await ctx.db.query("organizations").first();
      if (!firstOrg) {
        throw new Error("No organizations found");
      }
      systemOrg = firstOrg;
    }

    // Check if already exists
    const existing = await ctx.db
      .query("apps")
      .withIndex("by_code", (q) => q.eq("code", "your-app-code"))
      .first();

    if (existing) {
      return { appId: existing._id, message: "App already exists", app: existing };
    }

    // Create the app record
    const appId = await ctx.db.insert("apps", {
      code: "your-app-code",
      name: "Your App Name",
      description: "Description of what the app does",
      icon: "🎁",
      category: "collaboration",
      plans: ["pro", "business", "enterprise"],
      creatorOrgId: systemOrg._id,
      dataScope: "installer-owned",
      status: "active",
      version: "1.0.0",
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });

    const app = await ctx.db.get(appId);
    return { appId, message: "App registered successfully", app };
  },
});
```

### App Categories

Valid categories for the `category` field:
- `content` - Content management apps
- `analytics` - Analytics and reporting
- `marketing` - Marketing tools
- `collaboration` - Team collaboration and community
- `finance` - Financial tools
- `administration` - Admin and management
- `commerce` - E-commerce and sales
- `business` - General business tools

### Data Scopes

Valid values for the `dataScope` field:
- `org-owned` - Creator org owns all data (e.g., podcast episodes)
- `installer-owned` - Each installing org has isolated data (e.g., CRM, analytics)
- `none` - No persistent data (client-side only)

---

## Step 2: Backend - Add Licensing Limits/Features (if applicable)

**File:** `convex/licensing/tierConfigs.ts`

If your app has usage limits or feature flags, add them to the tier configuration.

### 2a. Add to `TierLimits` interface

```typescript
export interface TierLimits {
  // ... existing limits ...

  // Your App
  maxYourAppItems: number;
  maxYourAppActionsPerMonth: number;
}
```

### 2b. Add to `TierFeatures` interface

```typescript
export interface TierFeatures {
  // ... existing features ...

  // Your App
  yourAppEnabled: boolean;
  yourAppAdvancedFeature: boolean;
}
```

### 2c. Add values to each tier

Add the limit/feature values to each tier configuration (`FREE_TIER`, `STARTER_TIER`, `PROFESSIONAL_TIER`, `AGENCY_TIER`, `ENTERPRISE_TIER`):

```typescript
// In limits section:
maxYourAppItems: 10,  // or 0 for disabled, -1 for UNLIMITED
maxYourAppActionsPerMonth: 50,

// In features section:
yourAppEnabled: true,  // or false
yourAppAdvancedFeature: false,
```

---

## Step 3: Frontend - Register Window in Registry

**File:** `src/hooks/window-registry.tsx`

### 3a. Add lazy import

Add the lazy import near the top of the file with other imports:

```typescript
const YourAppWindow = lazy(() =>
  import("@/components/window-content/your-app-window").then(m => ({ default: m.YourAppWindow }))
);
```

### 3b. Add to WINDOW_REGISTRY

Add your window configuration to the `WINDOW_REGISTRY` object:

```typescript
export const WINDOW_REGISTRY: Record<string, WindowFactory> = {
  // ... existing windows ...

  "your-app-code": {
    createComponent: () => <YourAppWindow />,
    defaultConfig: {
      title: "Your App Name",
      titleKey: "ui.windows.your_app.title",  // Translation key
      icon: "🎁",
      position: { x: 150, y: 100 },
      size: { width: 1100, height: 700 }
    }
  }
};
```

---

## Step 4: Frontend - Add to Program Menu

**File:** `src/app/page.tsx`

### 4a. Add import

Add the window component import:

```typescript
import { YourAppWindow } from "@/components/window-content/your-app-window"
```

### 4b. Add open function

Add a function to open the window (inside the `HomePage` component):

```typescript
const openYourAppWindow = () => {
  openWindow(
    "your-app-code",           // Window ID (matches registry key)
    "Your App Name",           // Default title
    <YourAppWindow />,         // Component
    { x: 150, y: 100 },        // Position
    { width: 1100, height: 700 }, // Size
    'ui.app.your_app',         // Translation key
    '🎁'                       // Icon
  )
}
```

### 4c. Add to programsSubmenu

Add the menu item to the `programsSubmenu` array:

```typescript
const programsSubmenu = [
  // ... existing items ...

  // Your App - Brief description
  { label: t('ui.app.your_app') || "Your App Name", icon: "🎁", onClick: requireAuth(openYourAppWindow) },
]
```

---

## Step 5: Frontend - Add to All Apps Window

**File:** `src/components/window-content/all-apps-window.tsx`

### 5a. Add import

```typescript
import { YourAppWindow } from "@/components/window-content/your-app-window";
```

### 5b. Add to translationKeyMap

Inside the `getTranslatedAppName` callback, add to the map:

```typescript
const translationKeyMap: Record<string, string> = {
  // ... existing mappings ...
  'your-app-code': 'ui.app.your_app',
};
```

### 5c. Add to appWindowMap

Inside the `handleAppClick` callback, add to the map:

```typescript
const appWindowMap: Record<string, { component: React.ReactNode; width: number; height: number }> = {
  // ... existing mappings ...
  'your-app-code': {
    component: <YourAppWindow />,
    width: 1100,
    height: 700
  },
};
```

---

## Step 6: Add Translations

**File:** `convex/translations/seedStartMenu.ts`

Add translation entries for the app name and window title:

```typescript
const translations = [
  // ... existing translations ...

  {
    key: "ui.app.your_app",
    values: {
      en: "Your App Name",
      de: "Ihr App-Name",
      pl: "Nazwa Twojej Aplikacji",
      es: "Nombre de tu aplicación",
      fr: "Nom de votre application",
      ja: "あなたのアプリ名",
    }
  },
  {
    key: "ui.windows.your_app.title",
    values: {
      en: "Your App Name",
      de: "Ihr App-Name",
      pl: "Nazwa Twojej Aplikacji",
      es: "Nombre de tu aplicación",
      fr: "Nom de votre application",
      ja: "あなたのアプリ名",
    }
  },
];
```

---

## Step 7: Run Seeds

After making all changes, run the seed commands:

```bash
# Register the app in database (choose one)
npx convex run seedApps:seedSystemApps          # Registers all system apps
npx convex run seedApps:registerYourAppApp      # Registers just your app

# Seed translations
npx convex run translations/seedStartMenu:seed
```

---

## Step 8: Verify

1. **TypeScript Check**: Run `npm run typecheck` to ensure no type errors
2. **Lint Check**: Run `npm run lint` to check for issues
3. **Program Menu**: Verify the app appears in Start Menu → Programs
4. **All Apps Window**: Verify the app appears and opens correctly from All Apps
5. **Translations**: Switch languages to verify translations work

---

## Quick Reference Checklist

- [ ] `convex/seedApps.ts` - Add to `seedSystemApps` mutation
- [ ] `convex/seedApps.ts` - (Optional) Create standalone `registerXxxApp` mutation
- [ ] `convex/licensing/tierConfigs.ts` - Add limits to `TierLimits` interface
- [ ] `convex/licensing/tierConfigs.ts` - Add features to `TierFeatures` interface
- [ ] `convex/licensing/tierConfigs.ts` - Add values to all 5 tier configs
- [ ] `src/hooks/window-registry.tsx` - Add lazy import
- [ ] `src/hooks/window-registry.tsx` - Add to `WINDOW_REGISTRY`
- [ ] `src/app/page.tsx` - Add import
- [ ] `src/app/page.tsx` - Add `openXxxWindow` function
- [ ] `src/app/page.tsx` - Add to `programsSubmenu`
- [ ] `src/components/window-content/all-apps-window.tsx` - Add import
- [ ] `src/components/window-content/all-apps-window.tsx` - Add to `translationKeyMap`
- [ ] `src/components/window-content/all-apps-window.tsx` - Add to `appWindowMap`
- [ ] `convex/translations/seedStartMenu.ts` - Add `ui.app.xxx` translation
- [ ] `convex/translations/seedStartMenu.ts` - Add `ui.windows.xxx.title` translation
- [ ] Run `npx convex run seedApps:seedSystemApps`
- [ ] Run `npx convex run translations/seedStartMenu:seed`
- [ ] Run `npm run typecheck`
- [ ] Run `npm run lint`

---

## Example: Benefits App

For a complete example, see the Benefits app implementation:

- Backend: `convex/seedApps.ts` (search for "benefits")
- Licensing: `convex/licensing/tierConfigs.ts` (search for "Benefits Platform")
- Window Registry: `src/hooks/window-registry.tsx` (search for "benefits")
- Program Menu: `src/app/page.tsx` (search for "openBenefitsWindow")
- All Apps: `src/components/window-content/all-apps-window.tsx` (search for "benefits")
- Translations: `convex/translations/seedStartMenu.ts` (search for "ui.app.benefits")
