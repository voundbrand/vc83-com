/**
 * SEED TEMPLATE SETS
 *
 * Creates system-level template sets from existing templates.
 * Template sets live ONLY in the system organization.
 * Super admins grant access to organizations via templateSetAvailability.ts
 *
 * Run this script to:
 * 1. Create system default template set
 * 2. (Optional) Create additional branded template sets for licensing
 *
 * Usage:
 * ```bash
 * # Create system default template set
 * npx convex run seedTemplateSet:seedSystemDefaultSet
 *
 * # Enable template sets for organizations (super admin only)
 * Use templateSetAvailability.enableTemplateSet() mutation from UI
 * ```
 */

import { mutation } from "./_generated/server";
import { v } from "convex/values";
import { requireAuthenticatedUser } from "./rbacHelpers";

/**
 * Seed System Default Template Set
 *
 * Creates a default template set for the system organization.
 * Uses the first available ticket, invoice, and email templates.
 * No authentication required - run via CLI.
 *
 * Super admins must then enable this set for organizations via:
 * templateSetAvailability.enableTemplateSet()
 */
export const seedSystemDefaultSet = mutation({
  args: {},
  handler: async (ctx) => {
    console.log("🔄 Starting template set seeding...");

    // Get system organization
    const systemOrg = await ctx.db
      .query("organizations")
      .withIndex("by_slug", (q) => q.eq("slug", "system"))
      .first();

    if (!systemOrg) {
      throw new Error("System organization not found");
    }

    // Get first user for createdBy
    const firstUser = await ctx.db.query("users").first();
    if (!firstUser) {
      throw new Error("No users found. Create a user first before seeding template sets.");
    }

    // Check if system default already exists (use take instead of collect)
    const existingSets = await ctx.db
      .query("objects")
      .withIndex("by_org_type", (q) =>
        q.eq("organizationId", systemOrg._id).eq("type", "template_set")
      )
      .take(10); // Limit to 10 sets max

    const existingSystemDefault = existingSets.find((set) => set.customProperties?.isSystemDefault);

    // Find Professional ticket template (v2.0) - use specific filter first
    const defaultTicketTemplate = await ctx.db
      .query("objects")
      .withIndex("by_org_type", (q) =>
        q.eq("organizationId", systemOrg._id).eq("type", "template")
      )
      .filter((q) => q.eq(q.field("subtype"), "pdf"))
      .filter((q) => q.eq(q.field("status"), "published"))
      .filter((q) => q.or(
        q.eq(q.field("customProperties.code"), "ticket_professional_v1"),
        q.eq(q.field("customProperties.templateCode"), "ticket_professional_v1")
      ))
      .first();

    // Fallback: find any ticket template if specific one not found
    const fallbackTicketTemplate = !defaultTicketTemplate ? await ctx.db
      .query("objects")
      .withIndex("by_org_type", (q) =>
        q.eq("organizationId", systemOrg._id).eq("type", "template")
      )
      .filter((q) => q.eq(q.field("subtype"), "pdf"))
      .filter((q) => q.eq(q.field("status"), "published"))
      .filter((q) => q.eq(q.field("customProperties.category"), "ticket"))
      .first() : null;

    const finalTicketTemplate = defaultTicketTemplate || fallbackTicketTemplate;

    // Find Professional invoice template (v2.0)
    const defaultInvoiceTemplate = await ctx.db
      .query("objects")
      .withIndex("by_org_type", (q) =>
        q.eq("organizationId", systemOrg._id).eq("type", "template")
      )
      .filter((q) => q.eq(q.field("subtype"), "pdf"))
      .filter((q) => q.eq(q.field("status"), "published"))
      .filter((q) => q.or(
        q.eq(q.field("customProperties.code"), "invoice_b2c_receipt_v1"),
        q.eq(q.field("customProperties.templateCode"), "invoice_b2c_receipt_v1")
      ))
      .first();

    // Fallback: find any invoice template if specific one not found
    const fallbackInvoiceTemplate = !defaultInvoiceTemplate ? await ctx.db
      .query("objects")
      .withIndex("by_org_type", (q) =>
        q.eq("organizationId", systemOrg._id).eq("type", "template")
      )
      .filter((q) => q.eq(q.field("subtype"), "pdf"))
      .filter((q) => q.eq(q.field("status"), "published"))
      .filter((q) => q.or(
        q.eq(q.field("customProperties.category"), "invoice"),
        q.eq(q.field("customProperties.category"), "receipt")
      ))
      .first() : null;

    const finalInvoiceTemplate = defaultInvoiceTemplate || fallbackInvoiceTemplate;

    // Find Professional email template (event-confirmation v2.0)
    const defaultEmailTemplate = await ctx.db
      .query("objects")
      .withIndex("by_org_type", (q) =>
        q.eq("organizationId", systemOrg._id).eq("type", "template")
      )
      .filter((q) => q.eq(q.field("subtype"), "email"))
      .filter((q) => q.eq(q.field("status"), "published"))
      .filter((q) => q.or(
        q.eq(q.field("customProperties.code"), "email_event_confirmation"),
        q.eq(q.field("customProperties.templateCode"), "email_event_confirmation")
      ))
      .first();

    // Fallback: find any email template if specific one not found
    const fallbackEmailTemplate = !defaultEmailTemplate ? await ctx.db
      .query("objects")
      .withIndex("by_org_type", (q) =>
        q.eq("organizationId", systemOrg._id).eq("type", "template")
      )
      .filter((q) => q.eq(q.field("subtype"), "email"))
      .filter((q) => q.eq(q.field("status"), "published"))
      .first() : null;

    const finalEmailTemplate = defaultEmailTemplate || fallbackEmailTemplate;

    if (!finalTicketTemplate || !finalInvoiceTemplate || !finalEmailTemplate) {
      console.error("❌ Cannot create system default set: Missing required templates");
      console.error(`Found: ticket=${!!finalTicketTemplate}, invoice=${!!finalInvoiceTemplate}, email=${!!finalEmailTemplate}`);
      throw new Error(
        "Cannot create system default set: Missing required templates. " +
        `Run 'npx convex run seedPdfTemplates:seedPdfTemplates' and 'npx convex run seedEmailTemplates:seedEmailTemplates' first.`
      );
    }

    // Upsert Professional System Default template set
    let setId: any;
    let action = "created";

    if (existingSystemDefault) {
      // Update existing template set with new Professional v2.0 templates
      await ctx.db.patch(existingSystemDefault._id, {
        name: "Professional System Default",
        description: "Comprehensive Professional v2.0 template system with purple branding (#6B46C1). Includes 11 email templates (transactional, marketing, events, support), 8 PDF templates (tickets, invoices, lead magnets, quotes, badges, programs), and 4-language support (EN, DE, ES, FR). AI-adaptable with modular sections.",
        status: "active",
        customProperties: {
          ticketTemplateId: finalTicketTemplate._id,
          invoiceTemplateId: finalInvoiceTemplate._id,
          emailTemplateId: finalEmailTemplate._id,
          isDefault: true,
          isSystemDefault: true,
          tags: ["system", "default", "professional", "v2.0", "comprehensive"],
          previewImageUrl: "",
          version: "2.0.0",
          totalEmailTemplates: 11,
          totalPdfTemplates: 8,
        },
        updatedAt: Date.now(),
      });
      setId = existingSystemDefault._id;
      action = "updated";
      console.log("🔄 Updated system default template set:", setId);
    } else {
      // Create new Professional System Default template set
      setId = await ctx.db.insert("objects", {
        organizationId: systemOrg._id,
        type: "template_set",
        name: "Professional System Default",
        description: "Comprehensive Professional v2.0 template system with purple branding (#6B46C1). Includes 11 email templates (transactional, marketing, events, support), 8 PDF templates (tickets, invoices, lead magnets, quotes, badges, programs), and 4-language support (EN, DE, ES, FR). AI-adaptable with modular sections.",
        status: "active",
        customProperties: {
          ticketTemplateId: finalTicketTemplate._id,
          invoiceTemplateId: finalInvoiceTemplate._id,
          emailTemplateId: finalEmailTemplate._id,
          isDefault: true,
          isSystemDefault: true,
          tags: ["system", "default", "professional", "v2.0", "comprehensive"],
          previewImageUrl: "",
          version: "2.0.0",
          totalEmailTemplates: 11,
          totalPdfTemplates: 8,
        },
        createdBy: firstUser._id,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });
      console.log("✅ Created system default template set:", setId);
    }

    console.log("   Ticket:", finalTicketTemplate.name);
    console.log("   Invoice:", finalInvoiceTemplate.name);
    console.log("   Email:", finalEmailTemplate.name);
    console.log("\n⚠️  IMPORTANT: Super admins must enable this template set for organizations!");
    console.log("   Use templateSetAvailability.enableTemplateSet() mutation\n");

    return {
      message: `System default template set ${action} - super admins must enable for orgs`,
      setId,
      action,
      templates: {
        ticket: finalTicketTemplate.name,
        invoice: finalInvoiceTemplate.name,
        email: finalEmailTemplate.name,
      },
    };
  },
});

