/**
 * SALES NOTIFICATION EMAIL TEMPLATE
 *
 * Internal notification sent to sales team when new tickets/reservations are created.
 *
 * Design: Clean, actionable, internal-focused (not customer-facing)
 * Languages: DE, EN, ES, FR
 * Features: Quick action buttons, highlighted guest info, event details
 */

import { EmailTemplateProps, EmailTemplateOutput } from "../types";
import { salesNotificationTranslations } from "./translations";

/**
 * Sales Notification Email Template
 *
 * Generates internal notification HTML for sales team.
 * Pure inline styles (no CSS bleeding).
 */
export function SalesNotificationTemplate(props: EmailTemplateProps): EmailTemplateOutput {
  const { ticket, event, attendee, domain, branding, language } = props;

  const t = salesNotificationTranslations[language];
  const brandColor = branding.primaryColor || '#d4af37';
  const fullName = `${attendee.firstName} ${attendee.lastName}`;

  const timestamp = new Date().toLocaleString(language === 'de' ? 'de-DE' : language === 'fr' ? 'fr-FR' : language === 'es' ? 'es-ES' : 'en-US', {
    dateStyle: 'medium',
    timeStyle: 'short'
  });

  // Calculate total guest count
  const totalGuests = 1 + (attendee.guestCount || 0);
  const guestCountText = attendee.guestCount === 0
    ? t.mainGuestOnly
    : `${totalGuests} ${totalGuests === 1 ? t.personSingular : t.personPlural} (${t.mainGuestPlus} ${attendee.guestCount})`;

  const html = `
<!DOCTYPE html>
<html lang="${language}">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${t.title}</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f8fafc; color: #1f2937;">
  <div style="max-width: 700px; margin: 40px auto; background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">

    <!-- Header with Priority Badge -->
    <div style="background: linear-gradient(135deg, #1f2937 0%, #111827 100%); padding: 32px; position: relative;">
      <div style="position: absolute; top: 16px; right: 16px; background-color: #10b981; color: white; padding: 8px 16px; border-radius: 20px; font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px;">
        ${t.newReservation}
      </div>

      <h1 style="margin: 0 0 8px 0; color: #ffffff; font-size: 24px; font-weight: 600;">
        ${t.title}
      </h1>
      <p style="margin: 0; color: rgba(255, 255, 255, 0.8); font-size: 14px;">
        ${event.name} • ${timestamp}
      </p>
    </div>

    <!-- Guest Information -->
    <div style="padding: 32px;">

      <!-- Contact Details -->
      <div style="margin-bottom: 32px; padding: 24px; background-color: #f8fafc; border-radius: 8px; border-left: 4px solid ${brandColor};">
        <h2 style="margin: 0 0 16px 0; font-size: 18px; font-weight: 600; color: #1f2937;">
          ${t.guestInformation}
        </h2>
        <table style="width: 100%; border-collapse: collapse;">
          <tr>
            <td style="padding: 8px 0; font-weight: 600; color: #64748b; width: 140px;">${t.name}</td>
            <td style="padding: 8px 0; color: #1f2937; font-weight: 500;">${fullName}</td>
          </tr>
          ${attendee.phone ? `
          <tr>
            <td style="padding: 8px 0; font-weight: 600; color: #64748b;">${t.phone}</td>
            <td style="padding: 8px 0;">
              <a href="tel:${attendee.phone}" style="color: ${brandColor}; text-decoration: none;">${attendee.phone}</a>
            </td>
          </tr>
          ` : ''}
          <tr>
            <td style="padding: 8px 0; font-weight: 600; color: #64748b;">${t.email}</td>
            <td style="padding: 8px 0;">
              <a href="mailto:${attendee.email}" style="color: ${brandColor}; text-decoration: none;">${attendee.email}</a>
            </td>
          </tr>
          <tr>
            <td style="padding: 8px 0; font-weight: 600; color: #64748b;">${t.guestCount}</td>
            <td style="padding: 8px 0; color: #1f2937; font-weight: 600;">
              ${guestCountText}
            </td>
          </tr>
        </table>
      </div>

      <!-- Event Details -->
      <div style="margin-bottom: 32px; padding: 24px; background-color: #fef3c7; border-radius: 8px; border-left: 4px solid #d97706;">
        <h2 style="margin: 0 0 16px 0; font-size: 18px; font-weight: 600; color: #1f2937;">
          ${t.eventDetails}
        </h2>
        <table style="width: 100%; border-collapse: collapse;">
          <tr>
            <td style="padding: 8px 0; font-weight: 600; color: #92400e; width: 140px;">${t.event}</td>
            <td style="padding: 8px 0; color: #1f2937; font-weight: 500;">${event.name}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; font-weight: 600; color: #92400e;">${t.date}</td>
            <td style="padding: 8px 0; color: #1f2937;">${event.customProperties?.startDate || 'TBD'}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; font-weight: 600; color: #92400e;">${t.time}</td>
            <td style="padding: 8px 0; color: #1f2937;">${event.customProperties?.startTime || 'TBD'}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; font-weight: 600; color: #92400e;">${t.location}</td>
            <td style="padding: 8px 0; color: #1f2937;">${event.customProperties?.location || 'TBD'}</td>
          </tr>
        </table>
      </div>

      <!-- Quick Actions -->
      <div style="margin-top: 32px; padding: 24px; background-color: #eff6ff; border-radius: 8px; border: 2px solid ${brandColor};">
        <h2 style="margin: 0 0 16px 0; font-size: 18px; font-weight: 600; color: #1f2937;">
          ${t.quickActions}
        </h2>

        <div style="margin-bottom: 12px;">
          <a href="mailto:${attendee.email}?subject=Re:%20${encodeURIComponent(t.title)}%20-%20${encodeURIComponent(event.name)}"
             style="display: inline-block; margin-right: 8px; margin-bottom: 8px; padding: 12px 24px; background-color: ${brandColor}; color: #1a1412; text-decoration: none; border-radius: 6px; font-weight: 600; font-size: 14px;">
            ${t.contactGuest}
          </a>

          ${attendee.phone ? `
          <a href="tel:${attendee.phone}"
             style="display: inline-block; margin-right: 8px; margin-bottom: 8px; padding: 12px 24px; background-color: #10b981; color: #ffffff; text-decoration: none; border-radius: 6px; font-weight: 600; font-size: 14px;">
            ${t.call}
          </a>
          ` : ''}
        </div>

        <p style="margin: 16px 0 0 0; font-size: 13px; color: #64748b;">
          <strong>${t.noteTicketAttached}</strong>
        </p>
      </div>

      <!-- Metadata -->
      <div style="margin-top: 32px; padding-top: 24px; border-top: 1px solid #e5e7eb;">
        <p style="margin: 0 0 4px 0; font-size: 12px; color: #94a3b8;">
          <strong>${t.reservationTime}</strong> ${timestamp}
        </p>
        <p style="margin: 0 0 4px 0; font-size: 12px; color: #94a3b8;">
          <strong>${t.reservationId}</strong> ${ticket._id}
        </p>
      </div>
    </div>

    <!-- Footer -->
    <div style="padding: 24px 32px; background-color: #1f2937; text-align: center;">
      <p style="margin: 0; font-size: 13px; color: #9ca3af;">
        ${domain.displayName || domain.domainName} • ${t.automaticNotification}
      </p>
    </div>
  </div>
</body>
</html>
  `;

  // Generate subject line
  const subjects = {
    de: `🎫 Neue Reservierung: ${fullName} für ${event.name}`,
    en: `🎫 New Reservation: ${fullName} for ${event.name}`,
    es: `🎫 Nueva Reserva: ${fullName} para ${event.name}`,
    fr: `🎫 Nouvelle Réservation: ${fullName} pour ${event.name}`,
  };

  return {
    html,
    subject: subjects[language],
    previewText: `${t.title}: ${fullName} - ${event.name}`,
  };
}

/**
 * Sales Notification Email Metadata
 * For registration in the email template registry
 */
export const SALES_NOTIFICATION_EMAIL_METADATA = {
  code: "email_sales_notification",
  name: "Internal Sales Notification",
  description: "Internal notification sent to sales team when a new ticket/reservation is created",
  category: "system" as const,
  suggestedSections: ["hero", "body", "orderDetails", "cta"] as const,
  previewImageUrl: "",
  supportedLanguages: ["en", "de", "es", "fr"],
  author: "System",
  version: "1.0.0",
};
