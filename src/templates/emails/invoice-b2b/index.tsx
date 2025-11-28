/**
 * B2B INVOICE EMAIL TEMPLATE
 *
 * Professional invoice for business-to-business transactions.
 * Includes company details, tax IDs, purchase orders, and net payment terms.
 *
 * Suggested sections: hero, body, invoiceDetails, cta
 */

import type { EmailTemplateOutput, EmailLanguage } from "../types";
import type { GenericEmailProps, InvoiceDetailsSection } from "../generic-types";
import { GenericEmailTemplate } from "../generic/index";
import type { Id } from "../../../../convex/_generated/dataModel";

/**
 * B2B Invoice Template Props
 * Designed to work with invoiceEmailService.ts data structure
 */
export interface InvoiceB2BTemplateProps {
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

  // Currency and locale settings from organization
  currency?: string;
  locale?: string;
  currencySymbol?: string;

  viewInvoiceUrl?: string;
  payNowUrl?: string;
  downloadPdfUrl?: string;
}

export function InvoiceB2BEmailTemplate(props: InvoiceB2BTemplateProps): EmailTemplateOutput {
  const invoice = props.invoice;
  const lang = props.language;

  // Translations
  const translations = {
    de: {
      invoice: "Rechnung",
      professionalServices: "Professionelle Dienstleistungen für",
      dearCustomer: "Sehr geehrte Damen und Herren",
      dearName: "Sehr geehrte/r",
      invoiceDescription: "Anbei finden Sie Ihre Rechnung für erbrachte Dienstleistungen. Die Zahlung ist gemäß den unten aufgeführten Bedingungen fällig.",
      contactInfo: "Sollten Sie Fragen zu dieser Rechnung haben, zögern Sie bitte nicht, unsere Buchhaltungsabteilung zu kontaktieren.",
      viewInvoiceOnline: "Rechnung online ansehen",
      payInvoiceNow: "Rechnung jetzt bezahlen",
      businessServices: "Professionelle Geschäftsdienstleistungen",
      invoiceFor: "Rechnung für",
      amountDue: "Fälliger Betrag",
      dueDate: "Fälligkeitsdatum",
    },
    en: {
      invoice: "Invoice",
      professionalServices: "Professional services for",
      dearCustomer: "Dear Sir or Madam",
      dearName: "Dear",
      invoiceDescription: "Please find your invoice for services rendered. Payment is due according to the terms outlined below.",
      contactInfo: "If you have any questions regarding this invoice, please don't hesitate to contact our accounts department.",
      viewInvoiceOnline: "View Invoice Online",
      payInvoiceNow: "Pay Invoice Now",
      businessServices: "Professional business services",
      invoiceFor: "Invoice for",
      amountDue: "Amount due",
      dueDate: "Due date",
    },
    es: {
      invoice: "Factura",
      professionalServices: "Servicios profesionales para",
      dearCustomer: "Estimado/a señor/a",
      dearName: "Estimado/a",
      invoiceDescription: "Adjunto encontrará su factura por los servicios prestados. El pago vence según los términos especificados a continuación.",
      contactInfo: "Si tiene alguna pregunta sobre esta factura, no dude en ponerse en contacto con nuestro departamento de contabilidad.",
      viewInvoiceOnline: "Ver factura en línea",
      payInvoiceNow: "Pagar factura ahora",
      businessServices: "Servicios empresariales profesionales",
      invoiceFor: "Factura para",
      amountDue: "Monto adeudado",
      dueDate: "Fecha de vencimiento",
    },
    fr: {
      invoice: "Facture",
      professionalServices: "Services professionnels pour",
      dearCustomer: "Madame, Monsieur",
      dearName: "Cher/Chère",
      invoiceDescription: "Veuillez trouver ci-joint votre facture pour les services rendus. Le paiement est dû conformément aux conditions décrites ci-dessous.",
      contactInfo: "Si vous avez des questions concernant cette facture, n'hésitez pas à contacter notre service comptabilité.",
      viewInvoiceOnline: "Voir la facture en ligne",
      payInvoiceNow: "Payer la facture maintenant",
      businessServices: "Services commerciaux professionnels",
      invoiceFor: "Facture pour",
      amountDue: "Montant dû",
      dueDate: "Date d'échéance",
    },
  };

  const t = translations[lang];

  // Use organization's locale and currency from resolved data
  // The templateData already includes currency, locale, and currencySymbol from the resolver
  const currency = props.currency || invoice.currency;
  const locale = props.locale || (lang === 'de' ? 'de-DE' : lang === 'fr' ? 'fr-FR' : lang === 'es' ? 'es-ES' : 'en-US');

  const invoiceDate = new Date(invoice.invoiceDate).toLocaleDateString(locale, {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
  const dueDate = new Date(invoice.dueDate).toLocaleDateString(locale, {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  // Format currency amounts using organization's currency and locale
  const formatCurrency = (cents: number) => {
    const amount = cents / 100;
    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency: currency,
    }).format(amount);
  };

  // Convert line items to invoice section format
  const lineItems = invoice.lineItems.map(item => ({
    description: item.description || item.productName || item.eventName || 'Item',
    quantity: item.quantity,
    unitPrice: item.unitPriceInCents / 100,
    total: item.totalPriceInCents / 100,
    taxRate: item.taxRatePercent,
  }));

  // Build seller and buyer company info
  const recipientAddress = props.recipient.address ?
    `${props.recipient.address.line1 || ''}${props.recipient.address.line2 ? ', ' + props.recipient.address.line2 : ''}, ${props.recipient.address.city || ''}, ${props.recipient.address.state || ''} ${props.recipient.address.postalCode || ''}` : '';

  const sellerCompany = {
    name: props.sender.companyName,
    address: '', // Not provided in current data structure
    taxId: '', // Not provided in current data structure
  };

  const buyerCompany = {
    name: props.recipient.companyName || props.recipient.name,
    address: recipientAddress,
    taxId: props.recipient.taxId || '',
  };

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
    paymentTerms: invoice.paymentTerms,
    sellerCompany,
    buyerCompany,
    notes: invoice.notes,
    // Pass currency and locale to the renderer
    currency: currency,
    locale: locale,
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
        title: `${t.invoice} ${invoice.invoiceNumber}`,
        subtitle: `${t.professionalServices} ${buyerCompany.name}`,
      },
      {
        type: "body",
        paragraphs: [
          t.invoiceDescription,
          t.contactInfo,
        ],
      },
      invoiceSection,
      ...(props.viewInvoiceUrl ? [{
        type: "cta" as const,
        text: t.viewInvoiceOnline,
        url: props.viewInvoiceUrl,
        style: "secondary" as const,
      }] : []),
      ...(props.payNowUrl ? [{
        type: "cta" as const,
        text: t.payInvoiceNow,
        url: props.payNowUrl,
        style: "primary" as const,
      }] : []),
    ],
    footer: {
      companyName: props.sender.companyName,
      tagline: t.businessServices,
      legalText: sellerCompany.taxId ? `Tax ID: ${sellerCompany.taxId}` : undefined,
    },
    language: props.language,
  };

  const result = GenericEmailTemplate(genericProps);

  return {
    ...result,
    subject: `${t.invoice} ${invoice.invoiceNumber} - ${props.sender.companyName}`,
    previewText: `${t.invoiceFor} ${buyerCompany.name} - ${t.amountDue}: ${formatCurrency(invoice.totalInCents)} - ${t.dueDate}: ${dueDate}`,
  };
}

export const INVOICE_B2B_EMAIL_METADATA = {
  code: "email_invoice_b2b",
  name: "B2B Invoice",
  description: "Professional invoice for business-to-business transactions with company details and tax information",
  category: "transactional" as const,
  suggestedSections: ["hero", "body", "invoiceDetails", "cta"] as const,
  previewImageUrl: "",
  supportedLanguages: ["en", "de", "es", "fr"],
  author: "System",
  version: "1.0.0",
};
