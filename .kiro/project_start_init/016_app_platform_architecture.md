# Task 016: App Platform Architecture - Refined Vision

## Executive Summary

vc83.com is a **retro desktop OS experience** built as a single Next.js application where users can browse, purchase, and launch modular apps within a Windows-inspired interface. Apps are **centrally created and published by VC83** (initially), not duplicated per organization. The platform combines:

- **Retro Desktop UI**: Windows 95-style interface with draggable windows, taskbar, desktop icons
- **App Marketplace**: Stripe-powered store where orgs purchase/install apps
- **Modular Apps**: Self-contained React components that render in windows
- **Centralized Control**: All apps published by VC83, no third-party publishing (initially)

This document supersedes the multi-tenant assumptions from Phase 3 and clarifies the true architecture.

---

## Vision Statement

**What We're Building:**

A single-page application (SPA) that feels like a retro operating system. The platform supports **guest mode** (no account required) and **authenticated mode** (with account):

**Guest Mode (No Account Required)**:
1. **Explore the Desktop**: Land directly on retro Windows interface
2. **Launch Free Apps**: Access Episodes (podcast), About, and Contact apps
3. **Browse App Store**: See all available apps and pricing
4. **Try Before Signup**: Experience the platform to drive conversion

**Authenticated Mode (With Account)**:
1. **Everything guests can do** PLUS:
2. **Purchase Paid Apps**: Use Stripe to buy apps (one-time or subscription)
3. **Install Purchased Apps**: Paid apps appear as desktop icons
4. **Launch All Apps**: Access both free and purchased apps in windows
5. **Manage Account**: Payment settings, org switching, app management

**Not What We're Building** (initially):
- Multi-tenant where each org creates their own podcast
- Third-party app publishing marketplace
- Separate microservices or external app hosting
- Full-page navigation (everything stays in the desktop shell)

---

## Core Architectural Principles

### 1. App Ownership Model

**Central Truth**: Apps are **created and owned by VC83**. Organizations **install** apps to gain access, but don't own the app code or (usually) its data.

#### App Types:

**A. Shared-Content Apps** (Creator-Owned Data)
- **Example**: VC83 Podcast App (Episodes), About, Contact
- **Data Ownership**: Episodes belong to VC83 (the creator)
- **Installer Access**: Read-only view of creator's content
- **Guest Access**: ✅ FREE apps are publicly accessible (no auth required)
- **Use Case**: Publishing content (podcasts, blogs, news feeds) where many orgs consume the same material
- **Schema Pattern**: Content scoped by `appId` or `creatorOrgId`, not `installerOrgId`
- **Pricing**: Can be free or paid

**B. Private-Tool Apps** (Installer-Owned Data)
- **Example**: Analytics Dashboard, Subscriber Manager, Email (AI), Scheduling
- **Data Ownership**: Each org has their own isolated data
- **Installer Access**: Full CRUD on their own data, no visibility into other orgs
- **Guest Access**: ❌ Requires authentication + purchase/installation
- **Use Case**: Tools for managing org-specific workflows
- **Schema Pattern**: Content scoped by both `appId` AND `installerOrgId`
- **Pricing**: Usually paid (one-time or subscription)

**C. Interactive Apps** (Hybrid or Stateless)
- **Example**: Calculator, Games, Utilities
- **Data Ownership**: Minimal or no persistent data
- **Installer Access**: Everyone uses the same app logic
- **Guest Access**: Depends on pricing (free = yes, paid = no)
- **Use Case**: Utilities that don't require backend storage
- **Schema Pattern**: Client-side only, or minimal state in Convex
- **Pricing**: Can be free or paid

#### Permission Model:

```typescript
// For Shared-Content Apps (Free):
- Creator Org (VC83): Can create, edit, delete content (episodes)
- Guests (No Auth): Can view published content (read-only)
- Installer Orgs: Can view content, track usage (plays, views)
- Security: Mutations check if user is from creatorOrgId, queries allow public

// For Shared-Content Apps (Paid):
- Creator Org (VC83): Can create, edit, delete content
- Guests: Can see in App Store, but cannot access
- Installer Orgs: Must purchase, then can view content
- Security: Check installation exists AND isActive

// For Private-Tool Apps (Always Paid):
- Guests: Cannot access at all
- Installer Org: Must purchase, then full CRUD on their own data
- Other Orgs: No access to each other's data
- Security: Check auth + installation + filter by installerOrgId

// For Interactive Apps:
- Depends on pricing (free = guest access, paid = auth required)
- All users: Same functionality
- Security: Free apps = minimal, Paid apps = check installation
```

