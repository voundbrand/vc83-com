 
/**
 * PAYMENT PROVIDER ABSTRACTION LAYER
 *
 * This module defines the interface that ALL payment providers must implement.
 * Whether it's Stripe Connect, PayPal, Square, or Manual payments - they all
 * implement this same interface.
 *
 * Design Philosophy:
 * - Provider-agnostic: Works with any payment backend
 * - Future-proof: Easy to add new providers
 * - Consistent API: Same methods regardless of provider
 * - Type-safe: Full TypeScript support
 *
 * @module paymentProviders/types
 */

import { Id } from "../_generated/dataModel";

// =========================================
// CORE PROVIDER INTERFACE
// =========================================

/**
 * Payment Provider Interface
 *
 * Every payment provider (Stripe Connect, PayPal, Square, Manual, etc.)
 * must implement this interface.
 *
 * @example
 * ```typescript
 * class StripeConnectProvider implements IPaymentProvider {
 *   providerCode = "stripe-connect";
 *   providerName = "Stripe Connect";
 *   providerIcon = "💳";
 *
 *   async startAccountConnection(params) { ... }
 *   async createCheckoutSession(params) { ... }
 *   async handleWebhook(event) { ... }
 * }
 * ```
 */
export interface IPaymentProvider {
  // =========================================
  // IDENTITY
  // =========================================

  /**
   * Unique provider code (e.g., "stripe-connect", "paypal", "square")
   */
  readonly providerCode: string;

  /**
   * Human-readable provider name (e.g., "Stripe Connect", "PayPal")
   */
  readonly providerName: string;

  /**
   * Emoji icon for UI display
   */
  readonly providerIcon: string;

  // =========================================
  // ACCOUNT CONNECTION LAYER
  // =========================================

  /**
   * Start account connection/onboarding process
   *
   * For Stripe: OAuth flow (supports existing accounts)
   * For PayPal: OAuth flow
   * For Manual: Just saves bank details
   *
   * @param params - Connection parameters
   * @returns Connection result with onboarding/OAuth URL (if needed)
   */
  startAccountConnection(params: ConnectionParams): Promise<ConnectionResult>;

  /**
   * Complete OAuth connection (optional - for OAuth-based providers)
   *
   * Exchanges OAuth authorization code for account details.
   * Only needed for providers that use OAuth (Stripe, PayPal).
   *
   * @param authorizationCode - OAuth authorization code from callback
   * @returns Account ID and connection details
   */
  completeOAuthConnection?(authorizationCode: string): Promise<{
    accountId: string;
    livemode: boolean;
  }>;

  /**
   * Get current account status
   *
   * @param accountId - Provider-specific account ID
   * @returns Current account status
   */
  getAccountStatus(accountId: string): Promise<AccountStatus>;

  /**
   * Refresh account status from provider
   *
   * Some providers cache status, this forces a fresh fetch.
   *
   * @param accountId - Provider-specific account ID
   * @returns Updated account status
   */
  refreshAccountStatus(accountId: string): Promise<AccountStatus>;

  /**
   * Disconnect account from platform
   *
   * @param accountId - Provider-specific account ID
   */
  disconnectAccount(accountId: string): Promise<void>;

  // =========================================
  // CHECKOUT LAYER
  // =========================================

  /**
   * Create a checkout session for immediate payment
   *
   * For Stripe: Creates PaymentIntent + returns client_secret
   * For PayPal: Creates Order + returns approval URL
   * For Square: Creates Payment + returns payment form URL
   *
   * @param params - Checkout session parameters
   * @returns Session result with payment credentials
   */
  createCheckoutSession(
    params: CheckoutSessionParams
  ): Promise<CheckoutSessionResult>;

  /**
   * Verify that a payment was completed successfully
   *
   * @param sessionId - Provider-specific session ID
   * @param connectedAccountId - Optional connected account ID (for Stripe Connect)
   * @returns Payment verification result
   */
  verifyCheckoutPayment(
    sessionId: string,
    connectedAccountId?: string
  ): Promise<PaymentVerificationResult>;

  // =========================================
  // INVOICING LAYER (Future Phase)
  // =========================================

  /**
   * Create an invoice for B2B payment
   *
   * For Stripe: Creates Invoice with hosted page
   * For PayPal: Creates Invoice with payment link
   * For Manual: Generates PDF invoice for email
   *
   * @param params - Invoice parameters
   * @returns Invoice result with payment URL
   */
  createInvoice(params: InvoiceParams): Promise<InvoiceResult>;

