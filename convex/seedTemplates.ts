import { mutation } from "./_generated/server";

/**
 * SEED SYSTEM TEMPLATES & THEMES - SIMPLIFIED v2
 *
 * Philosophy: Templates/themes are CODE you deploy, not DATA you store!
 *
 * What we store in DB (minimal metadata):
 * - Template/theme code (identifier that maps to /src/templates/)
 * - Name and description
 * - Category
 * - Preview image URL
 * - Version
 *
 * What we DON'T store (lives in /src/templates/):
 * - React components (in /src/templates/web/landing-page/index.tsx)
 * - Theme objects (in /src/templates/themes/modern-gradient/theme.ts)
 * - Styles (in /src/templates/web/landing-page/styles.module.css)
 */

/**
 * Seed system templates (structure metadata)
 *
 * Creates template metadata that maps to React components in /src/templates/web/
 * No authentication required - this is a one-time setup mutation.
 */
export const seedSystemTemplates = mutation({
  args: {},
  handler: async (ctx) => {

    // Get system organization
    const systemOrg = await ctx.db
      .query("organizations")
      .withIndex("by_slug", (q) => q.eq("slug", "system"))
      .first();

    if (!systemOrg) {
      throw new Error("System organization not found");
    }

    // Get system user (if exists) or use first user
    const systemUser = await ctx.db
      .query("users")
      .filter((q) => q.eq(q.field("email"), "system@l4yercak3.com"))
      .first();

    const firstUser = systemUser || await ctx.db.query("users").first();

    if (!firstUser) {
      throw new Error("No users found. Create a user first before seeding templates.");
    }

    const createdTemplates = [];
    const skippedTemplates = [];

    // 1. LANDING PAGE TEMPLATE (maps to /src/templates/web/landing-page/)
    const existingLandingPage = await ctx.db
      .query("objects")
      .withIndex("by_org_type", (q) =>
        q.eq("organizationId", systemOrg._id).eq("type", "template")
      )
      .filter((q) => q.eq(q.field("customProperties.code"), "landing-page"))
      .first();

    if (!existingLandingPage) {
      const landingPage = await ctx.db.insert("objects", {
        organizationId: systemOrg._id,
        type: "template",
        subtype: "web",
        name: "Landing Page",
        status: "published",
        customProperties: {
          code: "landing-page", // Maps to /src/templates/web/landing-page/
          description: "Classic landing page: hero, content sections, CTA, footer",
          category: "web", // web, email, invoice, print, sms, etc.
          outputFormat: "html",
          sections: ["header", "hero", "content", "cta", "footer"],
          supportedContentTypes: ["checkout_product", "event", "published_page"],
          previewImageUrl: "https://cdn.l4yercak3.com/templates/landing-page.png",
          author: "L4YERCAK3 Design Team",
          version: "1.0.0",
        },
        createdBy: firstUser._id,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });
      createdTemplates.push(landingPage);
      console.log("✅ Created landing-page template");
    } else {
      skippedTemplates.push("landing-page");
      console.log("⏭️  Skipping landing-page (already exists)");
    }

    // 2. EVENT LANDING TEMPLATE (maps to /src/templates/web/event-landing/)
    const existingEventLanding = await ctx.db
      .query("objects")
      .withIndex("by_org_type", (q) =>
        q.eq("organizationId", systemOrg._id).eq("type", "template")
      )
      .filter((q) => q.eq(q.field("customProperties.code"), "event-landing"))
      .first();

    if (!existingEventLanding) {
      const eventLanding = await ctx.db.insert("objects", {
        organizationId: systemOrg._id,
        type: "template",
        subtype: "web",
        name: "Event Landing Page",
        status: "published",
        customProperties: {
          code: "event-landing", // Maps to /src/templates/web/event-landing/
          description: "Full-featured event landing page with hero, agenda, speakers, testimonials, FAQ, and sticky checkout",
          category: "web",
          outputFormat: "html",
          sections: [
            "navigation",
            "hero",
            "about",
            "agenda",
            "speakers",
            "testimonials",
            "faq",
            "checkout"
          ],
          supportedContentTypes: ["event", "published_page"],
          previewImageUrl: "https://cdn.l4yercak3.com/templates/event-landing.png",
          author: "L4YERCAK3 Design Team",
          version: "1.0.0",
          features: [
            "Video/image hero with play button",
            "Stats grid and highlights",
            "Multi-day agenda",
            "Speaker profiles",
            "Testimonials",
            "FAQ accordion",
            "Sticky checkout sidebar",
            "Mobile-optimized checkout",
            "Responsive grid layouts"
          ]
        },
        createdBy: firstUser._id,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });
      createdTemplates.push(eventLanding);
      console.log("✅ Created event-landing template");
    } else {
      skippedTemplates.push("event-landing");
      console.log("⏭️  Skipping event-landing (already exists)");
    }

    console.log(`\n✅ Seeding complete: ${createdTemplates.length} created, ${skippedTemplates.length} skipped`);

    return {
      templates: createdTemplates,
      message: `Successfully seeded ${createdTemplates.length} new template(s)`,
      created: createdTemplates.length,
      skipped: skippedTemplates.length,
    };
  },
});

