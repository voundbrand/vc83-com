/**
 * EMAIL SECTION RENDERER
 *
 * Utilities to render email sections to HTML.
 * Used by all generic email templates.
 */

import type {
  EmailSection,
  HeroSection,
  BodySection,
  CtaSection,
  EventDetailsSection,
  OrderDetailsSection,
  AccountDetailsSection,
  AttachmentInfoSection,
  ShippingInfoSection,
  LeadMagnetInfoSection,
  SupportInfoSection,
  InvoiceDetailsSection,
} from "./generic-types";
import { getTranslations, translatePaymentTerms, type SupportedLanguage } from "./translations";

/**
 * Render Hero Section
 */
export function renderHeroSection(section: HeroSection, primaryColor: string): string {
  return `
    <div style="text-align: center; margin-bottom: 40px;">
      ${section.image ? `
        <img src="${section.image}" alt="${section.title}" style="max-width: 100%; height: auto; border-radius: 12px; margin-bottom: 25px;">
      ` : ''}
      <h2 style="margin: 0 0 15px 0; font-size: 28px; color: #0f172a; font-weight: 600; letter-spacing: -0.5px; line-height: 1.3;">
        ${section.title}
      </h2>
      ${section.subtitle ? `
        <p style="margin: 0; font-size: 17px; line-height: 1.6; color: #64748b;">
          ${section.subtitle}
        </p>
      ` : ''}
    </div>
  `;
}

/**
 * Render Body Section
 */
export function renderBodySection(section: BodySection, primaryColor: string): string {
  let html = '<div style="margin: 30px 0;">';

  // Render paragraphs
  if (section.paragraphs && section.paragraphs.length > 0) {
    section.paragraphs.forEach(paragraph => {
      html += `
        <p style="margin: 0 0 20px 0; font-size: 16px; line-height: 1.7; color: #334155;">
          ${paragraph}
        </p>
      `;
    });
  }

  // Render structured sections
  if (section.sections && section.sections.length > 0) {
    section.sections.forEach(subsection => {
      html += `
        <div style="margin: 25px 0;">
          ${subsection.title ? `
            <h3 style="margin: 0 0 12px 0; font-size: 18px; color: ${primaryColor}; font-weight: 600;">
              ${subsection.icon || ''} ${subsection.title}
            </h3>
          ` : ''}
          <p style="margin: 0; font-size: 15px; line-height: 1.7; color: #475569;">
            ${subsection.content}
          </p>
        </div>
      `;
    });
  }

  html += '</div>';
  return html;
}

/**
 * Render CTA Section
 */
export function renderCtaSection(section: CtaSection, primaryColor: string): string {
  const styles = {
    primary: `background: ${primaryColor}; color: #ffffff; border: none;`,
    secondary: `background: #f1f5f9; color: ${primaryColor}; border: 2px solid ${primaryColor};`,
    outline: `background: transparent; color: ${primaryColor}; border: 2px solid ${primaryColor};`,
  };

  const buttonStyle = styles[section.style || 'primary'];

  return `
    <div style="text-align: center; margin: 35px 0;">
      <a href="${section.url}" style="display: inline-block; text-decoration: none; font-size: 16px; font-weight: 600; padding: 16px 40px; ${buttonStyle} border-radius: 8px; letter-spacing: 0.5px;">
        ${section.text}
      </a>
    </div>
  `;
}

/**
 * Render Event Details Section
 */