  /**
   * Send invoice to customer (email + notification)
   *
   * @param invoiceId - Provider-specific invoice ID
   * @returns Send result
   */
  sendInvoice(invoiceId: string): Promise<InvoiceSendResult>;

  /**
   * Mark invoice as paid (for manual payments)
   *
   * @param invoiceId - Provider-specific invoice ID
   */
  markInvoiceAsPaid(invoiceId: string): Promise<void>;

  // =========================================
  // WEBHOOK HANDLING
  // =========================================

  /**
   * Handle incoming webhook event from provider
   *
   * @param event - Webhook event data
   * @returns Handling result
   */
  handleWebhook(event: ProviderWebhookEvent): Promise<WebhookHandlingResult>;

  /**
   * Verify webhook signature for security
   *
   * @param payload - Raw webhook payload
   * @param signature - Webhook signature header
   * @returns True if signature is valid
   */
  verifyWebhookSignature(payload: string, signature: string): Promise<boolean>;
}

// =========================================
// CONNECTION TYPES
// =========================================

/**
 * Parameters for starting account connection
 */
export interface ConnectionParams {
  /** Organization connecting the account */
  organizationId: Id<"organizations">;

  /** Organization name for provider account */
  organizationName: string;

  /** Organization email for provider account */
  organizationEmail: string;

  /** URL to return to after successful onboarding */
  returnUrl: string;

  /** URL to return to if onboarding needs refresh */
  refreshUrl: string;

  /** Additional provider-specific parameters */
  metadata?: Record<string, unknown>;
}

/**
 * Result of starting account connection
 */
export interface ConnectionResult {
  /** Provider-specific account ID (e.g., Stripe account ID) */
  accountId: string;

  /** URL for completing onboarding (if required) */
  onboardingUrl?: string;

  /** Current account status */
  status: "pending" | "active" | "restricted" | "disabled";

  /** Whether onboarding is still required */
  requiresOnboarding: boolean;

  /** Additional provider-specific data */
  metadata?: Record<string, unknown>;
}

/**
 * Account status information
 */
export interface AccountStatus {
  /** Provider-specific account ID */
  accountId: string;

  /** Current status */
  status: "pending" | "active" | "restricted" | "disabled";

  /** Can process charges */
  chargesEnabled: boolean;

  /** Can receive payouts */
  payoutsEnabled: boolean;

  /** Onboarding completed */
  onboardingCompleted: boolean;

  /** Reason for disabled status (if applicable) */
  disabledReason?: string;

  /** Additional provider-specific metadata */
  metadata?: Record<string, unknown>;
}

// =========================================
// ADDRESS TYPES
// =========================================

/**
 * Standardized billing/shipping address format
 * Compatible with Stripe, PayPal, Square, and other payment providers
 */
export interface BillingAddress {
  /** Street address, P.O. box, company name, etc. */
  line1: string;

  /** Apartment, suite, unit, building, floor, etc. (optional) */
  line2?: string;

  /** City, district, suburb, town, or village */
  city: string;

  /** State, county, province, or region (optional) */
  state?: string;

  /** ZIP or postal code */
  postalCode: string;

  /** Two-letter country code (ISO 3166-1 alpha-2) */
  country: string;
}

// =========================================
// CHECKOUT TYPES
// =========================================

/**
 * Parameters for creating a checkout session
 */
export interface CheckoutSessionParams {
  /** Organization processing the payment */
  organizationId: Id<"organizations">;

  /** Product being purchased */
  productId: Id<"objects">;

  /** Product name for display */
  productName: string;

  /** Price in smallest currency unit (cents for USD) */
  priceInCents: number;

  /** Currency code (ISO 4217) */
  currency: string;

  /** Quantity being purchased */
  quantity: number;

  /** Customer email (optional) */
  customerEmail?: string;

  /** Customer name (optional) */
  customerName?: string;

  /** Customer phone (optional) */
  customerPhone?: string;

  /** Billing address for payment processing */
  billingAddress?: BillingAddress;

  /** Shipping address (if different from billing) */
  shippingAddress?: BillingAddress;

  /** URL to redirect on successful payment */
  successUrl: string;

  /** URL to redirect on cancelled payment */
  cancelUrl: string;

