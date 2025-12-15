/**
 * SEED SALES NOTIFICATION EMAIL TEMPLATE
 *
 * Seeds the internal sales notification email template.
 * This is sent to sales team when new tickets/reservations are created.
 *
 * Run with:
 * ```bash
 * npx convex run seedSalesNotificationTemplate:seedSalesNotificationTemplate
 * ```
 */

import { internalMutation } from "./_generated/server";
import { v } from "convex/values";

export const seedSalesNotificationTemplate = internalMutation({
  args: {
    overwrite: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    console.log("🔄 Seeding Sales Notification Email Template...");

    // Get system organization
    const systemOrg = await ctx.db
      .query("organizations")
      .withIndex("by_slug", (q) => q.eq("slug", "system"))
      .first();

    if (!systemOrg) {
      throw new Error("System organization not found. Run seedOntologyData first.");
    }

    // Get first user for createdBy
    const firstUser = await ctx.db.query("users").first();
    if (!firstUser) {
      throw new Error("No users found. Create a user first.");
    }

    const templateCode = "email_sales_notification";

    // Check if template already exists
    const existingTemplates = await ctx.db
      .query("objects")
      .withIndex("by_org_type", (q) =>
        q.eq("organizationId", systemOrg._id).eq("type", "template")
      )
      .filter((q) => q.eq(q.field("subtype"), "email"))
      .collect();

    const existingTemplate = existingTemplates.find(
      (t) => t.customProperties?.code === templateCode
    );

    if (existingTemplate && !args.overwrite) {
      console.log("✅ Sales Notification template already exists:", existingTemplate._id);
      console.log("   Use overwrite: true to update it.");
      return {
        message: "Template already exists (use overwrite: true to update)",
        templateId: existingTemplate._id,
        action: "skipped",
      };
    }

    // Email template schema for AI editing
    const emailTemplateSchema = {
      sections: [
        {
          id: "header",
          type: "hero",
          title: "New Reservation Header",
          required: true,
          fields: {
            badge: { type: "string", default: "New Reservation" },
            title: { type: "string", default: "New Ticket Reservation" },
            timestamp: { type: "date", format: "medium" },
          },
        },
        {
          id: "guestInfo",
          type: "body",
          title: "Guest Information",
          required: true,
          fields: {
            name: { type: "string", label: "Guest Name" },
            email: { type: "string", format: "email" },
            phone: { type: "string", format: "phone", optional: true },
            guestCount: { type: "number", default: 1 },
          },
        },
        {
          id: "eventDetails",
          type: "eventDetails",
          title: "Event Details",
          required: true,
          fields: {
            eventName: { type: "string" },
            date: { type: "date" },
            time: { type: "time" },
            location: { type: "string" },
          },
        },
        {
          id: "quickActions",
          type: "cta",
          title: "Quick Actions",
          required: false,
          fields: {
            contactEmail: { type: "button", action: "mailto" },
            callPhone: { type: "button", action: "tel", optional: true },
          },
        },
        {
          id: "metadata",
          type: "body",
          title: "Reservation Metadata",
          required: false,
          fields: {
            reservationId: { type: "string" },
            reservationTime: { type: "datetime" },
          },
        },
      ],
      variables: {
        attendee: {
          firstName: "string",
          lastName: "string",
          email: "string",
          phone: "string | undefined",
          guestCount: "number",
        },
        event: {
          name: "string",
          customProperties: {
            startDate: "string",
            startTime: "string",
            location: "string",
          },
        },
        ticket: {
          _id: "string",
        },
        domain: {
          displayName: "string",
          domainName: "string",
        },
        branding: {
          primaryColor: "string",
        },
      },
      supportedLanguages: ["en", "de", "es", "fr"],
      sectionOrder: ["header", "guestInfo", "eventDetails", "quickActions", "metadata"],
    };

    const templateData = {
      organizationId: systemOrg._id,
      type: "template" as const,
      subtype: "email",
      name: "Internal Sales Notification",
      description:
        "Internal notification sent to sales team when a new ticket/reservation is created. Includes guest contact info, event details, and quick action buttons.",
      status: "published" as const,
      customProperties: {
        code: templateCode,
        category: "internal", // UI TemplateSelector queries for "internal" category
        version: "1.0.0",
        author: "System",
        emailTemplateSchema,
        supportedLanguages: ["en", "de", "es", "fr"],
        suggestedSections: ["hero", "body", "eventDetails", "cta"],
        isSystemTemplate: true,
        hasSchema: true, // Mark as schema-driven for v2.0 compatibility
      },
      createdBy: firstUser._id,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    let templateId;
    let action = "created";

    if (existingTemplate) {
      // Update existing template
      await ctx.db.patch(existingTemplate._id, {
        ...templateData,
        createdBy: existingTemplate.createdBy,
        createdAt: existingTemplate.createdAt,
      });
      templateId = existingTemplate._id;
      action = "updated";
      console.log("🔄 Updated Sales Notification template:", templateId);
    } else {
      // Create new template
      templateId = await ctx.db.insert("objects", templateData);
      console.log("✅ Created Sales Notification template:", templateId);
    }

    console.log("\n📧 Sales Notification Email Template Details:");
    console.log("   Code:", templateCode);
    console.log("   Category: internal (sales team notification)");
    console.log("   Languages: EN, DE, ES, FR");
    console.log("   Purpose: Notify sales team of new reservations");
    console.log(`   Action: ${action}`);

    return {
      message: `Sales Notification template ${action} successfully`,
      templateId,
      action,
      code: templateCode,
    };
  },
});
