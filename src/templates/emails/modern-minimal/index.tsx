/**
 * MODERN MINIMAL EMAIL TEMPLATE
 *
 * Clean, minimalist design following apitemplate.io best practices
 * Perfect for tech events, conferences, and contemporary brands
 *
 * Design Quality: Matches luxury-confirmation standards
 * Languages: DE, EN, ES, FR
 * Supports: PDF tickets, ICS calendar files
 */

import { EmailTemplateProps, EmailTemplateOutput } from "../types";
import { modernMinimalTranslations } from "./translations";

/**
 * Modern Minimal Email Template
 *
 * Clean design with proper spacing, typography hierarchy, and color harmony.
 * Follows email best practices with inline styles and table-based layouts.
 */
export function ModernMinimalTemplate(props: EmailTemplateProps): EmailTemplateOutput {
  const { ticket, event, attendee, domain, branding, language } = props;

  const t = modernMinimalTranslations[language];
  const primaryColor = branding.primaryColor || '#3b82f6'; // Modern blue
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
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f8fafc; color: #0f172a;">
  <div style="max-width: 600px; margin: 40px auto; background: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 24px rgba(0, 0, 0, 0.08);">

    <!-- Header with Accent Color -->
    <div style="background: linear-gradient(135deg, ${primaryColor} 0%, #2563eb 100%); padding: 50px 40px; text-align: center;">
      <div style="width: 60px; height: 3px; background: rgba(255, 255, 255, 0.5); margin: 0 auto 25px; border-radius: 2px;"></div>
      <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: 600; letter-spacing: -0.5px; line-height: 1.3;">
        ${t.confirmationHeading}
      </h1>
      <div style="width: 60px; height: 3px; background: rgba(255, 255, 255, 0.5); margin: 25px auto 0; border-radius: 2px;"></div>
    </div>

    <!-- Content -->
    <div style="padding: 50px 40px;">
      <!-- Greeting -->
      <div style="text-align: center; margin-bottom: 40px;">
        <h2 style="margin: 0 0 15px 0; font-size: 24px; color: #0f172a; font-weight: 600; letter-spacing: -0.5px;">
          ${fullName}
        </h2>
        <p style="margin: 0; font-size: 16px; line-height: 1.6; color: #64748b;">
          ${t.thankYou}
        </p>
      </div>

      <!-- Event Details Card -->
      <div style="background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%); border: 2px solid #e2e8f0; border-radius: 12px; padding: 35px; margin: 40px 0;">
        <div style="text-align: center; margin-bottom: 30px;">
          <p style="margin: 0; font-size: 13px; letter-spacing: 2px; text-transform: uppercase; color: ${primaryColor}; font-weight: 600;">
            ${t.eventDetails}
          </p>
        </div>

        <table style="width: 100%; border-collapse: collapse;">
          <tr>
            <td style="padding: 14px 0; font-size: 13px; color: #64748b; text-transform: uppercase; letter-spacing: 1px; font-weight: 600; width: 35%;">${t.event}</td>
            <td style="padding: 14px 0; font-size: 16px; color: #0f172a; font-weight: 500; text-align: right;">${event.name}</td>
          </tr>
          <tr style="border-top: 1px solid #e2e8f0;">
            <td style="padding: 14px 0; font-size: 13px; color: #64748b; text-transform: uppercase; letter-spacing: 1px; font-weight: 600;">${t.date}</td>
            <td style="padding: 14px 0; font-size: 16px; color: #0f172a; font-weight: 500; text-align: right;">${event.customProperties?.startDate || 'TBD'}</td>
          </tr>
          <tr style="border-top: 1px solid #e2e8f0;">
            <td style="padding: 14px 0; font-size: 13px; color: #64748b; text-transform: uppercase; letter-spacing: 1px; font-weight: 600;">${t.time}</td>
            <td style="padding: 14px 0; font-size: 16px; color: #0f172a; font-weight: 500; text-align: right;">${event.customProperties?.startTime || 'TBD'}</td>
          </tr>
          <tr style="border-top: 1px solid #e2e8f0;">
            <td style="padding: 14px 0; font-size: 13px; color: #64748b; text-transform: uppercase; letter-spacing: 1px; font-weight: 600;">${t.location}</td>
            <td style="padding: 14px 0; font-size: 16px; color: #0f172a; font-weight: 500; text-align: right;">${event.customProperties?.location || 'TBD'}</td>
          </tr>
          ${attendee.guestCount > 0 ? `
          <tr style="border-top: 1px solid #e2e8f0;">
            <td style="padding: 14px 0; font-size: 13px; color: #64748b; text-transform: uppercase; letter-spacing: 1px; font-weight: 600;">${t.guests}</td>
            <td style="padding: 14px 0; font-size: 16px; color: ${primaryColor}; font-weight: 600; text-align: right;">+${attendee.guestCount}</td>
          </tr>
          ` : ''}
        </table>
      </div>

      <!-- Attachments -->
      <div style="text-align: center; padding: 35px 30px; background: linear-gradient(135deg, rgba(59, 130, 246, 0.05) 0%, rgba(37, 99, 235, 0.05) 100%); border-radius: 12px; border: 2px dashed rgba(59, 130, 246, 0.3); margin: 35px 0;">
        <p style="margin: 0 0 20px 0; font-size: 13px; color: ${primaryColor}; letter-spacing: 2px; text-transform: uppercase; font-weight: 600;">
          ${t.attachments}
        </p>
        <p style="margin: 0 0 15px 0; font-size: 15px; color: #334155; line-height: 1.7;">
          <strong style="color: ${primaryColor};">${t.ticketPDF}</strong><br>
          <span style="color: #64748b;">${t.ticketPDFDesc}</span>
        </p>
        <p style="margin: 0; font-size: 15px; color: #334155; line-height: 1.7;">
          <strong style="color: ${primaryColor};">${t.calendarFile}</strong><br>
          <span style="color: #64748b;">${t.calendarFileDesc}</span>
        </p>
      </div>

      <!-- Quick Links -->
      <div style="margin: 35px 0; padding: 30px; background: #f8fafc; border-radius: 12px;">
        <p style="margin: 0 0 20px 0; font-size: 13px; color: ${primaryColor}; letter-spacing: 2px; text-transform: uppercase; font-weight: 600; text-align: center;">
          ${t.usefulLinks}
        </p>
        <table style="width: 100%; border-collapse: collapse;">
          ${domain.mapsUrl ? `
          <tr>
            <td style="padding: 10px; text-align: center;">
              <a href="${domain.mapsUrl}" style="display: inline-block; text-decoration: none; color: #ffffff; font-size: 14px; font-weight: 600; padding: 14px 28px; background: ${primaryColor}; border-radius: 8px; letter-spacing: 0.5px;">
                ${t.directions}
              </a>
            </td>
          </tr>
          ` : ''}
          <tr>
            <td style="padding: 10px; text-align: center;">
              <a href="${domain.siteUrl}" style="display: inline-block; text-decoration: none; color: ${primaryColor}; font-size: 14px; font-weight: 600; padding: 14px 28px; background: #ffffff; border: 2px solid ${primaryColor}; border-radius: 8px; letter-spacing: 0.5px;">
                ${t.eventPage}
              </a>
            </td>
          </tr>
        </table>
      </div>

      <!-- Note -->
      <div style="margin: 35px 0; padding: 30px; background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%); border-radius: 12px; border-left: 4px solid #f59e0b;">
        <p style="margin: 0 0 12px 0; font-size: 14px; font-weight: 600; color: #92400e; letter-spacing: 0.5px;">
          ${t.importantNote}
        </p>
        <p style="margin: 0; font-size: 14px; color: #78350f; line-height: 1.7;">
          ${t.noteContent}
        </p>
      </div>

      <!-- Closing -->
      <div style="text-align: center; margin-top: 50px; padding-top: 35px; border-top: 2px solid #e2e8f0;">
        <p style="margin: 0 0 12px 0; font-size: 17px; color: #0f172a; font-weight: 600; letter-spacing: -0.5px;">
          ${t.closing}
        </p>
        <p style="margin: 0; font-size: 15px; color: #64748b;">
          ${t.team}
        </p>
      </div>
    </div>

    <!-- Footer -->
    <div style="padding: 30px 40px; background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%); text-align: center; border-top: 2px solid #e2e8f0;">
      <p style="margin: 0 0 6px 0; font-size: 13px; color: #64748b;">
        ${t.copyright.replace('{{year}}', year.toString())}
      </p>
      <p style="margin: 0; font-size: 12px; color: #94a3b8;">
        ${t.tagline}
      </p>
    </div>
  </div>
</body>
</html>
  `;

  const subjects = {
    de: `${event.name} – Bestätigung`,
    en: `${event.name} – Confirmed`,
    es: `${event.name} – Confirmado`,
    fr: `${event.name} – Confirmé`,
  };

  return {
    html,
    subject: subjects[language],
    previewText: t.thankYou.substring(0, 100),
  };
}
