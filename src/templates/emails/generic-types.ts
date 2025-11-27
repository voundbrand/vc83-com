/**
 * GENERIC EMAIL TEMPLATE TYPES
 *
 * Modular, schema-based email types that work for ANY business context.
 * Designed for AI-driven content generation and adaptation.
 */

import type { Id } from "../../../convex/_generated/dataModel";

/**
 * Email Section Types
 *
 * Modular sections that can be included/excluded based on context.
 * AI determines which sections to include for each email.
 */
export type EmailSectionType =
  | "hero"
  | "body"
  | "cta"
  | "eventDetails"
  | "orderDetails"
  | "accountDetails"
  | "attachmentInfo"
  | "shippingInfo"
  | "leadMagnetInfo"
  | "supportInfo"
  | "invoiceDetails";

/**
 * Hero Section
 * Large title/subtitle at top of email
 */
export interface HeroSection {
  type: "hero";
  title: string;
  subtitle?: string;
  image?: string;
}

/**
 * Body Section
 * Main content paragraphs or structured content
 */
export interface BodySection {
  type: "body";
  paragraphs?: string[];
  sections?: Array<{
    title?: string;
    content: string;
    icon?: string;
  }>;
}

/**
 * CTA Section
 * Call-to-action button
 */
export interface CtaSection {
  type: "cta";
  text: string;
  url: string;
  style?: "primary" | "secondary" | "outline";
}

/**
 * Event Details Section
 * Event-specific information
 */
export interface EventDetailsSection {
  type: "eventDetails";
  eventName: string;
  date: string;
  time: string;
  location: string;
  guestCount?: number;
}

/**
 * Order Details Section
 * Purchase/transaction information
 */
export interface OrderDetailsSection {
  type: "orderDetails";
  orderNumber: string;
  orderDate: string;
  items: Array<{
    name: string;
    quantity: number;
    price: number;
  }>;
  subtotal: number;
  tax?: number;
  shipping?: number;
  total: number;
  paymentMethod?: string;
  // Currency and locale settings (from organization)
  currency?: string;
  locale?: string;
}

/**
 * Account Details Section
 * Account-related information
 */
export interface AccountDetailsSection {
  type: "accountDetails";
  username?: string;
  email?: string;
  accountAction?: "created" | "verified" | "password_reset" | "updated";
  verificationLink?: string;
  resetLink?: string;
  expiresIn?: string;
}

/**
 * Attachment Info Section
 * Information about attached files
 */
export interface AttachmentInfoSection {
  type: "attachmentInfo";
  attachments: Array<{
    name: string;
    description: string;
    icon?: string;
  }>;
}

/**
 * Shipping Info Section
 * Shipping/delivery information
 */
export interface ShippingInfoSection {
  type: "shippingInfo";
  status: "processing" | "shipped" | "delivered" | "delayed";
  trackingNumber?: string;
  trackingUrl?: string;
  estimatedDelivery?: string;
  carrier?: string;
  shippingAddress: {
    name: string;
    street: string;
    city: string;
    state: string;
    zipCode: string;
    country?: string;
  };
}

/**
 * Lead Magnet Info Section
 * Lead magnet delivery information
 */
export interface LeadMagnetInfoSection {
  type: "leadMagnetInfo";
  title: string;
  description: string;
  fileType: string;
  pages?: number;
  downloadUrl?: string;
}

/**
 * Support Info Section
 * Customer support information
 */
export interface SupportInfoSection {
  type: "supportInfo";
  ticketNumber: string;
  status: "open" | "in_progress" | "resolved" | "closed";
  assignedTo?: string;
  message: string;
  nextSteps?: string;
}

/**
 * Invoice Details Section
 * Invoice and billing information for B2B and B2C invoices
 */
export interface InvoiceDetailsSection {
  type: "invoiceDetails";
  invoiceNumber: string;
  invoiceDate: string;
  dueDate: string;
  status: "draft" | "sent" | "paid" | "overdue" | "cancelled";

  // Line items
  lineItems: Array<{
    description: string;
    quantity: number;
    unitPrice: number;
    total: number;
    taxRate?: number;
  }>;

  // Financial summary
  subtotal: number;
  taxTotal: number;
  total: number;
  amountDue: number;
  amountPaid?: number;

  // Payment information
  paymentTerms?: string; // e.g., "Net 30", "Due on receipt"
  paymentMethods?: Array<{
    type: "card" | "bank_transfer" | "paypal" | "check";
    instructions: string;
  }>;

  // B2B specific
  sellerCompany?: {
    name: string;
    address?: string;
    taxId?: string;
    registrationNumber?: string;
  };
  buyerCompany?: {
    name: string;
    address?: string;
    taxId?: string;
    registrationNumber?: string;
  };

  // Billing address
  billingAddress?: {
    name: string;
    street: string;
    city: string;
    state: string;
    zipCode: string;
    country?: string;
  };

  // Additional notes
  notes?: string;
  purchaseOrderNumber?: string;

  // Currency and locale settings (from organization)
  currency?: string;
  locale?: string;
}

/**
 * Union of all section types
 */
export type EmailSection =
  | HeroSection
  | BodySection
  | CtaSection
  | EventDetailsSection
  | OrderDetailsSection
  | AccountDetailsSection
  | AttachmentInfoSection
  | ShippingInfoSection
  | LeadMagnetInfoSection
  | SupportInfoSection
  | InvoiceDetailsSection;

/**
 * Generic Email Template Props
 *
 * Flexible props that work for ANY email type.
 * Sections array determines what content is included.
 */
export interface GenericEmailProps {
  // Core header info (always present)
  header: {
    logo?: string;
    brandColor: string;
    companyName: string;
  };

  // Recipient info
  recipient: {
    firstName: string;
    lastName: string;
    email: string;
  };

  // Modular content sections (AI determines which to include)
  sections: EmailSection[];

  // Footer info
  footer: {
    companyName: string;
    tagline?: string;
    address?: string;
    socialLinks?: Array<{
      platform: string;
      url: string;
    }>;
    unsubscribeUrl?: string;
    legalText?: string;
  };

  // Email metadata
  language?: "en" | "de" | "es" | "fr";
  isTest?: boolean;
}

/**
 * Generic Email Template Output
 */
export interface GenericEmailOutput {
  html: string;
  subject: string;
  previewText?: string;
}

/**
 * Generic Email Template Component Type
 */
export type GenericEmailTemplate = (props: GenericEmailProps) => GenericEmailOutput;

/**
 * Email Template Categories (expanded)
 */
export type EmailTemplateCategory =
  | "transactional"
  | "marketing"
  | "event"
  | "support"
  | "system"
  | "newsletter";

/**
 * Generic Email Template Metadata
 */
export interface GenericEmailMetadata {
  code: string;
  name: string;
  description: string;
  category: EmailTemplateCategory;
  suggestedSections: readonly EmailSectionType[]; // Which sections work best with this template
  previewImageUrl?: string;
  supportedLanguages: string[];
  supportsAttachments?: boolean; // Backward compatibility
  author: string;
  version: string;
}
