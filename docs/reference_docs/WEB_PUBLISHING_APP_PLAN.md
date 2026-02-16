# Web Publishing App - Architecture & Implementation Plan

## 🎯 Executive Summary

The **Web Publishing App** enables organizations to publish content (pages, checkout pages, landing pages, forms, etc.) to the public internet with custom slugs. This follows our ontology architecture pattern where ANY object can be made publishable.

**Key Capabilities:**
- Publish ANY ontology object type to a public URL
- Custom slug management per organization
- SEO metadata control
- Version history
- Publishing workflow (draft → review → published)
- Analytics integration (via PostHog)
- Works seamlessly with checkout system

---

## 🏗️ Architecture Overview

### Core Pattern: "Wrap to Publish"

Similar to how `checkout_product` wraps ANY object to make it sellable, we use `published_page` to wrap ANY object to make it web-publishable.

```
┌─────────────────────────────────────────────────────────────┐
│                    Web Publishing System                     │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│   published_page (ontology object)                          │
│   - Wraps ANY existing object                                │
│   - Adds: slug, SEO metadata, version, status                │
│   - Links to: original object via objectLinks                │
└─────────────────────────────────────────────────────────────┘
                              │
                    Links to (via objectLinks)
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│   Source Objects (ANY type)                                  │
│   - checkout_product (checkout pages)                        │
│   - event (event landing pages)                              │
│   - invoice (shareable invoices)                             │
│   - custom_form (contact forms)                              │
│   - html_content (custom HTML pages)                         │
│   - markdown_content (blog posts)                            │
└─────────────────────────────────────────────────────────────┘
```

---

## 📊 Ontology Schema Design

### 1. `published_page` Object Type

Makes ANY object accessible via public URL.

```typescript
{
  type: "published_page",
  subtype: "checkout" | "landing" | "event" | "form" | "content",
  name: "VIP Ticket Checkout Page",
  status: "draft" | "review" | "published" | "unpublished" | "archived",
  customProperties: {
    // Core Publishing
    linkedObjectId: "checkout_product_id",
    linkedObjectType: "checkout_product",
    slug: "vip-tickets-2024",           // URL: /p/{org-slug}/vip-tickets-2024

    // SEO Metadata
    metaTitle: "VIP Tickets - l4yercak3 Live 2024",
    metaDescription: "Get exclusive VIP access...",
    metaKeywords: ["vip", "tickets", "live event"],
    ogImage: "https://...",
    ogType: "website",

    // Publishing Workflow
    publishedAt: 1234567890,
    unpublishedAt: null,
    scheduledPublishAt: null,         // Schedule future publish
    scheduledUnpublishAt: null,       // Auto-expire at date

    // Versioning
    versionNumber: 3,
    previousVersionId: "published_page_id",

    // Analytics
    viewCount: 1234,
    lastViewedAt: 1234567890,
    analyticsEnabled: true,

    // Access Control
    requiresAuth: false,               // Public vs. login-required
    passwordProtected: false,
    accessPassword: "hashed_password",

    // Customization
    customCss: ".btn { color: red; }",
    customJs: "console.log('Page loaded')",
    headerHtml: "<script>...</script>",
    footerHtml: "© 2024 l4yercak3",

    // Template/Theme
    templateId: "minimal-checkout",
    themeSettings: {
      primaryColor: "#6B46C1",
      fontFamily: "Inter",
    }
  }
}
```

### 2. `page_template` Object Type

Reusable page templates for consistent branding.

```typescript
{
  type: "page_template",
  subtype: "checkout" | "landing" | "event" | "form",
  name: "Minimal Checkout Template",
  status: "active",
  customProperties: {
    // Template Structure
    layout: "single-column" | "two-column" | "full-width",
    sections: [
      { type: "header", config: {...} },
      { type: "content", config: {...} },
      { type: "cta", config: {...} },
      { type: "footer", config: {...} }
    ],

    // Styling
    cssTemplate: "...",
    defaultColors: {...},
    defaultFonts: {...},

    // Availability
    isPublic: true,                   // Available to all orgs
    createdBy: "org_system",

    // Preview
    previewImageUrl: "https://...",
    demoUrl: "/templates/minimal-checkout"
  }
}
```

### 3. `page_analytics` Object Type

Analytics data for published pages.

