/**
 * INVOICE EMAIL SERVICE
 *
 * Sends invoice emails with PDF attachments
 * Uses template system for email generation
 * Reads configuration from domain config ontology
 */

import { action } from "./_generated/server";
import { v } from "convex/values";
import { internal, api } from "./_generated/api";
import { Id } from "./_generated/dataModel";
import type { EmailLanguage } from "../src/templates/emails/types";

// Import schema-based email template
import { InvoiceB2BEmailTemplate } from "../src/templates/emails/invoice-b2b/index";

// Import smart data resolver
import { resolveInvoiceEmailData } from "./invoiceDataResolver";

/**
 * Preview invoice email (manual trigger from UI)
 */
export const previewInvoiceEmail = action({
  args: {
    sessionId: v.string(),
    invoiceId: v.id("objects"),
    domainConfigId: v.optional(v.id("objects")), // Optional: uses system defaults if not provided
    emailTemplateId: v.optional(v.id("objects")), // Optional: custom email template to use
    pdfTemplateId: v.optional(v.id("objects")), // Optional: custom PDF invoice template (for preview info only)
    language: v.optional(v.union(v.literal("de"), v.literal("en"), v.literal("es"), v.literal("fr"))),
  },
  handler: async (ctx, args): Promise<{
    html: string;
    subject: string;
    to: string;
    language: string;
  }> => {
    console.log(`📧 [PREVIEW] Generating invoice email preview for invoice ${args.invoiceId}`);

    // 1. Load invoice data
    const invoice = await ctx.runQuery(api.invoicingOntology.getInvoiceById, {
      sessionId: args.sessionId,
      invoiceId: args.invoiceId,
    });

    if (!invoice) {
      throw new Error("Invoice not found");
    }

    // 2. Determine language (default to German)
    const language: EmailLanguage = args.language || 'de';

    // 3. Load domain config for branding (or use system defaults)
    let domainProps: any = null;
    let emailSettings: any = null;

    if (args.domainConfigId) {
      // Use custom domain configuration
      const domainConfig = await ctx.runQuery(api.domainConfigOntology.getDomainConfig, {
        configId: args.domainConfigId,
      });
      domainProps = domainConfig.customProperties as any;
      emailSettings = domainProps.email;
    } else {
      // No domain config - resolver will cascade to organization settings → neutral defaults
      console.log(`📧 No domain config, will use organization settings or neutral defaults`);
      domainProps = null; // Let resolver handle branding cascade
      // emailSettings will be resolved by Smart Data Resolver
    }

    // 4. Resolve email template from organization's template set
    console.log(`📧 [PREVIEW] Resolving email template for organization ${invoice.organizationId}`);

    // Step 1: Get the template ID (either explicit or from template set)
    let emailTemplateId: Id<"objects">;

    if (args.emailTemplateId) {
      // Use explicitly provided template
      console.log(`📧 [PREVIEW] Using explicitly provided template ID: ${args.emailTemplateId}`);
      emailTemplateId = args.emailTemplateId;
    } else {
      // Resolve from organization's default template set
      console.log(`📧 [PREVIEW] Resolving from organization's template set...`);
      const resolvedId = await ctx.runQuery(internal.templateSetQueries.resolveIndividualTemplateInternal, {
        organizationId: invoice.organizationId,
        templateType: "email",
        context: {
          domainConfigId: args.domainConfigId,
        },
      });

      if (!resolvedId) {
        throw new Error(`No email template found for organization ${invoice.organizationId}. Please configure a default template set.`);
      }

      emailTemplateId = resolvedId;
    }

    // Step 2: Resolve the template ID to get full template metadata
    const resolvedTemplate = await ctx.runQuery(internal.pdfTemplateQueries.resolveEmailTemplateInternal, {
      templateId: emailTemplateId,
      fallbackCategory: "transactional",
    });

    const templateCode = resolvedTemplate.templateCode;
    console.log(`📧 [PREVIEW] Resolved template: ${resolvedTemplate.name} (${templateCode})`);

    // 5. Use Smart Data Resolver to prepare fully formatted invoice data
    console.log(`📧 [PREVIEW] Using Smart Data Resolver...`);
    const resolvedData = await resolveInvoiceEmailData(ctx, invoice, language, {
      sessionId: args.sessionId,
      domainConfigId: args.domainConfigId,
      isTest: false,
    });

    // 6. Build template data from resolved data
    const templateData: any = {
      invoice: {
        _id: resolvedData.invoiceId,
        invoiceNumber: resolvedData.invoiceNumber,
        invoiceDate: resolvedData.invoiceDate,
        dueDate: resolvedData.dueDate,
        status: resolvedData.status,
        invoiceType: resolvedData.invoiceType,
        isDraft: resolvedData.isDraft,
        lineItems: resolvedData.lineItems,
        subtotalInCents: resolvedData.subtotalInCents,
        taxAmountInCents: resolvedData.taxAmountInCents,
        totalInCents: resolvedData.totalInCents,
        currency: resolvedData.currency,
        paymentTerms: resolvedData.paymentTerms,
        notes: resolvedData.notes,
        // Add formatted values for template
        formattedSubtotal: resolvedData.formattedSubtotal,
        formattedTax: resolvedData.formattedTax,
        formattedTotal: resolvedData.formattedTotal,
      },
      recipient: resolvedData.recipient,
      sender: resolvedData.sender,
      branding: resolvedData.branding,
      language: resolvedData.language,
      isTest: resolvedData.isTest,
      // Currency formatting info
      currency: resolvedData.currency,
      locale: resolvedData.locale,
      currencySymbol: resolvedData.currencySymbol,
    };

    // 7. Render email using schema-based template from database
    console.log(`📧 [PREVIEW] Final template code being used: ${templateCode}`);

    // Get email template from database by code
    const template = await ctx.runQuery(api.pdfTemplateQueries.getEmailTemplateByCode, {
      templateCode: templateCode,
    });

    if (!template) {
      throw new Error(`Email template not found: ${templateCode}. Please ensure the template is seeded.`);
    }

    // Check if this is a schema-based template
    const props = template.customProperties || {};
    const emailTemplateSchema = props.emailTemplateSchema;

    if (!emailTemplateSchema) {
      throw new Error(`Template ${templateCode} is not schema-based. Please migrate to schema-based templates.`);
    }

    console.log(`📧 [PREVIEW] Using schema-based template: ${template.name}`);

    // Render using the actual InvoiceB2BEmailTemplate component
    const templateResult = InvoiceB2BEmailTemplate(templateData);

    return {
      html: templateResult.html,
      subject: templateResult.subject,
      to: resolvedData.recipient.email,
      language,
    };
  },
});

