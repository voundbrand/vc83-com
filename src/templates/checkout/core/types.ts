/**
 * CHECKOUT CORE TYPES
 *
 * Shared type definitions for all checkout templates.
 * These types provide a common interface for checkout functionality
 * across different template variants (ticket, product, service).
 */

import { Id } from "../../../../convex/_generated/dataModel";

/**
 * Base checkout item that all checkout templates work with.
 * Maps to products in the ontology system with different subtypes.
 */
export interface CheckoutItem {
  id: Id<"objects">;
  name: string;
  description?: string;
  price: number;
  originalPrice?: number;
  currency: string;
  imageUrl?: string;
  features?: string[];
  stripePriceId?: string;
  metadata?: Record<string, unknown>;
  customProperties?: Record<string, unknown>;

  // Tax configuration
  taxCode?: string; // Stripe tax code (e.g., "txcd_10000000")
  taxBehavior?: "inclusive" | "exclusive" | "automatic";
  taxable?: boolean;
}

/**
 * Configuration for checkout display and behavior.
 */
export interface CheckoutConfig {
  // Display options
  showImages: boolean;
  showDescriptions: boolean;
  showFeatures: boolean;
  allowQuantity: boolean;
  maxQuantity?: number;
  minQuantity?: number;

  // Payment options
  acceptedPaymentMethods?: string[];
  requireBillingAddress?: boolean;
  requireShippingAddress?: boolean;
  allowPromoCodes?: boolean;

  // Layout options
  layout?: "sidebar" | "single-column" | "two-column";
  mobileLayout?: "stacked" | "tabbed";
}

/**
 * Callbacks for checkout events.
 */
export interface CheckoutCallbacks {
  onCheckoutStart?: (items: CheckoutItem[], quantity: number) => Promise<void>;
  onCheckoutComplete?: (session: CheckoutSession) => Promise<void>;
  onCheckoutError?: (error: Error) => void;
  onQuantityChange?: (quantity: number) => void;
  onItemSelect?: (item: CheckoutItem) => void;
}

/**
 * Checkout session data.
 */
export interface CheckoutSession {
  id: string;
  url?: string;
  status: "pending" | "processing" | "complete" | "failed";
  items: CheckoutItem[];
  quantity: number;
  total: number;
  currency: string;
  customerId?: string;
  metadata?: Record<string, unknown>;
}

/**
 * Payment result from provider.
 */
export interface PaymentResult {
  success: boolean;
  transactionId?: string;
  error?: string;
  receipt?: unknown;
}

/**
 * Price calculation result.
 */
export interface PriceCalculation {
  subtotal: number;
  discount: number;
  tax: number;
  shipping: number;
  total: number;
  currency: string;
  formattedTotal: string;
}

/**
 * Checkout error types.
 */
export enum CheckoutErrorType {
  PAYMENT_FAILED = "payment_failed",
  INVALID_PRODUCT = "invalid_product",
  OUT_OF_STOCK = "out_of_stock",
  NETWORK_ERROR = "network_error",
  CONFIGURATION_ERROR = "configuration_error",
}

/**
 * Checkout error with details.
 */
export interface CheckoutError {
  type: CheckoutErrorType;
  message: string;
  details?: unknown;
  retryable: boolean;
}