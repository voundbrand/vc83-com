/**
 * B2C INVOICE EMAIL TEMPLATE
 *
 * Consumer-friendly invoice with simplified layout and clear payment instructions.
 * Prominent "Pay Now" button and friendly tone.
 *
 * Suggested sections: hero, body, invoiceDetails, cta
 */

import type { EmailTemplateOutput, EmailLanguage } from "../types";
import type { GenericEmailProps, InvoiceDetailsSection } from "../generic-types";
import { GenericEmailTemplate } from "../generic/index";
import type { Id } from "../../../../convex/_generated/dataModel";

/**
 * B2C Invoice Template Props
 * Designed to work with invoiceEmailService.ts data structure
 */
export interface InvoiceB2CTemplateProps {
  invoice: {
    _id: Id<"objects">;
    invoiceNumber: string;
    invoiceDate: number;
    dueDate: number;
    status: string;
    invoiceType: string;
    isDraft: boolean;
    lineItems: Array<{
      description: string;
      productName?: string;
      eventName?: string;
      quantity: number;
      unitPriceInCents: number;
      totalPriceInCents: number;
      taxRatePercent: number;
      taxAmountInCents: number;
    }>;
    subtotalInCents: number;
    taxAmountInCents: number;
    totalInCents: number;
    currency: string;
    paymentTerms: string;
    notes?: string;
  };

  recipient: {
    name: string;
    email: string;
    companyName?: string;
    address?: {
      line1?: string;
      line2?: string;
      city?: string;
      postalCode?: string;
      state?: string;
      country?: string;
    };
    taxId?: string;
  };

  sender: {
    name: string;
    companyName: string;
    email: string;
    phone?: string;
    website?: string;
  };

  branding: {
    primaryColor: string;
    secondaryColor: string;
    accentColor: string;
    logoUrl?: string;
  };

  language: EmailLanguage;
  isTest: boolean;

  viewInvoiceUrl?: string;
  payNowUrl?: string;
  downloadPdfUrl?: string;
}

export function InvoiceB2CEmailTemplate(props: InvoiceB2CTemplateProps): EmailTemplateOutput {
  const invoice = props.invoice;

  // Format dates
  const invoiceDate = new Date(invoice.invoiceDate).toLocaleDateString(props.language === 'de' ? 'de-DE' : 'en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
  const dueDate = new Date(invoice.dueDate).toLocaleDateString(props.language === 'de' ? 'de-DE' : 'en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  // Format currency amounts (cents to display)
  const formatCurrency = (cents: number) => {
    const amount = cents / 100;
    return new Intl.NumberFormat(props.language === 'de' ? 'de-DE' : 'en-US', {
      style: 'currency',
      currency: invoice.currency,
    }).format(amount);
  };

  // Convert line items to invoice section format
  const lineItems = invoice.lineItems.map(item => ({
    description: item.description || item.productName || item.eventName || 'Item',
    quantity: item.quantity,
    unitPrice: item.unitPriceInCents / 100,
    total: item.totalPriceInCents / 100,
  }));

  // Build billing address from recipient
  const billingAddress = props.recipient.address ? {
    name: props.recipient.name,
    street: `${props.recipient.address.line1 || ''}${props.recipient.address.line2 ? ', ' + props.recipient.address.line2 : ''}`,
    city: props.recipient.address.city || '',
    state: props.recipient.address.state || '',
    zipCode: props.recipient.address.postalCode || '',
    country: props.recipient.address.country,
  } : undefined;

  // Build invoice details section
  const invoiceSection: InvoiceDetailsSection = {
    type: "invoiceDetails",
    invoiceNumber: invoice.invoiceNumber,
    invoiceDate: invoiceDate,
    dueDate: dueDate,
    status: invoice.status as "draft" | "sent" | "paid" | "overdue" | "cancelled",
    lineItems: lineItems,
    subtotal: invoice.subtotalInCents / 100,
    taxTotal: invoice.taxAmountInCents / 100,
    total: invoice.totalInCents / 100,
    amountDue: invoice.totalInCents / 100,
    billingAddress,
    paymentTerms: invoice.paymentTerms || "Due on receipt",
    notes: invoice.notes,
  };

  // Extract recipient first name (simple split on space)
  const recipientFirstName = props.recipient.name.split(' ')[0];

  const genericProps: GenericEmailProps = {
    header: {
      brandColor: props.branding.primaryColor,
      logo: props.branding.logoUrl,
      companyName: props.sender.companyName,
    },
    recipient: {
      firstName: recipientFirstName,
      lastName: props.recipient.name.split(' ').slice(1).join(' ') || '',
      email: props.recipient.email,
    },
    sections: [
      {
        type: "hero",
        title: "Your Invoice is Ready!",
        subtitle: `Invoice #${invoice.invoiceNumber}`,
      },
      {
        type: "body",
        paragraphs: [
          `Hi ${recipientFirstName}!`,
          `Thanks for your business! Here's your invoice for the items you purchased.`,
          `You can pay securely online using the button below.`,
        ],
      },
      ...(props.payNowUrl ? [{
        type: "cta" as const,
        text: "Pay Now - Easy & Secure",
        url: props.payNowUrl,
        style: "primary" as const,
      }] : []),
      invoiceSection,
      ...(props.viewInvoiceUrl ? [{
        type: "cta" as const,
        text: "View Full Invoice",
        url: props.viewInvoiceUrl,
        style: "secondary" as const,
      }] : []),
      {
        type: "body",
        sections: [
          {
            title: "💳 Need Help?",
            content: "If you have questions about this invoice or need assistance with payment, just reply to this email and we'll be happy to help!",
          },
        ],
      },
    ],
    footer: {
      companyName: props.sender.companyName,
      tagline: "Thanks for choosing us!",
    },
    language: props.language,
  };

  const result = GenericEmailTemplate(genericProps);

  return {
    ...result,
    subject: `Your Invoice #${invoice.invoiceNumber} - ${props.sender.companyName}`,
    previewText: `Invoice for ${formatCurrency(invoice.totalInCents)} - Pay securely online now`,
  };
}

export const INVOICE_B2C_EMAIL_METADATA = {
  code: "email_invoice_b2c",
  name: "B2C Invoice",
  description: "Consumer-friendly invoice with simplified layout and prominent payment button",
  category: "transactional" as const,
  suggestedSections: ["hero", "body", "invoiceDetails", "cta"] as const,
  previewImageUrl: "",
  supportedLanguages: ["en", "de", "es", "fr"],
  author: "System",
  version: "1.0.0",
};
