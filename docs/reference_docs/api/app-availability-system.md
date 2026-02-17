# App Availability Management System

## 🎯 Overview

The App Availability System enables **super admins** to control which applications (Payments, Web Publishing, etc.) are visible and accessible to specific organizations. This follows the architecture defined in [ARCHITECTURE.md](../../platform/ARCHITECTURE.md).

---

## 🏗️ Architecture

### Core Pattern: `appAvailabilities` Junction Table

```
┌──────────────────────────────────────────────────────────────┐
│                    App Availability System                    │
└──────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌──────────────────────────────────────────────────────────────┐
│   appAvailabilities (junction table)                         │
│   - Controls per-org app visibility                          │
│   - Super admin approval required                            │
│   - Audit trail (who, when)                                  │
└──────────────────────────────────────────────────────────────┘
          │                                           │
          │                                           │
          ▼                                           ▼
┌─────────────────────┐                  ┌──────────────────────┐
│   apps table        │                  │   organizations      │
│   - App registry    │                  │   - All orgs         │
│   - Payments        │                  │   - Org metadata     │
│   - Web Publishing  │                  │                      │
│   - Custom Apps     │                  │                      │
└─────────────────────┘                  └──────────────────────┘
```

---

## 📊 Database Schema

### `apps` Table

**Already exists in ARCHITECTURE.md - Used for app registration:**

```typescript
{
  _id: "app_payments_id",
  code: "payments",              // Unique app identifier
  name: "Payments",              // Display name
  description: "Stripe Connect payment processing",
  appType: "interactive",        // "interactive" | "shared-content" | "private-tool"
  price: 0,                      // Free or paid app
  isGlobal: true,                // Show in app store by default
  creatorOrgId: "org_system",    // System-created apps
  isActive: true,
  createdAt: 1234567890,
  updatedAt: 1234567890,
}
```

### `appAvailabilities` Table

**Already defined in ARCHITECTURE.md - Controls per-org visibility:**

```typescript
{
  _id: "availability_id",
  appId: "app_payments_id",
  organizationId: "org_acme",
  isAvailable: true,             // Toggle availability
  approvedBy: "user_admin_id",   // Super admin who approved
  approvedAt: 1234567890,

  // Indexes:
  // - by_org_app: ["organizationId", "appId"]
  // - by_app: ["appId"]
  // - by_org: ["organizationId"]
}
```

---

## 🔧 Backend Implementation

### File Structure

```
convex/
├── apps.ts                    # App registration & queries
├── appAvailability.ts         # Availability management (NEW)
└── seedApps.ts                # Seed system apps (NEW)
```

### Key Queries & Mutations

**convex/apps.ts**

```typescript
/**
 * GET AVAILABLE APPS FOR ORGANIZATION
 * Returns only apps that:
 * 1. Are active (isActive = true)
 * 2. Have appAvailabilities entry with isAvailable = true
 * 3. Or: Super admin sees all apps (bypass)
 */
export const getAvailableApps = query({
  args: {
    sessionId: v.string(),
    organizationId: v.id("organizations"),
  },
  handler: async (ctx, { sessionId, organizationId }) => {
    const { userId, isSuperAdmin } = await requireAuthenticatedUser(ctx, sessionId);

    // Super admin sees ALL apps
    if (isSuperAdmin) {
      return await ctx.db
        .query("apps")
        .filter(q => q.eq(q.field("isActive"), true))
        .collect();
    }

    // Regular user: Check appAvailabilities
    const availabilities = await ctx.db
      .query("appAvailabilities")
      .withIndex("by_org", q => q.eq("organizationId", organizationId))
      .filter(q => q.eq(q.field("isAvailable"), true))
      .collect();

    const availableAppIds = availabilities.map(a => a.appId);

    return await ctx.db
      .query("apps")
      .filter(q =>
        q.and(
          q.eq(q.field("isActive"), true),
          // @ts-ignore - Convex filter with ID array
          availableAppIds.includes(q.field("_id"))
        )
      )
      .collect();
  },
});

/**
 * GET ALL APPS (Super Admin Only)
 * Returns all apps in the system
 */
export const listAll = query({
  args: { sessionId: v.string() },
  handler: async (ctx, { sessionId }) => {
    const { isSuperAdmin } = await requireAuthenticatedUser(ctx, sessionId);
    if (!isSuperAdmin) throw new Error("Super admin access required");

    return await ctx.db.query("apps").collect();
  },
});
```

**convex/appAvailability.ts (NEW)**