### 2. Guest vs Authenticated Flow

**Guest Experience (Desktop-First, No Auth)**:
```
1. Visit vc83.com → Land on desktop (guest mode)
2. See desktop icons: Episodes, About, Contact, App Store
3. Click Episodes → Window opens, shows podcast episodes
4. Play episodes, explore interface
5. Click App Store → Browse all apps, see prices
6. Click "Buy" on paid app → "Sign up to purchase" prompt
7. Can explore freely, no friction, drives conversion
```

**Authenticated Experience (After Signup)**:
```
1. Click START → "Create Account"
2. Registration window opens (retro dialog)
3. Fill form (Personal or Business)
4. Desktop refreshes with user's installed apps
5. Free apps already installed (Episodes, About, Contact)
6. Can purchase paid apps via Stripe
7. Purchased apps appear as new desktop icons
8. Can switch between orgs (if member of multiple)
```

**The Paywall**:
- Free apps: Always accessible (even to guests)
- Paid apps: Require account + purchase
- App Store: Browsable by guests, purchase requires auth
- Trial periods: Available for some paid apps (handled by Stripe)

### 3. App Lifecycle

**Phase 1: Creation (Internal Only)**
- **Who**: You (VC83 developers)
- **How**: Code new app component in `/components/apps/`, define schema in Convex, add to registry via mutation
- **Output**: App exists in registry with metadata (name, description, price, category, `appType`)

**Phase 2: Publishing**
- **Who**: VC83 admin (you)
- **How**: Set `isActive: true` in registry, optionally set visibility rules (e.g., beta only for certain orgs)
- **Output**: App appears in store UI for eligible orgs

**Phase 3: Discovery**
- **Who**: Guests or authenticated users browsing the store
- **How**: Store window lists apps from Convex query (filtered by plan, already-installed status)
- **Output**: 
  - Guests see: Free apps (with "Launch" button), Paid apps (with "Sign up to buy" button)
  - Authenticated users see: Free apps (with "Launch"), Paid apps (with "Buy" or "Purchased" status)

**Phase 4: Purchase (if paid)**
- **Who**: Org admin initiating checkout
- **How**: 
  - Guest clicks "Buy" → Registration prompt → Creates account
  - Authenticated user clicks "Buy" → Stripe checkout session → Payment → Webhook confirms → Convex mutation records purchase
- **Output**: Purchase record created, unlocks installation

**Phase 5: Installation**
- **Who**: Org (automatically after purchase for paid apps, instantly for free apps upon account creation)
- **How**: Convex mutation creates `appInstallation` record linking org to app
- **Output**: App icon appears in org's desktop/start menu
- **Note**: Free apps auto-install when org is created (Phase 1 implementation)

**Phase 6: Launch**
- **Who**: User clicking app icon
- **How**: React component renders in a new window instance (via window manager)
- **Output**: Draggable window with app UI, fetching data from Convex

**Phase 7: Uninstall**
- **Who**: Org admin
- **How**: Click "Uninstall" in settings → Soft-delete installation record
- **Output**: App icon removed, window closes if open, data retained (for re-install)

### 4. Data Scoping Strategy

**Key Decision Point**: When querying/mutating, which ID do we filter by?

| App Type | Data Scope | Filter By | Example |
|----------|-----------|-----------|---------|
| Shared-Content | Creator-owned | `appId` or `creatorOrgId` | Podcast episodes |
| Private-Tool | Installer-owned | `appId` + `installerOrgId` | Analytics data |
| Interactive | No data or client-side | N/A or session-only | Calculator |

**Schema Additions Needed**:
```typescript
// In apps registry:
apps: {
  creatorOrgId: Id<"organizations">, // VC83's org ID
  appType: "shared-content" | "private-tool" | "interactive",
  dataScope: "creator-owned" | "installer-owned" | "none",
  // ... existing fields
}

// In content tables (example for podcast):
episodes: {
  appId: Id<"apps">,
  creatorOrgId: Id<"organizations">, // Who created this content
  // NO installerOrgId for shared-content apps
  // ... episode data
}

// In content tables (example for analytics):
analyticsData: {
  appId: Id<"apps">,
  installerOrgId: Id<"organizations">, // Who owns this data
  // ... analytics data
}
```