/**
 * Seed system themes (visual appearance metadata)
 *
 * Creates theme metadata that maps to theme objects in /src/templates/themes.ts
 * Note: Actual themes are in /src/templates/themes.ts (single-file pattern)
 * No authentication required - this is a one-time setup mutation.
 */
export const seedSystemThemes = mutation({
  args: {},
  handler: async (ctx) => {

    // Get system organization
    const systemOrg = await ctx.db
      .query("organizations")
      .withIndex("by_slug", (q) => q.eq("slug", "system"))
      .first();

    if (!systemOrg) {
      throw new Error("System organization not found");
    }

    // Get system user (if exists) or use first user
    const systemUser = await ctx.db
      .query("users")
      .filter((q) => q.eq(q.field("email"), "system@l4yercak3.com"))
      .first();

    const firstUser = systemUser || await ctx.db.query("users").first();

    if (!firstUser) {
      throw new Error("No users found. Create a user first before seeding themes.");
    }

    const createdThemes = [];
    const skippedThemes = [];

    // 1. MODERN GRADIENT THEME (light) - maps to webPublishingThemes array in /src/templates/themes.ts
    const existingModernGradient = await ctx.db
      .query("objects")
      .withIndex("by_org_type", (q) =>
        q.eq("organizationId", systemOrg._id).eq("type", "theme")
      )
      .filter((q) => q.eq(q.field("customProperties.code"), "modern-gradient"))
      .first();

    if (!existingModernGradient) {
      const modernGradient = await ctx.db.insert("objects", {
        organizationId: systemOrg._id,
        type: "theme",
        subtype: "color-scheme",
        name: "Modern Gradient",
        status: "published",
        customProperties: {
          code: "modern-gradient", // Maps to code in /src/templates/themes.ts
          description: "Purple gradient with L4YERCAK3 branding - Light theme",
          category: "brand",
          colorScheme: "purple-gradient-light",
          previewImageUrl: "https://cdn.l4yercak3.com/themes/modern-gradient.png",
          author: "L4YERCAK3 Design Team",
          version: "1.0.0",
        },
        createdBy: firstUser._id,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });
      createdThemes.push(modernGradient);
      console.log("✅ Created modern-gradient theme");
    } else {
      skippedThemes.push("modern-gradient");
      console.log("⏭️  Skipping modern-gradient (already exists)");
    }

    // 2. MODERN GRADIENT DARK THEME - maps to webPublishingThemes array in /src/templates/themes.ts
    const existingModernGradientDark = await ctx.db
      .query("objects")
      .withIndex("by_org_type", (q) =>
        q.eq("organizationId", systemOrg._id).eq("type", "theme")
      )
      .filter((q) => q.eq(q.field("customProperties.code"), "modern-gradient-dark"))
      .first();

    if (!existingModernGradientDark) {
      const modernGradientDark = await ctx.db.insert("objects", {
        organizationId: systemOrg._id,
        type: "theme",
        subtype: "color-scheme",
        name: "Modern Gradient Dark",
        status: "published",
        customProperties: {
          code: "modern-gradient-dark", // Maps to code in /src/templates/themes.ts
          description: "Purple gradient with L4YERCAK3 branding - Dark theme",
          category: "brand",
          colorScheme: "purple-gradient-dark",
          previewImageUrl: "https://cdn.l4yercak3.com/themes/modern-gradient-dark.png",
          author: "L4YERCAK3 Design Team",
          version: "1.0.0",
        },
        createdBy: firstUser._id,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });
      createdThemes.push(modernGradientDark);
      console.log("✅ Created modern-gradient-dark theme");
    } else {
      skippedThemes.push("modern-gradient-dark");
      console.log("⏭️  Skipping modern-gradient-dark (already exists)");
    }

    console.log(`\n✅ Seeding complete: ${createdThemes.length} created, ${skippedThemes.length} skipped`);
    console.log("💡 To add more themes: Add to webPublishingThemes array in /src/templates/themes.ts and run this mutation again");

    return {
      themes: createdThemes,
      message: `Successfully seeded ${createdThemes.length} new theme(s). Add more themes in /src/templates/themes.ts!`,
      created: createdThemes.length,
      skipped: skippedThemes.length,
    };
  },
});

/**
 * Seed all templates and themes (convenience function)
 *
 * Note: Call seedSystemTemplates and seedSystemThemes separately from the client.
 * This is just a helper that runs both in sequence.
 * No authentication required - this is a one-time setup mutation.
 */
export const seedAllTemplates = mutation({
  args: {},
  handler: async (ctx) => {

    // Get system organization
    const systemOrg = await ctx.db
      .query("organizations")
      .withIndex("by_slug", (q) => q.eq("slug", "system"))
      .first();

    if (!systemOrg) {
      throw new Error("System organization not found");
    }

    // Count seeded items
    const templates = await ctx.db
      .query("objects")
      .withIndex("by_org_type", (q) =>
        q.eq("organizationId", systemOrg._id).eq("type", "template")
      )
      .collect();

    const themes = await ctx.db
      .query("objects")
      .withIndex("by_org_type", (q) =>
        q.eq("organizationId", systemOrg._id).eq("type", "theme")
      )
      .collect();

    return {
      message: `Found ${templates.length} templates and ${themes.length} themes. Run seedSystemTemplates and seedSystemThemes separately if you need to seed them.`,
      templateCount: templates.length,
      themeCount: themes.length,
    };
  },
});
