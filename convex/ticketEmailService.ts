/**
 * TICKET EMAIL SERVICE
 *
 * Sends ticket confirmation emails with PDF and ICS attachments
 * Replicates frontend email system but runs in backend
 * Reads configuration from domain config ontology
 */

import { action } from "./_generated/server";
import { v } from "convex/values";
import { internal, api } from "./_generated/api";
import { Id } from "./_generated/dataModel";

/**
 * Generate customer confirmation email HTML
 * Beautiful cigar lounge styling from geschlossene-gesellschaft
 */
function generateCustomerEmailHTML(data: {
  firstName: string;
  lastName: string;
  eventName: string;
  eventDate: string;
  eventTime: string;
  eventVenue: string;
  guestCount: number;
  eventUrl: string;
  branding: {
    primaryColor: string;
    logoUrl?: string;
  };
}): string {
  const { firstName, lastName, eventName, eventDate, eventTime, eventVenue, guestCount, eventUrl, branding } = data;
  const fullName = `${firstName} ${lastName}`;
  const primaryColor = branding.primaryColor || '#d4af37';

  return `
<!DOCTYPE html>
<html lang="de">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Reservierung Bestätigt</title>
</head>
<body style="margin: 0; padding: 0; font-family: 'Didot', 'Bodoni MT', 'Garamond', serif; background-color: #0a0806; color: #f5f1e8;">
  <div style="max-width: 600px; margin: 40px auto; background: linear-gradient(135deg, #1a1412 0%, #2c1810 100%); border-radius: 12px; overflow: hidden; box-shadow: 0 8px 32px rgba(212, 175, 55, 0.2);">

    <!-- Header with Gold Accent -->
    <div style="background: linear-gradient(135deg, #2c1810 0%, #1a1412 100%); padding: 50px 30px; text-align: center; border-bottom: 2px solid ${primaryColor}; position: relative;">
      <div style="width: 80px; height: 2px; background: linear-gradient(90deg, transparent, ${primaryColor}, transparent); margin: 0 auto 30px;"></div>
      <h1 style="margin: 0; color: ${primaryColor}; font-size: 24px; font-weight: 300; letter-spacing: 4px; text-transform: uppercase; text-shadow: 0 2px 4px rgba(0, 0, 0, 0.3); line-height: 1.4;">
        Geschlossene Gesellschaft
      </h1>
      <div style="width: 80px; height: 2px; background: linear-gradient(90deg, transparent, ${primaryColor}, transparent); margin: 30px auto 0;"></div>
    </div>

    <!-- Content -->
    <div style="padding: 50px 40px;">
      <div style="text-align: center; margin-bottom: 40px;">
        <p style="margin: 0 0 20px 0; font-size: 18px; color: ${primaryColor}; letter-spacing: 3px; text-transform: uppercase; font-weight: 300;">
          Reservierung Bestätigt
        </p>
        <h2 style="margin: 0; font-size: 28px; color: #ffffff; font-weight: 300; letter-spacing: 2px;">
          ${fullName}
        </h2>
      </div>

      <p style="margin: 0 0 30px 0; font-size: 16px; line-height: 1.8; color: #ffffff; text-align: center;">
        Vielen Dank für deine Anmeldung. Deine Reservierung wurde erfolgreich bestätigt. Wir freuen uns, dich in unserem exklusiven Kreis begrüßen zu dürfen.
      </p>

      <!-- Event Details Box -->
      <div style="background: rgba(212, 175, 55, 0.08); border: 1px solid rgba(212, 175, 55, 0.3); border-radius: 8px; padding: 30px; margin: 40px 0;">
        <div style="text-align: center; margin-bottom: 25px;">
          <p style="margin: 0; font-size: 14px; letter-spacing: 3px; text-transform: uppercase; color: ${primaryColor};">
            Event Details
          </p>
        </div>

        <table style="width: 100%; border-collapse: collapse;">
          <tr>
            <td style="padding: 12px 0; font-size: 13px; color: #a89968; letter-spacing: 2px; text-transform: uppercase; width: 40%;">Event:</td>
            <td style="padding: 12px 0; font-size: 16px; color: #ffffff; font-weight: 300;">${eventName}</td>
          </tr>
          <tr>
            <td style="padding: 12px 0; font-size: 13px; color: #a89968; letter-spacing: 2px; text-transform: uppercase;">Datum:</td>
            <td style="padding: 12px 0; font-size: 16px; color: #ffffff; font-weight: 300;">${eventDate}</td>
          </tr>
          <tr>
            <td style="padding: 12px 0; font-size: 13px; color: #a89968; letter-spacing: 2px; text-transform: uppercase;">Zeit:</td>
            <td style="padding: 12px 0; font-size: 16px; color: #ffffff; font-weight: 300;">${eventTime}</td>
          </tr>
          <tr>
            <td style="padding: 12px 0; font-size: 13px; color: #a89968; letter-spacing: 2px; text-transform: uppercase;">Ort:</td>
            <td style="padding: 12px 0; font-size: 16px; color: #ffffff; font-weight: 300;">${eventVenue}</td>
          </tr>
          ${guestCount > 0 ? `
          <tr>
            <td style="padding: 12px 0; font-size: 13px; color: #a89968; letter-spacing: 2px; text-transform: uppercase;">Gäste:</td>
            <td style="padding: 12px 0; font-size: 16px; color: #ffffff; font-weight: 300;">+${guestCount} ${guestCount === 1 ? 'Gast' : 'Gäste'}</td>
          </tr>
          ` : ''}
        </table>
      </div>

      <!-- Attachments Notice -->
      <div style="text-align: center; padding: 30px 20px; background: rgba(212, 175, 55, 0.05); border-radius: 8px; border: 1px dashed rgba(212, 175, 55, 0.3); margin: 30px 0;">
        <p style="margin: 0 0 15px 0; font-size: 14px; color: ${primaryColor}; letter-spacing: 2px; text-transform: uppercase;">
          📎 Anhänge
        </p>
        <p style="margin: 0 0 10px 0; font-size: 14px; color: #ffffff; line-height: 1.6;">
          <strong>Event-Ticket (PDF):</strong><br>
          Dein personalisiertes Ticket mit QR-Code.<br>
          Bitte zeig es am Eingang vor.
        </p>
        <p style="margin: 0; font-size: 14px; color: #ffffff; line-height: 1.6;">
          <strong>Kalenderdatei (ICS):</strong><br>
          Klicke auf die angehängte .ics-Datei, um das Event<br>
          direkt zu deinem Kalender hinzuzufügen.
        </p>
      </div>

      <!-- Quick Links -->
      <div style="margin: 30px 0; padding: 25px; background: rgba(212, 175, 55, 0.05); border-radius: 8px;">
        <p style="margin: 0 0 20px 0; font-size: 14px; color: ${primaryColor}; letter-spacing: 2px; text-transform: uppercase; text-align: center;">
          Nützliche Links
        </p>
        <table style="width: 100%; border-collapse: collapse;">
          <tr>
            <td style="padding: 12px; text-align: center;">
              <a href="https://maps.app.goo.gl/zZXwB5vnZn6vIfH2F" style="display: inline-flex; align-items: center; gap: 8px; text-decoration: none; color: #ffffff; font-size: 14px; padding: 10px 20px; background: rgba(212, 175, 55, 0.15); border-radius: 6px; transition: background 0.3s;">
                📍 Wegbeschreibung
              </a>
            </td>
          </tr>
          <tr>
            <td style="padding: 12px; text-align: center;">
              <a href="${eventUrl}" style="display: inline-flex; align-items: center; gap: 8px; text-decoration: none; color: #ffffff; font-size: 14px; padding: 10px 20px; background: rgba(212, 175, 55, 0.15); border-radius: 6px; transition: background 0.3s;">
                📅 Event-Seite öffnen
              </a>
            </td>
          </tr>
        </table>
      </div>

      <!-- Important Note -->
      <div style="margin: 40px 0; padding: 25px; background: rgba(212, 175, 55, 0.05); border-left: 3px solid ${primaryColor}; border-radius: 4px;">
        <p style="margin: 0 0 10px 0; font-size: 14px; color: ${primaryColor}; letter-spacing: 2px; text-transform: uppercase; font-weight: 500;">
          Wichtiger Hinweis
        </p>
        <p style="margin: 0; font-size: 14px; color: #ffffff; line-height: 1.7;">
          Dies ist eine kuratierte, exklusive Veranstaltung. Bitte behandle die Details vertraulich.
          Der Zutritt ist nur mit gültigem Ticket möglich.
        </p>
      </div>

      <!-- Closing -->
      <div style="text-align: center; margin-top: 50px; padding-top: 40px; border-top: 1px solid rgba(212, 175, 55, 0.2);">
        <p style="margin: 0 0 15px 0; font-size: 16px; color: #ffffff; font-weight: 300; letter-spacing: 1px;">
          Wir freuen uns auf deinen Besuch
        </p>
        <p style="margin: 0; font-size: 14px; color: #a89968; letter-spacing: 2px;">
          — Dein Geschlossene Gesellschaft Team —
        </p>
      </div>
    </div>

    <!-- Footer -->
    <div style="padding: 30px 40px; background: #0f0b09; text-align: center; border-top: 1px solid rgba(212, 175, 55, 0.2);">
      <p style="margin: 0 0 5px 0; font-size: 12px; color: #6b5d47; letter-spacing: 1px;">
        © ${new Date().getFullYear()} Geschlossene Gesellschaft
      </p>
      <p style="margin: 0; font-size: 11px; color: #4a3f2f; letter-spacing: 1px;">
        Privat · Offen · Echt
      </p>
    </div>
  </div>
</body>
</html>
  `;
}