  /** Provider-specific account ID (for connected accounts) */
  connectedAccountId?: string;

  /** Additional metadata to store with payment */
  metadata?: Record<string, unknown>;
}

/**
 * Result of creating a checkout session
 */
export interface CheckoutSessionResult {
  /** Our internal session ID */
  sessionId: string;

  /** Provider-specific session ID */
  providerSessionId: string;

  /**
   * Client secret for frontend payment (Stripe Elements, etc.)
   * Only provided for embedded payment flows
   */
  clientSecret?: string;

  /**
   * Checkout URL for redirect flows (PayPal, etc.)
   * Only provided for redirect payment flows
   */
  checkoutUrl?: string;

  /** When this session expires */
  expiresAt: number;

  /** Additional provider-specific data */
  metadata?: Record<string, unknown>;
}

/**
 * Result of verifying a payment
 */
export interface PaymentVerificationResult {
  /** Whether payment succeeded */
  success: boolean;

  /** Provider-specific payment ID */
  paymentId: string;

  /** Amount paid (in smallest currency unit) */
  amount: number;

  /** Currency code */
  currency: string;

  /** Customer email (if provided) */
  customerEmail?: string;

  /** Customer name (if provided) */
  customerName?: string;

  /** Payment method details */
  paymentMethod?: {
    type: string;
    last4?: string;
    brand?: string;
  };

  /** Additional metadata from payment */
  metadata?: Record<string, unknown>;
}

// =========================================
// INVOICING TYPES (Future Phase)
// =========================================

/**
 * Parameters for creating an invoice
 */
export interface InvoiceParams {
  /** Organization creating the invoice */
  organizationId: Id<"organizations">;

  /** Contact being billed (optional) */
  billedToContactId?: Id<"objects">;

  /** Billing email */
  billedToEmail: string;

  /** Billing name */
  billedToName: string;

  /** Line items on invoice */
  items: InvoiceItem[];

  /** Due date (timestamp) */
  dueDate?: number;

  /** Payment terms (e.g., "Net 30") */
  paymentTerms?: string;

  /** Invoice notes */
  notes?: string;

  /** Provider-specific account ID */
  connectedAccountId?: string;

  /** Additional metadata */
  metadata?: Record<string, unknown>;
}

/**
 * Invoice line item
 */
export interface InvoiceItem {
  /** Item description */
  description: string;

  /** Quantity */
  quantity: number;

  /** Unit price (in smallest currency unit) */
  unitPrice: number;

  /** Linked product ID (optional) */
  productId?: Id<"objects">;
}

/**
 * Result of creating an invoice
 */
export interface InvoiceResult {
  /** Our internal invoice ID */
  invoiceId: string;

  /** Provider-specific invoice ID */
  providerInvoiceId: string;

  /** Hosted invoice URL for customer */
  hostedInvoiceUrl: string;

  /** PDF download URL (if available) */
  invoicePdf?: string;

  /** Current status */
  status: "draft" | "open" | "paid" | "void" | "uncollectible";

  /** Total amount due (in smallest currency unit) */
  amountDue: number;

  /** Currency code */
  currency: string;

  /** Additional provider-specific data */
  metadata?: Record<string, unknown>;
}

/**
 * Result of sending an invoice
 */
export interface InvoiceSendResult {
  /** Whether send succeeded */
  success: boolean;

  /** When invoice was sent (timestamp) */
  sentAt: number;

  /** Email address sent to */
  sentTo: string;

  /** Error message (if failed) */
  error?: string;
}

// =========================================
// WEBHOOK TYPES
// =========================================

/**
 * Generic webhook event structure
 */
export interface ProviderWebhookEvent {
  /** Provider that sent the webhook */
  provider: string;

  /** Event type (e.g., "payment_intent.succeeded") */
  eventType: string;

  /** Unique event ID from provider */
  eventId: string;

  /** Event data (provider-specific) */
  data: unknown;

  /** Webhook signature header */
  signature: string;

  /** Raw webhook payload */
  rawPayload: string;

  /** When event was created (timestamp) */
  createdAt?: number;
}

/**
 * Result of handling a webhook
 */
export interface WebhookHandlingResult {
  /** Whether webhook was handled successfully */
  success: boolean;

