# App Store Architecture

## 🏗️ System Overview

```
┌─────────────────────────────────────────────────────────────┐
│                     VC83 APP PLATFORM                        │
│                   (Multi-tenant SaaS)                        │
└─────────────────────────────────────────────────────────────┘
                              │
        ┌─────────────────────┼─────────────────────┐
        │                     │                     │
        ▼                     ▼                     ▼
┌──────────────┐    ┌──────────────┐      ┌──────────────┐
│ CORE TABLES  │    │  APP STORE   │      │  APP TABLES  │
│              │    │              │      │              │
│ • users      │    │ • apps       │      │ • vc83pod    │
│ • orgs       │    │ • installs   │      │ • analytics  │
│ • members    │    │ • purchases  │      │ • calendar   │
└──────────────┘    └──────────────┘      └──────────────┘
```

## 📊 The App Store Model

### Registry Table (`apps`)

Acts as the **App Store catalog** - metadata about available apps:

```typescript
apps: {
  code: "vc83pod",          // Links to table name
  name: "VC83 Podcast",     // Display name
  creatorOrgId: Id,         // Who built this app
  appType: "shared-content" // Data ownership model
  price: 0,                 // Free or paid
  // ... more metadata
}
```

### Installation Table (`appInstallations`)

Tracks **which orgs have installed which apps**:

```typescript
appInstallations: {
  organizationId: Id,  // Who installed it
  appId: Id,          // Which app
  isActive: true,     // Can use it
  isVisible: true,    // Shows in UI
  config: {}          // App-specific settings
}
```

### Data Tables (e.g., `vc83pod`)

Each app has its **own dedicated table** for data:

```typescript
vc83pod: {
  // ✅ REQUIRED BASE FIELDS:
  creatorOrgId: Id,      // VC83 owns this data
  status: "published",   // Workflow state
  createdBy: Id,
  createdAt: timestamp,
  viewCount: number,
  
  // 📻 PODCAST-SPECIFIC:
  title: string,
  audioUrl: string,
  episodeNumber: number,
  // ... more podcast fields
}
```

## 🔀 Three App Types

### 1. Shared Content (`shared-content`)

**Pattern:** One creator, many viewers

```
VC83 Org                     Other Orgs
   │                             │
   ├─ Creates episodes          ├─ Installs vc83pod app
   ├─ Publishes episodes        ├─ Views episodes (read-only)
   └─ Updates episodes          └─ Cannot edit VC83's episodes
   
Data Location: vc83pod table
Data Owner: VC83 (creatorOrgId = VC83)
Permission: Creator writes, installers read
```

**Examples:**
- Podcasts
- Blogs
- Documentation
- News feeds

### 2. Private Tool (`private-tool`)

**Pattern:** Each org has isolated data

```
Org A                        Org B                        Org C
  │                            │                            │
  ├─ Installs analytics       ├─ Installs analytics       ├─ Installs analytics
  ├─ Has own dashboard        ├─ Has own dashboard        ├─ Has own dashboard
  └─ Sees only their data     └─ Sees only their data     └─ Sees only their data

Data Location: analytics table
Data Owner: Each installer (separate rows per org)
Permission: Each org CRUD their own data only
```

**Examples:**
- Analytics dashboards
- CRM systems
- Project management
- Task tracking

### 3. Interactive (`interactive`)

**Pattern:** Stateless functionality

```
All Orgs
  │
  ├─ Installs contact form
  └─ Uses client-side logic or stateless API calls

Data Location: None (or external service)
Data Owner: N/A
Permission: Public usage
```

**Examples:**
- Contact forms (sends email, doesn't store)
- Calculators
- Search widgets
- Client-side utilities

## 🔐 Permission Model

### Shared Content App Flow

```
User opens vc83pod app
    │
    ├─ Check: Is app installed for user's org?
    │     └─ Query: appInstallations WHERE orgId AND appId
    │
    ├─ Check: Is user the creator (VC83)?
    │     └─ If YES: Can create/edit/delete episodes
    │     └─ If NO: Can only view published episodes
    │
    └─ Query: vc83pod table
          └─ If creator: All statuses
          └─ If viewer: status = "published" only
```

### Private Tool App Flow

```
User opens analytics app
    │
    ├─ Check: Is app installed for user's org?
    │     └─ Query: appInstallations WHERE orgId AND appId
    │
    └─ Query: analytics table WHERE creatorOrgId = user's org
          └─ User only sees their org's data
          └─ Complete isolation between orgs
```

## 📝 Standard App Schema

All app tables MUST include these base fields:

```typescript
{
  // WHO owns this data
  creatorOrgId: Id<"organizations">,
  
  // Publishing workflow
  status: "draft" | "published" | "archived",
  
  // Audit trail
  createdBy: Id<"users">,
  createdAt: number,
  updatedBy: Id<"users">,
  updatedAt: number,
  
  // Analytics
  viewCount: number,
  
  // APP-SPECIFIC fields go here...
}
```

## 🎯 Creating a New App: Complete Workflow

### 1. Define the Data Table

**File:** `convex/schemas/appDataSchemas.ts`

```typescript
export const yourapp = defineTable({
  ...appSchemaBase,  // ✅ Required!
  
  // Your custom fields
  customField: v.string(),
})
  .index("by_creator", ["creatorOrgId"])
  .index("by_status", ["status"]);
```

### 2. Register in App Store

**File:** `convex/apps.ts`

```typescript
DEFAULT_APPS.push({
  code: "yourapp",  // Must match table name!
  name: "Your App",
  creatorOrgId: VC83_ORG_ID,
  appType: "shared-content", // or private-tool, interactive
  // ... more metadata
});
```

### 3. Create Query/Mutation Module

**File:** `convex/yourapp.ts`

```typescript
export const list = query({
  handler: async (ctx) => {
    return ctx.db.query("yourapp").collect();
  },
});
```

### 4. Add to Schema

**File:** `convex/schema.ts`

```typescript
import { yourapp } from "./schemas/appDataSchemas";

export default defineSchema({
  // ...
  yourapp,
});
```

### 5. Build Frontend

**File:** `src/components/window-content/yourapp-window.tsx`

```typescript
export function YourAppWindow() {
  const data = useQuery(api.yourapp.list, {});
  // ... render UI
}
```

## 🚀 Benefits of This Architecture

✅ **Self-contained**: Each app owns its table and logic
✅ **Scalable**: Add new apps without touching existing ones
✅ **Type-safe**: TypeScript knows each app's schema
✅ **Flexible**: Support multiple data models (shared, private, interactive)
✅ **Discoverable**: Apps registry makes it easy to browse
✅ **Installable**: Organizations choose which apps to enable
✅ **Monetizable**: Built-in support for paid apps (Stripe integration)

## 📚 Next Steps

1. ✅ Create VC83 organization in database
2. ✅ Migrate existing apps to this pattern
3. 📝 Document each app's purpose and schema
4. 🎨 Build app store UI for browsing/installing
5. 💳 Integrate Stripe for paid apps
6. 🔍 Add app search and filtering
7. 📊 Build admin dashboard for app management
