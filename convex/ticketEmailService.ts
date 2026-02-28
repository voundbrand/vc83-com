/**
 * TICKET EMAIL SERVICE
 *
 * Sends ticket confirmation emails with PDF and ICS attachments
 * Uses template system for email generation
 * Reads configuration from domain config ontology
 */

import { action } from "./_generated/server";
import { v } from "convex/values";
const generatedApi: any = require("./_generated/api");
import { Id } from "./_generated/dataModel";
import { generateICSFile, icsToBase64 } from "./icsGeneration";

// Import email template functions
import { getEmailTemplate } from "../src/templates/emails/registry";
import type { EmailLanguage } from "../src/templates/emails/types";

async function logTemplateResolutionCheckpoint(
  ctx: any,
  payload: {
    organizationId: Id<"organizations">;
    resolverSource: "template_set" | "direct_override" | "fallback";
    templateCapability: "document_invoice" | "document_ticket" | "transactional_email" | "web_event_page" | "checkout_surface";
    surface: string;
    templateId?: Id<"objects">;
    templateCode?: string;
    checkoutSessionId?: Id<"objects">;
    ticketId?: Id<"objects">;
    context?: Record<string, unknown>;
  }
) {
  try {
    await ctx.runMutation(
      (generatedApi as any).internal.templateResolutionTelemetry.logTemplateResolutionCheckpoint,
      payload
    );
  } catch (error) {
    console.warn("⚠️ [Template Telemetry] Failed to record ticket email checkpoint:", error);
  }
}

type TicketTemplateSetContext = {
  productId?: Id<"objects">;
  checkoutInstanceId?: Id<"objects">;
  domainConfigId?: Id<"objects">;
};

type TicketTemplateResolution = {
  templateId: Id<"objects">;
  templateCode: string;
  templateName: string;
  resolverSource: "template_set" | "direct_override" | "fallback";
  fallbackReason: "none" | "custom_template_resolution_failed";
  defaultTemplateCode: string;
  context: TicketTemplateSetContext;
};

const TICKET_EMAIL_RENDER_FALLBACK_TEMPLATE_CODE = "event-confirmation-v2";

type TicketEmailRenderResult = {
  html: string;
  subject: string;
  renderedTemplateCode: string;
  fallbackFromTemplateCode?: string;
  fallbackErrorMessage?: string;
};

function renderTicketEmailTemplateWithFallback(params: {
  templateCode: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  templateData: any;
}): TicketEmailRenderResult {
  const renderTemplate = (templateCode: string) => {
    const templateFn = getEmailTemplate(templateCode);
    return templateFn(params.templateData);
  };

  try {
    const { html, subject } = renderTemplate(params.templateCode);
    return {
      html,
      subject,
      renderedTemplateCode: params.templateCode,
    };
  } catch (error) {
    const fallbackErrorMessage = error instanceof Error ? error.message : String(error);
    const alreadyOnFallbackTemplate =
      params.templateCode === TICKET_EMAIL_RENDER_FALLBACK_TEMPLATE_CODE;

    if (alreadyOnFallbackTemplate) {
      throw error;
    }

    console.warn(
      `⚠️ [Ticket Email] Failed to render template "${params.templateCode}", falling back to "${TICKET_EMAIL_RENDER_FALLBACK_TEMPLATE_CODE}":`,
      error
    );

    const { html, subject } = renderTemplate(TICKET_EMAIL_RENDER_FALLBACK_TEMPLATE_CODE);
    return {
      html,
      subject,
      renderedTemplateCode: TICKET_EMAIL_RENDER_FALLBACK_TEMPLATE_CODE,
      fallbackFromTemplateCode: params.templateCode,
      fallbackErrorMessage,
    };
  }
}

async function buildTicketTemplateSetContext(
  ctx: any,
  params: {
    ticketProps: Record<string, unknown>;
    domainConfigId?: Id<"objects">;
  }
): Promise<TicketTemplateSetContext> {
  const context: TicketTemplateSetContext = {
    domainConfigId: params.domainConfigId,
    productId: params.ticketProps.productId as Id<"objects"> | undefined,
  };

  const checkoutSessionId = params.ticketProps.checkoutSessionId as Id<"objects"> | undefined;
  if (!checkoutSessionId) {
    return context;
  }

  const checkoutSession = await (ctx as any).runQuery(
    generatedApi.internal.checkoutSessionOntology.getCheckoutSessionInternal,
    { checkoutSessionId }
  );

  const checkoutProps = checkoutSession?.customProperties || {};
  const checkoutInstanceId = checkoutProps.checkoutInstanceId as Id<"objects"> | undefined;
  if (checkoutInstanceId) {
    context.checkoutInstanceId = checkoutInstanceId;
  }

  if (!context.domainConfigId) {
    const sessionDomainConfigId = checkoutProps.domainConfigId as Id<"objects"> | undefined;
    if (sessionDomainConfigId) {
      context.domainConfigId = sessionDomainConfigId;
    }
  }

  if (!context.productId) {
    const selectedProducts = checkoutProps.selectedProducts as Array<{ productId: string }> | undefined;
    if (selectedProducts?.length) {
      context.productId = selectedProducts[0].productId as Id<"objects">;
    }
  }

  return context;
}