  /** Action taken by handler */
  actionTaken?:
    | "payment_succeeded"
    | "payment_failed"
    | "payment_cancelled"
    | "checkout_completed"
    | "account_updated"
    | "account_disabled"
    | "refund_processed"
    | "invoice_created"
    | "invoice_finalized"
    | "invoice_paid"
    | "invoice_failed"
    | "invoice_action_required"
    | "invoice_uncollectible"
    | "other";

  /** ID of affected object (if any) */
  objectId?: Id<"objects">;

  /** Human-readable message */
  message?: string;

  /** Error details (if failed) */
  error?: string;

  /** Additional metadata from webhook processing */
  metadata?: Record<string, unknown>;
}

// =========================================
// PROVIDER CAPABILITIES
// =========================================

/**
 * Provider capabilities flags
 *
 * Indicates which features a provider supports.
 */
export interface ProviderCapabilities {
  /** Supports immediate checkout */
  supportsCheckout: boolean;

  /** Supports B2B invoicing */
  supportsInvoicing: boolean;

  /** Supports recurring/subscription payments */
  supportsRecurring: boolean;

  /** Supports refunds */
  supportsRefunds: boolean;

  /** Supports partial refunds */
  supportsPartialRefunds: boolean;

  /** Supports multiple currencies */
  supportsMultiCurrency: boolean;

  /** Supported currency codes */
  supportedCurrencies?: string[];

  /** Requires account connection (vs. manual entry) */
  requiresConnection: boolean;

  /** Supports webhooks for async updates */
  supportsWebhooks: boolean;
}

// =========================================
// PROVIDER METADATA
// =========================================

/**
 * Provider metadata for display/selection
 */
export interface ProviderMetadata {
  /** Provider code */
  code: string;

  /** Display name */
  name: string;

  /** Icon for UI */
  icon: string;

  /** Short description */
  description: string;

  /** Capabilities */
  capabilities: ProviderCapabilities;

  /** Is provider enabled globally */
  isEnabled: boolean;

  /** Setup difficulty (1-5, 1 = easiest) */
  setupDifficulty?: number;

  /** Documentation URL */
  docsUrl?: string;
}

// =========================================
// ORGANIZATION PROVIDER CONFIG
// =========================================

/**
 * Organization's payment provider configuration
 *
 * Stored in organization.paymentProviders array
 */
export interface OrganizationProviderConfig {
  /** Provider code */
  providerCode: string;

  /** Provider-specific account ID */
  accountId: string;

  /** Current status */
  status: "pending" | "active" | "restricted" | "disabled";

  /** Is this the default provider for this org */
  isDefault: boolean;

  /** Is this provider in test mode (can be toggled even in production) */
  isTestMode: boolean;

  /** When account was connected (timestamp) */
  connectedAt: number;

  /** Last status check (timestamp) */
  lastStatusCheck?: number;

  /** Provider-specific metadata */
  metadata?: Record<string, unknown>;
}

// =========================================
// ERROR TYPES
// =========================================

/**
 * Payment provider error
 */
export class PaymentProviderError extends Error {
  constructor(
    message: string,
    public providerCode: string,
    public errorCode?: string,
    public metadata?: Record<string, unknown>
  ) {
    super(message);
    this.name = "PaymentProviderError";
  }
}

/**
 * Account connection error
 */
export class AccountConnectionError extends PaymentProviderError {
  constructor(
    message: string,
    providerCode: string,
    errorCode?: string,
    metadata?: Record<string, unknown>
  ) {
    super(message, providerCode, errorCode, metadata);
    this.name = "AccountConnectionError";
  }
}

/**
 * Payment processing error
 */
export class PaymentProcessingError extends PaymentProviderError {
  constructor(
    message: string,
    providerCode: string,
    errorCode?: string,
    metadata?: Record<string, unknown>
  ) {
    super(message, providerCode, errorCode, metadata);
    this.name = "PaymentProcessingError";
  }
}

/**
 * Webhook verification error
 */
export class WebhookVerificationError extends PaymentProviderError {
  constructor(
    message: string,
    providerCode: string,
    errorCode?: string,
    metadata?: Record<string, unknown>
  ) {
    super(message, providerCode, errorCode, metadata);
    this.name = "WebhookVerificationError";
  }
}

// =========================================
// PAYMENT PROVIDER TYPE LITERAL
// =========================================

/**
 * Supported payment provider types
 */
export type PaymentProviderType = "stripe" | "stripe-connect" | "manual" | "invoice";
