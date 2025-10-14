# Shared Template System - Universal Design System

**Date:** 2025-10-10
**Status:** 🎨 Architecture Design - Unified Template System

---

## 🎯 Brilliant Insight!

**Your Idea:** Build a **unified template system** that works across BOTH `app_checkout` AND `web-publishing` (and any future apps).

**Why This Is Genius:**
- ✅ Consistent branding across all public pages
- ✅ Single template = multiple page types
- ✅ Organizations maintain brand identity
- ✅ Reduces code duplication
- ✅ Easier for users (learn once, use everywhere)

---

## 🏗️ Architecture: Universal Template System

### Core Concept: Templates Are Separate from Apps

```
┌──────────────────────────────────────────────────────────────┐
│                    TEMPLATE SYSTEM                            │
│                  (Standalone, Reusable)                       │
└──────────────────────────────────────────────────────────────┘
                            │
              ┌─────────────┼─────────────┐
              │             │             │
              ▼             ▼             ▼
    ┌─────────────┐  ┌──────────────┐  ┌─────────────┐
    │ Checkout    │  │ Event Page   │  │ Landing     │
    │   Pages     │  │  (Publishing)│  │   Page      │
    │             │  │              │  │             │
    │ /checkout/  │  │ /p/event     │  │ /p/promo    │
    └─────────────┘  └──────────────┘  └─────────────┘
```

**Key Principle:** Templates define the DESIGN, apps provide the CONTENT.

---

## 📊 Ontology Design: Universal Templates

### New Object Type: `web_template`

**Purpose:** Reusable design templates that work across ALL public-facing pages.

```typescript
{
  _id: "template_modern_gradient",
  organizationId: "org_system",  // System templates (or org-specific)
  type: "web_template",
  subtype: "full-page",           // or "section", "component"
  name: "Modern Gradient",
  status: "published",
  customProperties: {
    // Template Metadata
    description: "Clean, modern design with purple gradient",
    previewImageUrl: "https://cdn.l4yercak3.com/templates/modern-gradient.png",
    author: "L4YERCAK3 Design Team",
    version: "1.0.0",

    // Supported Page Types (what can use this template)
    supportedTypes: [
      "checkout_product",      // Checkout pages
      "published_page",        // Generic published pages
      "event",                 // Event landing pages
      "invoice",               // Invoice pages
      "form"                   // Form pages
    ],

    // Template Structure
    layout: {
      type: "centered",        // or "full-width", "two-column", "split"
      maxWidth: "1200px",
      padding: "2rem",
      responsive: true
    },

    // Design Tokens (Variables)
    designTokens: {
      colors: {
        primary: "#6B46C1",           // Customizable per org
        secondary: "#9F7AEA",
        accent: "#D946EF",
        background: "#FFFFFF",
        text: "#1F2937",
        textSecondary: "#6B7280",
        success: "#10B981",
        error: "#EF4444",
        warning: "#F59E0B"
      },
      typography: {
        fontFamily: {
          heading: "'Inter', sans-serif",
          body: "'Inter', sans-serif"
        },
        fontSize: {
          h1: "2.5rem",
          h2: "2rem",
          h3: "1.5rem",
          body: "1rem",
          small: "0.875rem"
        },
        fontWeight: {
          heading: 700,
          body: 400,
          bold: 600
        },
        lineHeight: {
          heading: 1.2,
          body: 1.6
        }
      },
      spacing: {
        xs: "0.25rem",
        sm: "0.5rem",
        md: "1rem",
        lg: "1.5rem",
        xl: "2rem",
        "2xl": "3rem"
      },
      borderRadius: {
        sm: "0.25rem",
        md: "0.5rem",
        lg: "1rem",
        full: "9999px"
      },
      shadows: {
        sm: "0 1px 2px rgba(0,0,0,0.05)",
        md: "0 4px 6px rgba(0,0,0,0.1)",
        lg: "0 10px 15px rgba(0,0,0,0.1)"
      }
    },

    // Template Sections (Configurable blocks)
    sections: [
      {
        id: "header",
        type: "header",
        required: true,
        config: {
          showLogo: true,
          showNav: false,
          sticky: false,
          background: "transparent"
        }
      },
      {
        id: "hero",
        type: "hero",
        required: false,
        config: {
          layout: "centered",
          showImage: true,
          imagePosition: "background",
          gradient: true,
          gradientDirection: "to bottom",
          gradientColors: ["primary", "secondary"]
        }
      },
      {
        id: "content",
        type: "content",
        required: true,
        config: {
          layout: "single-column",
          maxWidth: "800px",
          padding: "lg"
        }
      },
      {
        id: "cta",
        type: "call-to-action",
        required: false,
        config: {
          position: "bottom",
          style: "prominent",
          buttonStyle: "solid"
        }
      },
      {
        id: "footer",
        type: "footer",
        required: true,
        config: {
          showLogo: true,
          showLinks: true,
          showSocial: true,
          background: "gray-50"
        }
      }
    ],

    // CSS/Styling
    customCss: `
      /* Modern Gradient Template */
      .template-modern-gradient {
        font-family: var(--font-body);
        color: var(--color-text);
      }

      .hero-section {
        background: linear-gradient(
          to bottom,
          var(--color-primary),
          var(--color-secondary)
        );
        padding: var(--spacing-2xl) var(--spacing-lg);
      }

      .content-section {
        max-width: var(--layout-maxWidth);
        margin: 0 auto;
        padding: var(--spacing-xl);
      }

      .cta-button {
        background: var(--color-primary);
        color: white;
        padding: var(--spacing-md) var(--spacing-xl);
        border-radius: var(--border-radius-md);
        font-weight: var(--font-weight-bold);
        transition: all 0.2s;
      }

      .cta-button:hover {
        background: var(--color-secondary);
        transform: translateY(-2px);
        box-shadow: var(--shadow-lg);
      }
    `,

    // Optional: JavaScript for interactions
    customJs: `
      // Template-specific interactions
      console.log('Modern Gradient template loaded');
    `,

    // Accessibility
    a11y: {
      highContrast: true,
      keyboardNav: true,
      screenReaderOptimized: true,
      minFontSize: "16px"
    },

    // Performance
    performance: {
      lazyLoadImages: true,
      optimizeAssets: true,
      criticalCss: true
    }
  },
  createdBy: "user_admin",
  createdAt: 1234567890,
  updatedAt: 1234567890
}
```