export function renderEventDetailsSection(section: EventDetailsSection, primaryColor: string): string {
  return `
    <div style="background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%); border: 2px solid #e2e8f0; border-radius: 12px; padding: 35px; margin: 40px 0;">
      <div style="text-align: center; margin-bottom: 30px;">
        <p style="margin: 0; font-size: 13px; letter-spacing: 2px; text-transform: uppercase; color: ${primaryColor}; font-weight: 600;">
          Event Details
        </p>
      </div>

      <table style="width: 100%; border-collapse: collapse;">
        <tr>
          <td style="padding: 14px 0; font-size: 13px; color: #64748b; text-transform: uppercase; letter-spacing: 1px; font-weight: 600; width: 35%;">Event</td>
          <td style="padding: 14px 0; font-size: 16px; color: #0f172a; font-weight: 500; text-align: right;">${section.eventName}</td>
        </tr>
        <tr style="border-top: 1px solid #e2e8f0;">
          <td style="padding: 14px 0; font-size: 13px; color: #64748b; text-transform: uppercase; letter-spacing: 1px; font-weight: 600;">Date</td>
          <td style="padding: 14px 0; font-size: 16px; color: #0f172a; font-weight: 500; text-align: right;">${section.date}</td>
        </tr>
        <tr style="border-top: 1px solid #e2e8f0;">
          <td style="padding: 14px 0; font-size: 13px; color: #64748b; text-transform: uppercase; letter-spacing: 1px; font-weight: 600;">Time</td>
          <td style="padding: 14px 0; font-size: 16px; color: #0f172a; font-weight: 500; text-align: right;">${section.time}</td>
        </tr>
        <tr style="border-top: 1px solid #e2e8f0;">
          <td style="padding: 14px 0; font-size: 13px; color: #64748b; text-transform: uppercase; letter-spacing: 1px; font-weight: 600;">Location</td>
          <td style="padding: 14px 0; font-size: 16px; color: #0f172a; font-weight: 500; text-align: right;">${section.location}</td>
        </tr>
        ${section.guestCount !== undefined && section.guestCount > 0 ? `
        <tr style="border-top: 1px solid #e2e8f0;">
          <td style="padding: 14px 0; font-size: 13px; color: #64748b; text-transform: uppercase; letter-spacing: 1px; font-weight: 600;">Guests</td>
          <td style="padding: 14px 0; font-size: 16px; color: ${primaryColor}; font-weight: 600; text-align: right;">+${section.guestCount}</td>
        </tr>
        ` : ''}
      </table>
    </div>
  `;
}

/**
 * Render Order Details Section
 */
