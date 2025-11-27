/**
 * SEED SYSTEM DEFAULT TEMPLATE SET (v2.0 - Schema-Driven Templates Only)
 *
 * Creates a clean system default template set with ONLY schema-driven templates.
 * This set is stored in the system organization and serves as the ultimate fallback.
 *
 * v2.0 Features:
 * - ONLY schema-driven templates (6 templates: 4 email + 2 PDF)
 * - Event Confirmation Email (REQUIRED)
 * - Transaction Receipt Email (Optional)
 * - Newsletter Email (Optional)
 * - Invoice Email (Optional)
 * - B2B Invoice PDF (Optional)
 * - Ticket PDF (Optional)
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

    // Find our 6 schema-driven templates by code
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
      t.customProperties?.code === "ticket_standard_v1" ||
      t.customProperties?.templateCode === "ticket_standard_v1"
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

    console.log(`✅ Found all 6 schema-driven templates`);

    // Build clean template array with only schema-driven templates (v2.0)
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
        isRequired: false,
        displayOrder: 5,
      },
      // Ticket PDF - Optional (but critical for events)
      {
        templateId: ticketPdfTemplate._id,
        templateType: "ticket",
        isRequired: false,
        displayOrder: 6,
      },
    ];

    console.log(`✅ Built template set with ${templatesList.length} schema-driven templates`);

    // Build customProperties for v2.0 format (schema-driven only)
    const customProps = {
      version: "2.0",
      templates: templatesList,
      isDefault: true,
      isSystemDefault: true,
      tags: ["system", "default", "schema-driven", "v2.0", "ai-ready"],
      previewImageUrl: "",
      totalEmailTemplates: 4, // event, receipt, newsletter, invoice email
      totalPdfTemplates: 2, // b2b invoice, ticket

      // Core template IDs
      eventTemplateId: eventConfirmationTemplate._id,
      receiptTemplateId: transactionReceiptTemplate._id,
      newsletterTemplateId: newsletterTemplate._id,
      invoiceEmailTemplateId: invoiceEmailTemplate._id,
      invoiceTemplateId: invoiceB2BPdfTemplate._id,
      ticketTemplateId: ticketPdfTemplate._id,
    };

    let setId: any;
    let action = "created";

    if (existingSystemDefault) {
      // Update existing set
      await ctx.db.patch(existingSystemDefault._id, {
        name: "System Default Template Set (v2.0 - Schema-Driven)",
        description: `Clean, schema-driven template system with 6 AI-ready templates (4 email + 2 PDF). Includes Event Confirmation (required), Transaction Receipt, Newsletter, Invoice Email, B2B Invoice PDF, and Ticket PDF. All templates use schema architecture for AI editing and maximum flexibility. Supports 4+ languages (EN, DE, ES, FR). Ultimate fallback for all organizations.`,
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
        description: `Clean, schema-driven template system with 6 AI-ready templates (4 email + 2 PDF). Includes Event Confirmation (required), Transaction Receipt, Newsletter, Invoice Email, B2B Invoice PDF, and Ticket PDF. All templates use schema architecture for AI editing and maximum flexibility. Supports 4+ languages (EN, DE, ES, FR). Ultimate fallback for all organizations.`,
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
    console.log(`      💰 B2B Invoice PDF: ${invoiceB2BPdfTemplate.name}`);
    console.log(`      🎫 Ticket PDF: ${ticketPdfTemplate.name}`);

    console.log("\n✅ System default template set seeding complete!");
    console.log("   All organizations will now fall back to this schema-driven set.");
    console.log("   🚀 All 6 templates are AI-ready with full schema support!");

    return {
      message: `System default template set ${action} successfully (Schema-Driven v2.0)`,
      setId,
      action,
      version: "2.0",
      templateCount: templatesList.length,
      breakdown: {
        requiredTemplates: 1, // event confirmation
        optionalTemplates: 5, // receipt, newsletter, invoice email, invoice PDF, ticket PDF
        emailTemplates: 4,
        pdfTemplates: 2, // invoice + ticket
        allSchemaDriven: true,
      },
    };
  },
});