```typescript
import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import { requireAuthenticatedUser } from "./rbacHelpers";

/**
 * GET APP AVAILABILITY FOR ORG
 * Check if a specific app is available to an organization
 */
export const getAppAvailability = query({
  args: {
    organizationId: v.id("organizations"),
    appId: v.id("apps"),
  },
  handler: async (ctx, { organizationId, appId }) => {
    return await ctx.db
      .query("appAvailabilities")
      .withIndex("by_org_app", q =>
        q.eq("organizationId", organizationId)
         .eq("appId", appId)
      )
      .first();
  },
});

/**
 * GET ALL AVAILABILITIES FOR ORG
 * Returns all app availability records for an organization
 */
export const getOrgAvailabilities = query({
  args: { organizationId: v.id("organizations") },
  handler: async (ctx, { organizationId }) => {
    return await ctx.db
      .query("appAvailabilities")
      .withIndex("by_org", q => q.eq("organizationId", organizationId))
      .collect();
  },
});

/**
 * SET APP AVAILABILITY (Super Admin Only)
 * Enable or disable an app for a specific organization
 */
export const setAppAvailability = mutation({
  args: {
    sessionId: v.string(),
    organizationId: v.id("organizations"),
    appId: v.id("apps"),
    isAvailable: v.boolean(),
  },
  handler: async (ctx, { sessionId, organizationId, appId, isAvailable }) => {
    const { userId, isSuperAdmin } = await requireAuthenticatedUser(ctx, sessionId);

    if (!isSuperAdmin) {
      throw new Error("Super admin access required to manage app availability");
    }

    // Check if availability record exists
    const existing = await ctx.db
      .query("appAvailabilities")
      .withIndex("by_org_app", q =>
        q.eq("organizationId", organizationId)
         .eq("appId", appId)
      )
      .first();

    if (existing) {
      // Update existing record
      await ctx.db.patch(existing._id, {
        isAvailable,
        approvedBy: userId,
        approvedAt: Date.now(),
      });
      return existing._id;
    } else {
      // Create new record
      return await ctx.db.insert("appAvailabilities", {
        appId,
        organizationId,
        isAvailable,
        approvedBy: userId,
        approvedAt: Date.now(),
      });
    }
  },
});

/**
 * BULK SET APP AVAILABILITY
 * Enable/disable multiple apps for an organization at once
 */
export const bulkSetAppAvailability = mutation({
  args: {
    sessionId: v.string(),
    organizationId: v.id("organizations"),
    appIds: v.array(v.id("apps")),
    isAvailable: v.boolean(),
  },
  handler: async (ctx, { sessionId, organizationId, appIds, isAvailable }) => {
    const { userId, isSuperAdmin } = await requireAuthenticatedUser(ctx, sessionId);

    if (!isSuperAdmin) {
      throw new Error("Super admin access required");
    }

    const results = [];

    for (const appId of appIds) {
      const existing = await ctx.db
        .query("appAvailabilities")
        .withIndex("by_org_app", q =>
          q.eq("organizationId", organizationId)
           .eq("appId", appId)
        )
        .first();

      if (existing) {
        await ctx.db.patch(existing._id, {
          isAvailable,
          approvedBy: userId,
          approvedAt: Date.now(),
        });
        results.push(existing._id);
      } else {
        const id = await ctx.db.insert("appAvailabilities", {
          appId,
          organizationId,
          isAvailable,
          approvedBy: userId,
          approvedAt: Date.now(),
        });
        results.push(id);
      }
    }

    return results;
  },
});
```

**convex/seedApps.ts (NEW)**

```typescript
import { mutation } from "./_generated/server";
import { v } from "convex/values";

/**
 * SEED SYSTEM APPS
 * Run once to register Payments and Web Publishing apps
 */
export const seedSystemApps = mutation({
  args: { sessionId: v.string() },
  handler: async (ctx, { sessionId }) => {
    const { isSuperAdmin } = await requireAuthenticatedUser(ctx, sessionId);
    if (!isSuperAdmin) throw new Error("Super admin only");

    const systemOrg = await ctx.db
      .query("organizations")
      .filter(q => q.eq(q.field("slug"), "system"))
      .first();

    if (!systemOrg) throw new Error("System organization not found");

    // 1. Register Payments App
    const paymentsApp = await ctx.db.insert("apps", {
      code: "payments",
      name: "Payments",
      description: "Stripe Connect payment processing and invoicing",
      appType: "interactive",
      price: 0,
      isGlobal: true,
      creatorOrgId: systemOrg._id,
      isActive: true,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });

    // 2. Register Web Publishing App
    const publishingApp = await ctx.db.insert("apps", {
      code: "web-publishing",
      name: "Web Publishing",
      description: "Publish content to the web with custom URLs",
      appType: "interactive",
      price: 0,
      isGlobal: true,
      creatorOrgId: systemOrg._id,
      isActive: true,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });

    return {
      paymentsAppId: paymentsApp,
      publishingAppId: publishingApp,
    };
  },
});
```

