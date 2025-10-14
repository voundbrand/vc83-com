# L4YERCAK3 Complete System Architecture Diagram

**Date:** 2025-10-10
**Purpose:** Visual overview of the entire multi-app system

---

## 🏗️ High-Level Architecture

```
┌──────────────────────────────────────────────────────────────────────┐
│                        L4YERCAK3 PLATFORM                             │
│                     (Multi-Tenant SaaS)                               │
└──────────────────────────────────────────────────────────────────────┘
                                  │
        ┌─────────────────────────┼─────────────────────────┐
        │                         │                         │
        ▼                         ▼                         ▼
┌──────────────┐        ┌──────────────┐        ┌──────────────┐
│  Super Admin │        │ Organization │        │ Organization │
│    (You)     │        │      A       │        │      B       │
└──────────────┘        └──────────────┘        └──────────────┘
        │                         │                         │
        │                         │                         │
        ▼                         ▼                         ▼
┌──────────────────────────────────────────────────────────────────────┐
│                      RETRO DESKTOP UI                                 │
│  ┌─────────────────────────────────────────────────────────────┐    │
│  │  Start Menu (Filtered by App Availability)                   │    │
│  │  ┌─────┐  ┌─────┐  ┌─────┐  ┌─────┐  ┌─────┐              │    │
│  │  │ 💰  │  │ 🌐  │  │ 📊  │  │ 👥  │  │ 🎫  │              │    │
│  │  │ Pay │  │ Pub │  │ CRM │  │ Mgmt│  │ Evt │              │    │
│  │  └─────┘  └─────┘  └─────┘  └─────┘  └─────┘              │    │
│  └─────────────────────────────────────────────────────────────┘    │
└──────────────────────────────────────────────────────────────────────┘
                                  │
                                  ▼
┌──────────────────────────────────────────────────────────────────────┐
│                    APP AVAILABILITY SYSTEM                            │
│  ┌────────────────────────────────────────────────────────────┐     │
│  │  appAvailabilities (Junction Table)                         │     │
│  │  ┌──────────────┬────────┬────────┬────────┬────────┐     │     │
│  │  │ Org \ App    │  Pay   │  Pub   │  CRM   │  Evt   │     │     │
│  │  ├──────────────┼────────┼────────┼────────┼────────┤     │     │
│  │  │ Org A        │   ✅   │   ✅   │   ✅   │   ❌   │     │     │
│  │  │ Org B        │   ✅   │   ❌   │   ❌   │   ✅   │     │     │
│  │  │ Org C        │   ❌   │   ✅   │   ✅   │   ✅   │     │     │
│  │  └──────────────┴────────┴────────┴────────┴────────┘     │     │
│  └────────────────────────────────────────────────────────────┘     │
└──────────────────────────────────────────────────────────────────────┘
                                  │
                                  ▼
┌──────────────────────────────────────────────────────────────────────┐
│                         APP REGISTRY (apps)                           │
│  ┌────────────────────────────────────────────────────────────┐     │
│  │  💰 Payments (code: "payments")                             │     │
│  │  🌐 Web Publishing (code: "web-publishing")                 │     │
│  │  📊 CRM (code: "crm")                                       │     │
│  │  🎫 Events (code: "events")                                 │     │
│  │  ... more apps ...                                          │     │
│  └────────────────────────────────────────────────────────────┘     │
└──────────────────────────────────────────────────────────────────────┘
                                  │
                                  ▼
┌──────────────────────────────────────────────────────────────────────┐
│                     ONTOLOGY SYSTEM (objects)                         │
│  ┌────────────────────────────────────────────────────────────┐     │
│  │  All app data stored as flexible objects:                   │     │
│  │  • checkout_product (Payments)                              │     │
│  │  • published_page (Web Publishing)                          │     │
│  │  • contact, deal (CRM)                                      │     │
│  │  • event, ticket_type (Events)                              │     │
│  │  • address, invoice, etc.                                   │     │
│  └────────────────────────────────────────────────────────────┘     │
└──────────────────────────────────────────────────────────────────────┘
```

---

## 🎯 User Journey: Organization User