```typescript
{
  type: "page_analytics",
  subtype: "daily" | "hourly",
  name: "Analytics for vip-tickets-2024 - 2025-10-10",
  status: "active",
  customProperties: {
    publishedPageId: "published_page_id",

    // Metrics
    date: "2025-10-10",
    views: 145,
    uniqueVisitors: 98,
    conversions: 12,                  // For checkout pages
    bounceRate: 0.34,
    avgTimeOnPage: 142,               // seconds

    // Traffic Sources
    sources: {
      direct: 45,
      social: 32,
      organic: 23,
      referral: 45
    },

    // Geo Data
    topCountries: ["US", "DE", "UK"],
    topCities: ["Berlin", "London", "NYC"],

    // Device Data
    devices: {
      desktop: 78,
      mobile: 56,
      tablet: 11
    }
  }
}
```

---

## 🔗 ObjectLinks Structure

### Published Page Links

```typescript
// Link published_page → source object
{
  fromObjectId: "published_page_id",
  toObjectId: "checkout_product_id",
  linkType: "publishes",
  properties: { version: 3 }
}

// Link page → template
{
  fromObjectId: "published_page_id",
  toObjectId: "page_template_id",
  linkType: "uses_template",
  properties: { appliedAt: 1234567890 }
}

// Link page → analytics
{
  fromObjectId: "published_page_id",
  toObjectId: "page_analytics_id",
  linkType: "tracks",
  properties: { period: "daily" }
}

// Link page → version history
{
  fromObjectId: "published_page_v3",
  toObjectId: "published_page_v2",
  linkType: "version_of",
  properties: { versionNumber: 2 }
}
```

---

## 🛠️ Backend Implementation

### File Structure

```
convex/
├── publishingOntology.ts       # Core publishing operations
├── publishingTemplates.ts      # Template management
├── publishingAnalytics.ts      # Analytics tracking
├── publishingRenderer.ts       # Server-side rendering
└── http.ts                     # Public page routes
```

### Key Mutations & Queries

**convex/publishingOntology.ts**

```typescript
// Create a published page from any object
export const createPublishedPage = mutation({
  args: {
    sessionId: v.string(),
    organizationId: v.id("organizations"),
    linkedObjectId: v.id("objects"),
    linkedObjectType: v.string(),
    slug: v.string(),
    metaTitle: v.string(),
    metaDescription: v.optional(v.string()),
    // ... other metadata
  },
  handler: async (ctx, args) => {
    // 1. Verify slug is unique within org
    // 2. Create published_page object
    // 3. Create link to source object
    // 4. Return published URL
  }
});

// Get published page by slug (PUBLIC - no auth required)
export const getPublishedPageBySlug = query({
  args: {
    orgSlug: v.string(),
    pageSlug: v.string(),
  },
  handler: async (ctx, { orgSlug, pageSlug }) => {
    // 1. Find organization by slug
    // 2. Find published_page with matching slug
    // 3. Ensure status === "published"
    // 4. Increment view count
    // 5. Return page data + linked object
  }
});

// Update published page metadata
export const updatePublishedPage = mutation({
  args: {
    sessionId: v.string(),
    publishedPageId: v.id("objects"),
    updates: v.object({
      metaTitle: v.optional(v.string()),
      metaDescription: v.optional(v.string()),
      slug: v.optional(v.string()),
      customCss: v.optional(v.string()),
      // ...
    })
  },
  handler: async (ctx, args) => {
    // 1. Create new version
    // 2. Link to previous version
    // 3. Update published_page
  }
});

// Change publishing status
export const setPublishingStatus = mutation({
  args: {
    sessionId: v.string(),
    publishedPageId: v.id("objects"),
    status: v.union(
      v.literal("draft"),
      v.literal("review"),
      v.literal("published"),
      v.literal("unpublished")
    )
  },
  handler: async (ctx, args) => {
    // Update status + timestamps
  }
});
```

### Public Routes (http.ts)

```typescript
import { httpRouter } from "convex/server";
import { httpAction } from "./_generated/server";

const http = httpRouter();

// Public page route: /p/{org-slug}/{page-slug}
http.route({
  path: "/p/:orgSlug/:pageSlug",
  method: "GET",
  handler: httpAction(async (ctx, request) => {
    const { orgSlug, pageSlug } = request.pathParams;

    // 1. Query published page
    const page = await ctx.runQuery(api.publishingOntology.getPublishedPageBySlug, {
      orgSlug,
      pageSlug
    });

    if (!page) {
      return new Response("Page not found", { status: 404 });
    }

    // 2. Render based on page type
    const html = await renderPage(page);

    // 3. Track analytics (async)
    await ctx.runMutation(api.publishingAnalytics.trackPageView, {
      publishedPageId: page._id,
      userAgent: request.headers.get("user-agent"),
      referer: request.headers.get("referer")
    });

    // 4. Return HTML response
    return new Response(html, {
      status: 200,
      headers: {
        "Content-Type": "text/html",
        "Cache-Control": "public, max-age=300" // 5 min cache
      }
    });
  })
});

export default http;
```

