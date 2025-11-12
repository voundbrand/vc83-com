/**
 * PDF TICKET TEMPLATE TYPES
 *
 * Defines interfaces for PDF ticket templates following the same pattern
 * as email templates.
 */

import type { Id } from "../../../../convex/_generated/dataModel";

/**
 * PDF Ticket Template Props
 *
 * Data passed to PDF ticket template generation functions.
 */
export interface PdfTicketTemplateProps {
  // Ticket information
  ticket: {
    _id: Id<"objects">;
    name: string;
    ticketNumber?: string;
    status: string;
    subtype?: string; // e.g., "VIP", "Standard", "Premium"
    customProperties?: {
      holderName?: string;
      holderEmail?: string;
      holderPhone?: string;
      purchaseDate?: number;
      pricePaid?: number;
      guestCount?: number;
      [key: string]: any;
    };
  };

  // Event information
  event: {
    _id: Id<"objects">;
    name: string;
    customProperties?: {
      startDate?: string | number;
      startTime?: string;
      location?: string;
      durationHours?: number;
      description?: string;
      eventSponsors?: Array<{ name: string; level?: string }>;
      [key: string]: any;
    };
  };

  // Order/Transaction information
  order: {
    orderId: string;
    orderDate: number;
    currency: string;
    netPrice: number; // in cents
    taxAmount: number; // in cents
    taxRate: number; // percentage
    totalPrice: number; // in cents
  };

  // QR Code
  qrCode: {
    dataUrl: string; // Base64 data URL of QR code
  };

  // Branding (from domain config)
  branding: {
    primaryColor: string;
    secondaryColor: string;
    accentColor?: string;
    logoUrl?: string;
  };

  // Organization info (for footer)
  organization?: {
    name?: string;
    email?: string;
    phone?: string;
    website?: string;
  };
}

/**
 * PDF Ticket Template Output
 *
 * What the template function returns after generation.
 */
export interface PdfTicketTemplateOutput {
  filename: string;
  content: string; // base64 encoded PDF
  contentType: string; // "application/pdf"
}

/**
 * PDF Ticket Template Function Type
 *
 * All PDF ticket template functions must match this signature.
 * They return a Promise since PDF generation is async.
 */
export type PdfTicketTemplateFunction = (
  props: PdfTicketTemplateProps
) => Promise<PdfTicketTemplateOutput>;

/**
 * PDF Ticket Template Metadata
 *
 * Information about the template for UI display.
 */
export interface PdfTicketTemplateMetadata {
  code: string;
  name: string;
  description: string;
  category: "elegant" | "modern" | "vip" | "festival" | "minimal";
  previewImageUrl?: string;
  features: {
    qrCodePosition: "top-right" | "top-left" | "bottom-right" | "bottom-left" | "center";
    showBarcode: boolean;
    showSponsors: boolean;
    colorScheme: "light" | "dark" | "gold" | "custom";
  };
  author: string;
  version: string;
}
