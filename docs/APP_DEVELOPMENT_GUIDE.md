# App Development Guide

Complete guide for building standardized snapshot-based apps on the Layer Cake platform, inspired by GoHighLevel's sub-account model.

## Table of Contents
1. [Overview](#overview)
2. [Critical Architecture Rules](#critical-architecture-rules)
3. [Snapshot-Based App Structure](#snapshot-based-app-structure)
4. [App Types](#app-types)
5. [Step-by-Step Tutorial](#step-by-step-tutorial)
6. [Snapshot Loading Pattern](#snapshot-loading-pattern)
7. [Best Practices](#best-practices)
8. [Reference](#reference)

> **🎨 Important**: All apps must support the theme system. See [Theme System Guide](./THEME_SYSTEM.md) for required CSS variable usage.

---

## Overview

The Layer Cake platform uses a **multi-tenant, snapshot-driven architecture** where:
- **Organizations** can install apps from the central store (yours initially; org-submitted via approval later).
- **Apps** are registered in a central registry (`apps` table) and defined as reusable snapshots.
- **Snapshots** are templates with config and optional seed data, stored centrally.
- **Installs** load a snapshot into the org's workspace via a lightweight "load" record.
- **App data** lives in shared schemas, scoped to the org and load for isolation.
- **All apps** follow this unified pattern—no branching flows.

### Key Principles
1. **Unified Install/Use**: One path—browse store → buy/load snapshot → launch in desktop window.
2. **Snapshot Cloning**: Templates fork minimally (config JSON + lazy data rows) to avoid bloat.
3. **Automatic Scoping**: Convex auth context handles org isolation; no manual tenant checks.
4. **Extensibility**: Declare tables in snapshot; loads auto-scope data.
5. **Security First**: Permissions from install record; audit logs on all ops.
6. **User-Owned Focus**: Apps enable org-specific workflows (e.g., their own invoicing or podcasting); no creator content preloaded.

This mirrors GoHighLevel: Shared backend, per-org "instances" via scoped sub-accounts, but lightweight for your retro desktop.

---

## 🚨 Critical Architecture Rules

### MANDATORY: All Apps Use Snapshot Pattern

**❌ NEVER create per-install tables or heavy clones.**  
**✅ ALWAYS use snapshots for templated, scoped loads.**

Every app MUST have:
1. **App Registry Entry** - In `apps` table (metadata, pricing).
2. **Snapshot Template** - In `snapshots` table (config + seeds).
3. **Load Record** - In `snapshotLoads` table (per-org fork).
4. **Scoped Data Tables** - Shared schemas (e.g., `app_invoice_invoices`), filtered by `orgId`/`loadId`.

This enables:
- One-click installs without bloat.
- Org-specific data via scoping.
- Template updates pushed to loads.
- Easy approval for org-created apps.

---

## Snapshot-Based App Structure

### Architecture Layers

```
┌─────────────────────────────────────────────────────────────────┐
│ Layer 1: APP REGISTRY (apps table)                             │
│ - App metadata, pricing, dataScope                             │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│ Layer 2: SNAPSHOT TEMPLATE (snapshots table)                   │
│ - Central config JSON + seed data for all installs              │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│ Layer 3: SNAPSHOT LOAD (snapshotLoads table)                   │
│ - Per-org fork: Copied config + overrides                      │
│ - Links to install for permissions                             │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│ Layer 4: SCOPED DATA TABLES (shared schemas)                   │
│ - app_invoice_invoices (scoped by loadId/orgId)                 │
│ - app_invoice_clients                                          │
│ - etc.                                                         │
└─────────────────────────────────────────────────────────────────┘
```

### Example: Invoicing App

```typescript
// 1️⃣ APP REGISTRY (apps table)
{
  _id: "app_registry_id",
  code: "app_invoice",
  name: "Layer Cake Invoicing",
  creatorOrgId: "kn78xtag...", // Your org
  dataScope: "private", // Hint: Full CRUD for installer
  pricing: { monthly: 29 },
}

// 2️⃣ SNAPSHOT TEMPLATE (snapshots table)
{
  _id: "template_1",
  appId: "app_registry_id",
  creatorOrgId: "kn78xtag...",
  config: {
    currency: "USD",
    taxRate: 0.08,
    defaultTerms: "Net 30 days",
    invoiceTemplate: "modern", // UI theme
  },
  seedData: [ // Optional sample rows
    {
      table: "clients",
      data: { name: "Sample Client", email: "client@example.com" }
    },
    {
      table: "invoices",
      data: { clientId: "sample_client_id", amount: 1000, status: "draft" }
    }
  ],
  version: "1.0.0",
  declaredTables: ["invoices", "clients", "payments"], // For extensibility
}

// 3️⃣ SNAPSHOT LOAD (snapshotLoads table) - Created on install
{
  _id: "load_1",
  installationId: "install_1", // From appInstallations
  orgId: "orgA_id", // Installer org
  snapshotTemplateId: "template_1",
  loadedConfig: { // Forked copy
    currency: "USD",
    taxRate: 0.08,
    // + org overrides, e.g., customBranding: { logo: "org-logo.png" }
  },
  customOverrides: { currency: "EUR" }, // Org tweaks
  isActive: true,
}

// 4️⃣ SCOPED DATA TABLES

// app_invoice_invoices (shared table)
{
  _id: "invoice_1",
  snapshotLoadId: "load_1",
  orgId: "orgA_id",
  clientId: "client_1",
  amount: 1500,
  status: "sent",
  dueDate: "2025-11-01",
  // ...
}
```

---

## App Types

All types use the same snapshot flow—`dataScope` in registry hints behavior (e.g., auto-insert seeds for private tools).

### 1. Private Tool Apps
**Example**: Invoicing (`app_invoice`).

**Characteristics**:
- Template seeds sample data (e.g., demo clients).
- Loads fork config; full CRUD scoped to org.
- Ideal for user-owned workflows.

**Data Flow**:
```
Org → Loads snapshot → Customizes → Data scoped to orgId/loadId
```

### 2. Shared Content Apps
**Example**: User podcast manager (`app_userpod`).

**Characteristics**:
- Template seeds base structure (e.g., episode fields).
- Loads grant full access; org builds their own content.
- No creator content—users create from scratch.

**Data Flow**:
```
Org → Loads snapshot → Creates their podcast → Scoped episodes
```

### 3. Interactive Apps
**Example**: Workflow board (`app_board`).

**Characteristics**:
- Mix: Shared seeds + org contributions.
- Permissions from load record.

**Data Flow**:
```
Template seeds base → Orgs load/contribute → Scoped interactions
```

---

## Standard File & Table Structure

### File Organization
```
convex/
├── apps.ts                           # Registry + seeding
├── snapshots.ts                      # Template mutations/queries
├── snapshotLoads.ts                  # Load management
├── app_invoice.ts                    # App-specific logic
├── schema.ts                         # All schemas
└── helpers/
    └── snapshotHelpers.ts            # Unified scoping utils
```

### Schema Structure
```typescript
// convex/schema.ts
export default defineSchema({
  // Existing: apps, appInstallations, organizations...
  
  // SNAPSHOT TEMPLATE
  snapshots: defineTable({
    appId: v.id("apps"),
    creatorOrgId: v.id("organizations"),
    config: v.object(), // App-specific JSON
    seedData: v.optional(v.array(v.object())),
    version: v.string(),
    declaredTables: v.array(v.string()), // ["invoices", ...]
  }).index("by_app", ["appId"]),
  
  // SNAPSHOT LOAD
  snapshotLoads: defineTable({
    installationId: v.id("appInstallations"),
    orgId: v.id("organizations"),
    snapshotTemplateId: v.id("snapshots"),
    loadedConfig: v.object(),
    customOverrides: v.optional(v.object()),
    isActive: v.boolean(),
    createdAt: v.number(),
  }).index("by_org_and_install", ["orgId", "installationId"]),
  
  // DATA TABLE EXAMPLE
  app_invoice_invoices: defineTable({
    snapshotLoadId: v.optional(v.id("snapshotLoads")),
    orgId: v.id("organizations"),
    clientId: v.id("app_invoice_clients"),
    amount: v.number(),
    status: v.union(v.literal("draft"), v.literal("sent"), v.literal("paid")),
    dueDate: v.string(),
    // ... other fields
  }).index("by_org", ["orgId"])
    .index("by_load", ["snapshotLoadId"]),
});
```

---

## Snapshot Loading Pattern

**Unified Approach**: All loads fork config JSON; seed data inserts scoped rows on first access.

```typescript
// Helper in snapshotHelpers.ts
export const getScopedData = async (ctx, loadId, tableName) => {
  const load = await ctx.db.get(loadId);
  if (!load) throw new Error("Load not found");
  
  // Filter by loadId/orgId
  return await ctx.db.query(`app_${load.snapshotTemplateId.appCode}_${tableName}`)
    .withIndex("by_load", q => q.eq("snapshotLoadId", loadId))
    .orWithIndex("by_org", q => q.eq("orgId", load.orgId))
    .collect();
};

// On load: Fork config, insert seeds if any
const loadSnapshot = async (ctx, { installationId, templateId }) => {
  const template = await ctx.db.get(templateId);
  const loadId = await ctx.db.insert("snapshotLoads", {
    installationId,
    orgId: /* from auth */,
    snapshotTemplateId: templateId,
    loadedConfig: { ...template.config }, // Shallow copy
    customOverrides: {},
    isActive: true,
  });
  
  // Lazy seed insert
  if (template.seedData) {
    for (const seed of template.seedData) {
      await ctx.db.insert(`app_${template.appId.code}_${seed.table}`, {
        ...seed.data,
        snapshotLoadId: loadId,
        orgId: /* from auth */,
      });
    }
  }
  
  return loadId;
};
```

---

## Step-by-Step Tutorial

### Building the Invoicing App (Snapshot Style)

#### Step 1: Register the App
**File**: `convex/apps.ts`
```typescript
export const APP_INVOICE = {
  code: "app_invoice",
  name: "Layer Cake Invoicing",
  creatorOrgId: "kn78xtag...", // Your org
  dataScope: "private",
  pricing: { monthly: 29 },
};

export const seedApps = [APP_INVOICE];
```

#### Step 2: Create Snapshot Template
**File**: `convex/snapshots.ts`
```typescript
export const createSnapshotTemplate = mutation({
  args: { appId: v.id("apps"), config: v.object(), seedData: v.optional(v.array(v.object())) },
  handler: async (ctx, args) => {
    const app = await ctx.db.get(args.appId);
    return await ctx.db.insert("snapshots", {
      appId: args.appId,
      creatorOrgId: app.creatorOrgId,
      config: args.config,
      seedData: args.seedData,
      version: "1.0.0",
      declaredTables: ["invoices", "clients"],
    });
  },
});

// Seed your template
export const seedInvoiceSnapshot = internalMutation(async (ctx) => {
  const appId = /* query apps for invoice */;
  await createSnapshotTemplate(ctx, {
    appId,
    config: { currency: "USD", taxRate: 0.08, ... },
    seedData: [ /* sample client/invoice */ ],
  });
});
```

#### Step 3: Unified Install/Load
**File**: `convex/appInstallations.ts` (extend existing)
```typescript
export const installAppAndLoadSnapshot = mutation({
  args: { appId: v.id("apps") },
  handler: async (ctx, { appId }) => {
    const { org } = await getOrgContext(ctx); // Auth helper
    const app = await ctx.db.get(appId);
    
    // Check plan/payment
    if (!app.pricing.free && !hasPayment(ctx, appId)) throw new Error("Pay up");
    
    // Create install
    const installId = await ctx.db.insert("appInstallations", {
      orgId: org._id,
      appId,
      status: "active",
      permissions: { reads: true, writes: true }, // Full for private
    });
    
    // Load snapshot
    const template = await ctx.db.query("snapshots")
      .withIndex("by_app", q => q.eq("appId", appId)).first();
    const loadId = await loadSnapshot(ctx, { installationId: installId, templateId: template._id });
    
    return { installId, loadId };
  },
});
```

#### Step 4: App Logic (Scoped)
**File**: `convex/app_invoice.ts`
```typescript
export const getInvoices = query({
  args: { loadId: v.optional(v.id("snapshotLoads")) }, // Pass from frontend
  handler: async (ctx, { loadId }) => {
    const load = loadId ? await ctx.db.get(loadId) : null;
    const orgId = load?.orgId || /* fallback */;
    
    let q = ctx.db.query("app_invoice_invoices").withIndex("by_org", q => q.eq("orgId", orgId));
    if (load) q = q.withIndex("by_load", q => q.eq("snapshotLoadId", load._id));
    
    return await q.collect();
  },
});

export const createInvoice = mutation({
  // ... args
  handler: async (ctx, args) => {
    const { org, load } = await getLoadContext(ctx); // Ensures active load
    
    return await ctx.db.insert("app_invoice_invoices", {
      snapshotLoadId: load._id,
      orgId: org._id,
      // ... args
    });
  },
});
```

#### Step 5: Seed Everything
```bash
npx convex run init:seedApps
npx convex run init:seedInvoiceSnapshot
```

#### Step 6: Frontend Install/Launch
```typescript
// Install
const { loadId } = await installAppAndLoadSnapshot({ appId });

// Launch window with loadId for scoping
<Window title="Invoicing" loadId={loadId}>
  <Invoices loadId={loadId} />
</Window>
```

#### Step 7: Theme Support (REQUIRED)
All app windows **must** use CSS variables for theming. See [Theme System Guide](./THEME_SYSTEM.md).

```tsx
// ✅ CORRECT - Uses theme variables
export function InvoicesWindow({ loadId }: { loadId: Id<"snapshotLoads"> }) {
  return (
    <div className="flex flex-col h-full p-4" style={{ background: 'var(--win95-bg)' }}>
      <h1 style={{ color: 'var(--win95-text)' }}>Invoices</h1>
      {/* ... */}
    </div>
  );
}

// ❌ WRONG - Hardcoded colors break dark mode
export function InvoicesWindow({ loadId }: { loadId: Id<"snapshotLoads"> }) {
  return (
    <div className="bg-gray-100 text-gray-800"> {/* DON'T DO THIS */}
      <h1>Invoices</h1>
    </div>
  );
}
```

---

## Best Practices

### ✅ DO
1. **Use snapshots for all apps** - Templates keep things DRY.
2. **Scope via helpers** - Always filter by `loadId`/`orgId`.
3. **Lazy seed** - Insert only on first load/use.
4. **Declare tables** - List in template for validation.
5. **Audit loads** - Log install/load events.
6. **User-Focused Seeds** - Provide samples, not creator data.
7. **Use CSS variables for theming** - See [Theme System Guide](./THEME_SYSTEM.md) (REQUIRED).

### ❌ DON'T
1. **Don't clone tables** - Scope rows, not schemas.
2. **Don't skip loads** - Always create on install.
3. **Don't hardcode scoping** - Use `getScopedData` helpers.
4. **Don't preload creator content** - Keep apps for user workflows.
5. **Don't use hardcoded colors** - Breaks dark mode and themes (see [Theme System Guide](./THEME_SYSTEM.md)).

---

## Migration Path for Existing Apps

From Phase 3 (e.g., generic content module):

1. **Add Snapshot Tables**: Insert schema for `snapshots`/`snapshotLoads`.
2. **Create Template**: Run mutation to snapshot existing structures as seeds (no real data).
3. **Update Installs**: Extend `installApp` to call `loadSnapshot`.
4. **Refactor Queries**: Wrap with `getScopedData`; add `loadId` filters.
5. **Migrate Data**: One-off mutation to add `orgId`/`loadId` to old rows.
6. **Test**: Install fresh org → Verify scoping.

---

## Reference

### Standard Naming
- **Registry**: `apps`
- **Template**: `snapshots`
- **Load**: `snapshotLoads`
- **Data**: `app_{code}_{entity}` (e.g., `app_invoice_invoices`)

### Required Fields
**Snapshots**:
- `appId`, `config: object`, `declaredTables: string[]`

**SnapshotLoads**:
- `installationId`, `orgId`, `loadedConfig: object`

**Data Tables**:
- `orgId` (always), `snapshotLoadId` (optional for private)

### Required Indexes
- Snapshots: `by_app`
- Loads: `by_org_and_install`
- Data: `by_org`, `by_load`

---

## Next Steps
1. **Implement**: Add schema/mutations for snapshots/loads.
2. **Migrate**: Convert existing modules to snapshots. (lets remove the "specific podcast app and replace it with a reusable podcast app)
3. **UI**: Wire store window to `installAppAndLoadSnapshot`.
4. **Extend**: Add org app submission (approval → snapshot).

