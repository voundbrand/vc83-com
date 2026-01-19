/**
 * ORDER EMAIL RENDERER
 *
 * Helper to render order confirmation emails using template system.
 * Handles multi-ticket orders (unlike single-ticket email templates).
 *
 * Uses database translations from email.order.* namespace.
 *
 * PROFESSIONAL DESIGN - matches ticket PDFs and invoice emails
 * Uses organization branding (primaryColor, logo) for customization.
 */

interface OrderEmailData {
  recipientName: string;
  eventName: string;
  eventSponsors?: Array<{ name: string; level?: string }>;
  eventLocation?: string;
  formattedDate: string;
  ticketCount: number;
  orderNumber: string;
  orderDate: string;
  primaryColor?: string;
  logoUrl?: string;
  organizationName?: string;
  // Financial fields (currently not displayed in template, but may be used in future)
  currency?: string;
  subtotalAmount?: number;
  taxAmount?: number;
  totalAmount?: number;
  taxRatePercent?: number;
}

/**
 * Translation object for email templates
 * Passed from caller who fetches translations from database
 */
export interface EmailTranslations {
  header: string;
  greeting: string;
  confirmed: string;
  eventName: string;
  presentedBy: string;
  ticketCount: string;
  date: string;
  location: string;
  orderNumber: string;
  orderDate: string;
  documentsHeader: string;
  documentsBody: string;
  supportText: string;
  copyright: string;
}

/**
 * Generate Order Confirmation Email HTML
 *
 * Professional design matching ticket PDFs and invoice emails.
 * Uses organization branding (primaryColor) for accent colors.
 * Clean, modern look with white background and sans-serif fonts.
 *
 * @param data - Order data for email
 * @param translations - Translated strings from database (from email.order.* namespace)
 */