/**
 * Send ticket confirmation email (manual trigger from UI)
 */
export const sendTicketConfirmationEmail = action({
  args: {
    ticketId: v.id("objects"),
    domainConfigId: v.id("objects"),
    isTest: v.optional(v.boolean()), // If true, sends to test email
    testRecipient: v.optional(v.string()),
  },
  handler: async (ctx, args): Promise<{
    success: boolean;
    messageId?: string;
    sentTo: string;
    isTest: boolean;
  }> => {
    console.log(`📧 Sending ticket confirmation email for ticket ${args.ticketId}`);

    // 1. Load ticket data
    const ticket = await ctx.runQuery(api.ticketOntology.getTicket, {
      sessionId: `email_${Date.now()}`,
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
      sessionId: `email_${Date.now()}`,
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

    // 5. Generate email HTML
    const emailHtml = generateCustomerEmailHTML({
      firstName: attendeeFirstName,
      lastName: attendeeLastName,
      eventName: event.name,
      eventDate: eventProps.startDate || 'TBD',
      eventTime: eventProps.startTime || 'TBD',
      eventVenue: eventProps.location || 'TBD',
      guestCount: ticketProps.guestCount || 0,
      eventUrl: domainProps.webPublishing?.siteUrl || 'https://pluseins.gg',
      branding: {
        primaryColor: branding.primaryColor,
        logoUrl: branding.logoUrl,
      },
    });

    // 6. Generate PDF ticket (we already have PDF generation system!)
    // TODO: Get actual PDF buffer from ticket or generate it
    const pdfBuffer = ""; // Base64 encoded PDF - we'll add this next

    // 7. Send email via delivery service
    const subject = args.isTest
      ? `[TEST] Deine Reservierung für ${event.name} ist bestätigt`
      : `Deine Reservierung für ${event.name} ist bestätigt`;

    const result: any = await ctx.runAction(internal.emailDelivery.sendEmail, {
      domainConfigId: args.domainConfigId,
      to: attendeeEmail,
      subject,
      html: emailHtml,
      // TODO: Add PDF and ICS attachments
    });

    return {
      success: result.success,
      messageId: result.messageId,
      sentTo: attendeeEmail,
      isTest: args.isTest || false,
    };
  },
});

/**
 * Preview email HTML (for testing before sending)
 * Returns the HTML so UI can display it
 */
export const previewTicketEmail = action({
  args: {
    ticketId: v.id("objects"),
    domainConfigId: v.id("objects"),
  },
  handler: async (ctx, args): Promise<{
    html: string;
    subject: string;
    to: string;
  }> => {
    // Load all data same as send action
    const ticket = await ctx.runQuery(api.ticketOntology.getTicket, {
      sessionId: `email_preview_${Date.now()}`,
      ticketId: args.ticketId,
    });

    const ticketProps = ticket.customProperties as any;
    const eventId = ticketProps.eventId;

    const event = await ctx.runQuery(api.eventOntology.getEvent, {
      sessionId: `email_preview_${Date.now()}`,
      eventId: eventId as Id<"objects">,
    });

    const eventProps = event.customProperties as any;

    const domainConfig = await ctx.runQuery(api.domainConfigOntology.getDomainConfig, {
      configId: args.domainConfigId,
    });

    const domainProps = domainConfig.customProperties as any;
    const branding = domainProps.branding;

    // Generate HTML
    const attendeeFirstName = ticketProps.attendeeFirstName || ticket.name.split(' ')[0];
    const attendeeLastName = ticketProps.attendeeLastName || ticket.name.split(' ').slice(1).join(' ');

    const emailHtml = generateCustomerEmailHTML({
      firstName: attendeeFirstName,
      lastName: attendeeLastName,
      eventName: event.name,
      eventDate: eventProps.startDate || 'TBD',
      eventTime: eventProps.startTime || 'TBD',
      eventVenue: eventProps.location || 'TBD',
      guestCount: ticketProps.guestCount || 0,
      eventUrl: domainProps.webPublishing?.siteUrl || 'https://pluseins.gg',
      branding: {
        primaryColor: branding.primaryColor,
        logoUrl: branding.logoUrl,
      },
    });

    return {
      html: emailHtml,
      subject: `Deine Reservierung für ${event.name} ist bestätigt`,
      to: ticketProps.attendeeEmail || 'kunde@beispiel.de',
    };
  },
});
