/**
 * EMAIL TEMPLATE TYPES
 *
 * Defines interfaces for email templates following the same pattern
 * as checkout, web, and form templates.
 */

import type { Id } from "../../../convex/_generated/dataModel";

/**
 * Supported email languages
 */
export type EmailLanguage = "de" | "en" | "es" | "fr";

/**
 * Email Template Props
 *
 * Data passed to email template components for rendering.
 */
export interface EmailTemplateProps {
  // Ticket information
  ticket: {
    _id: Id<"objects">;
    name: string;
    ticketNumber?: string;
    status: string;
    customProperties?: {
      guestCount?: number;
      attendeeFirstName?: string;
      attendeeLastName?: string;
      attendeeEmail?: string;
      purchaseDate?: number;
      pricePaid?: number;
      [key: string]: any;
    };
  };

  // Event information
  event: {
    _id: Id<"objects">;
    name: string;
    customProperties?: {
      startDate?: string;
      startTime?: string;
      location?: string;
      durationHours?: number;
      description?: string;
      [key: string]: any;
    };
  };

  // Attendee information (extracted for convenience)
  attendee: {
    firstName: string;
    lastName: string;
    email: string;
    phone?: string;
    guestCount: number;
  };

  // Domain configuration
  domain: {
    domainName: string;
    displayName?: string;
    siteUrl: string;
    mapsUrl?: string;
  };

  // Branding (from domain config)
  branding: {
    primaryColor: string;
    secondaryColor: string;
    accentColor?: string;
    logoUrl?: string;
  };

  // Language
  language: EmailLanguage;

  // Email context
  isTest?: boolean;
  testRecipient?: string;
}

/**
 * Email Template Output
 *
 * What the template component returns after rendering.
 */
export interface EmailTemplateOutput {
  html: string;           // Complete HTML email as string
  subject: string;        // Email subject line
  previewText?: string;   // Preview text shown in email clients
}

/**
 * Email Template Component Type
 *
 * All email template components must match this signature.
 */
export type EmailTemplateComponent = (props: EmailTemplateProps) => EmailTemplateOutput;

/**
 * Email Template Metadata
 *
 * Information about the template for UI display.
 */
export interface EmailTemplateMetadata {
  code: string;
  name: string;
  description: string;
  category: "professional" | "luxury" | "standard" | "minimal" | "festival" | "corporate" | "internal";
  previewImageUrl?: string;
  supportedLanguages: EmailLanguage[];
  supportsAttachments: boolean;
  author: string;
  version: string;
}

/**
 * Language-specific translations for email templates
 */
export interface EmailTranslations {
  de: EmailTranslation;
  en: EmailTranslation;
  es: EmailTranslation;
  fr: EmailTranslation;
}

export interface EmailTranslation {
  // Header
  title: string;
  confirmationHeading: string;

  // Body
  thankYou: string;

  // Event Details Section
  eventDetails: string;
  event: string;
  date: string;
  time: string;
  location: string;
  guests: string;
  guest: string;

  // Attachments Section
  attachments: string;
  ticketPDF: string;
  ticketPDFDesc: string;
  calendarFile: string;
  calendarFileDesc: string;

  // Quick Links Section
  usefulLinks: string;
  directions: string;
  eventPage: string;

  // Important Note
  importantNote: string;
  noteContent: string;

  // Closing
  closing: string;
  team: string;
  tagline: string;

  // Footer
  copyright: string;
}
