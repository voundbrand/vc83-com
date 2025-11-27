/**
 * SEED: Invoice Email Template
 *
 * Simple professional email template for sending invoices via email.
 * This is the email wrapper that contains the PDF invoice as an attachment.
 */

import { internalMutation } from "./_generated/server";
import { v } from "convex/values";

export const seedInvoiceEmailTemplate = internalMutation({
  args: {
    overwrite: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    console.log("🌱 Seeding Invoice Email Template...");

    // Get system organization
    const systemOrg = await ctx.db
      .query("organizations")
      .withIndex("by_slug", (q) => q.eq("slug", "system"))
      .first();

    if (!systemOrg) {
      throw new Error("System organization not found. Run seedSystemOrganization first.");
    }

    const templateCode = "email_invoice_send";

    // Check if template already exists
    const existingTemplate = await ctx.db
      .query("objects")
      .withIndex("by_org_type", (q) =>
        q.eq("organizationId", systemOrg._id).eq("type", "template")
      )
      .filter((q) => {
        const codeMatch = q.eq(q.field("customProperties.templateCode"), templateCode);
        const codeMatch2 = q.eq(q.field("customProperties.code"), templateCode);
        return q.or(codeMatch, codeMatch2);
      })
      .first();

    if (existingTemplate && !args.overwrite) {
      console.log(`⏭️  Template "${templateCode}" already exists. Skipping.`);
      return { templateId: existingTemplate._id, created: false };
    }

    const html = `<!DOCTYPE html>
<html lang="{{language}}">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>{{t_invoice_title}}</title>
</head>
<body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f4f4f4;">
    <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f4f4f4; padding: 20px;">
        <tr>
            <td align="center">
                <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">

                    <!-- Header with Logo -->
                    <tr>
                        <td style="background-color: {{highlight_color}}; padding: 30px 40px; text-align: center;">
                            {%if logo_url%}
                                <img src="{{logo_url}}" alt="{{organization_name}}" style="max-height: 60px; max-width: 200px;" />
                            {%else%}
                                <h1 style="color: #ffffff; margin: 0; font-size: 24px;">{{organization_name}}</h1>
                            {%endif%}
                        </td>
                    </tr>

                    <!-- Main Content -->
                    <tr>
                        <td style="padding: 40px;">
                            <h2 style="color: #333333; margin-top: 0; font-size: 24px;">{{t_greeting}}</h2>

                            <p style="color: #666666; font-size: 16px; line-height: 1.6; margin: 20px 0;">
                                {{t_message_intro}}
                            </p>

                            <!-- Invoice Details Box -->
                            <table width="100%" cellpadding="15" cellspacing="0" style="background-color: #f9f9f9; border-left: 4px solid {{highlight_color}}; margin: 25px 0;">
                                <tr>
                                    <td>
                                        <table width="100%" cellpadding="5" cellspacing="0">
                                            <tr>
                                                <td style="color: #666666; font-size: 14px; font-weight: bold;">{{t_invoice_number}}</td>
                                                <td style="color: #333333; font-size: 14px; text-align: right;">{{invoice_number}}</td>
                                            </tr>
                                            <tr>
                                                <td style="color: #666666; font-size: 14px; font-weight: bold;">{{t_invoice_date}}</td>
                                                <td style="color: #333333; font-size: 14px; text-align: right;">{{invoice_date}}</td>
                                            </tr>
                                            <tr>
                                                <td style="color: #666666; font-size: 14px; font-weight: bold;">{{t_due_date}}</td>
                                                <td style="color: #333333; font-size: 14px; text-align: right;">{{due_date}}</td>
                                            </tr>
                                            <tr>
                                                <td style="color: #666666; font-size: 14px; font-weight: bold; padding-top: 10px; border-top: 1px solid #e0e0e0;">{{t_total_amount}}</td>
                                                <td style="color: {{highlight_color}}; font-size: 18px; font-weight: bold; text-align: right; padding-top: 10px; border-top: 1px solid #e0e0e0;">{{total_formatted}}</td>
                                            </tr>
                                        </table>
                                    </td>
                                </tr>
                            </table>

                            <p style="color: #666666; font-size: 16px; line-height: 1.6; margin: 20px 0;">
                                {{t_message_attached}}
                            </p>

                            {%if payment_instructions%}
                            <p style="color: #666666; font-size: 16px; line-height: 1.6; margin: 20px 0;">
                                <strong>{{t_payment_instructions}}</strong><br/>
                                {{payment_instructions}}
                            </p>
                            {%endif%}

                            <!-- CTA Button -->
                            {%if payment_link%}
                            <table width="100%" cellpadding="0" cellspacing="0" style="margin: 30px 0;">
                                <tr>
                                    <td align="center">
                                        <a href="{{payment_link}}" style="display: inline-block; padding: 15px 40px; background-color: {{highlight_color}}; color: #ffffff; text-decoration: none; border-radius: 5px; font-size: 16px; font-weight: bold;">{{t_pay_now}}</a>
                                    </td>
                                </tr>
                            </table>
                            {%endif%}

                            <p style="color: #666666; font-size: 14px; line-height: 1.6; margin: 30px 0 10px 0;">
                                {{t_message_closing}}
                            </p>

                            <p style="color: #666666; font-size: 14px; line-height: 1.6; margin: 10px 0;">
                                {{t_signature}}<br/>
                                <strong>{{organization_name}}</strong>
                            </p>
                        </td>
                    </tr>

                    <!-- Footer -->
                    <tr>
                        <td style="background-color: #f9f9f9; padding: 20px 40px; text-align: center; border-top: 1px solid #e0e0e0;">
                            <p style="color: #999999; font-size: 12px; margin: 5px 0;">
                                {{organization_name}}<br/>
                                {{organization_address}}
                            </p>
                            <p style="color: #999999; font-size: 12px; margin: 5px 0;">
                                {{organization_phone}} | {{organization_email}}
                            </p>
                            {%if organization_website%}
                            <p style="color: #999999; font-size: 12px; margin: 5px 0;">
                                <a href="{{organization_website}}" style="color: {{highlight_color}}; text-decoration: none;">{{organization_website}}</a>
                            </p>
                            {%endif%}
                        </td>
                    </tr>
                </table>
            </td>
        </tr>
    </table>
</body>
</html>`;

    const css = `/* Invoice Email Template CSS - Inline styles used in HTML above */`;

    const templateSchema = {
      version: "1.0.0",
      code: templateCode,
      name: "Invoice Email Template",
      type: "email",
      category: "invoice",
      description: "Professional email template for sending invoices with PDF attachment",

      variables: [
        // Organization info
        { name: "organization_name", type: "string", required: true, description: "Company name", example: "VC83 GmbH" },
        { name: "organization_address", type: "string", required: false, description: "Company address", example: "Musterstraße 123, 10115 Berlin" },
        { name: "organization_phone", type: "string", required: false, description: "Company phone", example: "+49 30 12345678" },
        { name: "organization_email", type: "string", required: true, description: "Company email", example: "billing@vc83.com" },
        { name: "organization_website", type: "string", required: false, description: "Company website", example: "https://vc83.com" },
        { name: "logo_url", type: "string", required: false, description: "Company logo URL", example: "https://vc83.com/logo.png" },
        { name: "highlight_color", type: "string", required: false, description: "Brand color for highlights", example: "#6B46C1" },

        // Invoice details
        { name: "invoice_number", type: "string", required: true, description: "Invoice number", example: "INV-2025-001234" },
        { name: "invoice_date", type: "string", required: true, description: "Invoice date formatted", example: "January 15, 2025" },
        { name: "due_date", type: "string", required: true, description: "Payment due date formatted", example: "February 14, 2025" },
        { name: "total_formatted", type: "string", required: true, description: "Total amount with currency", example: "€1,342.80" },

        // Optional fields
        { name: "payment_link", type: "string", required: false, description: "Link to payment page", example: "https://vc83.com/pay/INV-123" },
        { name: "payment_instructions", type: "string", required: false, description: "Custom payment instructions", example: "Please transfer to IBAN: DE89..." },

        // Translations (language-specific)
        { name: "language", type: "string", required: false, description: "Email language code", example: "de" },
        { name: "t_invoice_title", type: "string", required: false, description: "Email subject line", example: "Your Invoice from VC83" },
        { name: "t_greeting", type: "string", required: false, description: "Greeting text", example: "Hello Valued Customer," },
        { name: "t_message_intro", type: "string", required: false, description: "Opening message", example: "Thank you for your business. Please find your invoice attached to this email." },
        { name: "t_invoice_number", type: "string", required: false, description: "Invoice number label", example: "Invoice Number:" },
        { name: "t_invoice_date", type: "string", required: false, description: "Invoice date label", example: "Invoice Date:" },
        { name: "t_due_date", type: "string", required: false, description: "Due date label", example: "Due Date:" },
        { name: "t_total_amount", type: "string", required: false, description: "Total amount label", example: "Total Amount:" },
        { name: "t_message_attached", type: "string", required: false, description: "Attachment message", example: "The detailed invoice is attached as a PDF document." },
        { name: "t_payment_instructions", type: "string", required: false, description: "Payment instructions label", example: "Payment Instructions:" },
        { name: "t_pay_now", type: "string", required: false, description: "Pay now button text", example: "Pay Now" },
        { name: "t_message_closing", type: "string", required: false, description: "Closing message", example: "If you have any questions about this invoice, please don't hesitate to contact us." },
        { name: "t_signature", type: "string", required: false, description: "Email signature", example: "Best regards," },
      ],

      defaultSections: [],

      // AI instructions for invoice email generation
      aiInstructions: {
        purpose: "Send invoices via email with professional formatting and PDF attachment",
        useCases: ["invoice_delivery", "payment_reminder", "billing_notification"],
        triggers: ["send invoice", "email invoice", "invoice notification"],
        requiredContext: ["invoice_data", "organization_details"],
        specialInstructions: "Always attach the PDF invoice. Include payment link if available. Use customer's preferred language.",
      }
    };

    let templateId: any;

    if (existingTemplate) {
      // Update existing template
      await ctx.db.patch(existingTemplate._id, {
        name: "Invoice Email Template",
        description: "Professional email template for sending invoices with PDF attachment",
        customProperties: {
          code: templateCode,
          templateCode: templateCode,
          category: "invoice",
          html,
          css,
          templateSchema,
          version: "1.0.0",
          isDefault: true,
          previewImageUrl: "https://cdn.vc83.com/templates/email-invoice-send-preview.png",
        },
        subtype: "email", // Critical: must be "email" to show in email selector
        status: "published",
        updatedAt: Date.now(),
      });
      templateId = existingTemplate._id;
      console.log(`✅ Updated template: ${templateCode}`);
    } else {
      // Create new template
      templateId = await ctx.db.insert("objects", {
        organizationId: systemOrg._id,
        type: "template",
        subtype: "email", // Critical: must be "email" to show in email selector
        status: "published",
        name: "Invoice Email Template",
        description: "Professional email template for sending invoices with PDF attachment",
        customProperties: {
          code: templateCode,
          templateCode: templateCode,
          category: "invoice",
          html,
          css,
          templateSchema,
          version: "1.0.0",
          isDefault: true,
          previewImageUrl: "https://cdn.vc83.com/templates/email-invoice-send-preview.png",
        },
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });
      console.log(`✅ Created template: ${templateCode}`);
    }

    return {
      templateId,
      created: !existingTemplate,
      templateCode,
    };
  },
});
