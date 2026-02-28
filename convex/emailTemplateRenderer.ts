/**
 * EMAIL TEMPLATE RENDERER
 *
 * Backend service that resolves and renders email templates.
 * Uses canonical template-set resolution for transactional email.
 */

import { action } from "./_generated/server";
import { v } from "convex/values";
import { Id } from "./_generated/dataModel";
// eslint-disable-next-line @typescript-eslint/no-var-requires
const generatedApi: any = require("./_generated/api");

// Custom property interfaces for type safety
interface TicketCustomProperties {
  emailTemplateId?: Id<"objects">;
  productId?: Id<"objects">;
  eventId?: Id<"objects">;
  checkoutSessionId?: Id<"objects">;
  contactId?: Id<"objects">;
  attendeeFirstName?: string;
  attendeeLastName?: string;
  attendeeEmail?: string;
  holderName?: string;
  holderEmail?: string;
  guestCount?: number;
  ticketNumber?: string;
  [key: string]: unknown;
}

interface ContactCustomProperties {
  firstName?: string;
  lastName?: string;
  email?: string;
  [key: string]: unknown;
}

interface DomainBranding {
  primaryColor?: string;
  secondaryColor?: string;
  accentColor?: string;
  logoUrl?: string;
}

interface DomainCustomProperties {
  domainName?: string;
  branding?: DomainBranding;
  webPublishing?: {
    siteUrl?: string;
  };
  [key: string]: unknown;
}

type TemplateSetContext = {
  productId?: Id<"objects">;
  checkoutInstanceId?: Id<"objects">;
  domainConfigId?: Id<"objects">;
};

type CanonicalEmailTemplateResolution = {
  templateId: Id<"objects">;
  templateCode: string;
  templateName: string;
  context: TemplateSetContext;
};

async function buildTemplateSetContext(
  ctx: any,
  ticketProps: TicketCustomProperties
): Promise<TemplateSetContext> {
  const context: TemplateSetContext = {
    productId: ticketProps.productId,
  };

  const checkoutSessionId = ticketProps.checkoutSessionId;
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

  const domainConfigId = checkoutProps.domainConfigId as Id<"objects"> | undefined;
  if (domainConfigId) {
    context.domainConfigId = domainConfigId;
  }

  if (!context.productId) {
    const selectedProducts = checkoutProps.selectedProducts as Array<{ productId: string }> | undefined;
    if (selectedProducts?.length) {
      context.productId = selectedProducts[0].productId as Id<"objects">;
    }
  }

  return context;
}

async function resolveCanonicalEmailTemplateCode(
  ctx: any,
  params: {
    organizationId: Id<"organizations">;
    ticketProps: TicketCustomProperties;
  }
): Promise<CanonicalEmailTemplateResolution> {
  const context = await buildTemplateSetContext(ctx, params.ticketProps);
  const templateId = await (ctx as any).runQuery(
    generatedApi.internal.templateSetQueries.resolveIndividualTemplateInternal,
    {
      organizationId: params.organizationId,
      templateCapability: "transactional_email",
      context,
    }
  );

  if (!templateId) {
    throw new Error(
      `No transactional email template found for organization ${params.organizationId}.`
    );
  }

  const template = await (ctx as any).runQuery(
    generatedApi.internal.pdfTemplateQueries.resolveEmailTemplateInternal,
    {
      templateId,
      templateCapability: "transactional_email",
    }
  );

  return {
    templateId,
    templateCode: template.templateCode,
    templateName: template.name,
    context,
  };
}

/**
 * Resolve Email Template Code
 *
 * Canonical path: template-set resolver (`transactional_email` capability).
 */
export const resolveEmailTemplateCode = action({
  args: {
    sessionId: v.string(),
    ticketId: v.id("objects"),
  },
  handler: async (ctx, args): Promise<string> => {
    const ticket = await (ctx as any).runQuery(generatedApi.api.ticketOntology.getTicket, {
      sessionId: args.sessionId,
      ticketId: args.ticketId,
    });

    const ticketProps = (ticket?.customProperties || {}) as TicketCustomProperties;
    try {
      const canonicalResolution = await resolveCanonicalEmailTemplateCode(ctx, {
        organizationId: ticket.organizationId,
        ticketProps,
      });
      console.log(
        `✅ [Template Resolver] Using canonical transactional email template: ${canonicalResolution.templateName} (${canonicalResolution.templateCode})`
      );
      return canonicalResolution.templateCode;
    } catch (error) {
      console.warn(
        `⚠️ [Template Resolver] Canonical transactional template resolution failed for ticket ${args.ticketId}.`,
        error
      );
    }

    console.warn(
      `⚠️ [Template Resolver] Falling back to system transactional email template (event-confirmation-v2).`
    );
    return "event-confirmation-v2";
  },
});

