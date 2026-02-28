/**
 * SEED SYSTEM DEFAULT TEMPLATE SET (v2.0 - Schema-Driven Templates Only)
 *
 * Creates a clean system default template set with ONLY schema-driven templates.
 * This set is stored in the system organization and serves as the ultimate fallback.
 *
 * v2.0 Features:
 * - Starter transacting bundle (9 templates: 5 email + 2 PDF + 1 page + 1 checkout)
 * - Event Confirmation Email (REQUIRED)
 * - Transaction Receipt Email (Optional)
 * - Newsletter Email (Optional)
 * - Invoice Email (Optional)
 * - Sales Notification Email (Optional) - Internal team notification
 * - B2B Invoice PDF (REQUIRED starter doc)
 * - Ticket PDF (REQUIRED starter doc)
 * - Event Landing Page (REQUIRED starter web surface)
 * - Behavior-Driven Checkout (REQUIRED starter checkout surface)
 * - AI-ready with full schema support
 * - Clean, future-proof architecture
 *
 * Run this after seeding schema templates:
 * ```bash
 * npx convex run seedSystemDefaultTemplateSet:seedSystemDefaultTemplateSet '{"overwrite": true}'
 * ```
 */

import { internalMutation } from "./_generated/server";
import { v } from "convex/values";