export function renderOrderDetailsSection(section: OrderDetailsSection, primaryColor: string): string {
  // Use organization's currency and locale if provided, otherwise default to USD/en-US
  const currency = section.currency || 'USD';
  const locale = section.locale || 'en-US';

  // Create currency formatter
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency: currency,
    }).format(amount);
  };

  return `
    <div style="background: #f8fafc; border: 2px solid #e2e8f0; border-radius: 12px; padding: 35px; margin: 40px 0;">
      <div style="margin-bottom: 20px;">
        <p style="margin: 0 0 8px 0; font-size: 13px; color: #64748b; text-transform: uppercase; letter-spacing: 1px; font-weight: 600;">Order #</p>
        <p style="margin: 0; font-size: 20px; color: ${primaryColor}; font-weight: 600;">${section.orderNumber}</p>
        <p style="margin: 8px 0 0 0; font-size: 14px; color: #64748b;">Placed on ${section.orderDate}</p>
      </div>

      <table style="width: 100%; border-collapse: collapse; margin: 25px 0;">
        <thead>
          <tr style="border-bottom: 2px solid #e2e8f0;">
            <th style="padding: 12px 0; text-align: left; font-size: 13px; color: #64748b; text-transform: uppercase; letter-spacing: 1px; font-weight: 600;">Item</th>
            <th style="padding: 12px 0; text-align: center; font-size: 13px; color: #64748b; text-transform: uppercase; letter-spacing: 1px; font-weight: 600;">Qty</th>
            <th style="padding: 12px 0; text-align: right; font-size: 13px; color: #64748b; text-transform: uppercase; letter-spacing: 1px; font-weight: 600;">Price</th>
          </tr>
        </thead>
        <tbody>
          ${section.items.map(item => `
            <tr style="border-bottom: 1px solid #e2e8f0;">
              <td style="padding: 14px 0; font-size: 15px; color: #0f172a;">${item.name}</td>
              <td style="padding: 14px 0; font-size: 15px; color: #64748b; text-align: center;">${item.quantity}</td>
              <td style="padding: 14px 0; font-size: 15px; color: #0f172a; text-align: right; font-weight: 500;">${formatCurrency(item.price)}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>

      <table style="width: 100%; border-collapse: collapse;">
        <tr>
          <td style="padding: 10px 0; font-size: 15px; color: #64748b; text-align: right;">Subtotal:</td>
          <td style="padding: 10px 0 10px 20px; font-size: 15px; color: #0f172a; text-align: right; font-weight: 500;">${formatCurrency(section.subtotal)}</td>
        </tr>
        ${section.tax !== undefined ? `
        <tr>
          <td style="padding: 10px 0; font-size: 15px; color: #64748b; text-align: right;">Tax:</td>
          <td style="padding: 10px 0 10px 20px; font-size: 15px; color: #0f172a; text-align: right; font-weight: 500;">${formatCurrency(section.tax)}</td>
        </tr>
        ` : ''}
        ${section.shipping !== undefined ? `
        <tr>
          <td style="padding: 10px 0; font-size: 15px; color: #64748b; text-align: right;">Shipping:</td>
          <td style="padding: 10px 0 10px 20px; font-size: 15px; color: #0f172a; text-align: right; font-weight: 500;">${formatCurrency(section.shipping)}</td>
        </tr>
        ` : ''}
        <tr style="border-top: 2px solid #e2e8f0;">
          <td style="padding: 14px 0; font-size: 17px; color: #0f172a; text-align: right; font-weight: 600;">Total:</td>
          <td style="padding: 14px 0 14px 20px; font-size: 20px; color: ${primaryColor}; text-align: right; font-weight: 700;">${formatCurrency(section.total)}</td>
        </tr>
      </table>

      ${section.paymentMethod ? `
        <div style="margin-top: 20px; padding-top: 20px; border-top: 1px solid #e2e8f0;">
          <p style="margin: 0; font-size: 14px; color: #64748b;">
            Payment Method: <span style="color: #0f172a; font-weight: 500;">${section.paymentMethod}</span>
          </p>
        </div>
      ` : ''}
    </div>
  `;
}

/**
 * Render Account Details Section
 */
export function renderAccountDetailsSection(section: AccountDetailsSection, primaryColor: string): string {
  const actionMessages = {
    created: 'Your account has been created successfully!',
    verified: 'Your account has been verified!',
    password_reset: 'Reset your password to continue.',
    updated: 'Your account information has been updated.',
  };

  const message = section.accountAction ? actionMessages[section.accountAction] : 'Account information';

  return `
    <div style="background: linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%); border: 2px solid #86efac; border-radius: 12px; padding: 35px; margin: 40px 0;">
      <div style="text-align: center; margin-bottom: 25px;">
        <p style="margin: 0 0 12px 0; font-size: 18px; color: #16a34a; font-weight: 600;">
          ${message}
        </p>
        ${section.username ? `
          <p style="margin: 0; font-size: 15px; color: #166534;">
            Username: <strong style="color: #15803d;">${section.username}</strong>
          </p>
        ` : ''}
        ${section.email ? `
          <p style="margin: 8px 0 0 0; font-size: 15px; color: #166534;">
            Email: <strong style="color: #15803d;">${section.email}</strong>
          </p>
        ` : ''}
      </div>

      ${section.verificationLink ? `
        <div style="text-align: center; margin: 25px 0;">
          <a href="${section.verificationLink}" style="display: inline-block; text-decoration: none; font-size: 16px; font-weight: 600; padding: 14px 32px; background: #16a34a; color: #ffffff; border-radius: 8px; letter-spacing: 0.5px;">
            Verify Email Address
          </a>
          ${section.expiresIn ? `
            <p style="margin: 12px 0 0 0; font-size: 13px; color: #166534;">
              Link expires in ${section.expiresIn}
            </p>
          ` : ''}
        </div>
      ` : ''}

      ${section.resetLink ? `
        <div style="text-align: center; margin: 25px 0;">
          <a href="${section.resetLink}" style="display: inline-block; text-decoration: none; font-size: 16px; font-weight: 600; padding: 14px 32px; background: ${primaryColor}; color: #ffffff; border-radius: 8px; letter-spacing: 0.5px;">
            Reset Password
          </a>
          ${section.expiresIn ? `
            <p style="margin: 12px 0 0 0; font-size: 13px; color: #166534;">
              Link expires in ${section.expiresIn}
            </p>
          ` : ''}
        </div>
      ` : ''}
    </div>
  `;
}

/**
 * Render Attachment Info Section
 */
export function renderAttachmentInfoSection(section: AttachmentInfoSection, primaryColor: string): string {
  return `
    <div style="text-align: center; padding: 35px 30px; background: linear-gradient(135deg, rgba(107, 70, 193, 0.05) 0%, rgba(85, 60, 154, 0.05) 100%); border-radius: 12px; border: 2px dashed rgba(107, 70, 193, 0.3); margin: 35px 0;">
      <p style="margin: 0 0 20px 0; font-size: 13px; color: ${primaryColor}; letter-spacing: 2px; text-transform: uppercase; font-weight: 600;">
        Attachments
      </p>
      ${section.attachments.map(attachment => `
        <p style="margin: 0 0 15px 0; font-size: 15px; color: #334155; line-height: 1.7;">
          <strong style="color: ${primaryColor};">${attachment.icon || '📎'} ${attachment.name}</strong><br>
          <span style="color: #64748b;">${attachment.description}</span>
        </p>
      `).join('')}
    </div>
  `;
}

/**
 * Render Shipping Info Section
 */
export function renderShippingInfoSection(section: ShippingInfoSection, primaryColor: string): string {
  const statusMessages = {
    processing: { text: 'Order Processing', color: '#f59e0b', bg: '#fef3c7' },
    shipped: { text: 'Shipped', color: '#3b82f6', bg: '#dbeafe' },
    delivered: { text: 'Delivered', color: '#10b981', bg: '#d1fae5' },
    delayed: { text: 'Delayed', color: '#ef4444', bg: '#fee2e2' },
  };

  const status = statusMessages[section.status];

  return `
    <div style="background: ${status.bg}; border: 2px solid ${status.color}; border-radius: 12px; padding: 35px; margin: 40px 0;">
      <div style="text-align: center; margin-bottom: 25px;">
        <p style="margin: 0; font-size: 18px; color: ${status.color}; font-weight: 600;">
          ${status.text}
        </p>
      </div>

      ${section.trackingNumber ? `
        <div style="margin: 20px 0;">
          <p style="margin: 0 0 8px 0; font-size: 13px; color: #64748b; text-transform: uppercase; letter-spacing: 1px; font-weight: 600;">Tracking Number</p>
          <p style="margin: 0; font-size: 18px; color: #0f172a; font-weight: 600; font-family: monospace;">${section.trackingNumber}</p>
        </div>
      ` : ''}

      ${section.carrier ? `
        <p style="margin: 15px 0 0 0; font-size: 14px; color: #64748b;">
          Carrier: <strong style="color: #0f172a;">${section.carrier}</strong>
        </p>
      ` : ''}

      ${section.estimatedDelivery ? `
        <p style="margin: 8px 0 0 0; font-size: 14px; color: #64748b;">
          Estimated Delivery: <strong style="color: #0f172a;">${section.estimatedDelivery}</strong>
        </p>
      ` : ''}

      ${section.trackingUrl ? `
        <div style="text-align: center; margin: 25px 0 0 0;">
          <a href="${section.trackingUrl}" style="display: inline-block; text-decoration: none; font-size: 14px; font-weight: 600; padding: 12px 28px; background: ${status.color}; color: #ffffff; border-radius: 8px; letter-spacing: 0.5px;">
            Track Shipment
          </a>
        </div>
      ` : ''}

      <div style="margin-top: 25px; padding-top: 25px; border-top: 1px solid ${status.color};">
        <p style="margin: 0 0 8px 0; font-size: 13px; color: #64748b; text-transform: uppercase; letter-spacing: 1px; font-weight: 600;">Shipping Address</p>
        <p style="margin: 0; font-size: 15px; color: #0f172a; line-height: 1.6;">
          ${section.shippingAddress.name}<br>
          ${section.shippingAddress.street}<br>
          ${section.shippingAddress.city}, ${section.shippingAddress.state} ${section.shippingAddress.zipCode}
          ${section.shippingAddress.country ? `<br>${section.shippingAddress.country}` : ''}
        </p>
      </div>
    </div>
  `;
}

/**
 * Render Lead Magnet Info Section
 */
export function renderLeadMagnetInfoSection(section: LeadMagnetInfoSection, primaryColor: string): string {
  return `
    <div style="background: linear-gradient(135deg, rgba(107, 70, 193, 0.1) 0%, rgba(85, 60, 154, 0.1) 100%); border: 3px solid ${primaryColor}; border-radius: 12px; padding: 40px; margin: 40px 0; text-align: center;">
      <div style="font-size: 48px; margin-bottom: 20px;">📚</div>
      <h3 style="margin: 0 0 15px 0; font-size: 22px; color: ${primaryColor}; font-weight: 700;">
        ${section.title}
      </h3>
      <p style="margin: 0 0 20px 0; font-size: 16px; color: #475569; line-height: 1.7;">
        ${section.description}
      </p>
      <div style="margin: 20px 0;">
        <p style="margin: 0; font-size: 14px; color: #64748b;">
          Type: <strong style="color: #0f172a;">${section.fileType}</strong>
          ${section.pages ? ` • ${section.pages} pages` : ''}
        </p>
      </div>
      ${section.downloadUrl ? `
        <div style="margin-top: 30px;">
          <a href="${section.downloadUrl}" style="display: inline-block; text-decoration: none; font-size: 16px; font-weight: 600; padding: 16px 40px; background: ${primaryColor}; color: #ffffff; border-radius: 8px; letter-spacing: 0.5px;">
            Download Now
          </a>
        </div>
      ` : ''}
      <p style="margin: 20px 0 0 0; font-size: 13px; color: #64748b;">
        Your ${section.fileType} is also attached to this email
      </p>
    </div>
  `;
}

/**
 * Render Support Info Section
 */
export function renderSupportInfoSection(section: SupportInfoSection, primaryColor: string): string {
  const statusColors = {
    open: { color: '#f59e0b', bg: '#fef3c7' },
    in_progress: { color: '#3b82f6', bg: '#dbeafe' },
    resolved: { color: '#10b981', bg: '#d1fae5' },
    closed: { color: '#6b7280', bg: '#f3f4f6' },
  };

  const status = statusColors[section.status];

  return `
    <div style="background: #f8fafc; border: 2px solid #e2e8f0; border-radius: 12px; padding: 35px; margin: 40px 0;">
      <div style="margin-bottom: 25px;">
        <p style="margin: 0 0 8px 0; font-size: 13px; color: #64748b; text-transform: uppercase; letter-spacing: 1px; font-weight: 600;">Support Ticket</p>
        <p style="margin: 0; font-size: 20px; color: ${primaryColor}; font-weight: 600;">#${section.ticketNumber}</p>
        <div style="margin-top: 12px;">
          <span style="display: inline-block; padding: 6px 14px; background: ${status.bg}; color: ${status.color}; font-size: 13px; font-weight: 600; border-radius: 6px; text-transform: uppercase; letter-spacing: 0.5px;">
            ${section.status.replace('_', ' ')}
          </span>
        </div>
      </div>

      ${section.assignedTo ? `
        <p style="margin: 20px 0 0 0; font-size: 14px; color: #64748b;">
          Assigned to: <strong style="color: #0f172a;">${section.assignedTo}</strong>
        </p>
      ` : ''}

      <div style="margin: 30px 0; padding: 25px; background: #ffffff; border-radius: 8px; border-left: 4px solid ${primaryColor};">
        <p style="margin: 0; font-size: 15px; color: #334155; line-height: 1.7;">
          ${section.message}
        </p>
      </div>

      ${section.nextSteps ? `
        <div style="margin: 25px 0 0 0; padding: 20px; background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%); border-radius: 8px;">
          <p style="margin: 0 0 10px 0; font-size: 14px; font-weight: 600; color: #92400e;">Next Steps</p>
          <p style="margin: 0; font-size: 14px; color: #78350f; line-height: 1.6;">
            ${section.nextSteps}
          </p>
        </div>
      ` : ''}
    </div>
  `;
}

/**
 * Render Invoice Details Section
 */
export function renderInvoiceDetailsSection(section: InvoiceDetailsSection, primaryColor: string): string {
  // Get translations based on language (default to English)
  const lang: SupportedLanguage = section.language || 'en';
  const t = getTranslations(lang);

  // Status translations and colors
  const statusLabels: Record<string, string> = {
    draft: t.statusDraft,
    sent: t.statusSent,
    paid: t.statusPaid,
    overdue: t.statusOverdue,
    cancelled: t.statusCancelled,
  };

  const statusColors = {
    draft: { color: '#64748b', bg: '#f1f5f9' },
    sent: { color: '#3b82f6', bg: '#dbeafe' },
    paid: { color: '#10b981', bg: '#d1fae5' },
    overdue: { color: '#ef4444', bg: '#fee2e2' },
    cancelled: { color: '#64748b', bg: '#f3f4f6' },
  };

  const status = statusColors[section.status];
  const statusLabel = statusLabels[section.status] || section.status;

  // Use organization's currency and locale if provided, otherwise default to USD/en-US
  const currency = section.currency || 'USD';
  const locale = section.locale || 'en-US';

  // Create currency formatter
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency: currency,
    }).format(amount);
  };

  return `
    <div style="background: #f8fafc; border: 2px solid #e2e8f0; border-radius: 12px; padding: 35px; margin: 40px 0;">
      <!-- Invoice Header -->
      <div style="display: flex; justify-content: space-between; margin-bottom: 30px; border-bottom: 2px solid #e2e8f0; padding-bottom: 20px;">
        <div>
          <p style="margin: 0 0 8px 0; font-size: 13px; color: #64748b; text-transform: uppercase; letter-spacing: 1px; font-weight: 600;">${t.invoice}</p>
          <p style="margin: 0; font-size: 24px; color: ${primaryColor}; font-weight: 700;">${section.invoiceNumber}</p>
        </div>
        <div style="text-align: right;">
          <span style="display: inline-block; padding: 8px 16px; background: ${status.bg}; color: ${status.color}; font-size: 13px; font-weight: 600; border-radius: 6px; text-transform: uppercase; letter-spacing: 0.5px;">
            ${statusLabel}
          </span>
        </div>
      </div>

      ${section.sellerCompany && section.buyerCompany ? `
        <!-- B2B: Company Information -->
        <div style="display: flex; justify-content: space-between; margin-bottom: 30px;">
          <div style="width: 48%;">
            <p style="margin: 0 0 8px 0; font-size: 12px; color: #64748b; text-transform: uppercase; letter-spacing: 1px; font-weight: 600;">${t.from}</p>
            <p style="margin: 0; font-size: 16px; color: #0f172a; font-weight: 600;">${section.sellerCompany.name}</p>
            ${section.sellerCompany.address ? `<p style="margin: 4px 0 0 0; font-size: 14px; color: #64748b;">${section.sellerCompany.address}</p>` : ''}
            ${section.sellerCompany.taxId ? `<p style="margin: 4px 0 0 0; font-size: 13px; color: #64748b;">${t.taxId}: ${section.sellerCompany.taxId}</p>` : ''}
          </div>
          <div style="width: 48%; text-align: right;">
            <p style="margin: 0 0 8px 0; font-size: 12px; color: #64748b; text-transform: uppercase; letter-spacing: 1px; font-weight: 600;">${t.billTo}</p>
            <p style="margin: 0; font-size: 16px; color: #0f172a; font-weight: 600;">${section.buyerCompany.name}</p>
            ${section.buyerCompany.address ? `<p style="margin: 4px 0 0 0; font-size: 14px; color: #64748b;">${section.buyerCompany.address}</p>` : ''}
            ${section.buyerCompany.taxId ? `<p style="margin: 4px 0 0 0; font-size: 13px; color: #64748b;">${t.taxId}: ${section.buyerCompany.taxId}</p>` : ''}
          </div>
        </div>
      ` : section.billingAddress ? `
        <!-- B2C: Billing Address -->
        <div style="margin-bottom: 30px;">
          <p style="margin: 0 0 8px 0; font-size: 12px; color: #64748b; text-transform: uppercase; letter-spacing: 1px; font-weight: 600;">${t.billTo}</p>
          <p style="margin: 0; font-size: 15px; color: #0f172a; line-height: 1.6;">
            ${section.billingAddress.name}<br>
            ${section.billingAddress.street}<br>
            ${section.billingAddress.city}, ${section.billingAddress.state} ${section.billingAddress.zipCode}
            ${section.billingAddress.country ? `<br>${section.billingAddress.country}` : ''}
          </p>
        </div>
      ` : ''}

      <!-- Invoice Dates -->
      <div style="margin-bottom: 30px;">
        <table style="width: 100%; border-collapse: collapse;">
          <tr>
            <td style="padding: 8px 0; font-size: 13px; color: #64748b; text-transform: uppercase; letter-spacing: 1px; font-weight: 600; width: 40%;">${t.invoiceDate}</td>
            <td style="padding: 8px 0; font-size: 15px; color: #0f172a; text-align: right;">${section.invoiceDate}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; font-size: 13px; color: #64748b; text-transform: uppercase; letter-spacing: 1px; font-weight: 600;">${t.dueDate}</td>
            <td style="padding: 8px 0; font-size: 15px; color: #0f172a; text-align: right; font-weight: 600;">${section.dueDate}</td>
          </tr>
          ${section.purchaseOrderNumber ? `
          <tr>
            <td style="padding: 8px 0; font-size: 13px; color: #64748b; text-transform: uppercase; letter-spacing: 1px; font-weight: 600;">${t.poNumber}</td>
            <td style="padding: 8px 0; font-size: 15px; color: #0f172a; text-align: right;">${section.purchaseOrderNumber}</td>
          </tr>
          ` : ''}
        </table>
      </div>

      <!-- Line Items Table -->
      <table style="width: 100%; border-collapse: collapse; margin: 30px 0; background: #ffffff; border-radius: 8px; overflow: hidden;">
        <thead>
          <tr style="background: linear-gradient(135deg, ${primaryColor} 0%, ${adjustBrightness(primaryColor, -10)} 100%);">
            <th style="padding: 14px; text-align: left; font-size: 12px; color: #ffffff; text-transform: uppercase; letter-spacing: 1px; font-weight: 600;">${t.description}</th>
            <th style="padding: 14px; text-align: center; font-size: 12px; color: #ffffff; text-transform: uppercase; letter-spacing: 1px; font-weight: 600;">${t.quantity}</th>
            <th style="padding: 14px; text-align: right; font-size: 12px; color: #ffffff; text-transform: uppercase; letter-spacing: 1px; font-weight: 600;">${t.unitPrice}</th>
            <th style="padding: 14px; text-align: right; font-size: 12px; color: #ffffff; text-transform: uppercase; letter-spacing: 1px; font-weight: 600;">${t.total}</th>
          </tr>
        </thead>
        <tbody>
          ${section.lineItems.map((item, index) => `
            <tr style="border-bottom: 1px solid #e2e8f0; ${index % 2 === 0 ? 'background: #f8fafc;' : ''}">
              <td style="padding: 14px; font-size: 15px; color: #0f172a;">${item.description}</td>
              <td style="padding: 14px; font-size: 15px; color: #64748b; text-align: center;">${item.quantity}</td>
              <td style="padding: 14px; font-size: 15px; color: #0f172a; text-align: right;">${formatCurrency(item.unitPrice)}</td>
              <td style="padding: 14px; font-size: 15px; color: #0f172a; text-align: right; font-weight: 500;">${formatCurrency(item.total)}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>

      <!-- Totals -->
      <div style="background: #ffffff; border-radius: 8px; padding: 25px; margin: 30px 0;">
        <table style="width: 100%; border-collapse: collapse;">
          <tr>
            <td style="padding: 10px 0; font-size: 15px; color: #64748b; text-align: right;">${t.subtotal}:</td>
            <td style="padding: 10px 0 10px 30px; font-size: 15px; color: #0f172a; text-align: right; font-weight: 500; width: 30%;">${formatCurrency(section.subtotal)}</td>
          </tr>
          <tr>
            <td style="padding: 10px 0; font-size: 15px; color: #64748b; text-align: right;">${t.tax}:</td>
            <td style="padding: 10px 0 10px 30px; font-size: 15px; color: #0f172a; text-align: right; font-weight: 500;">${formatCurrency(section.taxTotal)}</td>
          </tr>
          <tr style="border-top: 2px solid #e2e8f0;">
            <td style="padding: 14px 0; font-size: 17px; color: #0f172a; text-align: right; font-weight: 600;">${t.total}:</td>
            <td style="padding: 14px 0 14px 30px; font-size: 22px; color: ${primaryColor}; text-align: right; font-weight: 700;">${formatCurrency(section.total)}</td>
          </tr>
          ${section.amountPaid !== undefined && section.amountPaid > 0 ? `
          <tr>
            <td style="padding: 10px 0; font-size: 15px; color: #64748b; text-align: right;">${t.amountPaid}:</td>
            <td style="padding: 10px 0 10px 30px; font-size: 15px; color: #10b981; text-align: right; font-weight: 500;">-${formatCurrency(section.amountPaid)}</td>
          </tr>
          ` : ''}
          <tr style="border-top: 2px solid #e2e8f0;">
            <td style="padding: 14px 0; font-size: 18px; color: #0f172a; text-align: right; font-weight: 700;">${t.amountDue}:</td>
            <td style="padding: 14px 0 14px 30px; font-size: 24px; color: ${section.status === 'paid' ? '#10b981' : '#ef4444'}; text-align: right; font-weight: 700;">${formatCurrency(section.amountDue)}</td>
          </tr>
        </table>
      </div>

      ${section.paymentTerms || section.paymentMethods ? `
        <!-- Payment Information -->
        <div style="margin: 30px 0; padding: 25px; background: linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%); border: 2px solid #86efac; border-radius: 8px;">
          ${section.paymentTerms ? `
            <p style="margin: 0 0 12px 0; font-size: 14px; color: #166534;">
              <strong style="color: #15803d;">${t.paymentTerms}:</strong> ${translatePaymentTerms(section.paymentTerms, lang)}
            </p>
          ` : ''}
          ${section.paymentMethods && section.paymentMethods.length > 0 ? `
            <div style="margin-top: 15px;">
              <p style="margin: 0 0 10px 0; font-size: 13px; color: #166534; font-weight: 600; text-transform: uppercase; letter-spacing: 1px;">${t.paymentMethods}:</p>
              ${section.paymentMethods.map(method => `
                <p style="margin: 5px 0; font-size: 14px; color: #166534;">
                  <strong>${method.type.replace('_', ' ').toUpperCase()}:</strong> ${method.instructions}
                </p>
              `).join('')}
            </div>
          ` : ''}
        </div>
      ` : ''}

      ${section.notes ? `
        <!-- Notes -->
        <div style="margin: 25px 0; padding: 20px; background: #fef3c7; border-radius: 8px; border-left: 4px solid #f59e0b;">
          <p style="margin: 0 0 8px 0; font-size: 13px; color: #92400e; font-weight: 600; text-transform: uppercase; letter-spacing: 1px;">${t.notes}</p>
          <p style="margin: 0; font-size: 14px; color: #78350f; line-height: 1.6;">
            ${section.notes}
          </p>
        </div>
      ` : ''}
    </div>
  `;
}

/**
 * Utility: Adjust color brightness
 * Used to create gradient effects from brand color
 */
function adjustBrightness(hex: string, percent: number): string {
  // Remove # if present
  hex = hex.replace(/^#/, '');

  // Parse RGB
  const num = parseInt(hex, 16);
  const r = Math.max(0, Math.min(255, (num >> 16) + percent));
  const g = Math.max(0, Math.min(255, ((num >> 8) & 0x00FF) + percent));
  const b = Math.max(0, Math.min(255, (num & 0x0000FF) + percent));

  // Convert back to hex
  return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, '0')}`;
}

/**
 * Main Section Renderer
 *
 * Routes section rendering based on type
 */
export function renderSection(section: EmailSection, primaryColor: string): string {
  switch (section.type) {
    case "hero":
      return renderHeroSection(section, primaryColor);
    case "body":
      return renderBodySection(section, primaryColor);
    case "cta":
      return renderCtaSection(section, primaryColor);
    case "eventDetails":
      return renderEventDetailsSection(section, primaryColor);
    case "orderDetails":
      return renderOrderDetailsSection(section, primaryColor);
    case "accountDetails":
      return renderAccountDetailsSection(section, primaryColor);
    case "attachmentInfo":
      return renderAttachmentInfoSection(section, primaryColor);
    case "shippingInfo":
      return renderShippingInfoSection(section, primaryColor);
    case "leadMagnetInfo":
      return renderLeadMagnetInfoSection(section, primaryColor);
    case "supportInfo":
      return renderSupportInfoSection(section, primaryColor);
    case "invoiceDetails":
      return renderInvoiceDetailsSection(section, primaryColor);
    default:
      return '';
  }
}
