# Quick Start: Adding New Apps to L4YERCAK3

## 🚀 30-Second Overview

L4YERCAK3 uses a **unified app system** where:
1. **Super admin** registers apps in the system
2. **Super admin** enables apps for specific organizations
3. **Organization users** see enabled apps in their Start Menu
4. **Apps** use ontology pattern for flexible data storage

---

## 🎯 Current Apps

### ✅ Implemented
1. **Payments App** (`code: "payments"`)
   - Stripe Connect integration
   - Transaction management
   - Invoice tracking

### 🚧 In Progress
2. **Web Publishing App** (`code: "web-publishing"`)
   - Publish content to public URLs
   - SEO management
   - Analytics tracking

### 📋 Planned
3. **Events App** - Event management and ticketing
4. **CRM App** - Contact and lead management
5. **Analytics App** - Business intelligence dashboards

---

## 📖 How to Add a New App

### Step 1: Design the Ontology Objects (30 min)

**Create a markdown doc:** `docs/YOUR_APP_PLAN.md`

**Define your object types:**

```typescript
// Example: CRM App

// contact object type
{
  type: "contact",
  subtype: "lead" | "customer" | "partner",
  name: "John Doe",
  status: "active" | "inactive",
  customProperties: {
    email: "john@example.com",
    phone: "+1234567890",
    company: "Acme Corp",
    // ... other fields
  }
}

// deal object type
{
  type: "deal",
  subtype: "inbound" | "outbound",
  name: "Q4 Enterprise Deal",
  status: "prospecting" | "negotiation" | "closed-won" | "closed-lost",
  customProperties: {
    value: 50000,
    closeDate: 1234567890,
    contactId: "contact_id",
    // ... other fields
  }
}

// Link contact → deal
{
  fromObjectId: "contact_id",
  toObjectId: "deal_id",
  linkType: "associated_with",
  properties: { role: "decision_maker" }
}
```

**Refer to examples:**
- [WEB_PUBLISHING_APP_PLAN.md](./WEB_PUBLISHING_APP_PLAN.md)
- [CHECKOUT_SYSTEM_ARCHITECTURE.md](./.kiro/checkout_system/CHECKOUT_SYSTEM_ARCHITECTURE.md)

---

### Step 2: Create Backend Files (2-3 hours)

**Create: `convex/yourAppOntology.ts`**

```typescript
import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import { requireAuthenticatedUser } from "./rbacHelpers";

/**
 * CREATE CONTACT
 * Creates a new contact in the CRM
 */
export const createContact = mutation({
  args: {
    sessionId: v.string(),
    organizationId: v.id("organizations"),
    name: v.string(),
    email: v.string(),
    phone: v.optional(v.string()),
    company: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { userId } = await requireAuthenticatedUser(ctx, args.sessionId);

    return await ctx.db.insert("objects", {
      organizationId: args.organizationId,
      type: "contact",
      subtype: "lead",
      name: args.name,
      status: "active",
      customProperties: {
        email: args.email,
        phone: args.phone,
        company: args.company,
      },
      createdBy: userId,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });
  },
});

/**
 * GET CONTACTS
 * Retrieves all contacts for an organization
 */
export const getContacts = query({
  args: {
    organizationId: v.id("organizations"),
    status: v.optional(v.string()),
  },
  handler: async (ctx, { organizationId, status }) => {
    const query = ctx.db
      .query("objects")
      .withIndex("by_org_type", q =>
        q.eq("organizationId", organizationId)
         .eq("type", "contact")
      );

    let contacts = await query.collect();

    if (status) {
      contacts = contacts.filter(c => c.status === status);
    }

    return contacts;
  },
});

// ... more queries/mutations
```

**Key Patterns:**
- ✅ Always use `requireAuthenticatedUser` for auth
- ✅ Store data in `objects` table
- ✅ Use `organizationId` for multi-tenancy
- ✅ Use `objectLinks` for relationships
- ✅ Follow existing file structure (see `publishingOntology.ts`, `checkoutOntology.ts`)

---

### Step 3: Register the App (15 min)

**Create: `convex/seedYourApp.ts`**

