/**
 * SEED TICKET PDF TEMPLATE WITH SCHEMA
 *
 * Creates schema-based ticket PDF template in the database.
 * This template includes AI instructions for intelligent template usage.
 *
 * Run with: npx convex run seedTicketPdfTemplate:seedTicketPdfTemplate
 */

import { internalMutation, internalQuery } from "./_generated/server";
import { v } from "convex/values";

export const seedTicketPdfTemplate = internalMutation({
  args: {
    overwrite: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    console.log("🔄 Starting ticket PDF template seeding with schema...");

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
      throw new Error("No users found. Create a user first before seeding templates.");
    }

    // Check if template already exists
    const existing = await ctx.db
      .query("objects")
      .withIndex("by_org_type", (q) =>
        q.eq("organizationId", systemOrg._id).eq("type", "template")
      )
      .filter((q) => q.eq(q.field("customProperties.templateCode"), "ticket_professional_v1"))
      .first();

    if (existing && !args.overwrite) {
      console.log("✅ Ticket PDF template already exists:", existing._id);
      console.log("   Use overwrite: true to update it.");
      return {
        message: "Template already exists (use overwrite: true to update)",
        templateId: existing._id,
        action: "skipped",
      };
    }

    // Complete template schema
    const customProps = {
      // Template identification
      code: "ticket_professional_v1",
      templateCode: "ticket_professional_v1", // Both for compatibility
      name: "Professional Event Ticket",
      description: "Professional event ticket with QR code validation",
      version: "1.0.0",
      category: "ticket",

      // PDF settings
      pageSize: "a4",
      orientation: "portrait",

      // AI Instructions for intelligent template usage
      aiInstructions: {
        purpose: "Generate professional event tickets with QR codes for entry validation",
        useCases: [
          "conference_tickets",
          "event_registration",
          "seminar_admission",
          "workshop_passes",
        ],
        triggers: [
          "create ticket for event",
          "send event ticket",
          "generate admission pass",
        ],
        context: {
          whenToUse: "Any event requiring admission tickets with QR validation",
          bestFor: "Professional conferences, seminars, workshops, and paid events",
          requiredData: ["event_name", "event_date", "attendee_name", "ticket_number"],
        },
        personalization: [
          "Include attendee name and email",
          "Display QR code for entry scanning",
          "Show event location and time",
          "Add sponsor logos if available",
        ],
      },

      // Styling
      styling: {
        colors: {
          primary: "#6B46C1",
          secondary: "#9F7AEA",
          background: "#FFFFFF",
          text: "#2A2A2A",
          textLight: "#64748b",
          border: "#E2E8F0",
        },
        fonts: {
          heading: "Helvetica",
          body: "Helvetica",
        },
      },

      // Template tags for discovery
      tags: ["ticket", "event", "pdf", "qr-code", "admission"],

      // Supported languages
      supportedLanguages: ["en", "de", "es", "fr"],
      defaultLanguage: "en",

      // Template status
      isDefault: true,
      isSystemTemplate: true,
    };

    let templateId: any;
    let action = "created";

    if (existing) {
      // Update existing template
      await ctx.db.patch(existing._id, {
        name: "Professional Event Ticket (PDF)",
        description: "Professional event ticket with QR code validation for conferences, seminars, and paid events",
        status: "published",
        subtype: "pdf",
        customProperties: customProps,
        updatedAt: Date.now(),
      });
      templateId = existing._id;
      action = "updated";
      console.log("🔄 Updated ticket PDF template:", templateId);
    } else {
      // Create new template
      templateId = await ctx.db.insert("objects", {
        organizationId: systemOrg._id,
        type: "template",
        subtype: "pdf",
        name: "Professional Event Ticket (PDF)",
        description: "Professional event ticket with QR code validation for conferences, seminars, and paid events",
        status: "published",
        customProperties: customProps,
        createdBy: firstUser._id,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });
      console.log("✅ Created ticket PDF template:", templateId);
    }

    console.log("\n📊 Template Details:");
    console.log("   Code: ticket_professional_v1");
    console.log("   Category: ticket");
    console.log("   Type: PDF");
    console.log("   Status: published");
    console.log("   Languages: en, de, es, fr");

    return {
      message: `Ticket PDF template ${action} successfully`,
      templateId,
      action,
      code: "ticket_professional_v1",
    };
  },
});

// Helper query to check template details
export const getTicketTemplateSchema = internalQuery({
  args: {},
  handler: async (ctx) => {
    const systemOrg = await ctx.db
      .query("organizations")
      .withIndex("by_slug", (q) => q.eq("slug", "system"))
      .first();

    if (!systemOrg) {
      return null;
    }

    const template = await ctx.db
      .query("objects")
      .withIndex("by_org_type", (q) =>
        q.eq("organizationId", systemOrg._id).eq("type", "template")
      )
      .filter((q) => q.eq(q.field("customProperties.templateCode"), "ticket_professional_v1"))
      .first();

    return template;
  },
});
