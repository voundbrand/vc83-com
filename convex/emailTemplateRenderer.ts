/**
 * EMAIL TEMPLATE RENDERER
 *
 * Backend service that resolves and renders email templates.
 * Follows the template resolution chain:
 * Ticket → Product → Event → Domain → Organization → System
 */

import { action } from "./_generated/server";
import { v } from "convex/values";
import { api } from "./_generated/api";
import { Id } from "./_generated/dataModel";

// Import email template registry (runtime import)
// Note: In production, this would be a dynamic import or server-side rendering
// For now, we'll use the template code and generate on the frontend, then call from backend

/**
 * Resolve Email Template Code
 *
 * Walks the resolution chain to find which template to use.
 * Ticket → Product → Event → Domain → Organization → System
 */
export const resolveEmailTemplateCode = action({
  args: {
    sessionId: v.string(),
    ticketId: v.id("objects"),
  },
  handler: async (ctx, args): Promise<string> => {
    // 1. Get ticket
    const ticket = await ctx.runQuery(api.ticketOntology.getTicket, {
      sessionId: args.sessionId,
      ticketId: args.ticketId,
    });

    // Check ticket-level template (for manual testing/overrides)
    const ticketProps = ticket.customProperties as any;
    if (ticketProps?.emailTemplateId) {
      const template = await ctx.runQuery(api.templateOntology.getEmailTemplateById, {
        templateId: ticketProps.emailTemplateId as Id<"objects">,
      });
      if (template?.customProperties?.code) {
        console.log(`✅ Using ticket-level email template: ${template.customProperties.code}`);
        return template.customProperties.code;
      }
    }

    // 2. Check product-level template
    const productId = ticketProps?.productId;
    if (productId) {
      const product = await ctx.runQuery(api.productOntology.getProduct, {
        sessionId: args.sessionId,
        productId: productId as Id<"objects">,
      });

      const productProps = product.customProperties as any;
      if (productProps?.emailTemplateId) {
        const template = await ctx.runQuery(api.templateOntology.getEmailTemplateById, {
          templateId: productProps.emailTemplateId as Id<"objects">,
        });
        if (template?.customProperties?.code) {
          console.log(`✅ Using product-level email template: ${template.customProperties.code}`);
          return template.customProperties.code;
        }
      }
    }

    // 3. Check event-level template
    const eventId = ticketProps?.eventId;
    if (eventId) {
      const event = await ctx.runQuery(api.eventOntology.getEvent, {
        sessionId: args.sessionId,
        eventId: eventId as Id<"objects">,
      });

      const eventProps = event.customProperties as any;
      if (eventProps?.emailTemplateId) {
        const template = await ctx.runQuery(api.templateOntology.getEmailTemplateById, {
          templateId: eventProps.emailTemplateId as Id<"objects">,
        });
        if (template?.customProperties?.code) {
          console.log(`✅ Using event-level email template: ${template.customProperties.code}`);
          return template.customProperties.code;
        }
      }
    }

    // 4. Check domain-level template (from domain config)
    // For now, default to luxury-confirmation
    // TODO: Add domain config template resolution

    // 5. Default fallback
    console.log(`✅ Using fallback email template: luxury-confirmation`);
    return "luxury-confirmation";
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
    domainConfigId: v.id("objects"),
    language: v.union(v.literal("de"), v.literal("en"), v.literal("es"), v.literal("fr")),
  },
  handler: async (ctx, args): Promise<{
    templateCode: string;
    ticket: {
      _id: Id<"objects">;
      name: string;
      ticketNumber?: string;
      status: string;
      customProperties: any;
    };
    event: {
      _id: Id<"objects">;
      name: string;
      customProperties?: any;
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
    const ticket = await ctx.runQuery(api.ticketOntology.getTicket, {
      sessionId: args.sessionId,
      ticketId: args.ticketId,
    });

    const ticketProps = ticket.customProperties as any;

    // Load event
    const eventId = ticketProps.eventId;
    if (!eventId) {
      throw new Error("Ticket has no associated event");
    }

    const event = await ctx.runQuery(api.eventOntology.getEvent, {
      sessionId: args.sessionId,
      eventId: eventId as Id<"objects">,
    });

    // Load domain config
    const domainConfig = await ctx.runQuery(api.domainConfigOntology.getDomainConfig, {
      configId: args.domainConfigId,
    });

    const domainProps = domainConfig.customProperties as any;
    const branding = domainProps.branding;

    // Extract attendee info
    const attendeeFirstName = ticketProps.attendeeFirstName || ticket.name.split(' ')[0];
    const attendeeLastName = ticketProps.attendeeLastName || ticket.name.split(' ').slice(1).join(' ');
    const attendeeEmail = ticketProps.attendeeEmail || '';

    // Resolve template code
    const templateCode: string = await ctx.runAction(api.emailTemplateRenderer.resolveEmailTemplateCode, {
      sessionId: args.sessionId,
      ticketId: args.ticketId,
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
        domainName: domainProps.domainName,
        siteUrl: domainProps.webPublishing?.siteUrl || 'https://pluseins.gg',
        mapsUrl: "https://maps.app.goo.gl/zZXwB5vnZn6vIfH2F", // TODO: Make configurable
      },
      branding: {
        primaryColor: branding.primaryColor,
        secondaryColor: branding.secondaryColor,
        accentColor: branding.accentColor,
        logoUrl: branding.logoUrl,
      },
      language: args.language,
    };
  },
});