```typescript
import { mutation } from "./_generated/server";
import { v } from "convex/values";
import { requireAuthenticatedUser } from "./rbacHelpers";

/**
 * SEED YOUR APP
 * Run once to register app in the system
 */
export const seedYourApp = mutation({
  args: { sessionId: v.string() },
  handler: async (ctx, { sessionId }) => {
    const { userId, isSuperAdmin } = await requireAuthenticatedUser(ctx, sessionId);
    if (!isSuperAdmin) throw new Error("Super admin only");

    const systemOrg = await ctx.db
      .query("organizations")
      .filter(q => q.eq(q.field("slug"), "system"))
      .first();

    if (!systemOrg) throw new Error("System organization not found");

    // Register app
    const appId = await ctx.db.insert("apps", {
      code: "crm",                           // Unique identifier
      name: "CRM",                            // Display name
      description: "Contact and deal management",
      appType: "interactive",
      price: 0,                               // Free or paid
      isGlobal: true,                         // Show in app store
      creatorOrgId: systemOrg._id,
      isActive: true,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });

    console.log("CRM app registered:", appId);
    return appId;
  },
});
```

**Run the seed:**

```bash
# In Convex dashboard
npx convex run seedYourApp:seedYourApp \
  --sessionId "your_session_id"
```

---

### Step 4: Create UI Components (3-4 hours)

**Create: `src/components/window-content/your-app-window/index.tsx`**

```typescript
"use client";

import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { useAuth, useCurrentOrganization } from "@/hooks/use-auth";
import { Users, Plus, Search } from "lucide-react";

export function CrmWindow() {
  const [activeTab, setActiveTab] = useState<"contacts" | "deals">("contacts");
  const { sessionId } = useAuth();
  const currentOrg = useCurrentOrganization();

  // Get contacts for current org
  const contacts = useQuery(
    api.crmOntology.getContacts,
    currentOrg?.id && sessionId
      ? { organizationId: currentOrg.id }
      : "skip"
  );

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="px-4 py-3 border-b-2">
        <h2 className="text-sm font-bold flex items-center gap-2">
          <Users size={16} />
          CRM
        </h2>
        <p className="text-xs mt-1">Manage contacts and deals</p>
      </div>

      {/* Tabs */}
      <div className="flex border-b-2">
        <TabButton
          label="Contacts"
          active={activeTab === "contacts"}
          onClick={() => setActiveTab("contacts")}
        />
        <TabButton
          label="Deals"
          active={activeTab === "deals"}
          onClick={() => setActiveTab("deals")}
        />
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4">
        {activeTab === "contacts" && <ContactsList contacts={contacts} />}
        {activeTab === "deals" && <DealsList />}
      </div>
    </div>
  );
}
```

**Follow UI patterns from:**
- [payments-window/index.tsx](../src/components/window-content/payments-window/index.tsx)
- [publishing-window/index.tsx](../src/components/window-content/publishing-window/index.tsx)

---

### Step 5: Register Window (5 min)

**Update: `src/window-registry.tsx`**

```typescript
import { CrmWindow } from "@/components/window-content/crm-window";

export const WINDOW_REGISTRY = {
  // ... existing windows ...

  // Your new app
  "crm": {
    component: CrmWindow,
    title: "CRM",
    icon: "Users",
    appCode: "crm",                    // Links to apps.code
    requiresAppAvailability: true,     // Requires super admin approval
  },
} as const;
```

---

### Step 6: Add to Start Menu (5 min)

**Update: `src/components/start-menu.tsx`**

```typescript
// Apps section
const appMenuItems = [
  // ... existing apps ...

  {
    id: "crm",
    label: "CRM",
    icon: <Users size={16} />,
    visible: isAppAvailable("crm"),
    onClick: () => openWindow("crm"),
  },
].filter(item => item.visible);
```

---

### Step 7: Enable for Organizations (2 min)

**As super admin:**

```
1. Open "Manage" window
2. Go to "App Availability" tab
3. Find your target organization
4. Toggle ON the "CRM" column
5. ✅ Done! Users can now see the app
```

---

## 🧪 Testing Checklist

### Backend Testing
```bash
# 1. Seed app
npx convex run seedYourApp:seedYourApp --sessionId "..."

# 2. Verify app exists
# In Convex dashboard: Check apps table

# 3. Enable for test org
# In Admin UI: Toggle app availability

# 4. Test queries
# In Convex dashboard: Run getContacts manually
```

