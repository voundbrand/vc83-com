# Schema Organization Guide

This directory contains modular schema definitions that are composed into the main `schema.ts` file.

## 📁 File Structure

```
schemas/
├── README.md              # This file
├── appSchemaBase.ts       # Base fields ALL apps must include
├── coreSchemas.ts         # Users, organizations, memberships
├── appStoreSchemas.ts     # Apps registry, installations, purchases
├── appDataSchemas.ts      # Individual app tables (l4yercak3pod, etc.)
└── utilitySchemas.ts      # Audit logs, invitations, etc.
```

## 🎯 Creating a New App

### 1. Choose Your App Model

**Shared Content App** (like l4yercak3pod):
- Content created by ONE organization (the creator)
- Other organizations can VIEW but not edit
- Example: Podcast, blog, documentation

**Private Tool App** (like analytics):
- Each organization has their OWN data
- Data is isolated per installer
- Example: CRM, analytics dashboard, task manager

**Interactive App** (like contact form):
- No persistent backend data
- Client-side only or stateless API calls
- Example: Calculator, contact form, search widget

### 2. Add Your Table to `appDataSchemas.ts`

```typescript
export const yourappname = defineTable({
  // ✅ REQUIRED: Base fields (DON'T SKIP THESE!)
  ...appSchemaBase,
  
  // 🎯 YOUR APP: Custom fields
  customField1: v.string(),
  customField2: v.number(),
  customField3: v.optional(v.string()),
})
  .index("by_creator", ["creatorOrgId"])
  .index("by_status", ["status"])
  // Add more indexes as needed
  .index("by_custom_field", ["customField1"]);
```

### 3. Register in `apps.ts`

Add your app to the DEFAULT_APPS array:

```typescript
{
  code: "yourappname",  // MUST match table name!
  name: "Your App Name",
  description: "What your app does",
  icon: "🎯",
  category: "content", // or analytics, marketing, etc.
  plans: ["personal", "business", "enterprise"],
  creatorOrgId: l4yercak3_ORG_ID, // Your creator org
  appType: "shared-content", // or private-tool, interactive
  dataScope: "creator-owned", // or installer-owned, none
  // ... pricing fields
}
```

### 4. Create Query/Mutation Module

Create `convex/yourappname.ts`:

```typescript
import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

export const create = mutation({
  args: { /* your fields */ },
  handler: async (ctx, args) => {
    // Implement create logic
  },
});

export const list = query({
  handler: async (ctx) => {
    return await ctx.db
      .query("yourappname")
      .withIndex("by_creator")
      .collect();
  },
});
```

## 🔐 Required Base Fields

ALL app tables MUST include these fields from `appSchemaBase`:

| Field | Type | Purpose |
|-------|------|---------|
| `creatorOrgId` | `Id<"organizations">` | Who created this content |
| `status` | `"draft" \| "published" \| "archived"` | Publishing state |
| `createdBy` | `Id<"users">` | User who created this |
| `createdAt` | `number` | Timestamp of creation |
| `updatedBy` | `Id<"users">` | User who last updated |
| `updatedAt` | `number` | Timestamp of last update |
| `viewCount` | `number` | Analytics counter |

## 🎨 Naming Conventions

### Table Names
- Use lowercase, no spaces: `l4yercak3pod`, `analytics`, `calendar`
- Match the app `code` field exactly
- Keep it short but descriptive

### App Codes
- Use the same value as the table name
- This creates a 1:1 mapping: `code: "l4yercak3pod"` → `l4yercak3pod` table

### Module Names
- Create `convex/yourappname.ts` to match your table
- Export queries and mutations for your app

## 📊 App Types Explained

### Shared Content (`shared-content`)
```
Creator Org (l4yercak3)     → Creates podcast episodes
↓
Installer Orgs (A, B)  → Can VIEW episodes, cannot edit
```

**Use for:** Podcasts, blogs, documentation, news feeds

### Private Tool (`private-tool`)
```
Org A → Has their own analytics data
Org B → Has their own analytics data
Org C → Has their own analytics data
```

**Use for:** CRM, project management, analytics dashboards

### Interactive (`interactive`)
```
All Orgs → Use the same stateless functionality
No persistent data stored
```

**Use for:** Calculators, contact forms, search widgets

## 🚀 Migration Checklist

When creating a new app:

- [ ] Add table definition to `appDataSchemas.ts`
- [ ] Include `...appSchemaBase` fields
- [ ] Add proper indexes (at minimum: by_creator, by_status)
- [ ] Export table in main `schema.ts`
- [ ] Register app in `apps.ts` DEFAULT_APPS
- [ ] Create query/mutation module `convex/yourappname.ts`
- [ ] Update seed data in `init.ts` if needed
- [ ] Create frontend components
- [ ] Test guest access vs authenticated access
- [ ] Document in your app's README

## 🔍 Finding App Data

**In queries:**
```typescript
// Get all records for an app
const records = await ctx.db
  .query("l4yercak3pod")
  .withIndex("by_creator", (q) => q.eq("creatorOrgId", creatorId))
  .collect();

// Get published records only
const published = await ctx.db
  .query("l4yercak3pod")
  .withIndex("by_status", (q) => q.eq("status", "published"))
  .collect();
```

## 📝 Documentation Standards

Each app should document:
1. What problem it solves
2. Who can create content (creator-owned vs installer-owned)
3. Who can view content (public, authenticated, or purchasers)
4. Required fields beyond the base schema
5. Any special indexes or search functionality
6. Integration points with other apps

## ❓ Questions?

See the implementation examples:
- `l4yercak3pod` - A complete shared-content app
- Main `schema.ts` - How modules are composed
- `convex/l4yercak3pod.ts` - Query/mutation patterns
