/**
 * PAYMENT RECEIPT EMAIL TEMPLATE
 *
 * Payment confirmation receipt with transaction details.
 * Shows amount paid, payment method, and remaining balance if any.
 *
 * Suggested sections: hero, body, invoiceDetails, cta
 */

import type { EmailTemplateProps, EmailTemplateOutput } from "../types";
import type { GenericEmailProps, InvoiceDetailsSection } from "../generic-types";
import { GenericEmailTemplate } from "../generic/index";

/**
 * Receipt Template Props
 * Extends base EmailTemplateProps with receipt data
 */
export interface ReceiptTemplateProps extends EmailTemplateProps {
  receipt?: {
    receiptNumber: string;
    invoiceNumber: string;
    paymentDate: string;

    lineItems: Array<{
      description: string;
      quantity: number;
      unitPrice: number;
      total: number;
    }>;

    subtotal: number;
    taxTotal: number;
    total: number;
    amountPaid: number;
    amountDue: number; // Remaining balance

    paymentMethod: string;
    transactionId?: string;

    billingAddress?: {
      name: string;
      street: string;
      city: string;
      state: string;
      zipCode: string;
      country?: string;
    };

    notes?: string;
  };

  viewReceiptUrl?: string;
  downloadPdfUrl?: string;
}

export function ReceiptEmailTemplate(props: ReceiptTemplateProps): EmailTemplateOutput {
  // Provide fallback receipt data for preview/testing
  const receipt = props.receipt || {
    receiptNumber: "RCP-2024-001",
    invoiceNumber: "INV-2024-001",
    paymentDate: "January 15, 2024",
    lineItems: [
      {
        description: "Event Registration",
        quantity: 1,
        unitPrice: 500,
        total: 500,
      }
    ],
    subtotal: 500,
    taxTotal: 40,
    total: 540,
    amountPaid: 540,
    amountDue: 0,
    paymentMethod: "Credit Card",
    transactionId: "txn_1234567890",
    billingAddress: {
      name: `${props.attendee.firstName} ${props.attendee.lastName}`,
      street: "789 Customer Lane",
      city: "Hometown",
      state: "CA",
      zipCode: "90210",
    },
  };

  // Build invoice details section (reusing for receipt display)
  const receiptSection: InvoiceDetailsSection = {
    type: "invoiceDetails",
    invoiceNumber: receipt.invoiceNumber,
    invoiceDate: receipt.paymentDate,
    dueDate: receipt.paymentDate, // For receipt, due date = payment date
    status: receipt.amountDue > 0 ? "sent" : "paid",
    lineItems: receipt.lineItems,
    subtotal: receipt.subtotal,
    taxTotal: receipt.taxTotal,
    total: receipt.total,
    amountPaid: receipt.amountPaid,
    amountDue: receipt.amountDue,
    billingAddress: receipt.billingAddress,
    paymentMethods: [{
      type: "card",
      instructions: `Paid via ${receipt.paymentMethod}${receipt.transactionId ? ` - Transaction ID: ${receipt.transactionId}` : ''}`,
    }],
    notes: receipt.notes,
  };

  const genericProps: GenericEmailProps = {
    header: {
      brandColor: props.branding.primaryColor || '#10b981', // Green for paid receipts
      logo: props.branding.logoUrl,
      companyName: props.domain.displayName || props.domain.domainName,
    },
    recipient: {
      firstName: props.attendee.firstName,
      lastName: props.attendee.lastName,
      email: props.attendee.email,
    },
    sections: [
      {
        type: "hero",
        title: "✅ Payment Received!",
        subtitle: `Receipt #${receipt.receiptNumber}`,
      },
      {
        type: "body",
        paragraphs: [
          `Hi ${props.attendee.firstName}!`,
          `Thank you for your payment! We've successfully received your payment of $${receipt.amountPaid.toFixed(2)}.`,
          receipt.amountDue > 0
            ? `Your remaining balance is $${receipt.amountDue.toFixed(2)}.`
            : `Your invoice has been paid in full. You're all set!`,
        ],
      },
      receiptSection,
      ...(props.viewReceiptUrl ? [{
        type: "cta" as const,
        text: "Download Receipt",
        url: props.viewReceiptUrl,
        style: "primary" as const,
      }] : []),
      {
        type: "body",
        sections: [
          {
            title: "📧 Keep This Email",
            content: "This email serves as your official receipt. Please keep it for your records. If you need a PDF copy, you can download it using the button above.",
          },
          {
            title: "❓ Questions?",
            content: "If you have any questions about this payment or need additional documentation, feel free to reach out to us!",
          },
        ],
      },
    ],
    footer: {
      companyName: props.domain.displayName || props.domain.domainName,
      tagline: "Thank you for your business!",
    },
    language: props.language,
  };

  const result = GenericEmailTemplate(genericProps);

  return {
    ...result,
    subject: `Payment Received - Receipt #${receipt.receiptNumber}`,
    previewText: `Payment of $${receipt.amountPaid.toFixed(2)} confirmed for Invoice ${receipt.invoiceNumber}`,
  };
}

export const RECEIPT_EMAIL_METADATA = {
  code: "email_receipt",
  name: "Payment Receipt",
  description: "Payment confirmation receipt with transaction details and remaining balance",
  category: "transactional" as const,
  suggestedSections: ["hero", "body", "invoiceDetails", "cta"] as const,
  previewImageUrl: "",
  supportedLanguages: ["en", "de", "es", "fr"],
  author: "System",
  version: "1.0.0",
};
