
# VC83 Platform Specification Document

## Version 2.0
**Date:** September 29, 2025  
**Author:** Grok (assisted synthesis from user requirements)  
**Overview:** VC83.com evolves from a retro podcast landing page into a multi-tenant web application, built with Next.js, Convex (backend/auth), and Vercel. It supports a Network State-inspired community for Mecklenburg-Vorpommern (MV) startups, offering tools for ideation, founder matching, and investor networking. The platform features a retro '83-inspired UI (Windows-like desktop, draggable windows, pixel fonts) and an "app store" where users/orgs install/uninstall apps (e.g., podcast, events), with payment-based access (free/paid tiers) and hiding options, all within a single reusable codebase.

---

## 1. Core Requirements
- **Multi-Tenancy**:
  - **Private Accounts**: Users start with solo accounts (no org required), accessing basic apps (e.g., public podcast view).
  - **Business Accounts (Organizations)**: Users create/join orgs; one user can belong to multiple orgs via memberships.
  - **Upgrades**: Private accounts can convert to orgs via self-service or admin action.
  - **Data Isolation**: Apps and content (e.g., podcast episodes) scoped by `orgId` using Convex row-level security (RLS). Public content available globally.
- **Retro UI**:
  - **Public Landing**: Simple podcast page with retro styling (purple #6B46C1, white #FFFFFF, black #000000, pixel fonts like Press Start 2P).
  - **Logged-In Dashboard**: Desktop metaphor with draggable windows (React-Draggable, CRT scanline effects).
  - **App Store**: Grid of app icons; click to install/uninstall or open as windows.
- **App Store**:
  - **Modules**: Podcast (core), Events (from existing workflows), Ideation (Kanban), Founder Matching (profile search).
  - **Installation**: Users/orgs enable apps via clicks (updates DB); uninstall hides/disables.
  - **Access Gating**: Free apps (e.g., basic podcast) vs. paid (e.g., premium tools, events) via Stripe subscriptions.
  - **Hiding**: Users/orgs toggle app visibility to declutter dashboards.
- **Admin Controls**: Global admin (superuser) manages all orgs, apps, and content. Org owners manage their members and app settings.
- **Reusable Codebase**: Shared logic (e.g., email integration, Microsoft login) supports multiple verticals (events, VC tools).

---

## 2. Key Features
### 2.1 Authentication & User/Org Management
- **Auth**: Convex Auth with providers (Microsoft OAuth, email/password). Post-signup, auto-create user with `isPrivate: true`.
- **Private vs. Org Accounts**:
  - **Private**: Access free/global apps (e.g., public podcast).
  - **Org**: Multi-user with roles (owner, admin, member). Create via dashboard; join via invites.
  - **Conversion**: "Upgrade to Org" button creates org, sets user as owner, updates `isPrivate: false`.
- **Multi-Org Belonging**: Users switch orgs via dropdown (stores `currentOrgId` in session/localStorage).
- **Admin Settings**: Superuser window for CRUD on users/orgs/apps. Org owners get limited settings (e.g., hide apps, manage members).

### 2.2 App Store & Access Control
- **App Store UI**: Retro desktop grid with app icons (e.g., floppy disk for podcast). Click to install/uninstall or open apps as draggable windows.
- **Backend Tables**:
  ```ts
  import { defineSchema, defineTable } from "convex/server";
  import { v } from "convex/values";

  export default defineSchema({
    users: defineTable({
      tokenIdentifier: v.string(),
      name: v.optional(v.string()),
      email: v.string(),
      isPrivate: v.boolean(),
    }).index("by_token", ["tokenIdentifier"]),

    organizations: defineTable({
      name: v.string(),
      ownerId: v.id("users"),
      plan: v.union(v.literal("free"), v.literal("pro")),
    }).index("by_owner", ["ownerId"]),

    memberships: defineTable({
      userId: v.id("users"),
      orgId: v.id("organizations"),
      role: v.union(v.literal("owner"), v.literal("member"), v.literal("admin")),
    }).index("by_user", ["userId"])
      .index("by_org", ["orgId"])
      .index("by_user_org", ["userId", "orgId"]),

    apps: defineTable({
      appId: v.string(), // e.g., "podcast", "events"
      name: v.string(),
      description: v.string(),
      defaultPlan: v.union(v.literal("free"), v.literal("pro")),
    }).index("by_appId", ["appId"]),

    app_access: defineTable({
      orgId: v.optional(v.id("organizations")), // Null for private users
      userId: v.optional(v.id("users")), // Individual overrides
      appId: v.string(),
      enabled: v.boolean(), // True if installed
      hidden: v.boolean(), // True if hidden by user/org
      contentIds: v.optional(v.array(v.id("contents"))), // Scoped content
      planRequired: v.union(v.literal("free"), v.literal("pro")),
    }).index("by_org_app", ["orgId", "appId"])
      .index("by_user_app", ["userId", "appId"]),

    contents: defineTable({
      orgId: v.optional(v.id("organizations")), // Null for global
      appId: v.string(),
      title: v.string(),
      data: v.any(), // e.g., podcast embed URL
      visibility: v.union(v.literal("all"), v.literal("org_only"), v.literal("hidden")),
    }).index("by_org_app", ["orgId", "appId"]),
  });
  ```
- **Logic**:
  - **Install**: Mutation sets `app_access.enabled: true`. Paid apps check org’s Stripe plan.
  - **Uninstall**: Sets `app_access.enabled: false`, `hidden: true`.
  - **Hiding**: Toggle `app_access.hidden: true` in user/org settings.
  - **Admin**: CRUD on `apps`, `app_access`, `contents` (e.g., assign podcast episodes to orgs).
  - **Org Owners**: Toggle visibility/install for their org via settings window.

### 2.3 Podcast Module
- **Public Landing**: Retro podcast page with global episodes (Spotify embeds, episode grid: e.g., "Ep. 1: Legal Landmines").
- **Logged-In**: Scoped to org (query `contents` with `orgId`). Opens as a draggable window in dashboard.
- **Admin Controls**: CRUD episodes in `contents` (e.g., `{ appId: "podcast", title: "Ep. 1", visibility: "org_only" }`). Assign to orgs or set public.
- **Org Hiding**: Checkbox in org settings to hide podcast (updates `app_access.hidden`).

### 2.4 Reusable Workflows
- **Shared Logic**:
  - `utils/email.ts`: Nodemailer/Resend for notifications (e.g., org invites).
  - `utils/microsoft.ts`: Graph API for login/integrations.
  - `utils/workflows.ts`: Event platform logic (e.g., scheduling, invites) as reusable module.
- **Multi-Vertical**: Deploy to subdomains maybe in the future, for now we will use the context internally of the org to switch between different verticals.

### 2.5 Community & Accelerator Tools
- **Discord Widget**: Embed in dashboard window (free Discord API) for org-specific channels.
- **Tools**:
  - **Ideation**: Kanban window (Shadcn components, DB-backed).
  - **Founder Matching**: Profile search (filter by skills/geo/org).
- **Hiding**: Org/users toggle in settings (e.g., hide ideation).

---

## 3. Implementation Plan
- **Tech Stack**: Next.js (frontend), Convex (auth/DB), Vercel (deploy), Tailwind/Shadcn (retro UI: React-Draggable, pixel fonts).
- **MVP Roadmap (6 Weeks)**:
  1. **Week 1**: Set up Convex Auth, schema (users/orgs/memberships/apps).
  2. **Week 2**: Build retro dashboard with org switcher, desktop UI.
  3. **Week 3**: Modularize podcast (public → org-scoped).
  4. **Week 4**: App store grid (install/uninstall mutations).
  5. **Week 5**: Stripe integration, access gating (free/pro).
  6. **Week 6**: Admin/org settings (CRUD, hide toggles).
- **Security**: Convex RLS (e.g., `eq("orgId", ctx.identity.orgId)`). Next.js middleware for auth protection.
- **Deployment**: Vercel (free tier). `npx convex deploy` for backend.
- **Edge Cases**:
  - Private users: Default to global apps (no orgId).
  - Multi-org: Session stores `currentOrgId`; switch rerenders dashboard.
  - Hiding: UI checks `app_access.hidden` before rendering icons.

---

## 4. Future Extensions
- Token-gated app access (Network State-inspired).
- Custom org subdomains (e.g., `orgname.vc83.com`).
- Analytics for app usage to track investor/talent engagement.

---

## 5. MV Context & Strategy
- **Why It Fits**: MV’s sparse talent pool (200+ startups, limited vs. Berlin) benefits from a virtual hub. The app store pulls global talent (via Discord, podcast) while reusable workflows scale your event platform’s logic.
- **Promotion**: Use VC83 podcast to drive sign-ups: “Join vc83.com for your MV startup toolkit—install what you need!” Beta-test with BAIN/Gründungswerft contacts.
- **No-Money Workaround**: No personal capital needed—leverage scout gigs (e.g., Superscout) and podcast buzz to attract investors.

---
