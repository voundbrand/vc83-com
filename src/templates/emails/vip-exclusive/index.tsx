/**
 * VIP EXCLUSIVE EMAIL TEMPLATE
 *
 * Premium design following apitemplate.io best practices
 * Features elevated styling, generous spacing, and luxury aesthetics
 *
 * Design Quality: Matches luxury-confirmation standards
 * Languages: DE, EN, ES, FR
 * Supports: PDF tickets, ICS calendar files
 */

import { EmailTemplateProps, EmailTemplateOutput } from "../types";
import { vipExclusiveTranslations } from "./translations";

/**
 * VIP Exclusive Email Template
 *
 * Premium black and gold design with proper spacing, typography hierarchy.
 * Follows email best practices with inline styles and table-based layouts.
 */
export function VIPExclusiveTemplate(props: EmailTemplateProps): EmailTemplateOutput {
  const { ticket, event, attendee, domain, branding, language } = props;

  const t = vipExclusiveTranslations[language];
  const primaryColor = branding.primaryColor || '#d4af37'; // Luxury gold
  const fullName = `${attendee.firstName} ${attendee.lastName}`;
  const year = new Date().getFullYear();

  const html = `
<!DOCTYPE html>
<html lang="${language}">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>VIP ${t.confirmationHeading}</title>
</head>
<body style="margin: 0; padding: 0; font-family: 'Georgia', 'Times New Roman', serif; background-color: #000000; color: #ffffff;">
  <div style="max-width: 600px; margin: 40px auto; background: linear-gradient(135deg, #1a1614 0%, #0d0b0a 100%); border: 3px solid ${primaryColor}; border-radius: 0; overflow: hidden; box-shadow: 0 12px 48px rgba(212, 175, 55, 0.25);">

    <!-- VIP Badge -->
    <div style="text-align: center; padding: 25px 0; background: linear-gradient(135deg, ${primaryColor} 0%, #b8941f 100%);">
      <span style="display: inline-block; font-size: 16px; font-weight: 700; letter-spacing: 5px; color: #000000; text-transform: uppercase;">
        ★ VIP ACCESS ★
      </span>
    </div>

    <!-- Header -->
    <div style="background: linear-gradient(135deg, #1a1614 0%, #0d0b0a 100%); padding: 55px 40px; text-align: center; border-bottom: 2px solid rgba(212, 175, 55, 0.3);">
      <div style="width: 100px; height: 2px; background: linear-gradient(90deg, transparent, ${primaryColor}, transparent); margin: 0 auto 30px;"></div>
      <h1 style="margin: 0; color: ${primaryColor}; font-size: 30px; font-weight: 400; letter-spacing: 4px; text-transform: uppercase; text-shadow: 0 3px 10px rgba(212, 175, 55, 0.3); line-height: 1.4;">
        ${t.title}
      </h1>
      <p style="margin: 18px 0 0 0; font-size: 13px; color: rgba(212, 175, 55, 0.8); letter-spacing: 3px; text-transform: uppercase; font-weight: 400;">
        Exclusive Experience
      </p>
      <div style="width: 100px; height: 2px; background: linear-gradient(90deg, transparent, ${primaryColor}, transparent); margin: 30px auto 0;"></div>
    </div>

    <!-- Content -->
    <div style="padding: 55px 45px;">
      <!-- Greeting -->
      <div style="text-align: center; margin-bottom: 45px;">
        <p style="margin: 0 0 20px 0; font-size: 13px; color: ${primaryColor}; letter-spacing: 4px; text-transform: uppercase; font-weight: 600;">
          VIP ${t.confirmationHeading}
        </p>
        <h2 style="margin: 0 0 25px 0; font-size: 32px; color: #ffffff; font-weight: 300; letter-spacing: 2px;">
          ${fullName}
        </h2>
        <p style="margin: 0; font-size: 16px; line-height: 1.8; color: rgba(255, 255, 255, 0.85);">
          ${t.thankYou}
        </p>
      </div>

      <!-- VIP Benefits Badge -->
      <div style="background: linear-gradient(135deg, ${primaryColor} 0%, #b8941f 100%); padding: 30px; margin: 45px 0; border-radius: 2px; box-shadow: 0 8px 24px rgba(212, 175, 55, 0.2);">
        <p style="margin: 0; font-size: 14px; font-weight: 700; letter-spacing: 3px; text-transform: uppercase; color: #000000; text-align: center;">
          ★ VIP EXCLUSIVE BENEFITS ★
        </p>
      </div>

      <!-- Event Details -->
      <div style="background: rgba(212, 175, 55, 0.06); border: 2px solid rgba(212, 175, 55, 0.25); padding: 40px 35px; margin: 45px 0; border-radius: 2px;">
        <div style="text-align: center; margin-bottom: 35px;">
          <p style="margin: 0; font-size: 13px; letter-spacing: 4px; text-transform: uppercase; color: ${primaryColor}; font-weight: 600;">
            ${t.eventDetails}
          </p>
        </div>

        <table style="width: 100%; border-collapse: collapse;">
          <tr>
            <td style="padding: 16px 0; font-size: 12px; color: rgba(212, 175, 55, 0.7); letter-spacing: 2px; text-transform: uppercase; font-weight: 600; width: 40%;">${t.event}</td>
            <td style="padding: 16px 0; font-size: 18px; color: #ffffff; font-weight: 300; text-align: right; letter-spacing: 0.5px;">${event.name}</td>
          </tr>
          <tr style="border-top: 1px solid rgba(212, 175, 55, 0.15);">
            <td style="padding: 16px 0; font-size: 12px; color: rgba(212, 175, 55, 0.7); letter-spacing: 2px; text-transform: uppercase; font-weight: 600;">${t.date}</td>
            <td style="padding: 16px 0; font-size: 18px; color: #ffffff; font-weight: 300; text-align: right; letter-spacing: 0.5px;">${event.customProperties?.startDate || 'TBD'}</td>
          </tr>
          <tr style="border-top: 1px solid rgba(212, 175, 55, 0.15);">
            <td style="padding: 16px 0; font-size: 12px; color: rgba(212, 175, 55, 0.7); letter-spacing: 2px; text-transform: uppercase; font-weight: 600;">${t.time}</td>
            <td style="padding: 16px 0; font-size: 18px; color: #ffffff; font-weight: 300; text-align: right; letter-spacing: 0.5px;">${event.customProperties?.startTime || 'TBD'}</td>
          </tr>
          <tr style="border-top: 1px solid rgba(212, 175, 55, 0.15);">
            <td style="padding: 16px 0; font-size: 12px; color: rgba(212, 175, 55, 0.7); letter-spacing: 2px; text-transform: uppercase; font-weight: 600;">${t.location}</td>
            <td style="padding: 16px 0; font-size: 18px; color: #ffffff; font-weight: 300; text-align: right; letter-spacing: 0.5px;">${event.customProperties?.location || 'TBD'}</td>
          </tr>
          ${attendee.guestCount > 0 ? `
          <tr style="border-top: 1px solid rgba(212, 175, 55, 0.15);">
            <td style="padding: 16px 0; font-size: 12px; color: rgba(212, 175, 55, 0.7); letter-spacing: 2px; text-transform: uppercase; font-weight: 600;">${t.guests}</td>
            <td style="padding: 16px 0; font-size: 18px; color: ${primaryColor}; font-weight: 400; text-align: right; letter-spacing: 0.5px;">+${attendee.guestCount} VIP</td>
          </tr>
          ` : ''}
        </table>
      </div>

      <!-- Attachments -->
      <div style="text-align: center; padding: 40px 35px; background: rgba(212, 175, 55, 0.04); border-radius: 2px; border: 2px dashed rgba(212, 175, 55, 0.25); margin: 40px 0;">
        <p style="margin: 0 0 25px 0; font-size: 13px; color: ${primaryColor}; letter-spacing: 3px; text-transform: uppercase; font-weight: 600;">
          ${t.attachments}
        </p>
        <p style="margin: 0 0 18px 0; font-size: 15px; color: rgba(255, 255, 255, 0.9); line-height: 1.8;">
          <strong style="color: ${primaryColor}; font-weight: 400;">${t.ticketPDF}</strong><br>
          <span style="color: rgba(255, 255, 255, 0.65);">${t.ticketPDFDesc}</span>
        </p>
        <p style="margin: 0; font-size: 15px; color: rgba(255, 255, 255, 0.9); line-height: 1.8;">
          <strong style="color: ${primaryColor}; font-weight: 400;">${t.calendarFile}</strong><br>
          <span style="color: rgba(255, 255, 255, 0.65);">${t.calendarFileDesc}</span>
        </p>
      </div>

      <!-- Quick Links -->
      <div style="margin: 40px 0; padding: 35px 30px; background: rgba(212, 175, 55, 0.04); border-radius: 2px;">
        <p style="margin: 0 0 25px 0; font-size: 13px; color: ${primaryColor}; letter-spacing: 3px; text-transform: uppercase; font-weight: 600; text-align: center;">
          ${t.usefulLinks}
        </p>
        <table style="width: 100%; border-collapse: collapse;">
          ${domain.mapsUrl ? `
          <tr>
            <td style="padding: 12px; text-align: center;">
              <a href="${domain.mapsUrl}" style="display: inline-block; text-decoration: none; color: #000000; font-size: 13px; font-weight: 600; letter-spacing: 2px; padding: 16px 35px; background: ${primaryColor}; border-radius: 2px; text-transform: uppercase;">
                ${t.directions}
              </a>
            </td>
          </tr>
          ` : ''}
          <tr>
            <td style="padding: 12px; text-align: center;">
              <a href="${domain.siteUrl}" style="display: inline-block; text-decoration: none; color: ${primaryColor}; font-size: 13px; font-weight: 600; letter-spacing: 2px; padding: 16px 35px; background: transparent; border: 2px solid ${primaryColor}; border-radius: 2px; text-transform: uppercase;">
                ${t.eventPage}
              </a>
            </td>
          </tr>
        </table>
      </div>

      <!-- VIP Note -->
      <div style="margin: 50px 0; padding: 35px; background: linear-gradient(135deg, rgba(212, 175, 55, 0.08) 0%, rgba(212, 175, 55, 0.04) 100%); border-radius: 2px; border-left: 4px solid ${primaryColor};">
        <p style="margin: 0 0 15px 0; font-size: 13px; color: ${primaryColor}; letter-spacing: 3px; text-transform: uppercase; font-weight: 600;">
          ${t.importantNote}
        </p>
        <p style="margin: 0; font-size: 15px; color: rgba(255, 255, 255, 0.85); line-height: 1.8;">
          ${t.noteContent}
        </p>
      </div>

      <!-- Closing -->
      <div style="text-align: center; margin-top: 55px; padding-top: 40px; border-top: 1px solid rgba(212, 175, 55, 0.2);">
        <p style="margin: 0 0 18px 0; font-size: 19px; color: #ffffff; font-weight: 300; letter-spacing: 1px;">
          ${t.closing}
        </p>
        <p style="margin: 0; font-size: 14px; color: ${primaryColor}; letter-spacing: 2px; font-weight: 400;">
          ${t.team}
        </p>
      </div>
    </div>

    <!-- Footer -->
    <div style="padding: 35px 45px; background: #000000; text-align: center; border-top: 2px solid ${primaryColor};">
      <p style="margin: 0 0 8px 0; font-size: 12px; color: rgba(212, 175, 55, 0.6); letter-spacing: 1px;">
        ${t.copyright.replace('{{year}}', year.toString())}
      </p>
      <p style="margin: 0; font-size: 11px; color: rgba(212, 175, 55, 0.4); letter-spacing: 1px;">
        ${t.tagline.replace('{{year}}', year.toString())}
      </p>
    </div>
  </div>
</body>
</html>
  `;

  const subjects = {
    de: `★ VIP: ${event.name} – Exklusiver Zugang Bestätigt`,
    en: `★ VIP: ${event.name} – Exclusive Access Confirmed`,
    es: `★ VIP: ${event.name} – Acceso Exclusivo Confirmado`,
    fr: `★ VIP: ${event.name} – Accès Exclusif Confirmé`,
  };

  return {
    html,
    subject: subjects[language],
    previewText: t.thankYou.substring(0, 100),
  };
}