**Security Rules**:
- **Shared-Content Mutations**: Only allow if `userId` belongs to `creatorOrgId`
- **Shared-Content Queries**: Allow any installer to read
- **Private-Tool Mutations/Queries**: Only allow if `userId` belongs to `installerOrgId`

### 5. Windows UI Integration

**Desktop Shell**:
- **Component**: `app/page.tsx` (or dedicated layout)
- **Features**:
  - Background (retro wallpaper)
  - Desktop icons for installed apps (grid layout)
  - Taskbar with Start menu, clock, org switcher
  - Window container for launching apps

**Window Manager**:
- **Library Options**: `react-rnd`, `react-grid-layout`, or custom hooks
- **Features**:
  - Draggable (by title bar)
  - Resizable (corner handles)
  - Z-index management (click to bring to front)
  - Minimize (to taskbar), Maximize, Close
  - State persistence (Convex stores window positions per user?)

**App Rendering**:
```typescript
// Pseudocode for window system
const [openWindows, setOpenWindows] = useState<WindowInstance[]>([]);

function launchApp(appId: string) {
  const app = installedApps.find(a => a._id === appId);
  const component = APP_COMPONENTS[app.code]; // Map of app codes to React components
  
  setOpenWindows([...openWindows, {
    id: generateId(),
    appId,
    component,
    position: { x: 100, y: 100 },
    size: { width: 800, height: 600 },
    zIndex: getNextZIndex(),
  }]);
}

// In render:
{openWindows.map(win => (
  <DraggableWindow key={win.id} {...win}>
    <win.component appId={win.appId} />
  </DraggableWindow>
))}
```

**App Components**:
- **Location**: `/components/apps/PodcastApp.tsx`, `/components/apps/AnalyticsApp.tsx`, etc.
- **Props**: Each receives `appId` to fetch relevant data
- **Data Fetching**: Use Convex `useQuery` hooks within the component
- **Self-Contained**: Apps manage their own state, routing (if needed), and UI

### 6. Stripe Integration

**Purchase Flow**:

1. **Client-Side**:
   - User clicks "Buy App" in store UI
   - Next.js client calls Convex mutation `createCheckoutSession({ appId })`
   - Mutation returns Stripe session ID
   - Client redirects to Stripe Checkout (or embeds via Stripe Elements)

2. **Stripe Checkout**:
   - User enters payment info (Stripe handles security)
   - On success, Stripe redirects to `success_url` (e.g., `/store?session_id=xxx`)
   - On cancel, redirects to `cancel_url`

3. **Webhook (Server-Side)**:
   - Stripe sends `checkout.session.completed` event to `/api/webhooks/stripe` (Next.js API route or Convex HTTP action)
   - Webhook handler verifies signature, extracts `session_id` and `metadata.appId`
   - Calls Convex mutation `confirmPurchase({ sessionId, appId })`

4. **Convex Backend**:
   - `confirmPurchase` creates `purchases` record
   - Calls `installApp` to grant access
   - Returns success

5. **Client Update**:
   - Convex reactivity auto-updates `installedApps` query
   - Desktop UI shows new app icon instantly

**Stripe Setup Requirements**:
- **Stripe Account**: Create account, get API keys (test + production)
- **Products**: Create products in Stripe Dashboard for each paid app (or dynamically via API)
- **Webhooks**: Configure endpoint URL in Stripe Dashboard
- **Convex Schema**: Add `purchases` table (fields: `orgId`, `appId`, `stripeSessionId`, `amount`, `currency`, `status`, `createdAt`)

**Subscription Handling** (if needed):
- For recurring apps (e.g., Analytics at $10/month):
  - Create Stripe subscription via `createSubscription` mutation
  - Listen for `invoice.payment_succeeded` and `customer.subscription.deleted` webhooks
  - On deletion, call `uninstallApp` automatically

**Admin Controls**:
- **Comp Access**: Admin mutation to create installation without purchase (for beta testers, partners)
- **Refunds**: Stripe Dashboard issues refund → webhook triggers `uninstallApp`
- **Pricing Changes**: Update Stripe product prices, reflected in store UI via Convex query

### 7. Scalability and Evolution

**Current Scope (MVP)**:
- All apps created by VC83
- ~10-20 apps initially
- Stripe for purchases
- Single Next.js deployment

