/**
 * PAYMENT PROVIDER TYPES
 *
 * Type definitions for payment provider abstraction layer.
 * Allows multiple payment providers (Stripe, PayPal, etc.) with a unified interface.
 */

import { Id } from "../../../convex/_generated/dataModel";
import { CheckoutItem, CheckoutSession, PaymentResult } from "../../templates/checkout/core/types";

/**
 * Configuration for a payment provider.
 */
export interface PaymentProviderConfig {
  providerId: Id<"objects">; // Links to paymentProviders in ontology
  providerCode: string; // e.g., "stripe", "paypal"
  isEnabled: boolean;
  isDefault: boolean;
  credentials: Record<string, string>; // API keys, secrets, etc.
  settings: Record<string, unknown>; // Provider-specific settings
}

/**
 * Tax settings for checkout.
 */
export interface TaxSettings {
  taxEnabled: boolean;
  defaultTaxBehavior?: "inclusive" | "exclusive" | "automatic";
  defaultTaxCode?: string;
  originAddress?: {
    addressLine1: string;
    addressLine2?: string;
    city: string;
    state?: string;
    postalCode: string;
    country: string;
  };
  stripeSettings?: {
    taxCalculationEnabled?: boolean;
    taxCodeValidation?: boolean;
  };
}

/**
 * Customer address for tax calculation.
 */
export interface CustomerAddress {
  addressLine1: string;
  addressLine2?: string;
  city: string;
  state?: string;
  postalCode: string;
  country: string;
}

/**
 * Checkout session creation options.
 */
export interface CreateSessionOptions {
  items: CheckoutItem[];
  quantity: number;
  organizationId: Id<"organizations">;
  customerId?: string;
  metadata?: Record<string, unknown>;

  // URLs
  successUrl?: string;
  cancelUrl?: string;

  // Payment options
  allowPromoCodes?: boolean;
  requireBillingAddress?: boolean;
  requireShippingAddress?: boolean;

  // Customization
  locale?: string;
  currency?: string;

  // Tax configuration
  taxSettings?: TaxSettings;
  customerAddress?: CustomerAddress;
}

/**
 * Session validation result.
 */
export interface SessionValidationResult {
  valid: boolean;
  session?: CheckoutSession;
  error?: string;
}

/**
 * Payment provider interface.
 * All payment providers must implement this interface.
 */
export interface IPaymentProvider {
  /**
   * Provider identification
   */
  readonly providerCode: string;
  readonly providerName: string;

  /**
   * Initialize provider with configuration.
   */
  initialize(config: PaymentProviderConfig): Promise<void>;

  /**
   * Create a checkout session.
   */
  createSession(options: CreateSessionOptions): Promise<CheckoutSession>;

  /**
   * Redirect to checkout (for redirect-based providers).
   */
  redirectToCheckout(session: CheckoutSession): Promise<void>;

  /**
   * Validate a payment session.
   */
  validateSession(sessionId: string): Promise<SessionValidationResult>;

  /**
   * Get payment result for a completed session.
   */
  getPaymentResult(sessionId: string): Promise<PaymentResult>;

  /**
   * Cancel/expire a session.
   */
  cancelSession(sessionId: string): Promise<void>;

  /**
   * Check if provider is properly configured.
   */
  isConfigured(): boolean;

  /**
   * Get provider-specific metadata.
   */
  getMetadata(): ProviderMetadata;
}

/**
 * Provider metadata for display and capabilities.
 */
export interface ProviderMetadata {
  displayName: string;
  description: string;
  logoUrl?: string;
  websiteUrl?: string;
  capabilities: ProviderCapabilities;
  supportedCurrencies: string[];
  supportedCountries?: string[];
}

/**
 * Provider capabilities flags.
 */
export interface ProviderCapabilities {
  supportsSubscriptions: boolean;
  supportsRefunds: boolean;
  supportsPartialRefunds: boolean;
  supportsPromoCodes: boolean;
  supportsMultipleCurrencies: boolean;
  supportsPaymentMethods: string[]; // ["card", "bank_transfer", "paypal", etc.]
  requiresRedirect: boolean;
  supportsEmbeddedCheckout: boolean;
}

/**
 * Provider error types.
 */
export enum ProviderErrorType {
  CONFIGURATION_ERROR = "configuration_error",
  NETWORK_ERROR = "network_error",
  INVALID_REQUEST = "invalid_request",
  PAYMENT_DECLINED = "payment_declined",
  SESSION_EXPIRED = "session_expired",
  PROVIDER_ERROR = "provider_error",
}

/**
 * Provider-specific error.
 */
export class ProviderError extends Error {
  constructor(
    public type: ProviderErrorType,
    message: string,
    public details?: unknown
  ) {
    super(message);
    this.name = "ProviderError";
  }
}
