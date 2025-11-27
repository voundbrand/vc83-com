import { internalMutation } from "./_generated/server";

/**
 * SEED TRANSACTION RECEIPT TEMPLATE WITH SCHEMA
 *
 * Seeds the transaction receipt email template with its full schema.
 * This is used when someone makes a purchase - critical for all payment workflows.
 *
 * Run with: npx convex run seedTransactionReceiptTemplate:seedTransactionReceiptTemplate
 */
export const seedTransactionReceiptTemplate = internalMutation({
  args: {},
  handler: async (ctx) => {
    console.log("🔄 Seeding transaction receipt template with schema...");

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

    // Transaction Receipt template schema
    const transactionReceiptSchema = {
      code: "transaction-receipt-v2",
      name: "Transaction Receipt Email",
      description: "Receipt email sent after a successful payment. Includes order details, payment information, and download links.",
      category: "transactional",
      version: "2.0.0",
      defaultSections: [
        {
          type: "hero",
          title: "✅ Payment Confirmed",
          subtitle: "Thank you for your purchase!",
          image: "{companyLogoUrl}"
        },
        {
          type: "body",
          paragraphs: [
            "Hi {firstName},",
            "",
            "Your payment has been successfully processed. Here are your transaction details:",
            ""
          ]
        },
        {
          type: "body",
          sections: [
            {
              title: "📋 Order Number",
              content: "{orderNumber}",
              icon: "file-text"
            },
            {
              title: "📅 Transaction Date",
              content: "{transactionDate}",
              icon: "calendar"
            },
            {
              title: "💳 Payment Method",
              content: "{paymentMethod}",
              icon: "credit-card"
            },
            {
              title: "💰 Total Paid",
              content: "{totalAmountFormatted}",
              icon: "dollar-sign"
            }
          ]
        },
        {
          type: "itemizedList",
          title: "Order Summary",
          items: "{orderItems}"
        },
        {
          type: "body",
          paragraphs: [
            "",
            "**Payment Breakdown:**",
            "- Subtotal: {subtotalFormatted}",
            "- Tax: {taxFormatted}",
            "- Shipping: {shippingFormatted}",
            "- **Total: {totalAmountFormatted}**",
            ""
          ]
        },
        {
          type: "cta",
          text: "View Order Details",
          url: "{orderDetailsUrl}",
          style: "primary"
        },
        {
          type: "body",
          paragraphs: [
            "",
            "{additionalMessage}",
            "",
            "Questions about your order? Contact us at {supportEmail}",
            "",
            "Thank you for your business!",
            "{companyName}",
            ""
          ]
        }
      ],
      defaultBrandColor: "#6B46C1",
      supportedLanguages: ["en", "de", "es", "fr"],
      variables: [
        {
          name: "firstName",
          type: "string",
          description: "Customer's first name",
          required: true,
          defaultValue: "Jamie",
          aiInstructions: "Use the customer's first name from the order. If not available, use 'Valued Customer'."
        },
        {
          name: "lastName",
          type: "string",
          description: "Customer's last name",
          required: false,
          defaultValue: "Smith"
        },
        {
          name: "email",
          type: "email",
          description: "Customer's email address",
          required: true,
          defaultValue: "jamie.smith@example.com"
        },
        {
          name: "orderNumber",
          type: "string",
          description: "Unique order/transaction ID",
          required: true,
          defaultValue: "ORD-2025-789456",
          aiInstructions: "Generate unique order number. Format: 'ORD-YYYY-NNNNNN'"
        },
        {
          name: "transactionDate",
          type: "string",
          description: "Date and time of transaction",
          required: true,
          defaultValue: "January 27, 2025 at 3:42 PM EST",
          aiInstructions: "Format as 'Month Day, Year at Time TimeZone' for clarity"
        },
        {
          name: "paymentMethod",
          type: "string",
          description: "Payment method used",
          required: true,
          defaultValue: "Visa ending in 4242",
          aiInstructions: "Show payment method type and last 4 digits only (e.g., 'Visa •••• 4242', 'PayPal', 'Apple Pay')"
        },
        {
          name: "totalAmountFormatted",
          type: "string",
          description: "Total amount paid (formatted with currency)",
          required: true,
          defaultValue: "$127.48",
          aiInstructions: "Include currency symbol and proper formatting (e.g., '$127.48', '€89.99', '£54.32')"
        },
        {
          name: "subtotalFormatted",
          type: "string",
          description: "Subtotal before tax and shipping",
          required: true,
          defaultValue: "$109.99",
          aiInstructions: "Sum of all item prices before tax/shipping"
        },
        {
          name: "taxFormatted",
          type: "string",
          description: "Tax amount",
          required: true,
          defaultValue: "$9.24",
          aiInstructions: "Show tax amount. Use '$0.00' or 'N/A' if no tax applicable"
        },
        {
          name: "shippingFormatted",
          type: "string",
          description: "Shipping cost",
          required: true,
          defaultValue: "$8.25",
          aiInstructions: "Show shipping cost. Use 'FREE' or '$0.00' for free shipping"
        },
        {
          name: "orderItems",
          type: "array",
          description: "List of purchased items with quantities and prices",
          required: true,
          defaultValue: "[{\"name\": \"Premium Widget\", \"quantity\": 2, \"price\": \"$49.99\"}, {\"name\": \"Shipping Protection\", \"quantity\": 1, \"price\": \"$10.00\"}]",
          aiInstructions: "Array of items: [{name, quantity, price}]. Format prices with currency."
        },
        {
          name: "orderDetailsUrl",
          type: "url",
          description: "Link to detailed order page",
          required: true,
          defaultValue: "https://example.com/orders/ORD-2025-789456",
          aiInstructions: "Generate secure link to order details page with authentication"
        },
        {
          name: "downloadUrls",
          type: "array",
          description: "Download links for digital products",
          required: false,
          defaultValue: "[]",
          aiInstructions: "Include download links for digital products/tickets/PDFs. Empty array if none."
        },
        {
          name: "trackingNumber",
          type: "string",
          description: "Shipping tracking number",
          required: false,
          defaultValue: "",
          aiInstructions: "Include tracking number for physical shipments. Leave empty for digital products."
        },
        {
          name: "estimatedDelivery",
          type: "string",
          description: "Estimated delivery date",
          required: false,
          defaultValue: "",
          aiInstructions: "Format as 'Day, Month Date - Month Date' (e.g., 'Wed, Feb 1 - Feb 5'). Leave empty for instant/digital delivery."
        },
        {
          name: "additionalMessage",
          type: "string",
          description: "Additional message or instructions",
          required: false,
          defaultValue: "Your order is being processed and will ship within 1-2 business days. You'll receive a tracking number once shipped.",
          aiInstructions: "Provide relevant next steps: shipping timeline, download instructions, or special notes"
        },
        {
          name: "supportEmail",
          type: "email",
          description: "Customer support email",
          required: true,
          defaultValue: "support@example.com",
          aiInstructions: "Use organization's customer support email"
        },
        {
          name: "companyName",
          type: "string",
          description: "Company/organization name",
          required: true,
          defaultValue: "Your Company"
        },
        {
          name: "companyLogoUrl",
          type: "url",
          description: "Company logo URL",
          required: false,
          defaultValue: "https://placehold.co/200x50/6B46C1/white?text=Company+Logo"
        },
        {
          name: "companyAddress",
          type: "string",
          description: "Company billing address",
          required: false,
          defaultValue: "123 Main Street, Suite 100, City, State 12345, USA"
        },
        {
          name: "shippingAddress",
          type: "string",
          description: "Customer shipping address",
          required: false,
          defaultValue: "456 Oak Avenue, Apt 7B, City, State 67890, USA",
          aiInstructions: "Full shipping address from order data"
        },
        {
          name: "billingAddress",
          type: "string",
          description: "Customer billing address",
          required: false,
          defaultValue: "456 Oak Avenue, Apt 7B, City, State 67890, USA",
          aiInstructions: "Full billing address from payment data"
        }
      ],
      previewData: {
        header: {
          brandColor: "#6B46C1",
          companyName: "ShopPro",
          logo: "https://placehold.co/200x50/6B46C1/white?text=ShopPro"
        },
        recipient: {
          firstName: "Jamie",
          lastName: "Smith",
          email: "jamie.smith@example.com"
        },
        orderNumber: "ORD-2025-789456",
        transactionDate: "January 27, 2025 at 3:42 PM EST",
        paymentMethod: "Visa ending in 4242",
        totalAmountFormatted: "$127.48",
        subtotalFormatted: "$109.99",
        taxFormatted: "$9.24",
        shippingFormatted: "$8.25",
        orderItems: [
          { name: "Premium Wireless Headphones", quantity: 1, price: "$79.99" },
          { name: "USB-C Charging Cable (3-pack)", quantity: 1, price: "$19.99" },
          { name: "Travel Case", quantity: 1, price: "$10.00" }
        ],
        orderDetailsUrl: "https://example.com/orders/ORD-2025-789456",
        trackingNumber: "1Z999AA10123456784",
        estimatedDelivery: "Wed, Jan 31 - Fri, Feb 2",
        additionalMessage: "Your order has been confirmed and will ship within 1 business day. You'll receive a separate email with tracking information once your package is on its way. For expedited shipping options, please contact support.",
        supportEmail: "help@shoppro.com",
        companyName: "ShopPro",
        companyLogoUrl: "https://placehold.co/200x50/6B46C1/white?text=ShopPro",
        companyAddress: "789 Commerce Boulevard, New York, NY 10001",
        shippingAddress: "456 Oak Avenue, Apt 7B, Brooklyn, NY 11201",
        billingAddress: "456 Oak Avenue, Apt 7B, Brooklyn, NY 11201"
      }
    };

    // Check if template already exists
    const existing = await ctx.db
      .query("objects")
      .withIndex("by_org_type", (q) =>
        q.eq("organizationId", systemOrg._id).eq("type", "template")
      )
      .filter((q) => q.eq(q.field("subtype"), "email"))
      .filter((q) => q.eq(q.field("customProperties.code"), "transaction-receipt-v2"))
      .first();

    if (existing) {
      // Update existing template with schema
      await ctx.db.patch(existing._id, {
        name: transactionReceiptSchema.name,
        customProperties: {
          code: transactionReceiptSchema.code,
          templateCode: transactionReceiptSchema.code,
          description: transactionReceiptSchema.description,
          category: transactionReceiptSchema.category,
          supportedLanguages: transactionReceiptSchema.supportedLanguages,
          version: transactionReceiptSchema.version,
          // Schema data
          emailTemplateSchema: transactionReceiptSchema,
        },
        updatedAt: Date.now(),
      });

      console.log("✅ Updated transaction receipt template with schema");
      return { action: "updated", templateId: existing._id };
    } else {
      // Create new template with schema
      const templateId = await ctx.db.insert("objects", {
        organizationId: systemOrg._id,
        type: "template",
        subtype: "email",
        name: transactionReceiptSchema.name,
        status: "published",
        customProperties: {
          code: transactionReceiptSchema.code,
          templateCode: transactionReceiptSchema.code,
          description: transactionReceiptSchema.description,
          category: transactionReceiptSchema.category,
          supportedLanguages: transactionReceiptSchema.supportedLanguages,
          version: transactionReceiptSchema.version,
          // Schema data
          emailTemplateSchema: transactionReceiptSchema,
        },
        createdBy: firstUser._id,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });

      console.log("✅ Created transaction receipt template with schema");
      return { action: "created", templateId };
    }
  },
});

/**
 * DELETE TRANSACTION RECEIPT TEMPLATE
 *
 * Remove the transaction receipt template (for testing)
 */
export const deleteTransactionReceiptTemplate = internalMutation({
  args: {},
  handler: async (ctx) => {
    console.log("🗑️  Deleting transaction receipt template...");

    // Get system organization
    const systemOrg = await ctx.db
      .query("organizations")
      .withIndex("by_slug", (q) => q.eq("slug", "system"))
      .first();

    if (!systemOrg) {
      throw new Error("System organization not found");
    }

    // Find transaction receipt template
    const template = await ctx.db
      .query("objects")
      .withIndex("by_org_type", (q) =>
        q.eq("organizationId", systemOrg._id).eq("type", "template")
      )
      .filter((q) => q.eq(q.field("subtype"), "email"))
      .filter((q) => q.eq(q.field("customProperties.code"), "transaction-receipt-v2"))
      .first();

    if (template) {
      await ctx.db.delete(template._id);
      console.log("✅ Deleted transaction receipt template");
      return { deleted: true };
    } else {
      console.log("⚠️  Transaction receipt template not found");
      return { deleted: false };
    }
  },
});