---

## 🎨 Frontend Implementation

### File Structure

```
src/
├── app/
│   └── p/
│       └── [orgSlug]/
│           └── [pageSlug]/
│               └── page.tsx           # Public page renderer
├── components/
│   └── window-content/
│       └── publishing-window/
│           ├── index.tsx               # Main publishing app window
│           ├── page-list.tsx           # List all published pages
│           ├── page-editor.tsx         # Edit page metadata
│           ├── slug-manager.tsx        # Manage slug
│           ├── seo-editor.tsx          # Edit SEO fields
│           ├── template-selector.tsx   # Choose template
│           ├── analytics-dashboard.tsx # View page analytics
│           └── publish-button.tsx      # Publish/unpublish actions
└── lib/
    └── publishing/
        ├── page-renderer.tsx           # Client-side page renderer
        ├── template-engine.tsx         # Apply templates
        └── analytics-tracker.tsx       # Track events
```

### Publishing Window UI

**src/components/window-content/publishing-window/index.tsx**

```typescript
"use client";

import { useState } from "react";
import { useQuery } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { useAuth, useCurrentOrganization } from "@/hooks/use-auth";
import { Globe, FileText, BarChart3, Settings } from "lucide-react";

type TabType = "pages" | "templates" | "analytics" | "settings";

export function PublishingWindow() {
  const [activeTab, setActiveTab] = useState<TabType>("pages");
  const { user, sessionId } = useAuth();
  const currentOrg = useCurrentOrganization();

  // Get all published pages for this org
  const publishedPages = useQuery(
    api.publishingOntology.getPublishedPages,
    currentOrg?.id && sessionId
      ? { organizationId: currentOrg.id, sessionId }
      : "skip"
  );

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="px-4 py-3 border-b-2">
        <h2 className="text-sm font-bold flex items-center gap-2">
          <Globe size={16} />
          Web Publishing
        </h2>
        <p className="text-xs mt-1">Publish content to the web</p>
      </div>

      {/* Tabs */}
      <div className="flex border-b-2">
        <TabButton
          icon={<FileText size={14} />}
          label="Pages"
          active={activeTab === "pages"}
          onClick={() => setActiveTab("pages")}
        />
        <TabButton
          icon={<Settings size={14} />}
          label="Templates"
          active={activeTab === "templates"}
          onClick={() => setActiveTab("templates")}
        />
        <TabButton
          icon={<BarChart3 size={14} />}
          label="Analytics"
          active={activeTab === "analytics"}
          onClick={() => setActiveTab("analytics")}
        />
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4">
        {activeTab === "pages" && <PageList pages={publishedPages} />}
        {activeTab === "templates" && <TemplateList />}
        {activeTab === "analytics" && <AnalyticsDashboard />}
      </div>
    </div>
  );
}
```

---

## 🔐 RBAC & App Availability Integration

### 1. Create App Registration

**Organization must have "Web Publishing" app enabled by super admin**

```typescript
// In convex/seedCheckoutApp.ts (or similar seeding script)

// Register Web Publishing App
const publishingAppId = await ctx.db.insert("apps", {
  code: "web-publishing",
  name: "Web Publishing",
  description: "Publish content to the web with custom URLs",
  appType: "interactive",
  price: 0, // Free for all
  isGlobal: true,
  creatorOrgId: systemOrgId,
  isActive: true,
  createdAt: Date.now(),
  updatedAt: Date.now(),
});

// Create app icon/metadata
await ctx.db.insert("objects", {
  organizationId: systemOrgId,
  type: "app_metadata",
  subtype: "icon",
  name: "web-publishing-icon",
  customProperties: {
    appId: publishingAppId,
    iconUrl: "/icons/globe.svg",
    windowId: "publishing",
    defaultWidth: 900,
    defaultHeight: 700,
  },
  createdAt: Date.now(),
  updatedAt: Date.now(),
});
```