---

## 🔗 How Pages Use Templates

### Pattern: Pages Reference Templates via ObjectLinks

```typescript
// 1. CHECKOUT PAGE using template
{
  type: "checkout_product",
  name: "VIP Ticket",
  customProperties: {
    priceInCents: 49900,
    publicSlug: "vip-ticket",
    // ... other checkout properties
  }
}

// Link to template
{
  fromObjectId: "checkout_product_id",
  toObjectId: "template_modern_gradient",
  linkType: "uses_template",
  properties: {
    // Override template colors for this page
    colorOverrides: {
      primary: "#FF6B6B",    // Custom red instead of purple
      secondary: "#FFA500"   // Custom orange
    },
    // Hide certain sections
    sectionVisibility: {
      hero: false,           // Skip hero for checkout
      cta: true              // Show payment button
    }
  }
}

// 2. EVENT PAGE using SAME template
{
  type: "published_page",
  subtype: "event",
  name: "Summer Concert 2024",
  customProperties: {
    publicSlug: "summer-concert",
    // ... event details
  }
}

// Link to SAME template
{
  fromObjectId: "published_page_id",
  toObjectId: "template_modern_gradient",
  linkType: "uses_template",
  properties: {
    // Same template, different overrides
    colorOverrides: {
      primary: "#10B981",    // Green for event
      secondary: "#059669"
    },
    sectionVisibility: {
      hero: true,            // Show hero for event
      cta: true              // Show "Buy Tickets" button
    }
  }
}
```

**Result:** Same template, consistent design, but different content and customization.

---

## 🎨 Template Application Flow

