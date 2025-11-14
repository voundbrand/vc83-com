/**
 * CHECKOUT TEMPLATE TYPES
 *
 * Type definitions for checkout templates and schemas.
 */

import type { Id } from "../../../convex/_generated/dataModel";
import type { Theme } from "../types";

/**
 * Checkout Template Schema - defines configuration structure
 *
 * NOTE: This schema defines the UI FORM FIELDS for the checkout editor.
 * Template capabilities (supportsFormIntegration, etc.) are stored in the
 * DATABASE template records, not here. The database is the source of truth.
 */
export interface CheckoutTemplateSchema {
  code: string;
  name: string;
  version: string;
  description: string;
  fields: CheckoutSchemaField[]; // UI form fields for configuration
  defaultConfig: Record<string, unknown>; // Default values for form fields
}

/**
 * Schema Field Definition
 */
export interface CheckoutSchemaField {
  key: string;
  label: string;
  type: "text" | "textarea" | "number" | "checkbox" | "select" | "color" | "group";
  required?: boolean;
  placeholder?: string;
  helpText?: string;
  defaultValue?: unknown;
  min?: number;
  max?: number;
  options?: Array<{ value: string; label: string; disabled?: boolean }>;
  fields?: CheckoutSchemaField[]; // For nested groups
}

/**
 * Checkout Template Props - what gets passed to template components
 */
export interface CheckoutTemplateProps {
  organizationId: Id<"organizations">;
  checkoutInstanceId?: Id<"objects">; // Checkout instance ID for linking checkout session
  configuration: Record<string, unknown>;
  linkedProducts: CheckoutProduct[];
  theme: Theme;
  onCheckout?: (product: CheckoutProduct, quantity: number) => Promise<void>;
}

/**
 * Product data for checkout
 */
export interface CheckoutProduct {
  _id: string;
  name: string;
  description: string;
  price: number; // in cents
  currency: string;
  subtype?: string; // "ticket" | "physical" | "digital" - product fulfillment type
  // 🎯 Event data loaded directly from objectLinks (by getPublicCheckoutProducts)
  eventName?: string; // Event name
  eventDescription?: string; // Event description
  eventLocation?: string; // Event location (e.g., "123 Main St, City, State")
  eventStartDate?: number; // Event start timestamp
  eventEndDate?: number; // Event end timestamp
  eventAgenda?: Array<{ // Event agenda/schedule
    time: string;
    title: string;
    description?: string;
  }>;
  eventSponsors?: Array<{ // Event sponsors
    name: string;
    level?: string; // platinum, gold, silver, bronze, community - optional
  }>;
  customProperties?: {
    // Backend stores price and currency in customProperties
    price?: number; // Price in cents
    currency?: string; // USD, EUR, etc.
    // Event data loaded from objectLinks
    eventId?: string; // Event ID if linked
    eventName?: string; // Event name if linked
    slug?: string;
    stripePriceId?: string;
    ticketTier?: string;
    earlyBirdEndDate?: string;
    earlyBirdPrice?: number;
    originalPrice?: number;
    // Form integration
    formId?: string;
    formTiming?: "duringCheckout" | "afterPurchase";
    formRequired?: boolean;
    // Quantity limits
    minQuantity?: number;
    maxQuantity?: number;
    // Tax settings
    taxable?: boolean;
    taxCode?: string;
    taxBehavior?: "exclusive" | "inclusive" | "automatic";
    // Additional event metadata (from event object customProperties)
    eventDate?: number;
    location?: string;
  };
}

/**
 * Checkout Instance - database object
 */
export interface CheckoutInstance {
  _id: Id<"objects">;
  organizationId: Id<"organizations">;
  type: "checkout_instance";
  subtype: string; // template code
  name: string;
  description?: string;
  status: "draft" | "published" | "unpublished";
  customProperties: {
    templateCode: string;
    configuration: Record<string, unknown>;
    linkedProducts: Id<"objects">[]; // Product IDs
    publicSlug: string;
    publicUrl: string;
  };
  createdBy: Id<"users">;
  createdAt: number;
  updatedAt: number;
}