### Frontend Testing
```
1. Login as organization user
2. Check Start Menu → should see CRM icon
3. Click CRM icon → window opens
4. Create a contact → verify in Convex dashboard
5. List contacts → verify data appears in UI
```

### Multi-Org Testing
```
1. Enable app for Org A
2. Disable app for Org B
3. Login as user from Org A → see app ✅
4. Login as user from Org B → don't see app ✅
5. Verify data isolation (Org A can't see Org B's contacts)
```

---

## 📋 Complete Implementation Checklist

### Planning Phase (1-2 hours)
- [ ] Define ontology object types
- [ ] Design data model (objects + links)
- [ ] Write `docs/YOUR_APP_PLAN.md`
- [ ] Review with team

### Backend Phase (3-4 hours)
- [ ] Create `convex/yourAppOntology.ts`
- [ ] Implement create/read/update/delete mutations
- [ ] Implement queries for listing/filtering
- [ ] Create `convex/seedYourApp.ts`
- [ ] Run seed to register app
- [ ] Test queries in Convex dashboard

### Frontend Phase (4-5 hours)
- [ ] Create `src/components/window-content/your-app-window/`
- [ ] Build main window component
- [ ] Build list views
- [ ] Build detail views
- [ ] Build forms (create/edit)
- [ ] Register in `window-registry.tsx`
- [ ] Add to Start Menu

### Integration Phase (1-2 hours)
- [ ] Enable app for test organization
- [ ] Test end-to-end workflow
- [ ] Test multi-org isolation
- [ ] Test RBAC permissions
- [ ] Fix any bugs

### Polish Phase (1-2 hours)
- [ ] Add loading states
- [ ] Add error handling
- [ ] Add empty states
- [ ] Add confirmation modals
- [ ] Update documentation

**Total Time: 10-15 hours** for a complete app

---

## 🎨 Design Guidelines

### Follow Existing Patterns

**Window Layout:**
```
┌─────────────────────────────────────┐
│ Header (title, description)         │ ← Always include
├─────────────────────────────────────┤
│ Tabs (if multiple sections)         │ ← Optional
├─────────────────────────────────────┤
│ Content (scrollable)                 │ ← Main area
│                                      │
│                                      │
├─────────────────────────────────────┤
│ Footer (metadata, actions)           │ ← Optional
└─────────────────────────────────────┘
```

**Color Scheme:**
- Use CSS variables: `var(--win95-bg)`, `var(--primary)`, etc.
- Match retro Windows 95 aesthetic
- Consistent button styles

**Data Tables:**
- Use existing table components
- Include sort/filter options
- Add pagination for large datasets

**Forms:**
- Validate inputs
- Show clear error messages
- Disable submit button while saving
- Show success confirmation

---

## 🔗 Useful Resources

### Architecture Docs
- [ARCHITECTURE.md](./ARCHITECTURE.md) - Multi-tenant architecture
- [README_ONTOLOGY.md](./README_ONTOLOGY.md) - Ontology system guide
- [APP_AVAILABILITY_SYSTEM.md](./APP_AVAILABILITY_SYSTEM.md) - App management

### Example Apps
- **Payments:** `convex/checkoutOntology.ts` + `src/components/window-content/payments-window/`
- **Web Publishing:** `convex/publishingOntology.ts` + `src/components/window-content/publishing-window/`

### Code Patterns
- **Auth:** `convex/rbacHelpers.ts`
- **Ontology:** `convex/ontologyHelpers.ts`
- **Translations:** `convex/translationResolver.ts`

---

## 🎉 Congratulations!

You now have everything you need to build apps on L4YERCAK3!

**Next Steps:**
1. Pick an app to build (CRM, Analytics, Events, etc.)
2. Follow this guide step-by-step
3. Test thoroughly
4. Deploy to production
5. Enable for your organizations

**Need Help?**
- Check existing app implementations
- Review architecture docs
- Ask in team chat
- Create a GitHub issue

---

**Document Version:** 1.0
**Created:** 2025-10-10
**Status:** ✅ Ready to Use
