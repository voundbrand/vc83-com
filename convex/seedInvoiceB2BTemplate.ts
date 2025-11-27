/**
 * SEED B2B INVOICE TEMPLATE WITH SCHEMA
 *
 * Creates schema-based B2B invoice template in the database.
 * This template includes AI instructions for intelligent template usage.
 *
 * Run with: npx convex run seedInvoiceB2BTemplate:seedInvoiceB2BTemplate
 */

import { internalMutation } from "./_generated/server";
import { INVOICE_B2B_SINGLE_V1 } from "./pdfTemplateRegistry";

export const seedInvoiceB2BTemplate = internalMutation({
  args: {},
  handler: async (ctx) => {
    console.log("🔄 Starting B2B invoice template seeding with schema...");

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

    // Check if template already exists (search by templateCode regardless of subtype)
    // This allows us to migrate old templates with subtype "pdf" to subtype "invoice"
    const existing = await ctx.db
      .query("objects")
      .withIndex("by_org_type", (q) =>
        q.eq("organizationId", systemOrg._id).eq("type", "template")
      )
      .filter((q) => q.eq(q.field("customProperties.templateCode"), "invoice_b2b_single_v1"))
      .first();

    // Complete template schema matching PdfTemplateSchema interface
    const templateSchema = {
      // BaseTemplateSchema fields
      version: "1.0.0",
      type: "pdf" as const,
      category: "invoice",
      code: "invoice_b2b_single_v1",
      name: "B2B Single Invoice",
      description: "Professional invoice for individual B2B transactions with complete VAT breakdown",
      author: "VC83 System",

      // PdfTemplateSchema fields
      pageSize: "a4" as const,
      orientation: "portrait" as const,
      margins: {
        top: "20mm",
        right: "20mm",
        bottom: "20mm",
        left: "20mm",
      },

      // Layout with sections (currently using HTML/CSS from registry)
      layout: {
        sections: [], // Will be populated when we convert HTML to schema sections
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
        spacing: {
          unit: "8px",
        },
      },

      // AI Instructions for intelligent template usage
      aiInstructions: {
        purpose: "Generate formal VAT-compliant invoices for B2B customers in EU markets",
        useCases: [
          "conference_registration_billing",
          "b2b_service_invoicing",
          "subscription_billing",
          "one_time_purchase_invoice",
        ],
        triggers: [
          "create invoice for company",
          "send B2B invoice",
          "bill organization",
          "generate business invoice",
          "conference invoice",
        ],
        requiredContext: [
          "transaction_data",
          "customer_vat_info",
          "organization_details",
        ],
        previewRecommended: true,
        supportsBatchGeneration: true,
        specialInstructions:
          "Always validate VAT numbers for EU customers. Include reverse charge note if customer is EU but outside seller's country. Use NET30 payment terms by default for B2B.",
        batchGuidelines: {
          maxBatchSize: 100,
          groupBy: "customer_organization",
          consolidateItems: true,
        },
      },

      // Variables with AI instructions
      variables: [
        {
          name: "invoiceNumber",
          type: "string",
          required: true,
          description: "Unique invoice identifier",
          example: "INV-2025-001234",
          aiInstructions:
            "Generate using format INV-YYYY-NNNNNN where NNNNNN is sequential. Query database for last invoice number to ensure no gaps.",
        },
        {
          name: "invoiceDate",
          type: "date",
          required: true,
          description: "Invoice issue date",
          example: "January 15, 2025",
          aiInstructions:
            "Default to current date unless user specifies different date. Format as 'Month DD, YYYY' for readability.",
        },
        {
          name: "dueDate",
          type: "date",
          required: true,
          description: "Payment due date",
          example: "February 14, 2025",
          aiInstructions:
            "Calculate as invoiceDate + payment terms (default NET30 = 30 days). User can override.",
        },
        {
          name: "billTo",
          type: "object",
          required: true,
          description: "Billing company information",
          aiInstructions:
            "Fetch from customer record. Validate VAT number format for EU customers. Include all required fields for legal compliance.",
        },
        {
          name: "items",
          type: "array",
          required: true,
          description: "Invoice line items with VAT breakdown",
          aiInstructions:
            "Each item needs: description, quantity, unitPrice (net in cents), taxRate, taxAmount (cents), totalPrice (gross in cents). Calculate VAT correctly based on customer country and tax rules.",
        },
        {
          name: "subtotal",
          type: "number",
          required: true,
          description: "Subtotal (net) in cents, before tax",
          example: 6639,
          aiInstructions: "Sum of all item unitPrice * quantity. Must be in cents for precision.",
        },
        {
          name: "taxRate",
          type: "number",
          required: true,
          description: "Overall tax rate as percentage",
          example: 19,
          aiInstructions:
            "Use customer's country tax rate. Germany=19%, France=20%, Spain=21%, etc.",
        },
        {
          name: "tax",
          type: "number",
          required: true,
          description: "Total tax amount (VAT) in cents",
          example: 1261,
          aiInstructions: "Sum of all item taxAmount. Must equal subtotal * taxRate / 100.",
        },
        {
          name: "total",
          type: "number",
          required: true,
          description: "Total amount (gross) in cents, including tax",
          example: 7900,
          aiInstructions: "Must equal subtotal + tax. This is the amount customer pays.",
        },
        {
          name: "currency",
          type: "string",
          required: true,
          description: "Currency symbol",
          example: "€",
          aiInstructions:
            "Default to € for EU customers, $ for US, £ for UK. Check organization's default currency settings.",
        },
      ],

    };

    if (!existing) {
      // Create new template with full schema (same pattern as email templates)
      const templateId = await ctx.db.insert("objects", {
        organizationId: systemOrg._id,
        type: "template",
        subtype: "pdf", // PDF template (category is "invoice" in customProperties)
        name: templateSchema.name,
        description: templateSchema.description,
        status: "published",
        customProperties: {
          // Template identification
          code: templateSchema.code, // Legacy field
          templateCode: templateSchema.code, // Required field for template resolution
          category: templateSchema.category, // "invoice"
          version: templateSchema.version,

          // Template definition from registry (HTML/CSS approach)
          html: INVOICE_B2B_SINGLE_V1.template.html,
          css: INVOICE_B2B_SINGLE_V1.template.css,
          requiredFields: INVOICE_B2B_SINGLE_V1.requiredFields,
          defaultStyling: INVOICE_B2B_SINGLE_V1.defaultStyling,

          // API Template.io configuration
          apiTemplate: INVOICE_B2B_SINGLE_V1.apiTemplate,

          // FULL SCHEMA (like emailTemplateSchema for email templates)
          templateSchema: templateSchema,

          // Template metadata
          isDefault: false,
          previewImageUrl: INVOICE_B2B_SINGLE_V1.previewImageUrl,
        },
        createdBy: firstUser._id,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });

      console.log("✅ Created B2B invoice template with schema:", templateId);
      console.log("   Template code:", templateSchema.code);
      console.log("   Version:", templateSchema.version);
      console.log("   AI Instructions:");
      console.log("     - Use cases:", templateSchema.aiInstructions.useCases.join(", "));
      console.log("     - Batch support:", templateSchema.aiInstructions.supportsBatchGeneration);
      console.log("     - Preview recommended:", templateSchema.aiInstructions.previewRecommended);
      console.log("   Variables with AI instructions:", templateSchema.variables.length);

      return {
        success: true,
        action: "created",
        templateId,
        templateCode: templateSchema.code,
        aiEnabled: true,
      };
    } else {
      // Update existing template with full schema
      await ctx.db.patch(existing._id, {
        name: templateSchema.name,
        description: templateSchema.description,
        status: "published", // Ensure it's published
        subtype: "pdf", // PDF template (category is "invoice" in customProperties)
        customProperties: {
          // Template identification
          code: templateSchema.code,
          templateCode: templateSchema.code,
          category: templateSchema.category, // "invoice"
          version: templateSchema.version,

          // Template definition from registry (HTML/CSS approach)
          html: INVOICE_B2B_SINGLE_V1.template.html,
          css: INVOICE_B2B_SINGLE_V1.template.css,
          requiredFields: INVOICE_B2B_SINGLE_V1.requiredFields,
          defaultStyling: INVOICE_B2B_SINGLE_V1.defaultStyling,

          // API Template.io configuration
          apiTemplate: INVOICE_B2B_SINGLE_V1.apiTemplate,

          // FULL SCHEMA (same as email template pattern)
          templateSchema: templateSchema,

          // Preserve existing settings
          isDefault: existing.customProperties?.isDefault || false,
          previewImageUrl: INVOICE_B2B_SINGLE_V1.previewImageUrl,
        },
        updatedAt: Date.now(),
      });

      console.log("🔄 Updated existing B2B invoice template with schema:", existing._id);
      console.log("   Template code:", templateSchema.code);
      console.log("   Version:", templateSchema.version);
      console.log("   ✨ Schema now visible in UI");

      return {
        success: true,
        action: "updated",
        templateId: existing._id,
        templateCode: templateSchema.code,
        aiEnabled: true,
      };
    }
  },
});

/**
 * Get Invoice B2B Template Schema
 *
 * Query to retrieve the AI-enhanced template schema for client-side use
 */
export const getInvoiceB2BTemplateSchema = internalMutation({
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

    // Find template
    const template = await ctx.db
      .query("objects")
      .withIndex("by_org_type", (q) =>
        q.eq("organizationId", systemOrg._id).eq("type", "template")
      )
      .filter((q) => q.eq(q.field("subtype"), "pdf"))
      .filter((q) => q.eq(q.field("customProperties.templateCode"), "invoice_b2b_single_v1"))
      .first();

    if (!template) {
      return null;
    }

    // Return AI-enhanced schema
    return {
      _id: template._id,
      code: template.customProperties?.templateCode,
      name: template.name,
      description: template.description,
      category: template.customProperties?.category,
      version: template.customProperties?.version,
      aiInstructions: template.customProperties?.aiInstructions,
      variables: template.customProperties?.variables,
      previewData: template.customProperties?.previewData,
      supportedLanguages: template.customProperties?.supportedLanguages,
      defaultBrandColor: template.customProperties?.defaultBrandColor,
    };
  },
});