export function generateOrderConfirmationHtml(
  data: OrderEmailData,
  translations: EmailTranslations
): string {
  const {
    recipientName,
    eventName,
    eventSponsors,
    eventLocation,
    formattedDate,
    ticketCount,
    orderNumber,
    orderDate,
    primaryColor = "#6B46C1", // Professional purple (matches PDFs)
    logoUrl,
    organizationName = "Event Team",
  } = data;

  const year = new Date().getFullYear();

  // Derive a darker shade for gradient
  const secondaryColor = "#553C9A";

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Order Confirmation</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f8fafc; color: #0f172a;">
  <div style="max-width: 600px; margin: 40px auto; background: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 24px rgba(0, 0, 0, 0.08);">

    <!-- Header with Accent Color -->
    <div style="background: linear-gradient(135deg, ${primaryColor} 0%, ${secondaryColor} 100%); padding: 50px 40px; text-align: center;">
      ${logoUrl ? `<img src="${logoUrl}" alt="${organizationName}" style="max-height: 50px; margin-bottom: 20px;">` : ''}
      <div style="width: 60px; height: 3px; background: rgba(255, 255, 255, 0.5); margin: 0 auto 25px; border-radius: 2px;"></div>
      <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: 600; letter-spacing: -0.5px; line-height: 1.3;">
        ${translations.header}
      </h1>
      <div style="width: 60px; height: 3px; background: rgba(255, 255, 255, 0.5); margin: 25px auto 0; border-radius: 2px;"></div>
    </div>

    <!-- Content -->
    <div style="padding: 50px 40px;">
      <!-- Greeting -->
      <div style="text-align: center; margin-bottom: 40px;">
        <h2 style="margin: 0 0 15px 0; font-size: 24px; color: #0f172a; font-weight: 600; letter-spacing: -0.5px;">
          ${recipientName}
        </h2>
        <p style="margin: 0; font-size: 16px; line-height: 1.6; color: #64748b;">
          ${translations.confirmed}
        </p>
      </div>

      <!-- Event Details Card -->
      <div style="background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%); border: 2px solid #e2e8f0; border-radius: 12px; padding: 35px; margin: 40px 0;">
        <div style="text-align: center; margin-bottom: 30px;">
          <p style="margin: 0; font-size: 13px; letter-spacing: 2px; text-transform: uppercase; color: ${primaryColor}; font-weight: 600;">
            ${translations.eventName}
          </p>
        </div>

        <h2 style="margin: 0 0 20px 0; color: #0f172a; font-size: 22px; font-weight: 600; text-align: center;">
          ${eventName}
        </h2>

        ${eventSponsors && eventSponsors.length > 0 ? (() => {
          const sponsorNames = eventSponsors.length === 1
            ? eventSponsors[0].name
            : eventSponsors.map(s => s.name).join(', ');
          return `<p style="margin: 0 0 20px 0; color: ${primaryColor}; font-size: 14px; text-align: center; font-style: italic;">${translations.presentedBy}: ${sponsorNames}</p>`;
        })() : ""}

        <table style="width: 100%; border-collapse: collapse; border-top: 1px solid #e2e8f0; padding-top: 20px;">
          <tr>
            <td style="padding: 14px 0; font-size: 13px; color: #64748b; text-transform: uppercase; letter-spacing: 1px; font-weight: 600; width: 35%;">${translations.ticketCount}</td>
            <td style="padding: 14px 0; font-size: 16px; color: ${primaryColor}; font-weight: 600; text-align: right;">${ticketCount} Ticket${ticketCount > 1 ? 's' : ''}</td>
          </tr>
          <tr style="border-top: 1px solid #e2e8f0;">
            <td style="padding: 14px 0; font-size: 13px; color: #64748b; text-transform: uppercase; letter-spacing: 1px; font-weight: 600;">${translations.date}</td>
            <td style="padding: 14px 0; font-size: 16px; color: #0f172a; font-weight: 500; text-align: right;">${formattedDate}</td>
          </tr>
          ${eventLocation ? `
          <tr style="border-top: 1px solid #e2e8f0;">
            <td style="padding: 14px 0; font-size: 13px; color: #64748b; text-transform: uppercase; letter-spacing: 1px; font-weight: 600;">${translations.location}</td>
            <td style="padding: 14px 0; font-size: 16px; color: #0f172a; font-weight: 500; text-align: right;">${eventLocation}</td>
          </tr>
          ` : ""}
        </table>
      </div>

      <!-- Order Info -->
      <div style="margin: 30px 0; text-align: center;">
        <p style="margin: 0; color: #64748b; font-size: 13px;">
          ${translations.orderNumber}: <strong style="color: #0f172a;">${orderNumber}</strong> · ${translations.orderDate}: ${orderDate}
        </p>
      </div>

      <!-- Attachments Note -->
      <div style="text-align: center; padding: 35px 30px; background: linear-gradient(135deg, rgba(107, 70, 193, 0.05) 0%, rgba(85, 60, 154, 0.05) 100%); border-radius: 12px; border: 2px dashed rgba(107, 70, 193, 0.3); margin: 35px 0;">
        <p style="margin: 0 0 20px 0; font-size: 13px; color: ${primaryColor}; letter-spacing: 2px; text-transform: uppercase; font-weight: 600;">
          ${translations.documentsHeader}
        </p>
        <p style="margin: 0; font-size: 15px; color: #334155; line-height: 1.7;">
          ${translations.documentsBody}
        </p>
      </div>
    </div>

    <!-- Footer -->
    <div style="padding: 30px 40px; background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%); text-align: center; border-top: 2px solid #e2e8f0;">
      <p style="margin: 0 0 6px 0; font-size: 13px; color: #64748b;">
        ${translations.supportText.replace('{supportEmail}', `support@${organizationName.toLowerCase().replace(/\s+/g, '')}.com`)}
      </p>
      <p style="margin: 0; font-size: 12px; color: #94a3b8;">
        ${translations.copyright.replace('{year}', String(year)).replace('{organizationName}', organizationName)}
      </p>
    </div>
  </div>
</body>
</html>
  `;
}

/**
 * Generate Order Confirmation Subject Line
 *
 * @param eventName - Event name
 * @param subjectTemplate - Translated subject template from database (e.g., "Your Tickets for {eventName}")
 */
export function generateOrderConfirmationSubject(
  eventName: string,
  subjectTemplate: string
): string {
  return subjectTemplate.replace('{eventName}', eventName);
}
