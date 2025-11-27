/**
 * TEMPLATE RENDERING SCHEMA TYPES
 *
 * Schema-based approach for rendering email and PDF templates
 * Inspired by the forms system - AI-friendly, JSON-based, easy to preview
 *
 * Philosophy:
 * - Templates are defined by JSON schemas, not hardcoded components
 * - AI can generate and modify templates by generating schemas
 * - Live previews render directly from schemas
 * - Easy to version, validate, and migrate
 *
 * Note: This is separate from schema-types.ts which defines form field schemas
 *       for EDITING templates. This file defines the structure for RENDERING templates.
 */

/**
 * Base Template Schema
 * Common properties for all template types
 */
export interface BaseTemplateSchema {
  version: string;
  type: "email" | "pdf";
  category: string;
  code: string; // Template code (e.g., "ticket_professional_v1")
  name: string;
  description: string;
  author?: string;
  createdAt?: number;
  updatedAt?: number;
}

/**
 * Template Variable Definition
 * Declares what data the template needs to render
 */
export interface TemplateVariable {
  name: string; // e.g., "ticket.ticketNumber" or "event.name"
  type: "string" | "number" | "date" | "boolean" | "image" | "qr" | "array" | "object";
  required: boolean;
  description?: string;
  defaultValue?: unknown;
  validation?: {
    min?: number;
    max?: number;
    pattern?: string;
    options?: string[];
  };
}

/**
 * Section Types
 * Building blocks for template layouts
 */
export type SectionType =
  | "header"
  | "footer"
  | "hero-image"
  | "text-block"
  | "data-table"
  | "qr-code"
  | "barcode"
  | "divider"
  | "button"
  | "social-links"
  | "address-block"
  | "pricing-table"
  | "ticket-details"
  | "event-details"
  | "spacer"
  | "custom-html";

/**
 * Base Section Definition
 */
export interface BaseSection {
  id: string;
  type: SectionType;
  order: number;
  visible: boolean;
  condition?: string; // e.g., "{{ticket.vipStatus}} === true"
  spacing?: {
    marginTop?: string;
    marginBottom?: string;
    paddingTop?: string;
    paddingBottom?: string;
  };
  backgroundColor?: string;
  border?: {
    width?: string;
    color?: string;
    style?: "solid" | "dashed" | "dotted";
    radius?: string;
  };
}

/**
 * Header Section
 */
export interface HeaderSection extends BaseSection {
  type: "header";
  content: {
    logo?: string; // Variable reference like "{{branding.logoUrl}}" or static URL
    text?: string; // Variable reference like "{{domain.name}}" or static text
    height?: string;
    alignment?: "left" | "center" | "right";
    showBorder?: boolean;
  };
}

/**
 * Footer Section
 */
export interface FooterSection extends BaseSection {
  type: "footer";
  content: {
    text?: string; // Variable reference or static text
    links?: Array<{
      text: string;
      url: string;
    }>;
    showSocialLinks?: boolean;
    socialLinks?: Array<{
      platform: "facebook" | "twitter" | "instagram" | "linkedin" | "youtube";
      url: string;
    }>;
    copyright?: string;
    alignment?: "left" | "center" | "right";
  };
}

/**
 * Hero Image Section
 */
export interface HeroImageSection extends BaseSection {
  type: "hero-image";
  content: {
    imageUrl: string; // Variable reference like "{{event.imageUrl}}" or URL
    altText?: string;
    height?: string;
    fit?: "cover" | "contain" | "fill";
    overlay?: {
      color?: string;
      opacity?: number;
      text?: string;
      textColor?: string;
    };
  };
}

/**
 * Text Block Section
 */
export interface TextBlockSection extends BaseSection {
  type: "text-block";
  content: {
    title?: string; // Supports variables like "{{event.name}}"
    subtitle?: string;
    body: string; // Supports template variables and basic markdown
    alignment?: "left" | "center" | "right";
    fontSize?: {
      title?: string;
      subtitle?: string;
      body?: string;
    };
    fontWeight?: {
      title?: "normal" | "bold";
      body?: "normal" | "bold";
    };
    color?: {
      title?: string;
      body?: string;
    };
  };
}

/**
 * Data Table Section
 * For displaying structured data (invoice line items, ticket details, etc.)
 */
export interface DataTableSection extends BaseSection {
  type: "data-table";
  content: {
    title?: string;
    columns: Array<{
      id: string;
      label: string;
      field: string; // Variable reference like "{{product.name}}"
      width?: string;
      alignment?: "left" | "center" | "right";
      format?: "currency" | "date" | "number" | "text" | "percentage";
    }>;
    dataSource: string; // Variable reference to array like "{{invoice.lineItems}}"
    showHeader?: boolean;
    zebra?: boolean; // Alternating row colors
    showTotal?: boolean;
    totalLabel?: string;
    totalField?: string;
  };
}