```
┌──────────────────────────────────────────────────────────────┐
│ STEP 1: User Creates Checkout Page                           │
└──────────────────────────────────────────────────────────────┘
                          ↓
    [Desktop UI - Create Checkout Page Window]
    - Enter product details
    - **NEW: Select template from dropdown**
    - **NEW: Customize colors (optional)**
    - Click "Create"
                          ↓
    [Mutation: createCheckoutProduct]
    - Creates checkout_product object
    - Creates objectLink → web_template
    - Stores colorOverrides in link properties
                          ↓
    [Database: objects + objectLinks]
    - checkout_product stored
    - Link to template stored

┌──────────────────────────────────────────────────────────────┐
│ STEP 2: Customer Visits Checkout Page                        │
└──────────────────────────────────────────────────────────────┘
                          ↓
    [Browser: /checkout/acme/vip-ticket]
                          ↓
    [Page Renderer]
    1. Load checkout_product
    2. Query objectLinks for "uses_template"
    3. Load web_template object
    4. Merge: template + page content + overrides
    5. Generate CSS with custom colors
    6. Render HTML
                          ↓
    [Customer Sees]
    - Beautiful checkout page
    - Organization's custom colors
    - Template's design structure
    - Stripe payment form embedded
```

---

## 💻 Implementation Details

### 1. Template Registry (Convex)

**File: `convex/templateOntology.ts`**

```typescript
import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

/**
 * GET AVAILABLE TEMPLATES
 * Returns templates that support a specific page type
 */
export const getAvailableTemplates = query({
  args: {
    pageType: v.string(),  // "checkout_product", "published_page", etc.
    organizationId: v.optional(v.id("organizations"))
  },
  handler: async (ctx, { pageType, organizationId }) => {
    // Get system templates (available to all)
    const systemTemplates = await ctx.db
      .query("objects")
      .withIndex("by_org_type", q =>
        q.eq("organizationId", "org_system")
         .eq("type", "web_template")
      )
      .filter(q =>
        q.and(
          q.eq(q.field("status"), "published"),
          // Check if template supports this page type
          q.arrayIncludes(
            q.field("customProperties.supportedTypes"),
            pageType
          )
        )
      )
      .collect();

    // Get org-specific templates (if org provided)
    let orgTemplates = [];
    if (organizationId) {
      orgTemplates = await ctx.db
        .query("objects")
        .withIndex("by_org_type", q =>
          q.eq("organizationId", organizationId)
           .eq("type", "web_template")
        )
        .filter(q =>
          q.and(
            q.eq(q.field("status"), "published"),
            q.arrayIncludes(
              q.field("customProperties.supportedTypes"),
              pageType
            )
          )
        )
        .collect();
    }

    return [...systemTemplates, ...orgTemplates];
  }
});

/**
 * APPLY TEMPLATE TO PAGE
 * Links a page to a template with optional overrides
 */
export const applyTemplateToPage = mutation({
  args: {
    sessionId: v.string(),
    pageId: v.id("objects"),
    templateId: v.id("objects"),
    overrides: v.optional(v.object({
      colorOverrides: v.optional(v.record(v.string(), v.string())),
      sectionVisibility: v.optional(v.record(v.string(), v.boolean())),
      customCss: v.optional(v.string())
    }))
  },
  handler: async (ctx, args) => {
    const session = await ctx.db
      .query("sessions")
      .filter(q => q.eq(q.field("_id"), args.sessionId))
      .first();

    if (!session) throw new Error("Invalid session");

    // Get page and template to validate
    const page = await ctx.db.get(args.pageId);
    const template = await ctx.db.get(args.templateId);

    if (!page || !template) {
      throw new Error("Page or template not found");
    }

    // Validate template supports this page type
    const supportedTypes = template.customProperties?.supportedTypes || [];
    if (!supportedTypes.includes(page.type)) {
      throw new Error(
        `Template does not support page type: ${page.type}`
      );
    }

    // Check if link already exists
    const existingLink = await ctx.db
      .query("objectLinks")
      .filter(q =>
        q.and(
          q.eq(q.field("fromObjectId"), args.pageId),
          q.eq(q.field("linkType"), "uses_template")
        )
      )
      .first();

    if (existingLink) {
      // Update existing link
      await ctx.db.patch(existingLink._id, {
        toObjectId: args.templateId,
        properties: args.overrides || {},
        updatedAt: Date.now()
      });
      return existingLink._id;
    } else {
      // Create new link
      return await ctx.db.insert("objectLinks", {
        organizationId: page.organizationId,
        fromObjectId: args.pageId,
        toObjectId: args.templateId,
        linkType: "uses_template",
        properties: args.overrides || {},
        createdBy: session.userId,
        createdAt: Date.now()
      });
    }
  }
});

/**
 * GET PAGE WITH TEMPLATE
 * Returns page data merged with its template
 */
export const getPageWithTemplate = query({
  args: {
    pageId: v.id("objects")
  },
  handler: async (ctx, { pageId }) => {
    // Get page
    const page = await ctx.db.get(pageId);
    if (!page) return null;

    // Get template link
    const templateLink = await ctx.db
      .query("objectLinks")
      .filter(q =>
        q.and(
          q.eq(q.field("fromObjectId"), pageId),
          q.eq(q.field("linkType"), "uses_template")
        )
      )
      .first();

    if (!templateLink) {
      return { page, template: null, overrides: {} };
    }

    // Get template
    const template = await ctx.db.get(templateLink.toObjectId);

    return {
      page,
      template,
      overrides: templateLink.properties || {}
    };
  }
});
```