```
1. User logs in
   │
   ├─→ System checks: organizationId, userId
   │
   ├─→ Query: getAvailableApps(organizationId)
   │
   └─→ Returns apps where:
       appAvailabilities.isAvailable = true

       Example: Org A sees:
       ✅ Payments
       ✅ Web Publishing
       ✅ CRM
       ❌ Events (not enabled)

2. User clicks "Web Publishing" icon
   │
   ├─→ Window opens: PublishingWindow component
   │
   ├─→ Loads data: getPublishedPages(organizationId)
   │
   └─→ Shows only Org A's published pages
       (Multi-tenant isolation enforced)

3. User publishes a checkout page
   │
   ├─→ Creates: published_page object
   │
   ├─→ Links to: checkout_product object
   │
   └─→ Public URL: /p/org-a-slug/page-slug
       (Accessible to anyone with the link)

4. Customer visits public page
   │
   ├─→ Route: /p/org-a-slug/page-slug
   │
   ├─→ Query: getPublishedPageBySlug(orgSlug, pageSlug)
   │
   ├─→ Renders: Checkout page with Stripe payment
   │
   └─→ Tracks: page_analytics object (views, conversions)
```

---

## 🔐 Super Admin Journey

```
1. Super Admin logs in
   │
   ├─→ System checks: user.global_role_id = "super_admin"
   │
   └─→ Grants: Global access (bypass org restrictions)

2. Opens "Manage" window
   │
   ├─→ Sees tabs:
   │   • Users
   │   • Organizations
   │   • Roles & Permissions
   │   • App Availability ← NEW!
   │
   └─→ Clicks "App Availability" tab

3. Manages app access
   │
   ├─→ Matrix UI shows:
   │   Rows: Organizations
   │   Columns: Apps
   │   Cells: ✅/❌ toggles
   │
   ├─→ Super admin clicks toggle
   │
   ├─→ Mutation: setAppAvailability(orgId, appId, isAvailable)
   │
   ├─→ Updates: appAvailabilities table
   │
   └─→ Real-time effect:
       User's Start Menu updates instantly
       (if they have window open)

4. Registers new app
   │
   ├─→ Runs: seedNewApp mutation
   │
   ├─→ Creates: apps table entry
   │
   └─→ App now available for enablement
       (Super admin can toggle per org)
```

---

## 📊 Data Flow: Publishing a Checkout Page

```
┌─────────────────────────────────────────────────────────────┐
│ STEP 1: Create Checkout Product (Payments App)             │
└─────────────────────────────────────────────────────────────┘
                          │
                          ▼
              ┌───────────────────────┐
              │ objects table         │
              │ type: checkout_product│
              │ name: "VIP Tickets"   │
              │ customProperties:     │
              │   priceInCents: 49900 │
              └───────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────┐
│ STEP 2: Publish to Web (Web Publishing App)                │
└─────────────────────────────────────────────────────────────┘
                          │
                          ▼
              ┌───────────────────────┐
              │ objects table         │
              │ type: published_page  │
              │ name: "VIP Tickets"   │
              │ customProperties:     │
              │   slug: "vip-tickets" │
              │   linkedObjectId: ... │
              └───────────────────────┘
                          │
                          ▼
              ┌───────────────────────┐
              │ objectLinks table     │
              │ linkType: "publishes" │
              │ from: published_page  │
              │ to: checkout_product  │
              └───────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────┐
│ STEP 3: Customer Visits Public Page                        │
└─────────────────────────────────────────────────────────────┘
                          │
          https://l4yercak3.com/p/org-a/vip-tickets
                          │
                          ▼
              ┌───────────────────────┐
              │ HTTP Route Handler    │
              │ /p/:orgSlug/:pageSlug │
              └───────────────────────┘
                          │
                          ▼
              ┌───────────────────────┐
              │ Query:                │
              │ getPublishedPageBySlug│
              │ • Find org by slug    │
              │ • Find page by slug   │
              │ • Load linked object  │
              └───────────────────────┘
                          │
                          ▼
              ┌───────────────────────┐
              │ Render HTML           │
              │ • Apply template      │
              │ • Inject SEO meta     │
              │ • Embed checkout form │
              └───────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────┐
│ STEP 4: Track Analytics                                    │
└─────────────────────────────────────────────────────────────┘
                          │
                          ▼
              ┌───────────────────────┐
              │ objects table         │
              │ type: page_analytics  │
              │ customProperties:     │
              │   views: 145          │
              │   conversions: 12     │
              │   sources: {...}      │
              └───────────────────────┘
```

---

## 🔗 Object Relationships (Graph View)