async function resolveTransactionalEmailTemplateForTicket(
  ctx: any,
  params: {
    organizationId: Id<"organizations">;
    ticketProps: Record<string, unknown>;
    domainConfigId?: Id<"objects">;
    explicitTemplateId?: Id<"objects">;
  }
): Promise<TicketTemplateResolution> {
  const templateSetContext = await buildTicketTemplateSetContext(ctx, {
    ticketProps: params.ticketProps,
    domainConfigId: params.domainConfigId,
  });

  const defaultTemplateId = await (ctx as any).runQuery(
    generatedApi.internal.templateSetQueries.resolveIndividualTemplateInternal,
    {
      organizationId: params.organizationId,
      templateCapability: "transactional_email",
      context: templateSetContext,
    }
  );

  if (!defaultTemplateId) {
    throw new Error(
      `No transactional email template found for organization ${params.organizationId}. Please configure a default template set.`
    );
  }

  const defaultTemplate = await (ctx as any).runQuery(
    generatedApi.internal.pdfTemplateQueries.resolveEmailTemplateInternal,
    {
      templateId: defaultTemplateId,
      templateCapability: "transactional_email",
    }
  );

  if (params.explicitTemplateId) {
    try {
      const explicitTemplate = await (ctx as any).runQuery(
        generatedApi.internal.pdfTemplateQueries.resolveEmailTemplateInternal,
        {
          templateId: params.explicitTemplateId,
          templateCapability: "transactional_email",
        }
      );

      return {
        templateId: params.explicitTemplateId,
        templateCode: explicitTemplate.templateCode,
        templateName: explicitTemplate.name,
        resolverSource: "direct_override",
        fallbackReason: "none",
        defaultTemplateCode: defaultTemplate.templateCode,
        context: templateSetContext,
      };
    } catch (error) {
      console.error(
        `📧 Failed to resolve explicit email template ${params.explicitTemplateId}, falling back to template-set resolution:`,
        error
      );
      return {
        templateId: defaultTemplateId,
        templateCode: defaultTemplate.templateCode,
        templateName: defaultTemplate.name,
        resolverSource: "fallback",
        fallbackReason: "custom_template_resolution_failed",
        defaultTemplateCode: defaultTemplate.templateCode,
        context: templateSetContext,
      };
    }
  }

  return {
    templateId: defaultTemplateId,
    templateCode: defaultTemplate.templateCode,
    templateName: defaultTemplate.name,
    resolverSource: "template_set",
    fallbackReason: "none",
    defaultTemplateCode: defaultTemplate.templateCode,
    context: templateSetContext,
  };
}

type TicketPdfTemplateResolution = {
  templateId?: Id<"objects">;
  templateCode: string;
  templateName: string;
  resolverSource: "template_set" | "direct_override" | "fallback";
  fallbackReason:
    | "none"
    | "custom_template_resolution_failed"
    | "legacy_ticket_template_id"
    | "legacy_ticket_template_code"
    | "system_default";
  defaultTemplateCode: string;
  context: TicketTemplateSetContext;
};