/**
 * DEPRECATED: Old authenticated version - use seedSystemDefaultSet instead
 */

/**
 * Seed Organization Template Sets (Simple - No Auth)
 *
 * Creates default template sets for all organizations based on their
 * current default templates. No authentication required - run via CLI.
 */
export const seedOrganizationSetsSimple = mutation({
  args: {
    organizationId: v.optional(v.id("organizations")), // Optional: seed specific org
  },
  handler: async (ctx, args) => {
    console.log("🔄 Starting organization template set seeding...");

    // Get first user for createdBy
    const firstUser = await ctx.db.query("users").first();
    if (!firstUser) {
      throw new Error("No users found. Create a user first before seeding template sets.");
    }

    // Get target organizations
    const organizations = args.organizationId
      ? [await ctx.db.get(args.organizationId)]
      : await ctx.db.query("organizations").collect();

    const results = [];

    for (const org of organizations) {
      if (!org) continue;

      // Skip system org
      if (org.slug === "system") {
        console.log(`⏭️  Skipping system organization`);
        continue;
      }

      console.log(`🔄 Processing organization: ${org.name}`);

      // Check if org already has a default set
      const existingSets = await ctx.db
        .query("objects")
        .withIndex("by_org_type", (q) =>
          q.eq("organizationId", org._id).eq("type", "template_set")
        )
        .collect();

      if (existingSets.some((set) => set.customProperties?.isDefault)) {
        console.log(`   ✅ Default set already exists for ${org.name}`);
        results.push({
          organization: org.name,
          status: "skipped",
          reason: "Default set already exists",
        });
        continue;
      }

      // Find org's default templates
      const orgTemplates = await ctx.db
        .query("objects")
        .withIndex("by_org_type", (q) =>
          q.eq("organizationId", org._id).eq("type", "template")
        )
        .filter((q) => q.eq(q.field("status"), "published"))
        .collect();

      const ticketTemplate = orgTemplates.find((t) => {
        return t.subtype === "pdf" && t.customProperties?.category === "ticket" && t.customProperties?.isDefault;
      });

      const invoiceTemplate = orgTemplates.find((t) => {
        return t.subtype === "pdf" && t.customProperties?.category === "invoice" && t.customProperties?.isDefault;
      });

      const emailTemplate = orgTemplates.find((t) => {
        return t.subtype === "email" && t.customProperties?.isDefault;
      });

      // If org has custom default templates, create a set
      if (ticketTemplate && invoiceTemplate && emailTemplate) {
        const setId = await ctx.db.insert("objects", {
          organizationId: org._id,
          type: "template_set",
          name: `${org.name} Default`,
          description: `Default template set for ${org.name}`,
          status: "active",
          customProperties: {
            ticketTemplateId: ticketTemplate._id,
            invoiceTemplateId: invoiceTemplate._id,
            emailTemplateId: emailTemplate._id,
            isDefault: true,
            tags: ["default"],
            previewImageUrl: "",
          },
          createdBy: firstUser._id,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        });

        console.log(`   ✅ Created default set for ${org.name}:`, setId);
        console.log(`      Ticket: ${ticketTemplate.name}`);
        console.log(`      Invoice: ${invoiceTemplate.name}`);
        console.log(`      Email: ${emailTemplate.name}`);

        results.push({
          organization: org.name,
          status: "created",
          setId,
        });
      } else {
        console.log(`   ⏭️  Skipping ${org.name} - missing default templates (will use system default)`);
        results.push({
          organization: org.name,
          status: "skipped",
          reason: "Missing default templates - will use system default",
        });
      }
    }

    console.log(`\n✅ Organization template set seeding complete!`);
    console.log(`   Created: ${results.filter(r => r.status === "created").length}`);
    console.log(`   Skipped: ${results.filter(r => r.status === "skipped").length}`);

    return {
      message: "Organization template sets seeded",
      results,
    };
  },
});