```
┌─────────────────────────────────────────────────────────────┐
│                   ONTOLOGY GRAPH                            │
└─────────────────────────────────────────────────────────────┘

                    organization
                         │
            ┌────────────┼────────────┐
            │            │            │
            ▼            ▼            ▼
        user      checkout_product  published_page
            │            │            │
            │            │            │ publishes
            │            │            └──────────┐
            │            │                       │
            │            ▼                       ▼
            │      checkout_session ←────→ checkout_product
            │            │                       │
            │            │ purchases             │ sells
            │            │                       │
            ▼            ▼                       ▼
     payment_transaction                  ticket_type
            │
            │ pays_for
            │
            ▼
     checkout_session


LEGEND:
• Nodes = Objects (rows in objects table)
• Edges = Links (rows in objectLinks table)
• Direction matters (from → to)
• Properties stored on edges
```

---

## 🛠️ Tech Stack Overview

```
┌─────────────────────────────────────────────────────────────┐
│                      FRONTEND                                │
│  Next.js 15 + TypeScript + Tailwind CSS                     │
│  ┌─────────────────────────────────────────────────┐       │
│  │ Retro Desktop UI (Windows 95 style)             │       │
│  │  • Window Manager                                │       │
│  │  • Start Menu                                    │       │
│  │  • Desktop Icons                                 │       │
│  │  • Draggable Windows                             │       │
│  └─────────────────────────────────────────────────┘       │
│                                                              │
│  ┌─────────────────────────────────────────────────┐       │
│  │ App Windows (React Components)                   │       │
│  │  • PaymentsWindow                                │       │
│  │  • PublishingWindow                              │       │
│  │  • CrmWindow                                     │       │
│  │  • EventsWindow                                  │       │
│  └─────────────────────────────────────────────────┘       │
└─────────────────────────────────────────────────────────────┘
                            │
                            │ Convex React Hooks
                            │ (useQuery, useMutation)
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                      BACKEND                                 │
│  Convex (Serverless Backend + Real-time)                    │
│  ┌─────────────────────────────────────────────────┐       │
│  │ Database Tables:                                 │       │
│  │  • organizations                                 │       │
│  │  • users                                         │       │
│  │  • apps                                          │       │
│  │  • appAvailabilities                             │       │
│  │  • objects (ontology)                            │       │
│  │  • objectLinks (relationships)                   │       │
│  └─────────────────────────────────────────────────┘       │
│                                                              │
│  ┌─────────────────────────────────────────────────┐       │
│  │ Queries & Mutations:                             │       │
│  │  • appAvailability.ts                            │       │
│  │  • checkoutOntology.ts                           │       │
│  │  • publishingOntology.ts                         │       │
│  │  • organizationOntology.ts                       │       │
│  └─────────────────────────────────────────────────┘       │
│                                                              │
│  ┌─────────────────────────────────────────────────┐       │
│  │ HTTP Routes (Public Pages):                      │       │
│  │  • /p/:orgSlug/:pageSlug                         │       │
│  │  • /api/webhooks/stripe                          │       │
│  └─────────────────────────────────────────────────┘       │
└─────────────────────────────────────────────────────────────┘
                            │
                            │ Integrations
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                   EXTERNAL SERVICES                          │
│  ┌────────────┐  ┌────────────┐  ┌────────────┐           │
│  │   Stripe   │  │  PostHog   │  │   Resend   │           │
│  │  Payments  │  │ Analytics  │  │   Emails   │           │
│  └────────────┘  └────────────┘  └────────────┘           │
└─────────────────────────────────────────────────────────────┘
```

---

## 🎨 UI Components Hierarchy