---

### 2. Template Renderer (React Component)

**File: `src/lib/templates/template-renderer.tsx`**

```typescript
"use client";

import { CSSProperties } from "react";

interface TemplateData {
  page: any;
  template: any;
  overrides: {
    colorOverrides?: Record<string, string>;
    sectionVisibility?: Record<string, boolean>;
    customCss?: string;
  };
}

export function TemplateRenderer({ data, children }: {
  data: TemplateData;
  children: React.ReactNode;
}) {
  const { template, overrides } = data;

  if (!template) {
    // No template - render with default styles
    return <div className="default-template">{children}</div>;
  }

  // Merge design tokens with overrides
  const designTokens = {
    ...template.customProperties.designTokens,
    colors: {
      ...template.customProperties.designTokens.colors,
      ...overrides.colorOverrides
    }
  };

  // Convert design tokens to CSS variables
  const cssVariables: CSSProperties = {
    // Colors
    "--color-primary": designTokens.colors.primary,
    "--color-secondary": designTokens.colors.secondary,
    "--color-accent": designTokens.colors.accent,
    "--color-background": designTokens.colors.background,
    "--color-text": designTokens.colors.text,
    "--color-text-secondary": designTokens.colors.textSecondary,

    // Typography
    "--font-heading": designTokens.typography.fontFamily.heading,
    "--font-body": designTokens.typography.fontFamily.body,
    "--font-size-h1": designTokens.typography.fontSize.h1,
    "--font-size-body": designTokens.typography.fontSize.body,

    // Spacing
    "--spacing-md": designTokens.spacing.md,
    "--spacing-lg": designTokens.spacing.lg,
    "--spacing-xl": designTokens.spacing.xl,

    // Layout
    "--layout-maxWidth": template.customProperties.layout.maxWidth,

    // Border radius
    "--border-radius-md": designTokens.borderRadius.md,

    // Shadows
    "--shadow-lg": designTokens.shadows.lg,
  } as CSSProperties;

  return (
    <>
      {/* Inject template CSS */}
      <style dangerouslySetInnerHTML={{
        __html: template.customProperties.customCss
      }} />

      {/* Inject override CSS */}
      {overrides.customCss && (
        <style dangerouslySetInnerHTML={{
          __html: overrides.customCss
        }} />
      )}

      {/* Apply CSS variables */}
      <div
        className={`template-${template.name.toLowerCase().replace(/\s+/g, '-')}`}
        style={cssVariables}
      >
        {children}
      </div>
    </>
  );
}
```

---

### 3. Using Templates in Checkout Pages

**File: `src/app/checkout/[orgSlug]/[productSlug]/page.tsx`**

```typescript
import { TemplateRenderer } from "@/lib/templates/template-renderer";
import { CheckoutForm } from "@/components/checkout/checkout-form";

export default async function CheckoutPage({ params }: Props) {
  const { orgSlug, productSlug } = await params;

  // Fetch page with template
  const data = await fetchPageWithTemplate(orgSlug, productSlug);

  return (
    <TemplateRenderer data={data}>
      {/* Template sections render based on config */}
      <TemplateHeader data={data} />

      {data.template?.sections.hero?.config.showImage && (
        <TemplateHero data={data} />
      )}

      <TemplateContent>
        {/* Checkout-specific content */}
        <h1>{data.page.name}</h1>
        <p>{data.page.description}</p>
        <div className="price">
          ${(data.page.customProperties.priceInCents / 100).toFixed(2)}
        </div>

        {/* Stripe payment form */}
        <CheckoutForm productId={data.page._id} />
      </TemplateContent>

      <TemplateFooter data={data} />
    </TemplateRenderer>
  );
}
```