/**
 * Seed Organization Template Sets
 *
 * Creates default template sets for all organizations based on their
 * current default templates.
 */
export const seedOrganizationSets = mutation({
  args: {
    sessionId: v.string(),
    organizationId: v.optional(v.id("organizations")), // Optional: seed specific org
  },
  handler: async (ctx, args) => {
    // Authenticate user
    const { userId } = await requireAuthenticatedUser(ctx, args.sessionId);

    // Get target organizations
    const organizations = args.organizationId
      ? [await ctx.db.get(args.organizationId)]
      : await ctx.db.query("organizations").collect();

    const results = [];

    for (const org of organizations) {
      if (!org) continue;

      // Skip system org
      if (org.slug === "system") continue;

      // Check if org already has a default set
      const existingSets = await ctx.db
        .query("objects")
        .withIndex("by_org_type", (q) =>
          q.eq("organizationId", org._id).eq("type", "template_set")
        )
        .collect();

      if (existingSets.some((set) => set.customProperties?.isDefault)) {
        results.push({
          organization: org.name,
          status: "skipped",
          reason: "Default set already exists",
        });
        continue;
      }

      // Find org's default templates
      const orgTemplates = await ctx.db
        .query("objects")
        .withIndex("by_org_type", (q) =>
          q.eq("organizationId", org._id).eq("type", "template")
        )
        .filter((q) => q.eq(q.field("status"), "published"))
        .collect();

      const ticketTemplate = orgTemplates.find((t) => {
        return t.subtype === "pdf" && t.customProperties?.category === "ticket" && t.customProperties?.isDefault;
      });

      const invoiceTemplate = orgTemplates.find((t) => {
        return t.subtype === "pdf" && t.customProperties?.category === "invoice" && t.customProperties?.isDefault;
      });

      const emailTemplate = orgTemplates.find((t) => {
        return t.subtype === "email" && t.customProperties?.isDefault;
      });

      // If org has custom default templates, create a set
      if (ticketTemplate && invoiceTemplate && emailTemplate) {
        const setId = await ctx.db.insert("objects", {
          organizationId: org._id,
          type: "template_set",
          name: `${org.name} Default`,
          description: `Default template set for ${org.name}`,
          status: "active",
          customProperties: {
            ticketTemplateId: ticketTemplate._id,
            invoiceTemplateId: invoiceTemplate._id,
            emailTemplateId: emailTemplate._id,
            isDefault: true,
            tags: ["default"],
            previewImageUrl: "",
          },
          createdBy: userId,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        });

        results.push({
          organization: org.name,
          status: "created",
          setId,
        });
      } else {
        results.push({
          organization: org.name,
          status: "skipped",
          reason: "No complete set of default templates found",
        });
      }
    }

    return { results };
  },
});