export const seedSystemDefaultTemplateSet = internalMutation({
  args: {
    overwrite: v.optional(v.boolean()), // Set to true to update existing set
  },
  handler: async (ctx, args) => {
    console.log("🔄 Starting system default template set seeding (v2.0)...");

    // Get system organization
    const systemOrg = await ctx.db
      .query("organizations")
      .withIndex("by_slug", (q) => q.eq("slug", "system"))
      .first();

    if (!systemOrg) {
      throw new Error("System organization not found. Please run seedOntologyData first.");
    }

    // Get first user for createdBy
    const firstUser = await ctx.db.query("users").first();
    if (!firstUser) {
      throw new Error("No users found. Create a user first.");
    }

    // Check if system default already exists
    const existingSets = await ctx.db
      .query("objects")
      .withIndex("by_org_type", (q) =>
        q.eq("organizationId", systemOrg._id).eq("type", "template_set")
      )
      .take(10);

    const existingSystemDefault = existingSets.find((set) => set.customProperties?.isSystemDefault);

    if (existingSystemDefault && !args.overwrite) {
      console.log("✅ System default template set already exists:", existingSystemDefault._id);
      console.log("   Use overwrite: true to update it.");
      return {
        message: "System default already exists (use overwrite: true to update)",
        setId: existingSystemDefault._id,
        action: "skipped",
      };
    }

    // Fetch all system templates
    const systemTemplates = await ctx.db
      .query("objects")
      .withIndex("by_org_type", (q) =>
        q.eq("organizationId", systemOrg._id).eq("type", "template")
      )
      .filter((q) => q.eq(q.field("status"), "published"))
      .collect();

    console.log(`📦 Found ${systemTemplates.length} system templates`);

    // Find starter bundle templates by code
    const eventConfirmationTemplate = systemTemplates.find((t) =>
      t.customProperties?.code === "event-confirmation-v2"
    );
    const transactionReceiptTemplate = systemTemplates.find((t) =>
      t.customProperties?.code === "transaction-receipt-v2"
    );
    const newsletterTemplate = systemTemplates.find((t) =>
      t.customProperties?.code === "newsletter-confirmation"
    );
    const invoiceEmailTemplate = systemTemplates.find((t) =>
      t.customProperties?.code === "invoice-email-v2" ||
      t.customProperties?.code === "email_invoice_send" // Fallback to old version
    );
    const invoiceB2BPdfTemplate = systemTemplates.find((t) =>
      t.customProperties?.code === "invoice_b2b_single_v1" ||
      t.customProperties?.templateCode === "invoice_b2b_single_v1"
    );
    const ticketPdfTemplate = systemTemplates.find((t) =>
      t.customProperties?.code === "ticket_professional_v1" ||
      t.customProperties?.templateCode === "ticket_professional_v1"
    );
    const salesNotificationTemplate = systemTemplates.find((t) =>
      t.customProperties?.code === "email_sales_notification"
    );
    const eventLandingTemplate = systemTemplates.find((t) =>
      (t.customProperties?.code === "event-landing" || t.customProperties?.code === "landing-page") &&
      t.subtype === "page"
    );
    const checkoutSurfaceTemplate = systemTemplates.find((t) =>
      (t.customProperties?.code === "behavior-driven-checkout" ||
        t.customProperties?.code === "ticket-checkout") &&
      t.subtype === "checkout"
    );

    // Verify we have the required templates
    if (!eventConfirmationTemplate) {
      throw new Error(
        "Event Confirmation template not found. Run: npx convex run seedEventConfirmationTemplate:seedEventConfirmationTemplate"
      );
    }
    if (!transactionReceiptTemplate) {
      throw new Error(
        "Transaction Receipt template not found. Run: npx convex run seedTransactionReceiptTemplate:seedTransactionReceiptTemplate"
      );
    }
    if (!newsletterTemplate) {
      throw new Error(
        "Newsletter template not found. Run: npx convex run seedNewsletterTemplate:seedNewsletterTemplate"
      );
    }
    if (!invoiceEmailTemplate) {
      throw new Error(
        "Invoice Email template not found. Run: npx convex run seedInvoiceEmailTemplateV2:seedInvoiceEmailTemplateV2"
      );
    }
    if (!invoiceB2BPdfTemplate) {
      throw new Error(
        "B2B Invoice PDF template not found. Run: npx convex run seedInvoiceB2BTemplate:seedInvoiceB2BTemplate"
      );
    }
    if (!ticketPdfTemplate) {
      throw new Error(
        "Ticket PDF template not found. Run: npx convex run seedTicketPdfTemplate:seedTicketPdfTemplate"
      );
    }
    if (!salesNotificationTemplate) {
      throw new Error(
        "Sales Notification template not found. Run: npx convex run seedSalesNotificationTemplate:seedSalesNotificationTemplate"
      );
    }
    if (!eventLandingTemplate) {
      throw new Error(
        "Event landing page template not found. Run: npx convex run seedTemplates:seedSystemTemplates"
      );
    }
    if (!checkoutSurfaceTemplate) {
      throw new Error(
        "Checkout surface template not found. Run: npx convex run seedCheckoutTemplates:seedCheckoutTemplates"
      );
    }

    console.log(`✅ Found all starter transacting templates`);

    // Build starter template array with transacting defaults (v2.0)
    const templatesList: Array<{
      templateId: string;
      templateType: string;
      isRequired: boolean;
      displayOrder: number;
    }> = [
      // Event Confirmation - REQUIRED (most critical template)
      {
        templateId: eventConfirmationTemplate._id,
        templateType: "event",
        isRequired: true,
        displayOrder: 1,
      },
      // Transaction Receipt - Optional
      {
        templateId: transactionReceiptTemplate._id,
        templateType: "receipt",
        isRequired: false,
        displayOrder: 2,
      },
      // Newsletter - Optional
      {
        templateId: newsletterTemplate._id,
        templateType: "newsletter",
        isRequired: false,
        displayOrder: 3,
      },
      // Invoice Email - Optional
      {
        templateId: invoiceEmailTemplate._id,
        templateType: "invoice_email",
        isRequired: false,
        displayOrder: 4,
      },
      // B2B Invoice PDF - Optional
      {
        templateId: invoiceB2BPdfTemplate._id,
        templateType: "invoice",
        isRequired: true,
        displayOrder: 5,
      },
      // Ticket PDF - REQUIRED starter document
      {
        templateId: ticketPdfTemplate._id,
        templateType: "ticket",
        isRequired: true,
        displayOrder: 6,
      },
      // Sales Notification Email - Optional (internal team notification)
      {
        templateId: salesNotificationTemplate._id,
        templateType: "sales_notification",
        isRequired: false,
        displayOrder: 7,
      },
      // Event Landing Page - REQUIRED starter web surface
      {
        templateId: eventLandingTemplate._id,
        templateType: "web_event_page",
        isRequired: true,
        displayOrder: 8,
      },
      // Checkout Surface - REQUIRED starter checkout surface
      {
        templateId: checkoutSurfaceTemplate._id,
        templateType: "checkout_surface",
        isRequired: true,
        displayOrder: 9,
      },
    ];

    console.log(`✅ Built starter transacting bundle with ${templatesList.length} templates`);

    // Build customProperties for v2.0 format (schema-driven only)
    const customProps = {
      version: "2.0",
      templates: templatesList,
      isDefault: true,
      isSystemDefault: true,
      tags: ["system", "default", "starter-transacting", "schema-driven", "v2.0", "ai-ready"],
      previewImageUrl: "",
      totalEmailTemplates: 5, // event, receipt, newsletter, invoice email, sales notification
      totalPdfTemplates: 2, // b2b invoice, ticket
      totalPageTemplates: 1, // event landing page
      totalCheckoutTemplates: 1, // behavior-driven checkout
      starterBundleVersion: "starter-transacting-v1",

      // Core template IDs
      eventTemplateId: eventConfirmationTemplate._id,
      receiptTemplateId: transactionReceiptTemplate._id,
      newsletterTemplateId: newsletterTemplate._id,
      invoiceEmailTemplateId: invoiceEmailTemplate._id,
      invoiceTemplateId: invoiceB2BPdfTemplate._id,
      ticketTemplateId: ticketPdfTemplate._id,
      salesNotificationTemplateId: salesNotificationTemplate._id,
      eventPageTemplateId: eventLandingTemplate._id,
      checkoutSurfaceTemplateId: checkoutSurfaceTemplate._id,
    };

    let setId: any;
    let action = "created";

    if (existingSystemDefault) {
      // Update existing set
      await ctx.db.patch(existingSystemDefault._id, {
        name: "System Default Template Set (v2.0 - Schema-Driven)",
        description: `Starter transacting template system with 9 AI-ready defaults (5 email + 2 PDF + 1 web page + 1 checkout surface). Includes Event Confirmation, Transaction Receipt, Newsletter, Invoice Email, Sales Notification, B2B Invoice PDF, Ticket PDF, Event Landing Page, and Behavior-Driven Checkout. All templates use schema architecture for AI editing and first-run transaction readiness.`,
        status: "active",
        customProperties: customProps,
        updatedAt: Date.now(),
      });
      setId = existingSystemDefault._id;
      action = "updated";
      console.log("🔄 Updated system default template set:", setId);
    } else {
      // Create new set
      setId = await ctx.db.insert("objects", {
        organizationId: systemOrg._id,
        type: "template_set",
        name: "System Default Template Set (v2.0 - Schema-Driven)",
        description: `Starter transacting template system with 9 AI-ready defaults (5 email + 2 PDF + 1 web page + 1 checkout surface). Includes Event Confirmation, Transaction Receipt, Newsletter, Invoice Email, Sales Notification, B2B Invoice PDF, Ticket PDF, Event Landing Page, and Behavior-Driven Checkout. All templates use schema architecture for AI editing and first-run transaction readiness.`,
        status: "active",
        customProperties: customProps,
        createdBy: firstUser._id,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });
      console.log("✅ Created system default template set:", setId);
    }

    // Create objectLinks for all templates
    // First, delete any existing links if updating
    if (existingSystemDefault) {
      const existingLinks = await ctx.db
        .query("objectLinks")
        .withIndex("by_from_link_type", (q) =>
          q.eq("fromObjectId", setId).eq("linkType", "includes_template")
        )
        .collect();

      for (const link of existingLinks) {
        await ctx.db.delete(link._id);
      }
    }

    // Create new links
    for (const t of templatesList) {
      await ctx.db.insert("objectLinks", {
        organizationId: systemOrg._id,
        fromObjectId: setId,
        toObjectId: t.templateId as any,
        linkType: "includes_template",
        properties: {
          templateType: t.templateType,
          isRequired: t.isRequired,
          displayOrder: t.displayOrder,
        },
        createdBy: firstUser._id,
        createdAt: Date.now(),
      });
    }

    console.log(`✅ Created ${templatesList.length} template links`);

    // Log template breakdown
    console.log("\n📊 Template Set Contents (Schema-Driven):");
    console.log("   Required Templates:");
    console.log(`      ✉️  Event Confirmation: ${eventConfirmationTemplate.name}`);
    console.log("   Optional Templates:");
    console.log(`      💳 Transaction Receipt: ${transactionReceiptTemplate.name}`);
    console.log(`      📧 Newsletter: ${newsletterTemplate.name}`);
    console.log(`      📄 Invoice Email: ${invoiceEmailTemplate.name}`);
    console.log(`      🔔 Sales Notification: ${salesNotificationTemplate.name}`);
    console.log(`      💰 B2B Invoice PDF: ${invoiceB2BPdfTemplate.name}`);
    console.log(`      🎫 Ticket PDF: ${ticketPdfTemplate.name}`);
    console.log(`      🌐 Event Landing Page: ${eventLandingTemplate.name}`);
    console.log(`      🛒 Checkout Surface: ${checkoutSurfaceTemplate.name}`);

    console.log("\n✅ System default template set seeding complete!");
    console.log("   All organizations will now fall back to this schema-driven set.");
    console.log("   🚀 All starter templates are AI-ready with full schema support!");

    return {
      message: `System default template set ${action} successfully (Starter Transacting v2.0)`,
      setId,
      action,
      version: "2.0",
      templateCount: templatesList.length,
      breakdown: {
        requiredTemplates: 5, // event email, invoice PDF, ticket PDF, event page, checkout surface
        optionalTemplates: 4, // receipt, newsletter, invoice email, sales notification
        emailTemplates: 5, // event, receipt, newsletter, invoice, sales notification
        pdfTemplates: 2, // invoice + ticket
        pageTemplates: 1,
        checkoutTemplates: 1,
        allSchemaDriven: true,
      },
    };
  },
});