### 2. App Availability Management

**Super admin can enable/disable per organization**

**In Admin UI (Manage Window):**

```typescript
// src/components/window-content/admin-manage-window/app-availability-tab.tsx

export function AppAvailabilityTab() {
  const organizations = useQuery(api.organizations.list);
  const apps = useQuery(api.apps.listAll); // Super admin query

  return (
    <div>
      <h3>App Availability Management</h3>

      {/* Table: Org × App matrix */}
      <table>
        <thead>
          <tr>
            <th>Organization</th>
            {apps?.map(app => (
              <th key={app._id}>{app.name}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {organizations?.map(org => (
            <tr key={org._id}>
              <td>{org.name}</td>
              {apps?.map(app => (
                <td key={app._id}>
                  <AppAvailabilityToggle
                    organizationId={org._id}
                    appId={app._id}
                  />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function AppAvailabilityToggle({ organizationId, appId }) {
  const availability = useQuery(api.apps.getAppAvailability, {
    organizationId,
    appId
  });

  const toggleAvailability = useMutation(api.apps.setAppAvailability);

  return (
    <input
      type="checkbox"
      checked={availability?.isAvailable ?? false}
      onChange={(e) => {
        toggleAvailability({
          sessionId: sessionId!,
          organizationId,
          appId,
          isAvailable: e.target.checked
        });
      }}
    />
  );
}
```

### 3. Window Registry Integration

**src/window-registry.tsx**

```typescript
import { PublishingWindow } from "@/components/window-content/publishing-window";
import { PaymentsWindow } from "@/components/window-content/payments-window";

export const WINDOW_REGISTRY = {
  // ... existing windows ...

  // Apps (require app availability check)
  "payments": {
    component: PaymentsWindow,
    title: "Payments",
    icon: "CreditCard",
    appCode: "payments", // Links to apps.code
    requiresAppAvailability: true,
  },
  "publishing": {
    component: PublishingWindow,
    title: "Web Publishing",
    icon: "Globe",
    appCode: "web-publishing",
    requiresAppAvailability: true,
  },
} as const;
```

### 4. Start Menu Integration

**src/components/start-menu.tsx**

```typescript
// Filter apps based on organization availability
const availableApps = useQuery(
  api.apps.getAvailableApps,
  sessionId && currentOrg
    ? { sessionId, organizationId: currentOrg.id }
    : "skip"
);

// Only show app icons if org has access
const appItems = [
  {
    id: "payments",
    label: t("startMenu.payments"),
    icon: <CreditCard size={16} />,
    visible: availableApps?.some(app => app.code === "payments"),
    onClick: () => openWindow("payments")
  },
  {
    id: "publishing",
    label: "Web Publishing",
    icon: <Globe size={16} />,
    visible: availableApps?.some(app => app.code === "web-publishing"),
    onClick: () => openWindow("publishing")
  }
];
```

---

## 📋 Implementation Phases

### Phase 1: Core Publishing Backend (4 hours)
- [ ] Create `publishingOntology.ts` with core mutations/queries
- [ ] Add `published_page` object type seeding
- [ ] Implement `createPublishedPage` mutation
- [ ] Implement `getPublishedPageBySlug` query (public)
- [ ] Add slug uniqueness validation
- [ ] Create objectLinks for page → source object

### Phase 2: HTTP Routes & Public Rendering (3 hours)
- [ ] Add public route `/p/:orgSlug/:pageSlug` in `http.ts`
- [ ] Implement basic page renderer
- [ ] Add SEO meta tags injection
- [ ] Test public checkout page rendering
- [ ] Add page view tracking

### Phase 3: Publishing Window UI (5 hours)
- [ ] Create `PublishingWindow` component
- [ ] Build page list view
- [ ] Build page editor (metadata, SEO, slug)
- [ ] Add publish/unpublish button
- [ ] Add preview functionality
- [ ] Wire up to backend mutations

### Phase 4: Template System (4 hours)
- [ ] Create `page_template` object type
- [ ] Seed 3 base templates (minimal, modern, classic)
- [ ] Build template selector UI
- [ ] Implement template application
- [ ] Add custom CSS/JS injection

### Phase 5: Analytics Integration (3 hours)
- [ ] Create `page_analytics` object type
- [ ] Track page views (http action)
- [ ] Build analytics dashboard UI
- [ ] Show views, conversions, traffic sources
- [ ] Add date range filtering