/**
 * QR Code Section
 */
export interface QRCodeSection extends BaseSection {
  type: "qr-code";
  content: {
    data: string; // Variable reference like "{{ticket.qrData}}" or static data
    size?: number; // Size in pixels
    errorCorrection?: "L" | "M" | "Q" | "H";
    label?: string; // Text below QR code
    alignment?: "left" | "center" | "right";
    backgroundColor?: string;
    foregroundColor?: string;
  };
}

/**
 * Button Section
 */
export interface ButtonSection extends BaseSection {
  type: "button";
  content: {
    text: string; // Variable reference or static text
    url: string; // Variable reference like "{{ticket.viewUrl}}" or static URL
    alignment?: "left" | "center" | "right";
    style?: "primary" | "secondary" | "outline";
    size?: "small" | "medium" | "large";
    fullWidth?: boolean;
  };
}

/**
 * Ticket Details Section
 * Pre-configured section for displaying ticket information
 */
export interface TicketDetailsSection extends BaseSection {
  type: "ticket-details";
  content: {
    showTicketNumber?: boolean;
    showEventName?: boolean;
    showEventDate?: boolean;
    showEventLocation?: boolean;
    showGuestCount?: boolean;
    showPrice?: boolean;
    layout?: "stacked" | "grid" | "table";
  };
}

/**
 * Event Details Section
 * Pre-configured section for displaying event information
 */
export interface EventDetailsSection extends BaseSection {
  type: "event-details";
  content: {
    showName?: boolean;
    showDate?: boolean;
    showTime?: boolean;
    showLocation?: boolean;
    showDescription?: boolean;
    showMap?: boolean;
    layout?: "stacked" | "card";
  };
}

/**
 * Spacer Section
 * Just adds vertical space
 */
export interface SpacerSection extends BaseSection {
  type: "spacer";
  content: {
    height: string;
  };
}

/**
 * Divider Section
 */
export interface DividerSection extends BaseSection {
  type: "divider";
  content: {
    style?: "solid" | "dashed" | "dotted";
    color?: string;
    width?: string;
    thickness?: string;
  };
}

/**
 * Union type for all section types
 */
export type TemplateSection =
  | HeaderSection
  | FooterSection
  | HeroImageSection
  | TextBlockSection
  | DataTableSection
  | QRCodeSection
  | ButtonSection
  | TicketDetailsSection
  | EventDetailsSection
  | SpacerSection
  | DividerSection;

/**
 * Template Styling
 */
export interface TemplateStyle {
  colors: {
    primary: string;
    secondary: string;
    accent?: string;
    background: string;
    text: string;
    textLight?: string;
    textDark?: string;
    border?: string;
    error?: string;
    success?: string;
  };
  fonts: {
    heading: string;
    body: string;
    mono?: string;
  };
  spacing: {
    unit: string; // e.g., "8px"
    containerPadding?: string;
    sectionGap?: string;
  };
  borderRadius?: string;
  maxWidth?: string;
}

/**
 * Email Template Schema
 */
export interface EmailTemplateSchema extends BaseTemplateSchema {
  type: "email";
  subject: string; // Can contain variables like "Your ticket for {{event.name}}"
  preheader?: string; // Email preview text
  layout: {
    sections: TemplateSection[];
  };
  variables: TemplateVariable[];
  styling: TemplateStyle;
  tracking?: {
    openTracking?: boolean;
    clickTracking?: boolean;
  };
}

/**
 * PDF Template Schema
 */
export interface PdfTemplateSchema extends BaseTemplateSchema {
  type: "pdf";
  pageSize: "letter" | "a4" | "legal" | "custom";
  orientation: "portrait" | "landscape";
  margins?: {
    top: string;
    right: string;
    bottom: string;
    left: string;
  };
  layout: {
    sections: TemplateSection[];
  };
  variables: TemplateVariable[];
  styling: TemplateStyle;
  watermark?: {
    text?: string;
    image?: string;
    opacity?: number;
  };
}

/**
 * Union type for all template schemas
 */
export type TemplateSchema = EmailTemplateSchema | PdfTemplateSchema;

/**
 * Template Preview Data
 * Sample data structure for previewing templates
 */
export interface TemplatePreviewData {
  [key: string]: unknown;
}

/**
 * Template Validation Result
 */
export interface TemplateValidationResult {
  isValid: boolean;
  errors: string[];
  warnings?: string[];
}

/**
 * Template Renderer Options
 */
export interface TemplateRenderOptions {
  data: TemplatePreviewData;
  mode?: "preview" | "production";
  scale?: number; // For thumbnails
  interactive?: boolean;
}