```
┌─────────────────────────────────────────────────────────────┐
│                    Desktop Layout                           │
│  ┌───────────────────────────────────────────────────┐      │
│  │ Start Menu (Bottom Left)                           │     │
│  │  ├─ Log Out                                        │     │
│  │  ├─ Settings                                       │     │
│  │  ├─ Oranizations                                   │     │
│  │  ├─ Programs                                       │     │
│  │  │   ├─ All Apps (Apps Window)                     │     │
│  │  │   ├─ Payments (if available)                    │     │
│  │  │   ├─ Web Publishing (if available)              │     │
│  │  │   ├─ CRM (if available)                         │     │
│  │  │   └─ Events (if available)                                             │     │
│  │  ├─                            
│  └───────────────────────────────────────────────────┘     │
│                                                              │
│  ┌───────────────────────────────────────────────────┐     │
│  │ Floating Windows (Draggable)                       │     │
│  │                                                     │     │
│  │  ┌──────────────────────────────┐                 │     │
│  │  │ PaymentsWindow               │                 │     │
│  │  │  ├─ Header                   │                 │     │
│  │  │  ├─ Tabs                     │                 │     │
│  │  │  │   ├─ Stripe Connect       │                 │     │
│  │  │  │   └─ Transactions         │                 │     │
│  │  │  ├─ Content (Scrollable)     │                 │     │
│  │  │  └─ Footer                   │                 │     │
│  │  └──────────────────────────────┘                 │     │
│  │                                                     │     │
│  │  ┌──────────────────────────────┐                 │     │
│  │  │ PublishingWindow             │                 │     │
│  │  │  ├─ Header                   │                 │     │
│  │  │  ├─ Tabs                     │                 │     │
│  │  │  │   ├─ Pages                │                 │     │
│  │  │  │   ├─ Templates             │                 │     │
│  │  │  │   └─ Analytics             │                 │     │
│  │  │  ├─ Content (Scrollable)     │                 │     │
│  │  │  └─ Footer                   │                 │     │
│  │  └──────────────────────────────┘                 │     │
│  │                                                     │     │
│  └───────────────────────────────────────────────────┘     │
└─────────────────────────────────────────────────────────────┘
```

---

## 🔐 Security & Permissions Flow

```
┌─────────────────────────────────────────────────────────────┐
│                    REQUEST FLOW                              │
└─────────────────────────────────────────────────────────────┘

User Action
    │
    ▼
┌───────────────────────────┐
│ 1. Authentication Check   │
│    requireAuthenticatedUser│
│    • Verify sessionId      │
│    • Load user data        │
│    • Check org membership  │
└───────────────────────────┘
    │
    ▼
┌───────────────────────────┐
│ 2. Organization Scope     │
│    • Extract organizationId│
│    • Verify user belongs   │
│    • Check app availability│
└───────────────────────────┘
    │
    ▼
┌───────────────────────────┐
│ 3. RBAC Permission Check  │
│    requirePermission       │
│    • Get user role         │
│    • Check role permissions│
│    • Allow/deny action     │
└───────────────────────────┘
    │
    ▼
┌───────────────────────────┐
│ 4. Data Access            │
│    • Filter by orgId       │
│    • Apply indexes         │
│    • Return scoped data    │
└───────────────────────────┘
    │
    ▼
┌───────────────────────────┐
│ 5. Audit Log              │
│    • Record action         │
│    • Store userId, orgId   │
│    • Track success/failure │
└───────────────────────────┘

BYPASS PATH (Super Admin Only):
    │
    ▼
┌───────────────────────────┐
│ Super Admin Bypass        │
│ • Check global_role_id    │
│ • Grant global access     │
│ • Still log actions       │
└───────────────────────────┘
```

---

## 📈 Scalability Considerations

```
┌─────────────────────────────────────────────────────────────┐
│                  PERFORMANCE OPTIMIZATIONS                   │
└─────────────────────────────────────────────────────────────┘

DATABASE INDEXES:
├─ by_org: ["organizationId"]
├─ by_org_type: ["organizationId", "type"]
├─ by_org_type_subtype: ["organizationId", "type", "subtype"]
├─ by_org_app: ["organizationId", "appId"] (for appAvailabilities)
└─ search_by_name: full-text search on names

CACHING STRATEGY:
├─ Public pages: 5-minute HTTP cache
├─ App availability: Client-side cache (5 minutes)
├─ User context: Session cache (until logout)
└─ Static assets: CDN (1 day)

QUERY OPTIMIZATION:
├─ Always filter by organizationId first
├─ Use compound indexes for multi-field queries
├─ Paginate large result sets
└─ Lazy load analytics data

REAL-TIME UPDATES:
├─ Start Menu: Updates on appAvailabilities change
├─ Published pages: Updates on status change
├─ Analytics: Updates every 60 seconds
└─ Transactions: Real-time webhook processing
```

---

## 🎉 Summary

This architecture provides:

✅ **Flexibility** - Ontology pattern allows ANY data type
✅ **Security** - Multi-tenant isolation + RBAC
✅ **Scalability** - Indexed queries + caching
✅ **Maintainability** - Consistent patterns across apps
✅ **Extensibility** - Easy to add new apps
✅ **Control** - Super admin can manage everything

**Ready to build!** 🚀

---

**Document Version:** 1.0
**Created:** 2025-10-10
**Status:** ✅ Complete Architecture Diagram
