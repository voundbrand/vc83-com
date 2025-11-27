import { internalMutation } from "./_generated/server";

/**
 * SEED INVOICE EMAIL TEMPLATE WITH RICH SCHEMA (v2.0)
 *
 * Complete rewrite of invoice email template using rich EmailTemplateSchema.
 * This replaces the old HTML-based invoice email with a proper schema-driven version.
 *
 * Run with: npx convex run seedInvoiceEmailTemplate-v2:seedInvoiceEmailTemplateV2
 */
export const seedInvoiceEmailTemplateV2 = internalMutation({
  args: {},
  handler: async (ctx) => {
    console.log("🔄 Seeding invoice email template v2.0 with rich schema...");

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

    // Invoice Email template schema (rich schema pattern)
    const invoiceEmailSchema = {
      code: "invoice-email-v2", // Schema-based template code (NOT the old registry code)
      name: "B2B Invoice Email (Schema-Based)",
      description: "Professional invoice delivery email with attached PDF invoice. Includes payment instructions, due date, and quick payment link.",
      category: "invoice",
      version: "2.0.0",
      defaultSections: [
        {
          type: "hero",
          title: "Invoice from {companyName}",
          subtitle: "Invoice #{invoiceNumber}",
          image: "{companyLogoUrl}"
        },
        {
          type: "body",
          paragraphs: [
            "Dear {customerName},",
            "",
            "Thank you for your business! Please find your invoice attached to this email.",
            ""
          ]
        },
        {
          type: "body",
          sections: [
            {
              title: "📄 Invoice Number",
              content: "{invoiceNumber}",
              icon: "file-text"
            },
            {
              title: "📅 Invoice Date",
              content: "{invoiceDate}",
              icon: "calendar"
            },
            {
              title: "⏰ Due Date",
              content: "{dueDate}",
              icon: "clock"
            },
            {
              title: "💰 Amount Due",
              content: "{totalFormatted}",
              icon: "dollar-sign"
            }
          ]
        },
        {
          type: "body",
          paragraphs: [
            "",
            "**Payment Instructions:**",
            "{paymentInstructions}",
            ""
          ]
        },
        {
          type: "cta",
          text: "Pay Invoice Online",
          url: "{paymentUrl}",
          style: "primary"
        },
        {
          type: "body",
          paragraphs: [
            "",
            "The detailed invoice is attached as a PDF document. If you have any questions about this invoice, please don't hesitate to contact us.",
            "",
            "Best regards,",
            "{companyName}",
            ""
          ]
        }
      ],
      defaultBrandColor: "#6B46C1",
      supportedLanguages: ["en", "de", "es", "fr"],
      variables: [
        {
          name: "customerName",
          type: "string",
          description: "Customer's name or company name",
          required: true,
          defaultValue: "Acme Corporation",
          aiInstructions: "Use customer's company name if B2B, or full name if B2C. Format: 'FirstName LastName' or 'Company Name'"
        },
        {
          name: "customerEmail",
          type: "email",
          description: "Customer's billing email",
          required: true,
          defaultValue: "billing@acmecorp.com"
        },
        {
          name: "companyName",
          type: "string",
          description: "Your company name",
          required: true,
          defaultValue: "Your Company GmbH",
          aiInstructions: "Use the organization's legal business name from settings"
        },
        {
          name: "companyLogoUrl",
          type: "url",
          description: "Company logo URL (optional)",
          required: false,
          defaultValue: "https://placehold.co/200x50/6B46C1/white?text=Company+Logo"
        },
        {
          name: "invoiceNumber",
          type: "string",
          description: "Unique invoice number",
          required: true,
          defaultValue: "INV-2025-001234",
          aiInstructions: "Generate sequential invoice number. Format: 'INV-YYYY-NNNNNN'"
        },
        {
          name: "invoiceDate",
          type: "string",
          description: "Invoice issue date",
          required: true,
          defaultValue: "January 27, 2025",
          aiInstructions: "Format as 'Month Day, Year' for readability"
        },
        {
          name: "dueDate",
          type: "string",
          description: "Payment due date",
          required: true,
          defaultValue: "February 26, 2025",
          aiInstructions: "Calculate based on payment terms (e.g., Net 30). Format as 'Month Day, Year'"
        },
        {
          name: "totalFormatted",
          type: "string",
          description: "Total amount due (formatted with currency)",
          required: true,
          defaultValue: "€1,234.56",
          aiInstructions: "Include currency symbol and proper formatting (e.g., '€1,234.56', '$1,234.56', '£1,234.56')"
        },
        {
          name: "subtotalFormatted",
          type: "string",
          description: "Subtotal before tax",
          required: true,
          defaultValue: "€1,037.79"
        },
        {
          name: "taxFormatted",
          type: "string",
          description: "Tax amount (VAT/Sales Tax)",
          required: true,
          defaultValue: "€196.77 (19% VAT)",
          aiInstructions: "Include tax rate for transparency. Format: '{amount} ({rate}% VAT)'"
        },
        {
          name: "paymentInstructions",
          type: "string",
          description: "How to pay the invoice",
          required: true,
          defaultValue: "Please transfer the amount to:\nIBAN: DE89 3704 0044 0532 0130 00\nBIC: COBADEFFXXX\nReference: INV-2025-001234",
          aiInstructions: "Include bank details for wire transfer, or alternative payment methods. Always include invoice number as reference."
        },
        {
          name: "paymentUrl",
          type: "url",
          description: "Online payment link (optional)",
          required: false,
          defaultValue: "https://example.com/pay/INV-2025-001234",
          aiInstructions: "Generate secure payment link if online payment is available. Include invoice ID in URL."
        },
        {
          name: "paymentTerms",
          type: "string",
          description: "Payment terms (e.g., Net 30, Net 60)",
          required: false,
          defaultValue: "Net 30",
          aiInstructions: "Specify payment terms (e.g., 'Net 30', 'Due on Receipt', 'Net 60')"
        },
        {
          name: "currency",
          type: "string",
          description: "Currency code",
          required: true,
          defaultValue: "EUR",
          aiInstructions: "Use ISO currency code (EUR, USD, GBP, etc.)"
        },
        {
          name: "lineItems",
          type: "array",
          description: "Invoice line items summary",
          required: false,
          defaultValue: "[{\"description\": \"Professional Services\", \"quantity\": \"10 hours\", \"rate\": \"€95.00/hour\", \"amount\": \"€950.00\"}]",
          aiInstructions: "Array of line items: [{description, quantity, rate, amount}]. Keep concise for email summary."
        },
        {
          name: "notes",
          type: "string",
          description: "Additional notes or terms",
          required: false,
          defaultValue: "Payment is due within 30 days. Late payments may incur interest charges.",
          aiInstructions: "Include important terms, late payment policies, or special notes"
        },
        {
          name: "supportEmail",
          type: "email",
          description: "Contact email for invoice questions",
          required: true,
          defaultValue: "billing@example.com",
          aiInstructions: "Use company's billing or accounting support email"
        },
        {
          name: "companyAddress",
          type: "string",
          description: "Company's legal address",
          required: false,
          defaultValue: "123 Business Street, 10115 Berlin, Germany"
        },
        {
          name: "companyPhone",
          type: "string",
          description: "Company phone number",
          required: false,
          defaultValue: "+49 30 1234 5678"
        },
        {
          name: "companyWebsite",
          type: "url",
          description: "Company website URL",
          required: false,
          defaultValue: "https://example.com"
        },
        {
          name: "taxId",
          type: "string",
          description: "Company tax ID / VAT number",
          required: false,
          defaultValue: "DE123456789",
          aiInstructions: "Include VAT number for B2B invoices in EU"
        }
      ],
      previewData: {
        header: {
          brandColor: "#6B46C1",
          companyName: "VC83 GmbH",
          logo: "https://placehold.co/200x50/6B46C1/white?text=VC83"
        },
        recipient: {
          customerName: "Acme Corporation",
          customerEmail: "billing@acmecorp.com"
        },
        companyName: "VC83 GmbH",
        companyLogoUrl: "https://placehold.co/200x50/6B46C1/white?text=VC83",
        invoiceNumber: "INV-2025-001234",
        invoiceDate: "January 27, 2025",
        dueDate: "February 26, 2025",
        totalFormatted: "€1,234.56",
        subtotalFormatted: "€1,037.79",
        taxFormatted: "€196.77 (19% VAT)",
        paymentInstructions: "Please transfer the amount to:\n\nIBAN: DE89 3704 0044 0532 0130 00\nBIC: COBADEFFXXX\nBank: Commerzbank AG\nReference: INV-2025-001234\n\nAlternatively, use the 'Pay Invoice Online' button above for instant payment via credit card or PayPal.",
        paymentUrl: "https://vc83.com/pay/INV-2025-001234",
        paymentTerms: "Net 30",
        currency: "EUR",
        lineItems: [
          { description: "Website Development", quantity: "1", rate: "€450.00", amount: "€450.00" },
          { description: "Monthly Hosting (Premium)", quantity: "12 months", rate: "€49.00/month", amount: "€588.00" }
        ],
        notes: "Payment is due within 30 days of invoice date. Late payments will incur a 1.5% monthly interest charge. Thank you for your business!",
        supportEmail: "billing@vc83.com",
        companyAddress: "Musterstraße 123, 10115 Berlin, Germany",
        companyPhone: "+49 30 1234 5678",
        companyWebsite: "https://vc83.com",
        taxId: "DE123456789"
      }
    };

    // Check if old invoice email template exists (will be replaced)
    const oldTemplate = await ctx.db
      .query("objects")
      .withIndex("by_org_type", (q) =>
        q.eq("organizationId", systemOrg._id).eq("type", "template")
      )
      .filter((q) => q.eq(q.field("subtype"), "email"))
      .filter((q) => q.eq(q.field("customProperties.code"), "email_invoice_send"))
      .first();

    // Check if schema-based template already exists
    const existing = await ctx.db
      .query("objects")
      .withIndex("by_org_type", (q) =>
        q.eq("organizationId", systemOrg._id).eq("type", "template")
      )
      .filter((q) => q.eq(q.field("subtype"), "email"))
      .filter((q) => q.eq(q.field("customProperties.code"), "invoice-email-v2"))
      .first();

    let action = "created";
    let templateId: any;

    if (existing) {
      // Update existing v2 template
      await ctx.db.patch(existing._id, {
        name: invoiceEmailSchema.name,
        customProperties: {
          code: invoiceEmailSchema.code,
          templateCode: invoiceEmailSchema.code,
          description: invoiceEmailSchema.description,
          category: invoiceEmailSchema.category,
          supportedLanguages: invoiceEmailSchema.supportedLanguages,
          version: invoiceEmailSchema.version,
          // Schema data
          emailTemplateSchema: invoiceEmailSchema,
        },
        updatedAt: Date.now(),
      });

      templateId = existing._id;
      action = "updated";
      console.log("✅ Updated invoice email template v2.0 with rich schema");
    } else {
      // Create new v2 template
      templateId = await ctx.db.insert("objects", {
        organizationId: systemOrg._id,
        type: "template",
        subtype: "email",
        name: invoiceEmailSchema.name,
        status: "published",
        customProperties: {
          code: invoiceEmailSchema.code,
          templateCode: invoiceEmailSchema.code,
          description: invoiceEmailSchema.description,
          category: invoiceEmailSchema.category,
          supportedLanguages: invoiceEmailSchema.supportedLanguages,
          version: invoiceEmailSchema.version,
          // Schema data
          emailTemplateSchema: invoiceEmailSchema,
        },
        createdBy: firstUser._id,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });

      console.log("✅ Created invoice email template v2.0 with rich schema");
      action = "created";
    }

    // Delete old HTML-based invoice email template if it exists
    if (oldTemplate) {
      await ctx.db.delete(oldTemplate._id);
      console.log("🗑️  Deleted old HTML-based invoice email template");
    }

    return {
      action,
      templateId,
      oldTemplateDeleted: !!oldTemplate,
      message: `Invoice Email v2.0 ${action} successfully. Rich schema pattern applied.`
    };
  },
});

/**
 * DELETE INVOICE EMAIL TEMPLATE V2
 *
 * Remove the invoice email template v2 (for testing)
 */
export const deleteInvoiceEmailTemplateV2 = internalMutation({
  args: {},
  handler: async (ctx) => {
    console.log("🗑️  Deleting invoice email template v2...");

    // Get system organization
    const systemOrg = await ctx.db
      .query("organizations")
      .withIndex("by_slug", (q) => q.eq("slug", "system"))
      .first();

    if (!systemOrg) {
      throw new Error("System organization not found");
    }

    // Find schema-based invoice email template
    const template = await ctx.db
      .query("objects")
      .withIndex("by_org_type", (q) =>
        q.eq("organizationId", systemOrg._id).eq("type", "template")
      )
      .filter((q) => q.eq(q.field("subtype"), "email"))
      .filter((q) => q.eq(q.field("customProperties.code"), "invoice-email-v2"))
      .first();

    if (template) {
      await ctx.db.delete(template._id);
      console.log("✅ Deleted invoice email template v2");
      return { deleted: true };
    } else {
      console.log("⚠️  Invoice email template v2 not found");
      return { deleted: false };
    }
  },
});