/**
 * Create Template Set from Existing Templates
 *
 * Utility function to create a template set from specific template IDs.
 * Useful for manual migration or custom set creation.
 */
export const createTemplateSetFromTemplates = mutation({
  args: {
    sessionId: v.string(),
    organizationId: v.id("organizations"),
    name: v.string(),
    description: v.optional(v.string()),
    ticketTemplateId: v.id("objects"),
    invoiceTemplateId: v.id("objects"),
    emailTemplateId: v.id("objects"),
    setAsDefault: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    // Authenticate user
    const { userId } = await requireAuthenticatedUser(ctx, args.sessionId);

    // Validate templates exist
    const ticketTemplate = await ctx.db.get(args.ticketTemplateId);
    const invoiceTemplate = await ctx.db.get(args.invoiceTemplateId);
    const emailTemplate = await ctx.db.get(args.emailTemplateId);

    if (!ticketTemplate || !invoiceTemplate || !emailTemplate) {
      throw new Error("One or more template IDs are invalid");
    }

    // If setting as default, unset existing defaults
    if (args.setAsDefault) {
      const existingSets = await ctx.db
        .query("objects")
        .withIndex("by_org_type", (q) =>
          q.eq("organizationId", args.organizationId).eq("type", "template_set")
        )
        .collect();

      for (const set of existingSets) {
        if (set.customProperties?.isDefault) {
          await ctx.db.patch(set._id, {
            customProperties: {
              ...set.customProperties,
              isDefault: false,
            },
          });
        }
      }
    }

    // Create template set
    const setId = await ctx.db.insert("objects", {
      organizationId: args.organizationId,
      type: "template_set",
      name: args.name,
      description: args.description || "",
      status: "active",
      customProperties: {
        ticketTemplateId: args.ticketTemplateId,
        invoiceTemplateId: args.invoiceTemplateId,
        emailTemplateId: args.emailTemplateId,
        isDefault: args.setAsDefault || false,
        tags: [],
        previewImageUrl: "",
      },
      createdBy: userId,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });

    return { setId, name: args.name };
  },
});