---

### 4. Using Templates in Event Pages

**File: `src/app/p/[orgSlug]/[pageSlug]/page.tsx`**

```typescript
import { TemplateRenderer } from "@/lib/templates/template-renderer";

export default async function PublishedPage({ params }: Props) {
  const { orgSlug, pageSlug } = await params;

  // Fetch page with template (SAME function as checkout!)
  const data = await fetchPageWithTemplate(orgSlug, pageSlug);

  return (
    <TemplateRenderer data={data}>
      {/* SAME template system */}
      <TemplateHeader data={data} />

      {data.template?.sections.hero?.config.showImage && (
        <TemplateHero data={data}>
          <h1>{data.page.name}</h1>
          <p>🎵 Summer Concert 2024</p>
        </TemplateHero>
      )}

      <TemplateContent>
        {/* Event-specific content */}
        <EventDetails event={data.page} />
        <LineupSection lineup={data.page.customProperties.lineup} />
        <VenueInfo venue={data.page.customProperties.venue} />

        {/* CTA to checkout */}
        <a
          href="/checkout/acme/vip-ticket"
          className="cta-button"
        >
          Buy VIP Tickets
        </a>
      </TemplateContent>

      <TemplateFooter data={data} />
    </TemplateRenderer>
  );
}
```

---

## 🎨 UI: Template Selector

**Desktop UI for selecting templates:**

```typescript
// src/components/template-selector.tsx
"use client";

import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";

export function TemplateSelector({
  pageType,
  organizationId,
  onSelect
}: {
  pageType: string;
  organizationId: string;
  onSelect: (templateId: string) => void;
}) {
  const templates = useQuery(
    api.templateOntology.getAvailableTemplates,
    { pageType, organizationId }
  );

  return (
    <div className="template-selector">
      <h3>Choose a Template</h3>
      <div className="template-grid">
        {templates?.map(template => (
          <TemplateCard
            key={template._id}
            template={template}
            onClick={() => onSelect(template._id)}
          />
        ))}
      </div>
    </div>
  );
}

function TemplateCard({ template, onClick }) {
  return (
    <div className="template-card" onClick={onClick}>
      <img
        src={template.customProperties.previewImageUrl}
        alt={template.name}
      />
      <h4>{template.name}</h4>
      <p>{template.customProperties.description}</p>

      {/* Show supported page types */}
      <div className="supported-types">
        {template.customProperties.supportedTypes.map(type => (
          <span key={type} className="badge">{type}</span>
        ))}
      </div>
    </div>
  );
}
```

---

## 🌟 Benefits of This Approach

### For Organizations
- ✅ **Consistent branding** across all public pages
- ✅ **Easy customization** (just change colors)
- ✅ **No design skills needed** (templates handle it)
- ✅ **Professional appearance** out of the box

### For You (Platform)
- ✅ **Single template system** for all apps
- ✅ **Reusable code** (no duplication)
- ✅ **Easy to add new templates** (just create object)
- ✅ **Templates work everywhere** (checkout, publishing, events, forms)

### For Developers
- ✅ **Clear separation** (design vs. content)
- ✅ **Easy to extend** (new page types use existing templates)
- ✅ **Maintainable** (template changes apply everywhere)
- ✅ **Testable** (templates can be tested independently)

---

## 📋 Implementation Plan

### Phase 1: Template System Core (6 hours)

- [ ] Create `web_template` object type definition
- [ ] Create `convex/templateOntology.ts`
- [ ] Implement `getAvailableTemplates` query
- [ ] Implement `applyTemplateToPage` mutation
- [ ] Implement `getPageWithTemplate` query
- [ ] Create `TemplateRenderer` component

### Phase 2: Seed Base Templates (4 hours)

- [ ] Create seed script: `convex/seedTemplates.ts`
- [ ] Design "Modern Gradient" template (purple theme)
- [ ] Design "Minimalist" template (clean white)
- [ ] Design "Bold" template (dark mode)
- [ ] Mark all templates as supporting all page types