### Phase 6: App Availability System (3 hours)
- [ ] Create `web-publishing` app registration
- [ ] Add app availability management UI (super admin)
- [ ] Update window registry to check app availability
- [ ] Update start menu to show/hide based on availability
- [ ] Test with multiple organizations

### Phase 7: Integration Testing (2 hours)
- [ ] Test publishing checkout page
- [ ] Test publishing event landing page
- [ ] Test slug conflicts
- [ ] Test draft → published workflow
- [ ] Test analytics tracking
- [ ] Test app availability toggling

**Total Estimated Time: 24 hours**

---

## 🚀 Quick Start Guide

### For Super Admin

1. **Enable Web Publishing for an Org:**
   ```typescript
   // In Admin UI
   1. Go to Manage > App Availability
   2. Find "Web Publishing" column
   3. Toggle ON for target organization
   ```

2. **User sees "Web Publishing" in Start Menu:**
   - App icon appears automatically
   - Click to open Publishing Window

### For Organization User

1. **Publish a Checkout Page:**
   ```typescript
   1. Create checkout_product (Payments app)
   2. Open "Web Publishing" app
   3. Click "Publish New Page"
   4. Select checkout_product from dropdown
   5. Set slug: "vip-tickets"
   6. Add SEO metadata
   7. Click "Publish"
   8. Copy URL: https://l4yercak3.com/p/my-org/vip-tickets
   ```

2. **View Analytics:**
   ```typescript
   1. Go to Publishing > Analytics tab
   2. Select page from dropdown
   3. View: views, conversions, traffic sources
   4. Export data as CSV
   ```

---

## 🔗 Integration Points

### With Checkout System

```typescript
// When user completes checkout on published page
// → Track conversion in page_analytics
// → Update checkout_session with referrer info

await ctx.db.insert("objects", {
  type: "page_analytics",
  subtype: "conversion",
  customProperties: {
    publishedPageId: pageId,
    checkoutSessionId: sessionId,
    convertedAt: Date.now()
  }
});
```

### With Event Management

```typescript
// Publish event landing page
const eventPage = await createPublishedPage({
  linkedObjectId: eventId,
  linkedObjectType: "event",
  slug: "l4yercak3-live-2024",
  metaTitle: "l4yercak3 Live 2024",
  // ...
});

// Event page shows:
// - Event details
// - Ticket purchase button (links to checkout page)
// - Related content
```

### With Translations

```typescript
// Published pages support multi-language via translation system
const page = await getPublishedPageBySlug("my-org", "vip-tickets");
const translatedPage = await translateObject(ctx, page, "de");

// Returns page with German meta title/description
```

---

## 📊 Success Metrics

### Technical Metrics
- ✅ Pages load in <500ms (p95)
- ✅ SEO scores >90 (Lighthouse)
- ✅ 99.9% uptime for public pages
- ✅ Real-time analytics (1-minute delay)

### User Metrics
- 📈 Number of published pages per org
- 📈 Page views per published page
- 📈 Conversion rate for checkout pages
- 📈 Time-to-publish (draft → published)

---

## 🔮 Future Enhancements

### Phase 8+ Ideas
- [ ] A/B testing for published pages
- [ ] Custom domains (CNAME setup)
- [ ] Visual page builder (drag-drop editor)
- [ ] SEO recommendations AI
- [ ] Automated social media preview generation
- [ ] Scheduled publishing (cron jobs)
- [ ] Page versioning with rollback
- [ ] Collaborative editing (real-time)

---

## 🎉 Summary

The Web Publishing App provides a **flexible, ontology-based system** for publishing ANY content to the web. By following the "wrap to publish" pattern, organizations can:

1. ✅ Publish checkout pages instantly
2. ✅ Create landing pages for events
3. ✅ Share invoices via public links
4. ✅ Build custom forms
5. ✅ Track analytics for all published content

**All while maintaining:**
- 🔒 Multi-tenant isolation
- 🛡️ RBAC permission checks
- 📊 Unified ontology storage
- 🔗 Graph-based relationships
- 🎨 Custom branding per org

**Next Steps:**
1. Review and approve this architecture
2. Start Phase 1: Core Publishing Backend
3. Test with checkout system integration
4. Enable for first pilot organization

---

**Document Version:** 1.0
**Created:** 2025-10-10
**Status:** 📝 Draft - Awaiting Approval