**Future Enhancements** (not in scope now, but designed for):
- **Third-Party Publishing**: Allow trusted orgs to submit apps via approval workflow
- **App Marketplace**: Public-facing store (non-logged-in users can browse)
- **App Analytics**: Track installs, active users, revenue per app
- **App Updates**: Version management, auto-update or opt-in
- **Custom Domains**: Orgs can brand their desktop (e.g., `workspace.theircompany.com`)
- **Mobile Support**: Responsive windows (sheet-style on mobile)
- **Offline Mode**: Service workers for PWA functionality

**Technical Debt Considerations**:
- **Performance**: Lazy-load app components (React.lazy), Convex pagination for large datasets
- **Security**: Regular audits, Convex rules review, Stripe webhook signature verification
- **Testing**: Storybook for app components, Playwright for e2e desktop flows, Convex tests for mutations

---

## Key Differences from Phase 3 Implementation

| Aspect | Phase 3 (Multi-Tenant) | Refined Vision (App Platform) |
|--------|------------------------|-------------------------------|
| **Content Ownership** | Each org owns their episodes | VC83 owns episodes, orgs view them |
| **Data Scoping** | Always `organizationId` | Depends on `appType` (creator vs installer) |
| **App Installation** | Creates per-org data on install | Grants access, no data duplication |
| **Podcast Module** | Each org manages their podcast | VC83 manages one podcast, all see it |
| **Use Case** | Shopify-style (each store independent) | App Store-style (apps published once, installed many times) |

---

## Success Criteria

**For This Architecture to Be Correct**:

1. ✅ **Apps are centrally controlled**: Only VC83 can publish/update apps
2. ✅ **Purchases unlock access**: Stripe handles payments, installations grant permissions
3. ✅ **Shared content works**: Your podcast episodes show for all installers without duplication
4. ✅ **Private tools work**: Each org's analytics data is isolated from others
5. ✅ **Windows UI feels native**: Apps open in draggable windows, not full-page routes
6. ✅ **Security is enforced**: Convex rules prevent cross-org data leaks and unauthorized mutations
7. ✅ **Performance is acceptable**: Page loads <2s, window opens <500ms, Stripe checkout <3s
8. ✅ **Retro aesthetic maintained**: 1983 vibe in store, windows, icons, fonts

---

## Implementation Phases (Revised)

### Phase 3.5: Refactor Existing Work (Task 017)
- Adjust schemas for creator vs installer ownership
- Modify podcast module for shared content
- Add `appType` and `dataScope` to apps registry
- Update security helpers

### Phase 4: Desktop Shell & Window Manager (Task 018)
- Build desktop UI with icons, taskbar, start menu
- Integrate window manager (react-rnd or custom)
- Launch apps in windows
- State persistence

### Phase 5: App Store UI & Stripe (Task 019)
- Store window component (browse, search, filter)
- Purchase flow with Stripe checkout
- Webhook handler for confirmations
- Admin dashboard for managing apps

### Phase 6: Core Apps Implementation (Task 020)
- Podcast App (shared-content)
- About/Contact (static content apps)
- Analytics App (private-tool, starter)
- Any additional apps

### Phase 7: Testing & Polish (Task 021)
- E2E tests for purchase → install → launch flow
- Security audit (data isolation, Stripe webhooks)
- Performance optimization
- Mobile responsiveness

### Phase 8: Production Ready (Task 022)
- Stripe production mode
- Deploy to Vercel + Convex production
- Monitoring setup
- Launch checklist

---

## Initial App Catalog (MVP)