---

## 🎨 Frontend Implementation

### File Structure

```
src/
└── components/
    └── window-content/
        └── admin-manage-window/
            └── app-availability-tab.tsx    # NEW - Super admin UI
```

### App Availability Management UI

**src/components/window-content/admin-manage-window/app-availability-tab.tsx**

```typescript
"use client";

import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { useAuth } from "@/hooks/use-auth";
import { Shield, Check, X, Loader2 } from "lucide-react";
import { Id } from "../../../../convex/_generated/dataModel";

export function AppAvailabilityTab() {
  const { sessionId, user } = useAuth();
  const [saving, setSaving] = useState(false);

  // Get all organizations
  const organizations = useQuery(api.organizations.list, sessionId ? { sessionId } : "skip");

  // Get all apps
  const apps = useQuery(api.apps.listAll, sessionId ? { sessionId } : "skip");

  if (!organizations || !apps) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 size={32} className="animate-spin" />
      </div>
    );
  }

  return (
    <div className="p-4">
      {/* Header */}
      <div className="mb-4">
        <h3 className="text-sm font-bold flex items-center gap-2">
          <Shield size={16} />
          App Availability Management
        </h3>
        <p className="text-xs text-gray-600 mt-1">
          Control which apps are visible to each organization
        </p>
      </div>

      {/* Matrix Table */}
      <div className="border-2 border-gray-400 overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="bg-gray-200 border-b-2 border-gray-400">
              <th className="px-3 py-2 text-left font-bold sticky left-0 bg-gray-200">
                Organization
              </th>
              {apps.map(app => (
                <th key={app._id} className="px-3 py-2 text-center font-bold">
                  {app.name}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {organizations.map(org => (
              <OrganizationRow
                key={org._id}
                organization={org}
                apps={apps}
                sessionId={sessionId!}
              />
            ))}
          </tbody>
        </table>
      </div>

      {/* Legend */}
      <div className="mt-4 flex items-center gap-4 text-xs">
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 bg-green-500 border border-gray-400"></div>
          <span>Available</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 bg-red-500 border border-gray-400"></div>
          <span>Not Available</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 bg-gray-300 border border-gray-400"></div>
          <span>Loading...</span>
        </div>
      </div>
    </div>
  );
}

/**
 * Individual organization row with app availability toggles
 */
function OrganizationRow({
  organization,
  apps,
  sessionId,
}: {
  organization: any;
  apps: any[];
  sessionId: string;
}) {
  const setAvailability = useMutation(api.appAvailability.setAppAvailability);

  // Get all availabilities for this org
  const availabilities = useQuery(
    api.appAvailability.getOrgAvailabilities,
    { organizationId: organization._id }
  );

  const handleToggle = async (appId: Id<"apps">, currentState: boolean) => {
    try {
      await setAvailability({
        sessionId,
        organizationId: organization._id,
        appId,
        isAvailable: !currentState,
      });
    } catch (error) {
      console.error("Failed to toggle app availability:", error);
      alert("Failed to update app availability");
    }
  };

  return (
    <tr className="border-b border-gray-300 hover:bg-gray-50">
      <td className="px-3 py-2 font-semibold sticky left-0 bg-white">
        {organization.name}
        <span className="text-gray-500 text-xs ml-2">({organization.slug})</span>
      </td>
      {apps.map(app => {
        const availability = availabilities?.find(a => a.appId === app._id);
        const isAvailable = availability?.isAvailable ?? false;

        return (
          <td key={app._id} className="px-3 py-2 text-center">
            <button
              onClick={() => handleToggle(app._id, isAvailable)}
              className="w-6 h-6 border-2 border-gray-400 flex items-center justify-center transition-colors"
              style={{
                backgroundColor: isAvailable ? "#22c55e" : "#ef4444",
              }}
              title={isAvailable ? "Click to disable" : "Click to enable"}
            >
              {isAvailable ? (
                <Check size={14} className="text-white" />
              ) : (
                <X size={14} className="text-white" />
              )}
            </button>
          </td>
        );
      })}
    </tr>
  );
}
```