/**
 * Send invoice email (manual trigger from UI)
 */
export const sendInvoiceEmail = action({
  args: {
    sessionId: v.string(),
    invoiceId: v.id("objects"),
    recipientEmail: v.string(), // Explicit recipient (can override invoice default)
    domainConfigId: v.optional(v.id("objects")), // Optional: if not provided, uses system defaults
    emailTemplateId: v.optional(v.id("objects")), // Optional: custom email template to use
    pdfTemplateId: v.optional(v.id("objects")), // Optional: custom PDF invoice template to use
    isTest: v.optional(v.boolean()), // If true, sends to test email
    testRecipient: v.optional(v.string()),
    language: v.optional(v.union(v.literal("de"), v.literal("en"), v.literal("es"), v.literal("fr"))),
    forceSendVia: v.optional(v.union(v.literal("microsoft"), v.literal("resend"))), // Optional: force specific sender
    includePdfAttachment: v.optional(v.boolean()), // Optional: include PDF invoice attachment (default: true)
  },
  handler: async (ctx, args): Promise<{
    success: boolean;
    messageId?: string;
    sentTo: string;
    sentVia: 'microsoft' | 'resend';
    isTest: boolean;
    attachments: { pdf: boolean };
  }> => {
    console.log(`📧 Sending invoice email for invoice ${args.invoiceId}`);

    // 1. Load invoice data
    const invoice = await ctx.runQuery(api.invoicingOntology.getInvoiceById, {
      sessionId: args.sessionId,
      invoiceId: args.invoiceId,
    });

    if (!invoice) {
      throw new Error("Invoice not found");
    }

    const invoiceProps = invoice.customProperties as any;

    // 2. Load domain config for branding (or use system defaults)
    let domainProps: any = null;
    let emailSettings: any = null;

    if (args.domainConfigId) {
      // Use custom domain configuration
      const domainConfig = await ctx.runQuery(api.domainConfigOntology.getDomainConfig, {
        configId: args.domainConfigId,
      });
      domainProps = domainConfig.customProperties as any;
      emailSettings = domainProps.email;
    } else {
      // No domain config - resolver will cascade to organization settings → neutral defaults
      console.log(`📧 No domain config, will use organization settings or neutral defaults`);
      domainProps = null; // Let resolver handle branding cascade
      emailSettings = {
        senderEmail: "invoices@mail.l4yercak3.com",
        replyToEmail: "billing@l4yercak3.com",
        defaultTemplateCode: "invoice-email-v2", // Default to schema-based B2B template
      };
    }

    // 3. Determine language (default to German)
    const language: EmailLanguage = args.language || 'de';

    // 5. Resolve email template from organization's template set
    console.log(`📧 [SEND] Resolving email template for organization ${invoice.organizationId}`);

    // Step 1: Get the template ID (either explicit or from template set)
    let emailTemplateId: Id<"objects">;

    if (args.emailTemplateId) {
      // Use explicitly provided template
      console.log(`📧 [SEND] Using explicitly provided template ID: ${args.emailTemplateId}`);
      emailTemplateId = args.emailTemplateId;
    } else {
      // Resolve from organization's default template set
      console.log(`📧 [SEND] Resolving from organization's template set...`);
      const resolvedId = await ctx.runQuery(internal.templateSetQueries.resolveIndividualTemplateInternal, {
        organizationId: invoice.organizationId,
        templateType: "email",
        context: {
          domainConfigId: args.domainConfigId,
        },
      });

      if (!resolvedId) {
        throw new Error(`No email template found for organization ${invoice.organizationId}. Please configure a default template set.`);
      }

      emailTemplateId = resolvedId;
    }

    // Step 2: Resolve the template ID to get full template metadata
    const resolvedTemplate = await ctx.runQuery(internal.pdfTemplateQueries.resolveEmailTemplateInternal, {
      templateId: emailTemplateId,
      fallbackCategory: "transactional",
    });

    const templateCode = resolvedTemplate.templateCode;
    console.log(`📧 [SEND] Resolved template: ${resolvedTemplate.name} (${templateCode})`);

    // 6. Use Smart Data Resolver to prepare fully formatted invoice data
    console.log(`📧 [SEND] Using Smart Data Resolver...`);
    const resolvedData = await resolveInvoiceEmailData(ctx, invoice, language, {
      sessionId: args.sessionId,
      domainConfigId: args.domainConfigId,
      isTest: args.isTest || false,
    });

    // Determine recipient email
    const recipientEmail = args.isTest ? args.testRecipient! : args.recipientEmail;

    // 7. Build template data from resolved data
    const templateData: any = {
      invoice: {
        _id: resolvedData.invoiceId,
        invoiceNumber: resolvedData.invoiceNumber,
        invoiceDate: resolvedData.invoiceDate,
        dueDate: resolvedData.dueDate,
        status: resolvedData.status,
        invoiceType: resolvedData.invoiceType,
        isDraft: resolvedData.isDraft,
        lineItems: resolvedData.lineItems,
        subtotalInCents: resolvedData.subtotalInCents,
        taxAmountInCents: resolvedData.taxAmountInCents,
        totalInCents: resolvedData.totalInCents,
        currency: resolvedData.currency,
        paymentTerms: resolvedData.paymentTerms,
        notes: resolvedData.notes,
        // Add formatted values for template
        formattedSubtotal: resolvedData.formattedSubtotal,
        formattedTax: resolvedData.formattedTax,
        formattedTotal: resolvedData.formattedTotal,
      },
      recipient: resolvedData.recipient,
      sender: resolvedData.sender,
      branding: resolvedData.branding,
      language: resolvedData.language,
      isTest: resolvedData.isTest,
      // Currency formatting info
      currency: resolvedData.currency,
      locale: resolvedData.locale,
      currencySymbol: resolvedData.currencySymbol,
    };

    // 8. Render email using schema-based template
    console.log(`📧 [SEND] Final template code being used: ${templateCode}`);

    // Get email template from database by code
    const sendTemplate = await ctx.runQuery(api.pdfTemplateQueries.getEmailTemplateByCode, {
      templateCode: templateCode,
    });

    if (!sendTemplate) {
      throw new Error(`Email template not found: ${templateCode}. Please ensure the template is seeded.`);
    }

    // Check if this is a schema-based template
    const sendProps = sendTemplate.customProperties || {};
    const sendEmailTemplateSchema = sendProps.emailTemplateSchema;

    if (!sendEmailTemplateSchema) {
      throw new Error(`Template ${templateCode} is not schema-based. Please migrate to schema-based templates.`);
    }

    console.log(`📧 [SEND] Using schema-based template: ${sendTemplate.name}`);

    // Render using the actual InvoiceB2BEmailTemplate component
    const sendTemplateResult = InvoiceB2BEmailTemplate(templateData);
    const emailHtml = sendTemplateResult.html;
    const templateSubject = sendTemplateResult.subject;

    // 9. Generate attachments
    const attachments: Array<{ filename: string; content: string; contentType: string }> = [];

    // 9a. Attach PDF invoice (auto-generate if needed and enabled)
    let hasPDF = false;
    const shouldIncludePdf = args.includePdfAttachment !== false; // Default to true
    const pdfUrl = invoiceProps.pdfUrl as string | undefined;
    const checkoutSessionId = invoiceProps.checkoutSessionId as string | undefined;

    if (shouldIncludePdf) {
      // If no PDF URL exists but we have a checkoutSessionId, auto-generate PDF
      if (!pdfUrl && checkoutSessionId) {
        console.log(`📄 No PDF found for invoice ${args.invoiceId}, auto-generating...`);
        try {
          const pdfResult = await ctx.runAction(api.pdfGeneration.generateInvoicePDF, {
            checkoutSessionId: checkoutSessionId as any,
            crmOrganizationId: invoiceProps.billToOrganizationId as any,
            templateCode: args.pdfTemplateId ? undefined : 'b2b-professional', // Use default or let template override
          });

          if (pdfResult && pdfResult.content) {
            attachments.push({
              filename: pdfResult.filename,
              content: pdfResult.content,
              contentType: pdfResult.contentType,
            });
            hasPDF = true;
            console.log(`✅ Auto-generated PDF attached: ${pdfResult.filename}`);
          } else {
            console.error(`⚠️ PDF auto-generation returned no content for invoice ${args.invoiceId}`);
          }
        } catch (error) {
          console.error(`⚠️ Failed to auto-generate PDF for invoice ${args.invoiceId}:`, error);
          // Continue without PDF - email will still send
        }
      } else if (pdfUrl) {
        // PDF URL exists, fetch and attach it
        try {
          console.log(`📄 Fetching existing PDF from: ${pdfUrl}`);

          // Fetch the PDF from Convex storage
          const response = await fetch(pdfUrl);
          if (!response.ok) {
            throw new Error(`Failed to fetch PDF: ${response.statusText}`);
          }

          // Get PDF as buffer and convert to base64 (use btoa, not Buffer.from)
          const pdfBlob = await response.blob();
          const pdfBuffer = await pdfBlob.arrayBuffer();
          const pdfBase64 = btoa(String.fromCharCode(...new Uint8Array(pdfBuffer)));

          attachments.push({
            filename: `invoice-${invoiceProps.invoiceNumber || 'document'}.pdf`,
            content: pdfBase64,
            contentType: 'application/pdf',
          });
          hasPDF = true;
          console.log(`✅ Existing PDF attachment added: ${attachments[0].filename}`);
        } catch (error) {
          console.error(`⚠️ Failed to attach existing PDF for invoice ${args.invoiceId}:`, error);
          // Continue without PDF - email will still send
        }
      } else {
        console.log(`⚠️ PDF attachment requested but no pdfUrl or checkoutSessionId found for invoice ${args.invoiceId}`);
      }
    } else {
      console.log(`ℹ️ PDF attachment disabled by user for invoice ${args.invoiceId}`);
    }

    // 10. Generate subject line (add TEST prefix if needed)
    const subject = args.isTest ? `[TEST] ${templateSubject}` : templateSubject;

    // ========================================================================
    // PHASE 1: SMART SENDER SELECTION (Microsoft vs Resend)
    // ========================================================================

    // Determine best sender (Microsoft or Resend)
    const senderConfig = await ctx.runQuery(api.oauth.emailSenderSelection.selectEmailSender, {
      organizationId: invoice.organizationId,
      domainConfigId: args.domainConfigId,
      preferredType: args.forceSendVia,
    });

    console.log(`📧 Selected sender: ${senderConfig.type} (${senderConfig.email})`);

    let result: any;
    let sentVia: 'microsoft' | 'resend' = 'resend';

    // ========================================================================
    // TRY MICROSOFT GRAPH FIRST (if connection active)
    // ========================================================================
    if (senderConfig.type === 'microsoft' && senderConfig.connectionId) {
      console.log(`📧 Attempting to send via Microsoft Graph from ${senderConfig.email}...`);

      try {
        const msResult = await ctx.runAction(internal.oauth.emailSending.sendEmailViaMicrosoft, {
          connectionId: senderConfig.connectionId,
          to: recipientEmail,
          subject,
          body: emailHtml,
          attachments: attachments.length > 0 ? attachments : undefined,
          replyTo: emailSettings.replyToEmail,
          importance: "normal",
        });

        if (msResult.success) {
          console.log(`✅ Email sent successfully via Microsoft Graph`);
          result = {
            success: true,
            messageId: msResult.messageId,
          };
          sentVia = 'microsoft';
        } else {
          console.warn(`⚠️ Microsoft send failed: ${msResult.error}. Falling back to Resend.`);
          throw new Error(msResult.error || "Microsoft send failed");
        }
      } catch (error) {
        console.warn(`⚠️ Microsoft send exception: ${error instanceof Error ? error.message : 'Unknown error'}. Falling back to Resend.`);
        senderConfig.type = 'resend';
      }
    }

    // ========================================================================
    // SEND VIA RESEND (fallback or default)
    // ========================================================================
    if (senderConfig.type === 'resend') {
      console.log(`📧 Sending via Resend from ${senderConfig.email}...`);

      if (args.domainConfigId) {
        // Send via emailDelivery service (domain-specific)
        result = await ctx.runAction(internal.emailDelivery.sendEmail, {
          domainConfigId: args.domainConfigId,
          to: recipientEmail,
          subject,
          html: emailHtml,
          attachments: attachments.length > 0 ? attachments : undefined,
        });
      } else {
        // Send directly with system defaults using Resend
        const RESEND_API_KEY = process.env.RESEND_API_KEY;
        if (!RESEND_API_KEY) {
          throw new Error("RESEND_API_KEY not configured");
        }

        const emailPayload = {
          from: emailSettings.senderEmail,
          to: recipientEmail,
          replyTo: emailSettings.replyToEmail,
          subject,
          html: emailHtml,
          attachments: attachments.length > 0 ? attachments : undefined,
        };

        console.log(`📧 Sending email with system defaults to ${recipientEmail}...`);

        const response = await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${RESEND_API_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(emailPayload),
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(`Resend API error: ${JSON.stringify(errorData)}`);
        }

        const resendResult = await response.json();
        result = {
          success: true,
          messageId: resendResult.id,
        };
      }
      sentVia = 'resend';
      console.log(`✅ Email sent successfully via Resend`);
    }

    // ========================================================================
    // LOG COMMUNICATION
    // ========================================================================
    try {
      await ctx.runMutation(internal.communicationTracking.logEmailCommunication, {
        organizationId: invoice.organizationId,
        recipientEmail,
        subject,
        emailType: "invoice",
        success: result.success,
        messageId: result.messageId,
        errorMessage: result.success ? undefined : "Send failed",
        metadata: {
          invoiceId: args.invoiceId,
          invoiceNumber: invoiceProps.invoiceNumber,
          sentVia,
          isTest: args.isTest || false,
        },
      });
    } catch (error) {
      console.error("Failed to log communication:", error);
      // Don't fail the email send if logging fails
    }

    // ========================================================================
    // RETURN RESULT
    // ========================================================================
    return {
      success: result.success,
      messageId: result.messageId,
      sentTo: recipientEmail,
      sentVia,
      isTest: args.isTest || false,
      attachments: {
        pdf: hasPDF,
      },
    };
  },
});