async function resolveTicketPdfTemplateForTicket(
  ctx: any,
  params: {
    organizationId: Id<"organizations">;
    ticketProps: Record<string, unknown>;
    domainConfigId?: Id<"objects">;
    explicitTemplateId?: Id<"objects">;
  }
): Promise<TicketPdfTemplateResolution> {
  const templateSetContext = await buildTicketTemplateSetContext(ctx, {
    ticketProps: params.ticketProps,
    domainConfigId: params.domainConfigId,
  });

  let defaultTemplateId: Id<"objects"> | null = null;
  let defaultTemplate:
    | {
        templateCode: string;
        name: string;
      }
    | null = null;

  try {
    defaultTemplateId = await (ctx as any).runQuery(
      generatedApi.internal.templateSetQueries.resolveIndividualTemplateInternal,
      {
        organizationId: params.organizationId,
        templateCapability: "document_ticket",
        context: templateSetContext,
      }
    );
    if (defaultTemplateId) {
      defaultTemplate = await (ctx as any).runQuery(
        generatedApi.internal.pdfTemplateQueries.resolvePdfTemplateInternal,
        {
          templateId: defaultTemplateId,
        }
      );
    }
  } catch (error) {
    console.error(
      `🎫 Failed canonical ticket PDF template resolution for organization ${params.organizationId}:`,
      error
    );
  }

  const systemDefaultTemplateCode = "ticket_professional_v1";
  const defaultTemplateCode = defaultTemplate?.templateCode || systemDefaultTemplateCode;

  if (params.explicitTemplateId) {
    try {
      const explicitTemplate = await (ctx as any).runQuery(
        generatedApi.internal.pdfTemplateQueries.resolvePdfTemplateInternal,
        {
          templateId: params.explicitTemplateId,
        }
      );

      return {
        templateId: params.explicitTemplateId,
        templateCode: explicitTemplate.templateCode,
        templateName: explicitTemplate.name,
        resolverSource: "direct_override",
        fallbackReason: "none",
        defaultTemplateCode,
        context: templateSetContext,
      };
    } catch (error) {
      console.error(
        `🎫 Failed to resolve explicit ticket PDF template ${params.explicitTemplateId}, falling back:`,
        error
      );
      if (defaultTemplateId && defaultTemplate) {
        return {
          templateId: defaultTemplateId,
          templateCode: defaultTemplate.templateCode,
          templateName: defaultTemplate.name,
          resolverSource: "fallback",
          fallbackReason: "custom_template_resolution_failed",
          defaultTemplateCode,
          context: templateSetContext,
        };
      }
    }
  }

  if (defaultTemplateId && defaultTemplate) {
    return {
      templateId: defaultTemplateId,
      templateCode: defaultTemplate.templateCode,
      templateName: defaultTemplate.name,
      resolverSource: "template_set",
      fallbackReason: "none",
      defaultTemplateCode,
      context: templateSetContext,
    };
  }

  const legacyTemplateId = params.ticketProps.pdfTemplateId as Id<"objects"> | undefined;
  if (legacyTemplateId) {
    try {
      const legacyTemplate = await (ctx as any).runQuery(
        generatedApi.internal.pdfTemplateQueries.resolvePdfTemplateInternal,
        {
          templateId: legacyTemplateId,
        }
      );
      return {
        templateId: legacyTemplateId,
        templateCode: legacyTemplate.templateCode,
        templateName: legacyTemplate.name,
        resolverSource: "fallback",
        fallbackReason: "legacy_ticket_template_id",
        defaultTemplateCode,
        context: templateSetContext,
      };
    } catch (error) {
      console.error(
        `🎫 Failed to resolve legacy ticket-level pdfTemplateId ${legacyTemplateId}, trying next fallback:`,
        error
      );
    }
  }

  const legacyTemplateCode = params.ticketProps.pdfTemplateCode as string | undefined;
  if (legacyTemplateCode) {
    return {
      templateCode: legacyTemplateCode,
      templateName: `Legacy ticket template code (${legacyTemplateCode})`,
      resolverSource: "fallback",
      fallbackReason: "legacy_ticket_template_code",
      defaultTemplateCode,
      context: templateSetContext,
    };
  }

  return {
    templateCode: systemDefaultTemplateCode,
    templateName: "System default ticket template",
    resolverSource: "fallback",
    fallbackReason: "system_default",
    defaultTemplateCode,
    context: templateSetContext,
  };
}

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
    const ticket = await (ctx as any).runQuery(generatedApi.api.ticketOntology.getTicket, {
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

    const event = await (ctx as any).runQuery(generatedApi.api.eventOntology.getEvent, {
      sessionId: args.sessionId,
      eventId: eventId as Id<"objects">,
    });

    const eventProps = event.customProperties as any;

    // 3. Load domain config for branding (or use system defaults)
    let domainProps: any = null;
    let emailSettings: any = null;

    if (args.domainConfigId) {
      // Use custom domain configuration
      const domainConfig = await (ctx as any).runQuery(generatedApi.api.domainConfigOntology.getDomainConfig, {
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
        defaultTemplateCode: "event-confirmation-v2",
      };
    }

    // 4. Extract attendee info from ticket - try multiple email fields
    let attendeeEmail = args.isTest
      ? args.testRecipient!
      : (ticketProps.attendeeEmail || ticketProps.holderEmail) as string | undefined;

    let attendeeFirstName = ticketProps.attendeeFirstName || '';
    let attendeeLastName = ticketProps.attendeeLastName || '';

    // If no email found in ticket props, try loading from CRM contact
    if (!attendeeEmail && ticketProps.contactId) {
      console.log(`🔍 [SEND] No email in ticket props, loading CRM contact: ${ticketProps.contactId}`);
      try {
        const contact = await (ctx as any).runQuery(generatedApi.api.crmOntology.getContact, {
          sessionId: args.sessionId,
          contactId: ticketProps.contactId as Id<"objects">,
        });

        if (contact && contact.type === "crm_contact") {
          const contactProps = contact.customProperties as any;
          attendeeEmail = contactProps?.email || '';
          attendeeFirstName = attendeeFirstName || contactProps?.firstName || '';
          attendeeLastName = attendeeLastName || contactProps?.lastName || '';
          console.log(`✅ [SEND] Loaded email from CRM contact: ${attendeeEmail}`);
        }
      } catch (error) {
        console.error(`❌ [SEND] Error loading CRM contact:`, error);
      }
    }

    // Final fallback for names if still empty
    if (!attendeeFirstName && !attendeeLastName) {
      const holderName = (ticketProps.holderName || ticket.name) as string;
      attendeeFirstName = holderName.split(' ')[0] || 'Guest';
      attendeeLastName = holderName.split(' ').slice(1).join(' ') || '';
    }

    if (!attendeeEmail) {
      console.error(`❌ [SEND] No email address found for attendee. Ticket props:`, {
        attendeeEmail: ticketProps.attendeeEmail,
        holderEmail: ticketProps.holderEmail,
        contactId: ticketProps.contactId,
      });
      throw new Error("No email address for attendee. Please ensure the ticket has an email or is linked to a CRM contact with an email.");
    }

    // 5. Determine language (default to German)
    const language: EmailLanguage = args.language || 'de';

    // 6. Get template data and render email using template system
    const templateData = await (ctx as any).runAction(generatedApi.api.emailTemplateRenderer.getEmailTemplateData, {
      sessionId: args.sessionId,
      ticketId: args.ticketId,
      organizationId: ticket.organizationId, // Pass organizationId for branding
      domainConfigId: args.domainConfigId || undefined as any, // Pass undefined if not provided
      language,
    });

    const templateResolution = await resolveTransactionalEmailTemplateForTicket(ctx, {
      organizationId: ticket.organizationId,
      ticketProps,
      domainConfigId: args.domainConfigId,
      explicitTemplateId: args.emailTemplateId,
    });

    const templateCode = templateResolution.templateCode;
    const resolverSource = templateResolution.resolverSource;
    const fallbackReason = templateResolution.fallbackReason;
    console.log(`📧 Using resolved template: ${templateResolution.templateName} (${templateCode})`);

    const emailRender = renderTicketEmailTemplateWithFallback({
      templateCode,
      templateData,
    });
    const emailHtml = emailRender.html;
    const templateSubject = emailRender.subject;

    await logTemplateResolutionCheckpoint(ctx, {
      organizationId: ticket.organizationId,
      resolverSource,
      templateCapability: "transactional_email",
      surface: "ticket_email.sendTicketConfirmationEmail",
      templateId: templateResolution.templateId,
      templateCode: emailRender.renderedTemplateCode,
      ticketId: args.ticketId,
      checkoutSessionId: ticketProps.checkoutSessionId as Id<"objects"> | undefined,
      context: {
        defaultTemplateCode: templateResolution.defaultTemplateCode,
        resolvedTemplateCode: templateCode,
        explicitTemplateIdProvided: !!args.emailTemplateId,
        fallbackReason,
        renderFallbackFromTemplateCode: emailRender.fallbackFromTemplateCode,
        renderFallbackErrorMessage: emailRender.fallbackErrorMessage,
        templateSetContext: templateResolution.context,
      },
    });

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
          const pdfTemplateResolution = await resolveTicketPdfTemplateForTicket(ctx, {
            organizationId: ticket.organizationId,
            ticketProps,
            domainConfigId: args.domainConfigId,
            explicitTemplateId: args.ticketPdfTemplateId,
          });
          const templateCode = pdfTemplateResolution.templateCode;
          console.log(
            `🎫 Using resolved ticket PDF template: ${pdfTemplateResolution.templateName} (${templateCode})`
          );

          await logTemplateResolutionCheckpoint(ctx, {
            organizationId: ticket.organizationId,
            resolverSource: pdfTemplateResolution.resolverSource,
            templateCapability: "document_ticket",
            surface: "ticket_email.sendTicketConfirmationEmail.pdfAttachment",
            templateId: pdfTemplateResolution.templateId,
            templateCode,
            ticketId: args.ticketId,
            checkoutSessionId: ticketProps.checkoutSessionId as Id<"objects"> | undefined,
            context: {
              defaultTemplateCode: pdfTemplateResolution.defaultTemplateCode,
              explicitTemplateIdProvided: !!args.ticketPdfTemplateId,
              fallbackReason: pdfTemplateResolution.fallbackReason,
              templateSetContext: pdfTemplateResolution.context,
            },
          });

          // Use new generateTicketPDFFromTicket (works without checkout)
          const generatedPdfUrl = await (ctx as any).runAction(generatedApi.api.pdfGeneration.generateTicketPDFFromTicket, {
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
    const senderConfig = await (ctx as any).runQuery(generatedApi.api.oauth.emailSenderSelection.selectEmailSender, {
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
        const msResult = await (ctx as any).runAction(generatedApi.internal.oauth.emailSending.sendEmailViaMicrosoft, {
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
        result = await (ctx as any).runAction(generatedApi.internal.emailDelivery.sendEmail, {
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
    const ticket = await (ctx as any).runQuery(generatedApi.api.ticketOntology.getTicket, {
      sessionId: args.sessionId,
      ticketId: args.ticketId,
    });

    const ticketProps = ticket.customProperties as any;

    // Determine language (default to German)
    const language: EmailLanguage = args.language || 'de';

    // Get template data and render email using template system
    const templateData = await (ctx as any).runAction(generatedApi.api.emailTemplateRenderer.getEmailTemplateData, {
      sessionId: args.sessionId,
      ticketId: args.ticketId,
      organizationId: ticket.organizationId, // Pass organizationId for branding
      domainConfigId: args.domainConfigId || undefined as any, // Use system defaults if not provided
      language,
    });

    const templateResolution = await resolveTransactionalEmailTemplateForTicket(ctx, {
      organizationId: ticket.organizationId,
      ticketProps,
      domainConfigId: args.domainConfigId,
      explicitTemplateId: args.emailTemplateId,
    });

    const templateCode = templateResolution.templateCode;
    const resolverSource = templateResolution.resolverSource;
    const fallbackReason = templateResolution.fallbackReason;
    console.log(`📧 [PREVIEW] Using resolved template: ${templateResolution.templateName} (${templateCode})`);

    const emailRender = renderTicketEmailTemplateWithFallback({
      templateCode,
      templateData,
    });
    const emailHtml = emailRender.html;
    const subject = emailRender.subject;

    await logTemplateResolutionCheckpoint(ctx, {
      organizationId: ticket.organizationId,
      resolverSource,
      templateCapability: "transactional_email",
      surface: "ticket_email.previewTicketEmail",
      templateId: templateResolution.templateId,
      templateCode: emailRender.renderedTemplateCode,
      ticketId: args.ticketId,
      checkoutSessionId: ticketProps.checkoutSessionId as Id<"objects"> | undefined,
      context: {
        defaultTemplateCode: templateResolution.defaultTemplateCode,
        resolvedTemplateCode: templateCode,
        explicitTemplateIdProvided: !!args.emailTemplateId,
        fallbackReason,
        renderFallbackFromTemplateCode: emailRender.fallbackFromTemplateCode,
        renderFallbackErrorMessage: emailRender.fallbackErrorMessage,
        templateSetContext: templateResolution.context,
      },
    });

    // Get the template function and generate HTML
    console.log(`📧 [PREVIEW] 🎯 Final template code: ${emailRender.renderedTemplateCode}`);
    console.log(`📧 [PREVIEW] 🌍 Language passed to template: ${language}`);
    console.log(`📧 [PREVIEW] 📋 Template data keys:`, Object.keys(templateData));
    console.log(`📧 [PREVIEW] 👤 Attendee data being used:`, {
      firstName: templateData.attendee.firstName,
      lastName: templateData.attendee.lastName,
      email: templateData.attendee.email,
      fullName: `${templateData.attendee.firstName} ${templateData.attendee.lastName}`.trim()
    });

    return {
      html: emailHtml,
      subject,
      to: ticketProps.attendeeEmail || 'kunde@beispiel.de',
      language,
    };
  },
});