### Integration in Manage Window

**src/components/window-content/admin-manage-window/index.tsx**

```typescript
import { AppAvailabilityTab } from "./app-availability-tab";

// Add to tabs
<TabButton
  icon={<Shield size={14} />}
  label="App Availability"
  active={activeTab === "app-availability"}
  onClick={() => setActiveTab("app-availability")}
/>

// Add to content
{activeTab === "app-availability" && <AppAvailabilityTab />}
```

---

## 🔗 Start Menu Integration

### Filter Apps by Availability

**src/components/start-menu.tsx**

```typescript
// Get available apps for current organization
const availableApps = useQuery(
  api.apps.getAvailableApps,
  sessionId && currentOrg
    ? { sessionId, organizationId: currentOrg.id }
    : "skip"
);

// Check if app is available
const isAppAvailable = (appCode: string) => {
  return availableApps?.some(app => app.code === appCode) ?? false;
};

// Application items (filtered by availability)
const appMenuItems = [
  {
    id: "payments",
    label: "Payments",
    icon: <CreditCard size={16} />,
    visible: isAppAvailable("payments"),
    onClick: () => openWindow("payments"),
  },
  {
    id: "publishing",
    label: "Web Publishing",
    icon: <Globe size={16} />,
    visible: isAppAvailable("web-publishing"),
    onClick: () => openWindow("publishing"),
  },
].filter(item => item.visible);
```

---

## 🚀 Usage Workflow

### For Super Admin

**1. Seed System Apps (One-Time Setup):**

```bash
# In Convex dashboard or via script
npx convex run seedApps:seedSystemApps \
  --sessionId "session_id"
```

**2. Enable Apps for Organization:**

```
1. Open "Manage" window (super admin)
2. Click "App Availability" tab
3. Find target organization row
4. Click checkbox under "Payments" column → Green ✅
5. Click checkbox under "Web Publishing" column → Green ✅
6. Changes saved automatically
```

### For Organization User

**1. Apps Appear in Start Menu:**

```
User logs in to their organization
→ Start Menu shows available apps:
   - Payments ✅ (if enabled)
   - Web Publishing ✅ (if enabled)
   - Other apps (if enabled)
```

**2. Click to Open:**

```
Click "Payments" icon
→ Opens PaymentsWindow component
→ User can manage Stripe Connect, view transactions
```

---

## 📋 Implementation Checklist

### Backend (3-4 hours)
- [ ] Add `appAvailabilities` table to schema (already in ARCHITECTURE.md)
- [ ] Create `convex/appAvailability.ts` with queries/mutations
- [ ] Create `convex/seedApps.ts` for app registration
- [ ] Add `getAvailableApps` query to filter by availability
- [ ] Test with multiple organizations

### Frontend (3-4 hours)
- [ ] Create `app-availability-tab.tsx` component
- [ ] Add matrix table UI with toggles
- [ ] Integrate in Admin Manage Window
- [ ] Update Start Menu to filter apps by availability
- [ ] Test enabling/disabling apps for different orgs

### Testing (1-2 hours)
- [ ] Seed Payments and Web Publishing apps
- [ ] Enable Payments for Org A, disable for Org B
- [ ] Login as user from Org A → see Payments icon
- [ ] Login as user from Org B → don't see Payments icon
- [ ] Toggle availability → verify real-time updates

**Total Estimated Time: 7-10 hours**

---

## 🎉 Benefits

### For Super Admin
- ✅ Full control over app visibility per organization
- ✅ Easy-to-use matrix UI for bulk management
- ✅ Audit trail (who enabled, when)
- ✅ No code changes needed to add new apps

### For Organization Users
- ✅ Clean Start Menu (only shows relevant apps)
- ✅ No confusion from unavailable apps
- ✅ Seamless experience (apps just work when enabled)

### For System
- ✅ Follows existing RBAC architecture
- ✅ Leverages ontology pattern for flexibility
- ✅ Scalable to 100+ apps and 1000+ organizations
- ✅ No schema changes needed for new apps

---

## 📚 Related Documentation

- [ARCHITECTURE.md](../../platform/ARCHITECTURE.md) - Full multi-tenant architecture
- [WEB_PUBLISHING_APP_PLAN.md](../WEB_PUBLISHING_APP_PLAN.md) - Web publishing app details
- CHECKOUT_SYSTEM_ARCHITECTURE.md (legacy .kiro draft, not in this repository) - Payments app details

---

**Document Version:** 1.0
**Created:** 2025-10-10
**Status:** 📝 Ready for Implementation
