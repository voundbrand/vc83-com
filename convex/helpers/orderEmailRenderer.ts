/**
 * ORDER EMAIL RENDERER
 *
 * Helper to render order confirmation emails using template system.
 * Handles multi-ticket orders (unlike single-ticket email templates).
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
  organizationName?: string;
  // Financial fields (currently not displayed in template, but may be used in future)
  currency?: string;
  subtotalAmount?: number;
  taxAmount?: number;
  totalAmount?: number;
  taxRatePercent?: number;
}

/**
 * Generate Order Confirmation Email HTML
 *
 * Uses elegant luxury styling matching email templates.
 * Supports multi-ticket orders with order-level summary.
 */
export function generateOrderConfirmationHtml(data: OrderEmailData): string {
  const {
    recipientName,
    eventName,
    eventSponsors,
    eventLocation,
    formattedDate,
    ticketCount,
    orderNumber,
    orderDate,
    primaryColor = "#d4af37", // Elegant gold (matches luxury template)
    organizationName = "L4YERCAK3",
  } = data;

  const year = new Date().getFullYear();

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Order Confirmation</title>
</head>
<body style="margin: 0; padding: 0; font-family: 'Didot', 'Bodoni MT', 'Garamond', serif; background-color: #0a0806; color: #f5f1e8;">
  <div style="max-width: 600px; margin: 40px auto; background: linear-gradient(135deg, #1a1412 0%, #2c1810 100%); border-radius: 12px; overflow: hidden; box-shadow: 0 8px 32px rgba(212, 175, 55, 0.2);">

    <!-- Header with Gold Accent -->
    <div style="background: linear-gradient(135deg, #2c1810 0%, #1a1412 100%); padding: 50px 30px; text-align: center; border-bottom: 2px solid ${primaryColor}; position: relative;">
      <div style="width: 80px; height: 2px; background: linear-gradient(90deg, transparent, ${primaryColor}, transparent); margin: 0 auto 30px;"></div>
      <h1 style="margin: 0; color: ${primaryColor}; font-size: 24px; font-weight: 300; letter-spacing: 4px; text-transform: uppercase; text-shadow: 0 2px 4px rgba(0, 0, 0, 0.3); line-height: 1.4;">
        Order Confirmation
      </h1>
      <div style="width: 80px; height: 2px; background: linear-gradient(90deg, transparent, ${primaryColor}, transparent); margin: 30px auto 0;"></div>
    </div>

    <!-- Content -->
    <div style="padding: 50px 40px;">
      <div style="text-align: center; margin-bottom: 40px;">
        <p style="margin: 0 0 20px 0; font-size: 18px; color: ${primaryColor}; letter-spacing: 3px; text-transform: uppercase; font-weight: 300;">
          ${recipientName}
        </p>
        <p style="margin: 0; font-size: 16px; color: #b8a891; letter-spacing: 1px; line-height: 1.8;">
          Your order has been confirmed
        </p>
      </div>

      <!-- Event Details Box -->
      <div style="background: rgba(212, 175, 55, 0.08); border: 1px solid rgba(212, 175, 55, 0.3); border-radius: 8px; padding: 30px; margin: 30px 0; text-align: center;">
        <h2 style="margin: 0 0 20px 0; color: ${primaryColor}; font-size: 22px; font-weight: 400; letter-spacing: 2px; text-transform: uppercase;">
          ${eventName}
        </h2>
        ${eventSponsors && eventSponsors.length > 0 ? (() => {
          if (eventSponsors.length === 1) {
            return `<p style="margin: 15px 0; color: ${primaryColor}; font-size: 14px; letter-spacing: 1px; font-style: italic;">Presented by ${eventSponsors[0].name}</p>`;
          }
          return `<p style="margin: 15px 0; color: ${primaryColor}; font-size: 14px; letter-spacing: 1px; font-style: italic;">Presented by: ${eventSponsors.map(s => s.name).join(', ')}</p>`;
        })() : ""}
        <div style="margin-top: 25px; padding-top: 20px; border-top: 1px solid rgba(212, 175, 55, 0.2);">
          <p style="margin: 10px 0; color: #b8a891; font-size: 14px; letter-spacing: 1px;">
            <strong style="color: ${primaryColor};">${ticketCount} Ticket${ticketCount > 1 ? 's' : ''}</strong>
          </p>
          <p style="margin: 10px 0; color: #b8a891; font-size: 14px; letter-spacing: 1px;">
            ${formattedDate}
          </p>
          ${eventLocation ? `<p style="margin: 10px 0; color: #b8a891; font-size: 14px; letter-spacing: 1px;">${eventLocation}</p>` : ""}
        </div>
      </div>

      <!-- Order Note -->
      <div style="margin: 30px 0; text-align: center;">
        <p style="margin: 0 0 10px 0; color: #b8a891; font-size: 13px;">
          Order #${orderNumber} · ${orderDate}
        </p>
      </div>

      <!-- Attachments Note -->
      <div style="background: rgba(212, 175, 55, 0.05); border-left: 3px solid ${primaryColor}; padding: 20px; margin: 30px 0; border-radius: 4px;">
        <p style="margin: 0 0 10px 0; color: ${primaryColor}; font-size: 14px; font-weight: 400; letter-spacing: 1px;">
          Your Documents
        </p>
        <p style="margin: 0; color: #b8a891; font-size: 13px; line-height: 1.6;">
          Your tickets and invoice are attached as PDF files. Please present your ticket at the event entrance.
        </p>
      </div>
    </div>

    <!-- Footer -->
    <div style="background: linear-gradient(135deg, #1a1412 0%, #0a0806 100%); padding: 30px 40px; text-align: center; border-top: 1px solid rgba(212, 175, 55, 0.3);">
      <p style="margin: 0 0 10px 0; color: #b8a891; font-size: 12px; letter-spacing: 1px;">
        Need assistance? Contact us at support@${organizationName.toLowerCase().replace(/\s+/g, '')}.com
      </p>
      <p style="margin: 15px 0 0 0; color: #6b5d4f; font-size: 11px; letter-spacing: 1px;">
        © ${year} ${organizationName}. All rights reserved.
      </p>
    </div>
  </div>
</body>
</html>
  `;
}

/**
 * Generate Order Confirmation Subject Line
 */
export function generateOrderConfirmationSubject(eventName: string): string {
  return `Your Tickets for ${eventName}`;
}
