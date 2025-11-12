/**
 * LUXURY CONFIRMATION EMAIL TEMPLATE
 *
 * Elegant gold & dark theme for upscale events
 * Inspired by geschlossene-gesellschaft aesthetic
 *
 * Languages: DE, EN, ES, FR
 * Supports: PDF tickets, ICS calendar files
 */

import { EmailTemplateProps, EmailTemplateOutput } from "../types";
import { luxuryConfirmationTranslations } from "./translations";

/**
 * Luxury Confirmation Email Template
 *
 * Generates beautiful HTML email with inline styles (no CSS bleeding).
 */
export function LuxuryConfirmationTemplate(props: EmailTemplateProps): EmailTemplateOutput {
  const { ticket, event, attendee, domain, branding, language } = props;

  const t = luxuryConfirmationTranslations[language];
  const primaryColor = branding.primaryColor || '#d4af37';
  const fullName = `${attendee.firstName} ${attendee.lastName}`;
  const year = new Date().getFullYear();

  const html = `
<!DOCTYPE html>
<html lang="${language}">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${t.confirmationHeading}</title>
</head>
<body style="margin: 0; padding: 0; font-family: 'Didot', 'Bodoni MT', 'Garamond', serif; background-color: #0a0806; color: #f5f1e8;">
  <div style="max-width: 600px; margin: 40px auto; background: linear-gradient(135deg, #1a1412 0%, #2c1810 100%); border-radius: 12px; overflow: hidden; box-shadow: 0 8px 32px rgba(212, 175, 55, 0.2);">

    <!-- Header with Gold Accent -->
    <div style="background: linear-gradient(135deg, #2c1810 0%, #1a1412 100%); padding: 50px 30px; text-align: center; border-bottom: 2px solid ${primaryColor}; position: relative;">
      <div style="width: 80px; height: 2px; background: linear-gradient(90deg, transparent, ${primaryColor}, transparent); margin: 0 auto 30px;"></div>
      <h1 style="margin: 0; color: ${primaryColor}; font-size: 24px; font-weight: 300; letter-spacing: 4px; text-transform: uppercase; text-shadow: 0 2px 4px rgba(0, 0, 0, 0.3); line-height: 1.4;">
        ${t.title}
      </h1>
      <div style="width: 80px; height: 2px; background: linear-gradient(90deg, transparent, ${primaryColor}, transparent); margin: 30px auto 0;"></div>
    </div>

    <!-- Content -->
    <div style="padding: 50px 40px;">
      <div style="text-align: center; margin-bottom: 40px;">
        <p style="margin: 0 0 20px 0; font-size: 18px; color: ${primaryColor}; letter-spacing: 3px; text-transform: uppercase; font-weight: 300;">
          ${t.confirmationHeading}
        </p>
        <h2 style="margin: 0; font-size: 28px; color: #ffffff; font-weight: 300; letter-spacing: 2px;">
          ${fullName}
        </h2>
      </div>

      <p style="margin: 0 0 30px 0; font-size: 16px; line-height: 1.8; color: #ffffff; text-align: center;">
        ${t.thankYou}
      </p>

      <!-- Event Details Box -->
      <div style="background: rgba(212, 175, 55, 0.08); border: 1px solid rgba(212, 175, 55, 0.3); border-radius: 8px; padding: 30px; margin: 40px 0;">
        <div style="text-align: center; margin-bottom: 25px;">
          <p style="margin: 0; font-size: 14px; letter-spacing: 3px; text-transform: uppercase; color: ${primaryColor};">
            ${t.eventDetails}
          </p>
        </div>

        <table style="width: 100%; border-collapse: collapse;">
          <tr>
            <td style="padding: 12px 0; font-size: 13px; color: #a89968; letter-spacing: 2px; text-transform: uppercase; width: 40%;">${t.event}</td>
            <td style="padding: 12px 0; font-size: 16px; color: #ffffff; font-weight: 300;">${event.name}</td>
          </tr>
          <tr>
            <td style="padding: 12px 0; font-size: 13px; color: #a89968; letter-spacing: 2px; text-transform: uppercase;">${t.date}</td>
            <td style="padding: 12px 0; font-size: 16px; color: #ffffff; font-weight: 300;">${event.customProperties?.startDate || 'TBD'}</td>
          </tr>
          <tr>
            <td style="padding: 12px 0; font-size: 13px; color: #a89968; letter-spacing: 2px; text-transform: uppercase;">${t.time}</td>
            <td style="padding: 12px 0; font-size: 16px; color: #ffffff; font-weight: 300;">${event.customProperties?.startTime || 'TBD'}</td>
          </tr>
          <tr>
            <td style="padding: 12px 0; font-size: 13px; color: #a89968; letter-spacing: 2px; text-transform: uppercase;">${t.location}</td>
            <td style="padding: 12px 0; font-size: 16px; color: #ffffff; font-weight: 300;">${event.customProperties?.location || 'TBD'}</td>
          </tr>
          ${attendee.guestCount > 0 ? `
          <tr>
            <td style="padding: 12px 0; font-size: 13px; color: #a89968; letter-spacing: 2px; text-transform: uppercase;">${t.guests}</td>
            <td style="padding: 12px 0; font-size: 16px; color: #ffffff; font-weight: 300;">+${attendee.guestCount} ${attendee.guestCount === 1 ? t.guest : t.guests}</td>
          </tr>
          ` : ''}
        </table>
      </div>

      <!-- Attachments Notice -->
      <div style="text-align: center; padding: 30px 20px; background: rgba(212, 175, 55, 0.05); border-radius: 8px; border: 1px dashed rgba(212, 175, 55, 0.3); margin: 30px 0;">
        <p style="margin: 0 0 15px 0; font-size: 14px; color: ${primaryColor}; letter-spacing: 2px; text-transform: uppercase;">
          ${t.attachments}
        </p>
        <p style="margin: 0 0 10px 0; font-size: 14px; color: #ffffff; line-height: 1.6;">
          <strong>${t.ticketPDF}</strong><br>
          ${t.ticketPDFDesc}
        </p>
        <p style="margin: 0; font-size: 14px; color: #ffffff; line-height: 1.6;">
          <strong>${t.calendarFile}</strong><br>
          ${t.calendarFileDesc}
        </p>
      </div>

      <!-- Quick Links -->
      <div style="margin: 30px 0; padding: 25px; background: rgba(212, 175, 55, 0.05); border-radius: 8px;">
        <p style="margin: 0 0 20px 0; font-size: 14px; color: ${primaryColor}; letter-spacing: 2px; text-transform: uppercase; text-align: center;">
          ${t.usefulLinks}
        </p>
        <table style="width: 100%; border-collapse: collapse;">
          ${domain.mapsUrl ? `
          <tr>
            <td style="padding: 12px; text-align: center;">
              <a href="${domain.mapsUrl}" style="display: inline-flex; align-items: center; gap: 8px; text-decoration: none; color: #ffffff; font-size: 14px; padding: 10px 20px; background: rgba(212, 175, 55, 0.15); border-radius: 6px; transition: background 0.3s;">
                ${t.directions}
              </a>
            </td>
          </tr>
          ` : ''}
          <tr>
            <td style="padding: 12px; text-align: center;">
              <a href="${domain.siteUrl}" style="display: inline-flex; align-items: center; gap: 8px; text-decoration: none; color: #ffffff; font-size: 14px; padding: 10px 20px; background: rgba(212, 175, 55, 0.15); border-radius: 6px; transition: background 0.3s;">
                ${t.eventPage}
              </a>
            </td>
          </tr>
        </table>
      </div>

      <!-- Important Note -->
      <div style="margin: 40px 0; padding: 25px; background: rgba(212, 175, 55, 0.05); border-left: 3px solid ${primaryColor}; border-radius: 4px;">
        <p style="margin: 0 0 10px 0; font-size: 14px; color: ${primaryColor}; letter-spacing: 2px; text-transform: uppercase; font-weight: 500;">
          ${t.importantNote}
        </p>
        <p style="margin: 0; font-size: 14px; color: #ffffff; line-height: 1.7;">
          ${t.noteContent}
        </p>
      </div>

      <!-- Closing -->
      <div style="text-align: center; margin-top: 50px; padding-top: 40px; border-top: 1px solid rgba(212, 175, 55, 0.2);">
        <p style="margin: 0 0 15px 0; font-size: 16px; color: #ffffff; font-weight: 300; letter-spacing: 1px;">
          ${t.closing}
        </p>
        <p style="margin: 0; font-size: 14px; color: #a89968; letter-spacing: 2px;">
          ${t.team}
        </p>
      </div>
    </div>

    <!-- Footer -->
    <div style="padding: 30px 40px; background: #0f0b09; text-align: center; border-top: 1px solid rgba(212, 175, 55, 0.2);">
      <p style="margin: 0 0 5px 0; font-size: 12px; color: #6b5d47; letter-spacing: 1px;">
        ${t.copyright.replace('{{year}}', year.toString())}
      </p>
      <p style="margin: 0; font-size: 11px; color: #4a3f2f; letter-spacing: 1px;">
        ${t.tagline}
      </p>
    </div>
  </div>
</body>
</html>
  `;

  // Generate subject line
  const subjects = {
    de: `Deine Reservierung für ${event.name} ist bestätigt`,
    en: `Your reservation for ${event.name} is confirmed`,
    es: `Tu reserva para ${event.name} está confirmada`,
    fr: `Votre réservation pour ${event.name} est confirmée`,
  };

  return {
    html,
    subject: subjects[language],
    previewText: t.thankYou.substring(0, 100),
  };
}