### Free Apps (Guest Accessible)
1. **Episodes** - VC83 Podcast player
   - Type: Shared-content
   - Data: Creator-owned (VC83's episodes)
   - Guest Access: ✅ Yes (public episodes)
   - Pricing: Free

2. **About** - Information about VC83
   - Type: Shared-content
   - Data: Creator-owned (static content)
   - Guest Access: ✅ Yes
   - Pricing: Free

3. **Contact** - Contact form
   - Type: Shared-content
   - Data: Creator-owned (submissions go to VC83)
   - Guest Access: ✅ Yes
   - Pricing: Free

### Paid Apps (Require Auth + Purchase)
4. **Email (AI)** - AI-powered email management
   - Type: Private-tool
   - Data: Installer-owned (each org's emails)
   - Guest Access: ❌ No (requires purchase)
   - Pricing: $14.99/month (subscription)
   - Trial: 14 days free

5. **Analytics** - Performance metrics
   - Type: Private-tool
   - Data: Installer-owned
   - Guest Access: ❌ No
   - Pricing: $9.99/month

6. **Subscribers** - Email list management
   - Type: Private-tool
   - Data: Installer-owned
   - Guest Access: ❌ No
   - Pricing: $14.99/month

7. **Scheduling** - Episode planning calendar
   - Type: Private-tool
   - Data: Installer-owned
   - Guest Access: ❌ No
   - Pricing: $7.99/month

## Desktop Configuration & Icon Management

### Signed-Out vs Signed-In States

**Signed-Out Desktop (Guest Mode)**:
- Shows ALL apps (both free and paid) as desktop icons
- Free apps: Fully functional, clickable, no restrictions
- Paid apps: Visible but disabled with "Sign in to unlock" tooltip/overlay
- Purpose: Show guests what's available to drive conversion
- Desktop layout: Default configuration from VC83 (not customizable)
- Apps shown determined by `price` field in app registry (free = price undefined/null)

**Signed-In Desktop (Authenticated Mode)**:
- Shows only installed apps as desktop icons
- Free apps: Auto-installed on org creation, always visible
- Paid apps: Only visible after purchase + installation
- Desktop layout: Per-organization configuration (drag-to-reposition, show/hide icons)
- Apps visible determined by `appInstallations` table + `isVisible` flag

**Why This Matters**:
- Existing user who signs out sees teaser desktop (paid apps locked)
- When they sign back in, sees their personalized desktop (only their apps)
- Clear distinction between "browsing mode" and "working mode"

### Desktop Icon Visibility Rules

```typescript
// Pseudo-logic for desktop icon rendering
function getDesktopIcons(isAuthenticated, currentOrgId) {
  if (!isAuthenticated) {
    // Guest mode: Show ALL apps (free = enabled, paid = disabled)
    const allApps = query("apps").where("isActive", true).all();
    return allApps.map(app => ({
      app,
      isEnabled: app.price === undefined, // Free apps enabled
      tooltip: app.price ? "Sign in to unlock" : null,
    }));
  } else {
    // Authenticated mode: Show ONLY installed apps
    const installations = query("appInstallations")
      .where("organizationId", currentOrgId)
      .where("isVisible", true)
      .all();
    
    return installations.map(install => ({
      app: install.app,
      isEnabled: true, // All installed apps are enabled
      position: install.desktopPosition, // Custom position
    }));
  }
}
```

### Desktop Configuration Schema

Per-organization desktop preferences:

```typescript
// Add to convex/schemas/appStoreSchemas.ts
export const desktopConfigs = defineTable({
  organizationId: v.id("organizations"),
  
  // Icon Layout
  iconLayout: v.array(v.object({
    appId: v.id("apps"),
    position: v.object({ 
      x: v.number(), 
      y: v.number() 
    }),
    isVisible: v.boolean(), // User can hide icons (still in START menu)
  })),
  
  // Visual Settings (future)
  wallpaper: v.optional(v.string()),
  theme: v.union(v.literal("light"), v.literal("dark")),
  
  // Metadata
  lastModified: v.number(),
  modifiedBy: v.id("users"),
})
  .index("by_organization", ["organizationId"]);
```

### Alternative: Simpler Approach (Desktop Position in appInstallations)

```typescript
// Modify existing appInstallations table
export const appInstallations = defineTable({
  organizationId: v.id("organizations"),
  appId: v.id("apps"),
  
  // Status
  isActive: v.boolean(),
  isVisible: v.boolean(), // ✅ Already exists - controls desktop icon visibility
  
  // Desktop Position (NEW)
  desktopPosition: v.optional(v.object({
    x: v.number(),
    y: v.number(),
  })),
  
  // ... rest of existing fields
})
```

**Recommendation**: Use the simpler approach (add `desktopPosition` to `appInstallations`) since it:
- Avoids separate table for just position data
- Keeps desktop config tied to installation lifecycle
- Easier to manage (delete installation = remove icon automatically)

### Right-Click Context Menu for Icons

**Desktop Icon Actions**:
1. **Open** (default on double-click)
2. **Remove from Desktop** (sets `isVisible: false`, icon disappears but stays in START menu)
3. **Pin to Taskbar** (future enhancement)
4. **Properties** (shows app details, version, installed date)

**Implementation**:
```typescript
// components/desktop-icon.tsx
const DesktopIcon = ({ app, installation, onRemove }) => {
  const handleContextMenu = (e) => {
    e.preventDefault();
    showContextMenu([
      { label: "Open", onClick: () => openWindow(app) },
      { divider: true },
      { label: "Remove from Desktop", onClick: () => onRemove(installation._id) },
      { label: "Properties", onClick: () => showAppProperties(app) },
    ]);
  };
  
  return (
    <div onContextMenu={handleContextMenu}>
      {/* Icon UI */}
    </div>
  );
};
```

### Auto-Installation on Org Creation

When organization is created, automatically install free apps:

```typescript
// convex/organizations.ts - in create mutation
export const create = mutation({
  handler: async (ctx, args) => {
    // 1. Create organization
    const orgId = await ctx.db.insert("organizations", { ... });
    
    // 2. Get all free apps (price === undefined/null)
    const freeApps = await ctx.db
      .query("apps")
      .filter(q => q.or(
        q.eq(q.field("price"), undefined),
        q.eq(q.field("price"), null)
      ))
      .collect();
    
    // 3. Auto-install free apps
    let xPos = 20, yPos = 20;
    for (const app of freeApps) {
      await ctx.db.insert("appInstallations", {
        organizationId: orgId,
        appId: app._id,
        isActive: true,
        isVisible: true, // Show on desktop by default
        desktopPosition: { x: xPos, y: yPos }, // Grid layout
        installedAt: Date.now(),
        installedBy: userId,
        usageCount: 0,
        updatedAt: Date.now(),
      });
      
      // Increment position for next icon (vertical layout)
      yPos += 100;
      if (yPos > 600) {
        yPos = 20;
        xPos += 100;
      }
    }
    
    return orgId;
  },
});
```

### Purchased App Behavior

**When org purchases new app**:
1. Stripe webhook confirms payment
2. Convex mutation creates `purchase` record
3. Convex mutation creates `appInstallation` record
4. Desktop icon appears automatically (real-time via Convex subscription)
5. Icon positioned at next available grid slot
6. User can immediately launch app (window manager handles it)

**Implementation**:
```typescript
// convex/purchases.ts
export const confirmPurchase = mutation({
  handler: async (ctx, { orgId, appId, stripeSessionId }) => {
    // 1. Create purchase record
    await ctx.db.insert("purchases", { ... });
    
    // 2. Install app
    const existingInstalls = await ctx.db
      .query("appInstallations")
      .withIndex("by_organization", q => q.eq("organizationId", orgId))
      .collect();
    
    // Find next available position
    const nextPosition = calculateNextIconPosition(existingInstalls);
    
    await ctx.db.insert("appInstallations", {
      organizationId: orgId,
      appId,
      isActive: true,
      isVisible: true,
      desktopPosition: nextPosition,
      installedAt: Date.now(),
      installedBy: ctx.auth.userId, // From purchase
      usageCount: 0,
      updatedAt: Date.now(),
    });
    
    // 3. Desktop UI auto-updates via Convex reactivity
  },
});
```

## Resolved Questions (Previously Open Questions)

1. ✅ **Guest Desktop Icons**: Show ALL apps (free enabled, paid disabled with "Sign in to unlock")
2. ✅ **Signed-Out State**: Separate from signed-in state, shows teaser desktop
3. ✅ **Free App Determination**: Based on `price` field in app registry (undefined/null = free)
4. ✅ **Desktop Customization**: Yes, via drag-to-reposition and right-click "Remove from Desktop"
5. ✅ **Installed Apps on Desktop**: Always appear automatically when installed
6. ✅ **Programs Menu**: All installed apps always accessible in START menu, even if hidden from desktop
7. ✅ **Purchased App Appearance**: New icon appears on desktop automatically, can launch immediately
8. ✅ **Trial Periods**: Yes, Email app offers 14-day trial (handled by Stripe)
9. **Window State Persistence**: Should window positions/sizes persist across sessions? (Probably yes, stored in Convex per user)
10. **Multiple Windows of Same App**: Can a user open the Podcast app twice? (Probably yes, but manage state carefully)

---

## Conclusion

This architecture balances simplicity (one Next.js app, one Convex backend) with flexibility (modular apps, diverse data scopes). By treating vc83.com as a desktop OS with an app store, we create a unique, delightful experience that's both nostalgic and powerful.

**Next Steps**:
1. Review this document for alignment
2. Proceed to Task 017 (Phase 3.5 Refactor) to adjust existing code
3. Begin Phase 4 (Desktop Shell) once refactor is validated

**Questions?** Any misalignments, missing pieces, or aspects to clarify before we commit to this direction? This is the north star—let's make sure it's pointing true north!