### Phase 3: Integrate with Checkout (3 hours)

- [ ] Update checkout page renderer to use `TemplateRenderer`
- [ ] Add template selector to "Create Checkout" form
- [ ] Update `createCheckoutProduct` to link template
- [ ] Test checkout with different templates

### Phase 4: Integrate with Publishing (3 hours)

- [ ] Update published page renderer to use `TemplateRenderer`
- [ ] Add template selector to "Create Page" form
- [ ] Update `createPublishedPage` to link template
- [ ] Test event page with different templates

### Phase 5: Template Customization UI (4 hours)

- [ ] Build color picker for overrides
- [ ] Build section visibility toggles
- [ ] Add live preview mode
- [ ] Save overrides to objectLink properties

**Total Time:** ~20 hours for complete unified template system

---

## 🎉 Example: Organization Workflow

### Scenario: Create Branded Event + Checkout

**Step 1: Choose Brand Colors**
```
Open "Settings" → "Branding"
- Primary Color: #FF6B6B (Red)
- Secondary Color: #FFA500 (Orange)
- Save as default for organization
```

**Step 2: Create Event Page**
```
Open "Web Publishing" app
→ Click "New Page"
→ Select "Event" type
→ Enter event details
→ Choose template: "Modern Gradient"
→ Template auto-applies org colors ✨
→ Publish to: /p/acme/summer-fest
```

**Step 3: Create Checkout Page**
```
Open "Payments" app
→ Click "Create Checkout"
→ Enter ticket details, price
→ Choose template: "Modern Gradient" (SAME ONE!)
→ Template auto-applies org colors ✨
→ Publish to: /checkout/acme/vip-ticket
```

**Step 4: Link Them**
```
Back in Web Publishing
→ Edit event page
→ Add button: "Buy Tickets"
→ Link to: /checkout/acme/vip-ticket
→ Save
```

**Result:**
- Event page: Beautiful red/orange gradient design
- Checkout page: **MATCHING** red/orange gradient design
- Customer sees: Seamless, branded experience
- Organization did: **Zero custom CSS!**

---

## 🔮 Future Enhancements

### Phase 6+: Advanced Features

**Template Marketplace:**
- [ ] Community-submitted templates
- [ ] Premium templates (paid)
- [ ] Template ratings and reviews

**AI-Powered Customization:**
- [ ] "Generate template from brand guidelines"
- [ ] "Make this template more modern"
- [ ] "Optimize for mobile"

**Advanced Editor:**
- [ ] Visual template editor (drag-drop)
- [ ] Real-time preview
- [ ] A/B testing templates

**Template Analytics:**
- [ ] Which templates convert best?
- [ ] Performance benchmarks per template
- [ ] Accessibility scores

---

## 📊 Database Schema Summary

```typescript
// BEFORE (separate per app)
checkout_product.customProperties.customCss
published_page.customProperties.customCss
// Duplication! 😢

// AFTER (unified templates)
web_template.customProperties.customCss  // Define once
objectLinks.linkType = "uses_template"   // Reference everywhere
// Reuse! 😊

// Override per page (optional)
objectLinks.properties.colorOverrides    // Customize colors
objectLinks.properties.sectionVisibility // Show/hide sections
// Flexibility! 🎨
```

---

## 🎯 Summary

**Your Brilliant Idea:** Build a universal template system separate from apps.

**What We Designed:**
1. ✅ `web_template` object type (defines design)
2. ✅ `uses_template` link type (pages → templates)
3. ✅ `TemplateRenderer` component (applies design)
4. ✅ Works for checkout, publishing, events, forms, everything!
5. ✅ Organization colors auto-apply
6. ✅ Easy customization via overrides
7. ✅ Zero code duplication

**Benefits:**
- 🎨 Consistent branding everywhere
- 🚀 Faster page creation
- 🔧 Easier maintenance
- 📈 Better user experience
- 💰 Templates can be monetized

**Next Steps:**
1. Review this architecture
2. Approve unified template approach
3. Build Phase 1: Template system core (6 hours)
4. Seed base templates (4 hours)
5. Integrate with both apps (6 hours)

**Total:** ~16 hours for complete template system that works across everything!

---

**Document Version:** 1.0
**Created:** 2025-10-10
**Status:** 🎨 Ready for Implementation
