/**
 * TICKET EMAIL SERVICE
 *
 * Sends ticket confirmation emails with PDF and ICS attachments
 * Uses template system for email generation
 * Reads configuration from domain config ontology
 */

import { action } from "./_generated/server";
import { v } from "convex/values";
import { internal, api } from "./_generated/api";
import { Id } from "./_generated/dataModel";
import { generateICSFile, icsToBase64 } from "./icsGeneration";

// Import email template functions
import { getEmailTemplate } from "../src/templates/emails/registry";
import type { EmailLanguage } from "../src/templates/emails/types";

/**
 * Send ticket confirmation email (manual trigger from UI)
 */
export const sendTicketConfirmationEmail = action({
  args: {
    sessionId: v.string(),
    ticketId: v.id("objects"),
    domainConfigId: v.optional(v.id("objects")), // Optional: if not provided, uses system defaults
    emailTemplateId: v.optional(v.id("objects")), // Optional: custom email template to use
    ticketPdfTemplateId: v.optional(v.id("objects")), // Optional: custom PDF ticket template to use
    isTest: v.optional(v.boolean()), // If true, sends to test email
    testRecipient: v.optional(v.string()),
    language: v.optional(v.union(v.literal("de"), v.literal("en"), v.literal("es"), v.literal("fr"))),
    forceSendVia: v.optional(v.union(v.literal("microsoft"), v.literal("resend"))), // Optional: force specific sender
    includePdfAttachment: v.optional(v.boolean()), // Optional: include PDF ticket attachment (default: true)
    includeIcsAttachment: v.optional(v.boolean()), // Optional: include ICS calendar attachment (default: true)
  },
  handler: async (ctx, args): Promise<{
    success: boolean;
    messageId?: string;
    sentTo: string;
    sentVia: 'microsoft' | 'resend'; // NEW: Track which service was used
    isTest: boolean;
    attachments: { pdf: boolean; ics: boolean };
  }> => {
    console.log(`📧 Sending ticket confirmation email for ticket ${args.ticketId}`);

    // 1. Load ticket data
    const ticket = await ctx.runQuery(api.ticketOntology.getTicket, {
      sessionId: args.sessionId,
      ticketId: args.ticketId,
    });

    if (!ticket) {
      throw new Error("Ticket not found");
    }

    const ticketProps = ticket.customProperties as any;

    // 2. Load event data
    const eventId = ticketProps.eventId;
    if (!eventId) {
      throw new Error("Ticket has no associated event");
    }

    const event = await ctx.runQuery(api.eventOntology.getEvent, {
      sessionId: args.sessionId,
      eventId: eventId as Id<"objects">,
    });

    const eventProps = event.customProperties as any;

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
      // No domain config - template renderer will cascade to organization settings → neutral defaults
      console.log(`📧 No domain config, will use organization settings or neutral defaults`);
      domainProps = null; // Let template renderer handle branding cascade
      emailSettings = {
        senderEmail: "tickets@mail.l4yercak3.com",
        replyToEmail: "support@l4yercak3.com",
        defaultTemplateCode: "luxury-confirmation",
      };
    }

    // 4. Extract attendee info from ticket
    const attendeeEmail = args.isTest ? args.testRecipient! : ticketProps.attendeeEmail;
    const attendeeFirstName = ticketProps.attendeeFirstName || ticket.name.split(' ')[0];
    const attendeeLastName = ticketProps.attendeeLastName || ticket.name.split(' ').slice(1).join(' ');

    if (!attendeeEmail) {
      throw new Error("No email address for attendee");
    }

    // 5. Determine language (default to German)
    const language: EmailLanguage = args.language || 'de';

    // 6. Get template data and render email using template system
    const templateData = await ctx.runAction(api.emailTemplateRenderer.getEmailTemplateData, {
      sessionId: args.sessionId,
      ticketId: args.ticketId,
      organizationId: ticket.organizationId, // Pass organizationId for branding
      domainConfigId: args.domainConfigId || undefined as any, // Pass undefined if not provided
      language,
    });

    // Determine which template code to use (custom template or default)
    let templateCode = templateData.templateCode;

    if (args.emailTemplateId) {
      // If custom email template provided, get its template code from database
      try {
        const customTemplate = await ctx.runQuery(api.templateOntology.getEmailTemplateById, {
          templateId: args.emailTemplateId,
        });

        if (customTemplate && customTemplate.customProperties?.code) {
          templateCode = customTemplate.customProperties.code as string;
          console.log(`📧 ✅ Using custom email template: ${customTemplate.name} (${templateCode})`);
        } else {
          console.log(`📧 ⚠️ Custom template ${args.emailTemplateId} has no code, using default: ${templateCode}`);
        }
      } catch (error) {
        console.error(`📧 ❌ Error loading custom template ${args.emailTemplateId}:`, error);
        console.log(`📧 Falling back to default template: ${templateCode}`);
      }
    }

    // Get the template function and generate HTML
    const templateFn = getEmailTemplate(templateCode);
    const { html: emailHtml, subject: templateSubject } = templateFn(templateData);

    // 7. Generate attachments
    const attachments: Array<{ filename: string; content: string; contentType: string }> = [];

    // 7a. Attach PDF ticket (if exists and enabled)
    let hasPDF = false;
    const shouldIncludePdf = args.includePdfAttachment !== false; // Default to true
    const pdfUrl = ticketProps.pdfUrl as string | undefined;

    if (shouldIncludePdf) {
      // Try to use stored PDF URL first, then generate if needed
      if (pdfUrl) {
        // PDF URL exists - fetch and attach it
        try {
          console.log(`📄 Fetching existing PDF from: ${pdfUrl}`);

          const response = await fetch(pdfUrl);
          if (!response.ok) {
            throw new Error(`Failed to fetch PDF: ${response.statusText}`);
          }

          // Get PDF as buffer and convert to base64 (use btoa, not Buffer.from)
          const pdfBlob = await response.blob();
          const pdfBuffer = await pdfBlob.arrayBuffer();
          const pdfBase64 = btoa(String.fromCharCode(...new Uint8Array(pdfBuffer)));

          attachments.push({
            filename: `ticket-${ticket.name.replace(/\s+/g, '-')}.pdf`,
            content: pdfBase64,
            contentType: 'application/pdf',
          });
          hasPDF = true;
          console.log(`✅ Existing PDF attachment added`);
        } catch (error) {
          console.error(`⚠️ Failed to attach existing PDF for ticket ${args.ticketId}:`, error);
          // Continue without PDF - email will still send
        }
      } else {
        // No PDF URL - try to generate one
        console.log(`📄 No existing PDF found, generating new PDF for ticket ${args.ticketId}...`);
        try {
          // Determine template code if custom template provided
          let templateCode: string | undefined = undefined;
          if (args.ticketPdfTemplateId) {
            const pdfTemplate = await ctx.runQuery(internal.pdfTemplateQueries.resolvePdfTemplateInternal, {
              templateId: args.ticketPdfTemplateId,
            });
            if (pdfTemplate?.templateCode) {
              templateCode = pdfTemplate.templateCode;
              console.log(`🎫 Using custom PDF template: ${pdfTemplate.name} (${templateCode})`);
            }
          }

          // Use new generateTicketPDFFromTicket (works without checkout)
          const generatedPdfUrl = await ctx.runAction(api.pdfGeneration.generateTicketPDFFromTicket, {
            ticketId: args.ticketId,
            templateCode,
          });

          if (generatedPdfUrl) {
            // Fetch the newly generated PDF
            const response = await fetch(generatedPdfUrl);
            if (!response.ok) {
              throw new Error(`Failed to fetch generated PDF: ${response.statusText}`);
            }

            const pdfBlob = await response.blob();
            const pdfBuffer = await pdfBlob.arrayBuffer();
            const pdfBase64 = btoa(String.fromCharCode(...new Uint8Array(pdfBuffer)));

            attachments.push({
              filename: `ticket-${ticket.name.replace(/\s+/g, '-')}.pdf`,
              content: pdfBase64,
              contentType: 'application/pdf',
            });
            hasPDF = true;
            console.log(`✅ Generated PDF attachment added`);
          } else {
            console.error(`⚠️ PDF generation returned no URL for ticket ${args.ticketId}`);
          }
        } catch (error) {
          console.error(`⚠️ Failed to generate PDF for ticket ${args.ticketId}:`, error);
          // Continue without PDF - email will still send
        }
      }
    } else {
      console.log(`ℹ️ PDF attachment disabled by user for ticket ${args.ticketId}`);
    }

    // 7b. Generate ICS calendar file (if enabled)
    let hasICS = false;
    const shouldIncludeIcs = args.includeIcsAttachment !== false; // Default to true
    if (shouldIncludeIcs) {
      try {
        // Ensure date and time are strings
        const startDate = String(eventProps.startDate || new Date().toISOString().split('T')[0]);
        const startTime = String(eventProps.startTime || '19:00');
        const durationHours = Number(eventProps.durationHours || 3);

        // Generate ICS file
        const icsContent = generateICSFile({
          eventName: event.name,
          eventDescription: `You have a confirmed reservation for ${event.name}. This is an exclusive event.`,
          eventLocation: eventProps.location || 'TBD',
          startDate,
          startTime,
          durationHours,
          organizerEmail: emailSettings.senderEmail,
          attendeeEmail,
          attendeeName: `${attendeeFirstName} ${attendeeLastName}`,
          url: domainProps.webPublishing?.siteUrl,
        });

        attachments.push({
          filename: `${event.name.replace(/\s+/g, '-')}.ics`,
          content: icsToBase64(icsContent),
          contentType: 'text/calendar',
        });
        hasICS = true;
        console.log(`✅ Generated ICS attachment for ticket ${args.ticketId}`);
      } catch (error) {
        console.error(`⚠️ Failed to generate ICS for ticket ${args.ticketId}:`, error);
        // Continue without ICS - email will still send
      }
    } else {
      console.log(`ℹ️ ICS attachment disabled by user for ticket ${args.ticketId}`);
    }

    // 8. Generate subject line (from template, add TEST prefix if needed)
    const subject = args.isTest ? `[TEST] ${templateSubject}` : templateSubject;

    // ========================================================================
    // 🆕 PHASE 1: SMART SENDER SELECTION (Microsoft vs Resend)
    // ========================================================================

    // Determine best sender (Microsoft or Resend)
    const senderConfig = await ctx.runQuery(api.oauth.emailSenderSelection.selectEmailSender, {
      organizationId: ticket.organizationId,
      domainConfigId: args.domainConfigId,
      preferredType: args.forceSendVia, // User can override automatic selection
    });

    console.log(`📧 Selected sender: ${senderConfig.type} (${senderConfig.email})`);

    let result: any;
    let sentVia: 'microsoft' | 'resend' = 'resend'; // Default to resend

    // ========================================================================
    // 🆕 TRY MICROSOFT GRAPH FIRST (if connection active)
    // ========================================================================
    if (senderConfig.type === 'microsoft' && senderConfig.connectionId) {
      console.log(`📧 Attempting to send via Microsoft Graph from ${senderConfig.email}...`);

      try {
        const msResult = await ctx.runAction(internal.oauth.emailSending.sendEmailViaMicrosoft, {
          connectionId: senderConfig.connectionId,
          to: attendeeEmail,
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
          // Microsoft send failed, fall back to Resend
          console.warn(`⚠️ Microsoft send failed: ${msResult.error}. Falling back to Resend.`);
          throw new Error(msResult.error || "Microsoft send failed");
        }
      } catch (error) {
        // Microsoft send failed, fall back to Resend
        console.warn(`⚠️ Microsoft send exception: ${error instanceof Error ? error.message : 'Unknown error'}. Falling back to Resend.`);
        // Set senderConfig.type to 'resend' to trigger fallback below
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
          to: attendeeEmail,
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
          to: attendeeEmail,
          replyTo: emailSettings.replyToEmail,
          subject,
          html: emailHtml,
          attachments: attachments.length > 0 ? attachments : undefined,
        };

        console.log(`📧 Sending email with system defaults to ${attendeeEmail}...`);

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
    // RETURN RESULT
    // ========================================================================
    return {
      success: result.success,
      messageId: result.messageId,
      sentTo: attendeeEmail,
      sentVia, // NEW: Track which service was used
      isTest: args.isTest || false,
      attachments: {
        pdf: hasPDF,
        ics: hasICS,
      },
    };
  },
});

/**
 * Preview email HTML (for testing before sending)
 * Returns the HTML so UI can display it
 */
export const previewTicketEmail = action({
  args: {
    sessionId: v.string(),
    ticketId: v.id("objects"),
    domainConfigId: v.optional(v.id("objects")), // Optional: uses system defaults if not provided
    emailTemplateId: v.optional(v.id("objects")), // Optional: custom email template to use
    ticketPdfTemplateId: v.optional(v.id("objects")), // Optional: custom PDF ticket template (for preview info only)
    language: v.optional(v.union(v.literal("de"), v.literal("en"), v.literal("es"), v.literal("fr"))),
  },
  handler: async (ctx, args): Promise<{
    html: string;
    subject: string;
    to: string;
    language: string;
  }> => {
    // Load all data same as send action
    const ticket = await ctx.runQuery(api.ticketOntology.getTicket, {
      sessionId: args.sessionId,
      ticketId: args.ticketId,
    });

    const ticketProps = ticket.customProperties as any;

    // Determine language (default to German)
    const language: EmailLanguage = args.language || 'de';

    // Get template data and render email using template system
    const templateData = await ctx.runAction(api.emailTemplateRenderer.getEmailTemplateData, {
      sessionId: args.sessionId,
      ticketId: args.ticketId,
      organizationId: ticket.organizationId, // Pass organizationId for branding
      domainConfigId: args.domainConfigId || undefined as any, // Use system defaults if not provided
      language,
    });

    // Determine which template code to use (custom template or default)
    let templateCode = templateData.templateCode;

    if (args.emailTemplateId) {
      // If custom email template provided, get its template code from database
      try {
        const customTemplate = await ctx.runQuery(api.templateOntology.getEmailTemplateById, {
          templateId: args.emailTemplateId,
        });

        if (customTemplate && customTemplate.customProperties?.code) {
          templateCode = customTemplate.customProperties.code as string;
          console.log(`📧 [PREVIEW] ✅ Using custom email template: ${customTemplate.name} (${templateCode})`);
        } else {
          console.log(`📧 [PREVIEW] ⚠️ Custom template ${args.emailTemplateId} has no code, using default: ${templateCode}`);
        }
      } catch (error) {
        console.error(`📧 [PREVIEW] ❌ Error loading custom template ${args.emailTemplateId}:`, error);
        console.log(`📧 [PREVIEW] Falling back to default template: ${templateCode}`);
      }
    }

    // Get the template function and generate HTML
    console.log(`📧 [PREVIEW] 🎯 Final template code: ${templateCode}`);
    console.log(`📧 [PREVIEW] 🌍 Language passed to template: ${language}`);
    console.log(`📧 [PREVIEW] 📋 Template data keys:`, Object.keys(templateData));

    const templateFn = getEmailTemplate(templateCode);
    const { html: emailHtml, subject } = templateFn(templateData);

    return {
      html: emailHtml,
      subject,
      to: ticketProps.attendeeEmail || 'kunde@beispiel.de',
      language,
    };
  },
});
