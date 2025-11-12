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
    domainConfigId: v.id("objects"),
    isTest: v.optional(v.boolean()), // If true, sends to test email
    testRecipient: v.optional(v.string()),
    language: v.optional(v.union(v.literal("de"), v.literal("en"), v.literal("es"), v.literal("fr"))),
  },
  handler: async (ctx, args): Promise<{
    success: boolean;
    messageId?: string;
    sentTo: string;
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

    // 3. Load domain config for branding
    const domainConfig = await ctx.runQuery(api.domainConfigOntology.getDomainConfig, {
      configId: args.domainConfigId,
    });

    const domainProps = domainConfig.customProperties as any;
    const branding = domainProps.branding;
    const emailSettings = domainProps.email;

    if (!emailSettings) {
      throw new Error("Email settings not configured for this domain");
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
      domainConfigId: args.domainConfigId,
      language,
    });

    // Get the template function and generate HTML
    const templateFn = getEmailTemplate(templateData.templateCode);
    const { html: emailHtml, subject: templateSubject } = templateFn(templateData);

    // 7. Generate attachments
    const attachments: Array<{ filename: string; content: string; contentType: string }> = [];

    // 7a. Generate PDF ticket
    let hasPDF = false;
    try {
      const checkoutSessionId = ticketProps.checkoutSessionId;
      if (checkoutSessionId) {
        const pdf = await ctx.runAction(api.pdfGeneration.generateTicketPDF, {
          ticketId: args.ticketId,
          checkoutSessionId: checkoutSessionId as Id<"objects">,
        });

        if (pdf) {
          attachments.push({
            filename: `ticket-${ticket.name.replace(/\s+/g, '-')}.pdf`,
            content: pdf.content, // Already base64 encoded
            contentType: pdf.contentType,
          });
          hasPDF = true;
          console.log(`✅ Generated PDF attachment for ticket ${args.ticketId}`);
        }
      }
    } catch (error) {
      console.error(`⚠️ Failed to generate PDF for ticket ${args.ticketId}:`, error);
      // Continue without PDF - email will still send
    }

    // 7b. Generate ICS calendar file
    let hasICS = false;
    try {
      // Generate ICS file
      const icsContent = generateICSFile({
        eventName: event.name,
        eventDescription: `You have a confirmed reservation for ${event.name}. This is an exclusive event.`,
        eventLocation: eventProps.location || 'TBD',
        startDate: eventProps.startDate || new Date().toISOString().split('T')[0],
        startTime: eventProps.startTime || '19:00',
        durationHours: eventProps.durationHours || 3,
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

    // 8. Generate subject line (from template, add TEST prefix if needed)
    const subject = args.isTest ? `[TEST] ${templateSubject}` : templateSubject;

    // 9. Send email via delivery service
    const result: any = await ctx.runAction(internal.emailDelivery.sendEmail, {
      domainConfigId: args.domainConfigId,
      to: attendeeEmail,
      subject,
      html: emailHtml,
      attachments: attachments.length > 0 ? attachments : undefined,
    });

    return {
      success: result.success,
      messageId: result.messageId,
      sentTo: attendeeEmail,
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
    domainConfigId: v.id("objects"),
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
      domainConfigId: args.domainConfigId,
      language,
    });

    // Get the template function and generate HTML
    const templateFn = getEmailTemplate(templateData.templateCode);
    const { html: emailHtml, subject } = templateFn(templateData);

    return {
      html: emailHtml,
      subject,
      to: ticketProps.attendeeEmail || 'kunde@beispiel.de',
      language,
    };
  },
});