/**
 * Get Email Template Data
 *
 * Gathers all data needed to render an email template.
 */
export const getEmailTemplateData = action({
  args: {
    sessionId: v.string(),
    ticketId: v.id("objects"),
    organizationId: v.optional(v.id("organizations")), // Optional: will be derived from ticket if not provided
    domainConfigId: v.optional(v.id("objects")), // Optional: uses system defaults if not provided
    language: v.union(v.literal("de"), v.literal("en"), v.literal("es"), v.literal("fr")),
  },
  handler: async (ctx, args): Promise<{
    templateCode: string;
    ticket: {
      _id: Id<"objects">;
      name: string;
      ticketNumber?: string;
      status: string;
      customProperties: TicketCustomProperties | undefined;
    };
    event: {
      _id: Id<"objects">;
      name: string;
      customProperties?: Record<string, unknown>;
    };
    attendee: {
      firstName: string;
      lastName: string;
      email: string;
      guestCount: number;
    };
    domain: {
      domainName: string;
      siteUrl: string;
      mapsUrl?: string;
    };
    branding: {
      primaryColor: string;
      secondaryColor: string;
      accentColor?: string;
      logoUrl?: string;
    };
    language: "de" | "en" | "es" | "fr";
  }> => {
    // Load ticket
    const ticket = await (ctx as any).runQuery(generatedApi.api.ticketOntology.getTicket, {
      sessionId: args.sessionId,
      ticketId: args.ticketId,
    });

    const ticketProps = (ticket.customProperties || {}) as TicketCustomProperties;

    // Load event
    const eventId = ticketProps.eventId;
    if (!eventId) {
      throw new Error("Ticket has no associated event");
    }

    const event = await (ctx as any).runQuery(generatedApi.api.eventOntology.getEvent, {
      sessionId: args.sessionId,
      eventId: eventId as Id<"objects">,
    });

    // Get organizationId from ticket if not provided
    const organizationId = args.organizationId || ticket.organizationId;

    // Load organization branding settings from organization_settings table
    const orgBrandingSettings = await (ctx as any).runQuery(generatedApi.api.organizationOntology.getOrganizationSettings, {
      organizationId: organizationId,
      subtype: "branding",
    });

    // Extract organization branding or use defaults
    const orgBranding = Array.isArray(orgBrandingSettings) ? undefined : orgBrandingSettings;
    const orgPrimaryColor = orgBranding?.customProperties?.primaryColor as string | undefined;
    const orgSecondaryColor = orgBranding?.customProperties?.secondaryColor as string | undefined;
    const orgLogoUrl = orgBranding?.customProperties?.logo as string | undefined;

    console.log("🎨 [Email Branding] Organization settings:", {
      primaryColor: orgPrimaryColor,
      secondaryColor: orgSecondaryColor,
      hasLogo: !!orgLogoUrl,
      logoUrl: orgLogoUrl,
    });

    // Load domain config (or use system defaults)
    let domainProps: DomainCustomProperties;
    let branding: DomainBranding;

    if (args.domainConfigId) {
      const domainConfig = await (ctx as any).runQuery(generatedApi.api.domainConfigOntology.getDomainConfig, {
        configId: args.domainConfigId,
      });
      domainProps = domainConfig.customProperties as DomainCustomProperties;

      // Cascading branding: domain config can override organization settings
      const domainBranding = domainProps.branding;
      console.log("🎨 [Email Branding] Domain config branding:", domainBranding);

      branding = {
        primaryColor: domainBranding?.primaryColor || orgPrimaryColor || "#ffffff",
        secondaryColor: domainBranding?.secondaryColor || orgSecondaryColor || "#1f2937",
        accentColor: domainBranding?.accentColor || "#f3f4f6",
        logoUrl: domainBranding?.logoUrl || orgLogoUrl,
      };
    } else {
      // Use organization branding with neutral defaults as fallback
      domainProps = {
        domainName: "l4yercak3.com",
        branding: {
          logoUrl: orgLogoUrl,
          primaryColor: orgPrimaryColor || "#ffffff", // Neutral white
          secondaryColor: orgSecondaryColor || "#1f2937", // Neutral dark gray
          accentColor: "#f3f4f6", // Neutral light gray
        },
        webPublishing: {
          siteUrl: "https://l4yercak3.com",
        },
      };
      branding = domainProps.branding!;
    }

    console.log("🎨 [Email Branding] Final cascaded branding:", branding);

    // Extract attendee info - ALWAYS try CRM contact FIRST (matching invoice/PDF pattern)
    let attendeeFirstName = '';
    let attendeeLastName = '';
    let attendeeEmail = '';

    // DEBUG: Log ticket properties to understand what data we have
    console.log(`🔍 [Email Template] Ticket properties:`, {
      contactId: ticketProps.contactId,
      attendeeFirstName: ticketProps.attendeeFirstName,
      attendeeLastName: ticketProps.attendeeLastName,
      attendeeEmail: ticketProps.attendeeEmail,
      holderName: ticketProps.holderName,
      holderEmail: ticketProps.holderEmail,
    });

    // STEP 1: Try to load FRESH CRM contact data first (PRIMARY source)
    if (ticketProps.contactId) {
      console.log(`🔍 [Email Template] Loading FRESH CRM contact: ${ticketProps.contactId}`);
      try {
        const contact = await (ctx as any).runQuery(generatedApi.api.crmOntology.getContact, {
          sessionId: args.sessionId,
          contactId: ticketProps.contactId as Id<"objects">,
        });

        if (contact && contact.type === "crm_contact") {
          const contactProps = contact.customProperties as ContactCustomProperties | undefined;
          attendeeFirstName = contactProps?.firstName || '';
          attendeeLastName = contactProps?.lastName || '';
          attendeeEmail = contactProps?.email || '';
          console.log(`✅ [Email Template] Using FRESH CRM contact: ${attendeeFirstName} ${attendeeLastName}`);
        }
      } catch (error) {
        console.error(`❌ [Email Template] Error loading CRM contact:`, error);
      }
    }

    // STEP 2: Fall back to stale ticket properties if CRM failed or was empty
    if (!attendeeFirstName || !attendeeLastName) {
      console.log(`⚠️ [Email Template] CRM contact empty/failed, using stale ticket properties as fallback`);
      attendeeFirstName = attendeeFirstName || ticketProps.attendeeFirstName || '';
      attendeeLastName = attendeeLastName || ticketProps.attendeeLastName || '';
      attendeeEmail = attendeeEmail || ticketProps.attendeeEmail || (ticketProps.holderEmail as string) || '';
    }

    // STEP 3: Final fallback to holderName if still no first/last name
    // DON'T use ticket.name as fallback - it's the product/ticket type name (e.g., "Ticket - Frühbucher - LisaBöseke")
    if (!attendeeFirstName && !attendeeLastName) {
      console.log(`⚠️ [Email Template] No name in CRM or ticket props, parsing holderName as last resort`);
      const holderName = (ticketProps.holderName as string) || (ticketProps.attendeeName as string) || '';
      if (holderName) {
        attendeeFirstName = holderName.split(' ')[0] || 'Guest';
        attendeeLastName = holderName.split(' ').slice(1).join(' ') || '';
      } else {
        attendeeFirstName = 'Guest';
        attendeeLastName = '';
      }
    }

    // Resolve template code
    const templateCode: string = await (ctx as any).runAction(generatedApi.api.emailTemplateRenderer.resolveEmailTemplateCode, {
      sessionId: args.sessionId,
      ticketId: args.ticketId,
    });

    // DEBUG: Log final resolved attendee data
    console.log(`✅ [Email Template] Final resolved attendee:`, {
      firstName: attendeeFirstName,
      lastName: attendeeLastName,
      email: attendeeEmail,
    });

    // Return all data needed for template rendering
    return {
      templateCode,
      ticket: {
        _id: ticket._id,
        name: ticket.name,
        ticketNumber: ticketProps.ticketNumber,
        status: ticket.status,
        customProperties: ticketProps,
      },
      event: {
        _id: event._id,
        name: event.name,
        customProperties: event.customProperties,
      },
      attendee: {
        firstName: attendeeFirstName,
        lastName: attendeeLastName,
        email: attendeeEmail,
        guestCount: ticketProps.guestCount || 0,
      },
      domain: {
        domainName: domainProps.domainName || 'l4yercak3.com',
        siteUrl: domainProps.webPublishing?.siteUrl || 'https://pluseins.gg',
        mapsUrl: "https://maps.app.goo.gl/zZXwB5vnZn6vIfH2F", // TODO: Make configurable
      },
      branding: {
        primaryColor: branding.primaryColor || '#ffffff',
        secondaryColor: branding.secondaryColor || '#1f2937',
        accentColor: branding.accentColor,
        logoUrl: branding.logoUrl,
      },
      language: args.language,
    };
  },
});
