/**
 * STRIPE CONNECT PAYMENT PROVIDER
 *
 * This wraps all Stripe Connect functionality into the unified
 * IPaymentProvider interface. This class serves as an adapter between
 * our generic payment interface and Stripe's specific API.
 *
 * Key Features:
 * - Stripe Connect account onboarding
 * - PaymentIntent-based checkout
 * - Webhook event handling
 * - Account status management
 *
 * @module paymentProviders/stripe
 */

import Stripe from "stripe";
import {
  IPaymentProvider,
  ConnectionParams,
  ConnectionResult,
  AccountStatus,
  CheckoutSessionParams,
  CheckoutSessionResult,
  PaymentVerificationResult,
  InvoiceParams,
  InvoiceResult,
  InvoiceSendResult,
  ProviderWebhookEvent,
  WebhookHandlingResult,
  AccountConnectionError,
  PaymentProcessingError,
  WebhookVerificationError,
} from "./types";

// =========================================
// STRIPE CONNECT PROVIDER CLASS
// =========================================

/**
 * Stripe Connect Payment Provider
 *
 * Implements the IPaymentProvider interface using Stripe Connect.
 * This allows organizations to connect their Stripe account and
 * accept payments directly (Standard Connect accounts).
 *
 * @example
 * ```typescript
 * const provider = new StripeConnectProvider(ctx);
 *
 * // Start account connection
 * const result = await provider.startAccountConnection({
 *   organizationId,
 *   organizationName: "Acme Corp",
 *   organizationEmail: "billing@acme.com",
 *   returnUrl: "https://app.l4yercak3.com/payments/return",
 *   refreshUrl: "https://app.l4yercak3.com/payments/refresh",
 * });
 *
 * // Create checkout session
 * const session = await provider.createCheckoutSession({
 *   organizationId,
 *   productId,
 *   productName: "Premium Plan",
 *   priceInCents: 9900,
 *   currency: "usd",
 *   quantity: 1,
 *   connectedAccountId: result.accountId,
 *   successUrl: "https://app.l4yercak3.com/checkout/success",
 *   cancelUrl: "https://app.l4yercak3.com/checkout/cancel",
 * });
 * ```
 */
export class StripeConnectProvider implements IPaymentProvider {
  // Provider identity
  readonly providerCode = "stripe-connect";
  readonly providerName = "Stripe Connect";
  readonly providerIcon = "💳";

  private stripe: Stripe;
  private webhookSecret: string;

  /**
   * Initialize Stripe provider
   *
   * @param secretKey - Stripe secret API key
   * @param webhookSecret - Stripe webhook signing secret
   */
  constructor(secretKey: string, webhookSecret: string) {
    if (!secretKey) {
      throw new Error("STRIPE_SECRET_KEY is required");
    }
    if (!webhookSecret) {
      throw new Error("STRIPE_WEBHOOK_SECRET is required");
    }

    this.stripe = new Stripe(secretKey, {
      apiVersion: "2025-09-30.clover",
    });
    this.webhookSecret = webhookSecret;
  }

  // =========================================
  // ACCOUNT CONNECTION METHODS
  // =========================================

  /**
   * Start Stripe Connect account connection using OAuth
   *
   * Uses OAuth flow which supports BOTH:
   * - Connecting existing Stripe accounts (user signs in)
   * - Creating new Stripe accounts (user creates one during OAuth)
   *
   * @param params - Connection parameters
   * @returns Connection result with OAuth URL
   */
  async startAccountConnection(
    params: ConnectionParams
  ): Promise<ConnectionResult> {
    try {
      // Get Stripe Client ID from environment
      const clientId = process.env.STRIPE_CLIENT_ID;
      if (!clientId) {
        throw new Error("STRIPE_CLIENT_ID is not configured");
      }

      // Build OAuth authorization URL
      const oauthParams = new URLSearchParams({
        response_type: "code",
        client_id: clientId,
        scope: "read_write",
        redirect_uri: params.returnUrl,
        state: params.organizationId, // Use org ID as state for CSRF protection
      });

      // Add user email if provided (helps pre-fill form)
      if (params.organizationEmail && params.organizationEmail.includes('@')) {
        oauthParams.append("stripe_user[email]", params.organizationEmail);
      }

      // Add business name if provided
      if (params.organizationName) {
        oauthParams.append("stripe_user[business_name]", params.organizationName);
      }

      const oauthUrl = `https://connect.stripe.com/oauth/authorize?${oauthParams.toString()}`;

      return {
        accountId: "", // Will be set after OAuth callback
        onboardingUrl: oauthUrl,
        status: "pending",
        requiresOnboarding: true,
        metadata: {
          method: "oauth",
          organizationId: params.organizationId,
        },
      };
    } catch (error) {
      throw new AccountConnectionError(
        `Failed to start Stripe OAuth connection: ${error instanceof Error ? error.message : "Unknown error"}`,
        this.providerCode,
        error instanceof Stripe.errors.StripeError ? error.code : undefined,
        { originalError: error }
      );
    }
  }

  /**
   * Complete OAuth connection by exchanging authorization code for account ID
   *
   * @param authorizationCode - Code from OAuth callback
   * @returns Account ID and connection details
   */
  async completeOAuthConnection(authorizationCode: string): Promise<{
    accountId: string;
    livemode: boolean;
  }> {
    try {
      // Exchange authorization code for access token
      const response = await this.stripe.oauth.token({
        grant_type: "authorization_code",
        code: authorizationCode,
      });

      if (!response.stripe_user_id) {
        throw new Error("No account ID returned from Stripe OAuth");
      }

      return {
        accountId: response.stripe_user_id,
        livemode: response.livemode ?? false,
      };
    } catch (error) {
      throw new AccountConnectionError(
        `Failed to complete OAuth connection: ${error instanceof Error ? error.message : "Unknown error"}`,
        this.providerCode,
        error instanceof Stripe.errors.StripeError ? error.code : undefined,
        { originalError: error }
      );
    }
  }

  /**
   * Get account status from Stripe
   *
   * @param accountId - Stripe account ID (acct_xxx)
   * @returns Current account status
   */
  async getAccountStatus(accountId: string): Promise<AccountStatus> {
    try {
      const account = await this.stripe.accounts.retrieve(accountId);

      return this.mapStripeAccountToStatus(account);
    } catch (error) {
      throw new AccountConnectionError(
        `Failed to fetch Stripe account status: ${error instanceof Error ? error.message : "Unknown error"}`,
        this.providerCode,
        error instanceof Stripe.errors.StripeError ? error.code : undefined,
        { accountId, originalError: error }
      );
    }
  }

  /**
   * Refresh account status (same as getAccountStatus for Stripe)
   *
   * @param accountId - Stripe account ID
   * @returns Updated account status
   */
  async refreshAccountStatus(accountId: string): Promise<AccountStatus> {
    return this.getAccountStatus(accountId);
  }

  /**
   * Disconnect Stripe account
   *
   * Note: This doesn't revoke the Stripe account, just marks it as disconnected
   * in our system. The user can revoke access in their Stripe dashboard.
   *
   * @param accountId - Stripe account ID
   */
  async disconnectAccount(accountId: string): Promise<void> {
    // Stripe doesn't have a programmatic disconnect API for Standard accounts.
    // Users must disconnect via their Stripe dashboard.
    // We just clear our local references in the database (handled by caller).
    console.log(`Disconnecting Stripe account: ${accountId} (local only)`);
  }

  // =========================================
  // CHECKOUT METHODS
  // =========================================

  /**
   * Create Stripe checkout session (PaymentIntent)
   *
   * Creates a PaymentIntent for immediate payment. Returns the client_secret
   * for use with Stripe Elements on the frontend.
   *
   * @param params - Checkout session parameters
   * @returns Session result with client secret
   */
  async createCheckoutSession(
    params: CheckoutSessionParams
  ): Promise<CheckoutSessionResult> {
    try {
      // Calculate total amount
      const totalAmount = params.priceInCents * params.quantity;

      // Create PaymentIntent
      const paymentIntent = await this.stripe.paymentIntents.create(
        {
          amount: totalAmount,
          currency: params.currency,
          automatic_payment_methods: {
            enabled: true,
          },
          metadata: {
            organizationId: params.organizationId,
            productId: params.productId,
            productName: params.productName,
            quantity: params.quantity.toString(),
            ...params.metadata,
          },
          receipt_email: params.customerEmail,
        },
        params.connectedAccountId
          ? {
              stripeAccount: params.connectedAccountId,
            }
          : undefined
      );

      // Generate session ID (we'll store this in database)
      const sessionId = `sess_${Date.now()}_${paymentIntent.id}`;

      return {
        sessionId,
        providerSessionId: paymentIntent.id,
        clientSecret: paymentIntent.client_secret || "",
        expiresAt: Date.now() + 24 * 60 * 60 * 1000, // 24 hours
        metadata: {
          status: paymentIntent.status,
          amount: paymentIntent.amount,
          currency: paymentIntent.currency,
        },
      };
    } catch (error) {
      throw new PaymentProcessingError(
        `Failed to create Stripe checkout session: ${error instanceof Error ? error.message : "Unknown error"}`,
        this.providerCode,
        error instanceof Stripe.errors.StripeError ? error.code : undefined,
        { params, originalError: error }
      );
    }
  }

  /**
   * Verify checkout payment
   *
   * Checks if a PaymentIntent was successfully completed.
   *
   * @param sessionId - PaymentIntent ID (pi_xxx)
   * @returns Payment verification result
   */
  async verifyCheckoutPayment(
    sessionId: string
  ): Promise<PaymentVerificationResult> {
    try {
      const paymentIntent = await this.stripe.paymentIntents.retrieve(sessionId);

      // Get payment method details if available
      let paymentMethodDetails: PaymentVerificationResult["paymentMethod"];
      if (paymentIntent.payment_method) {
        const pm = await this.stripe.paymentMethods.retrieve(
          paymentIntent.payment_method as string
        );
        paymentMethodDetails = {
          type: pm.type,
          last4: pm.card?.last4,
          brand: pm.card?.brand,
        };
      }

      return {
        success: paymentIntent.status === "succeeded",
        paymentId: paymentIntent.id,
        amount: paymentIntent.amount,
        currency: paymentIntent.currency,
        customerEmail: paymentIntent.receipt_email || undefined,
        paymentMethod: paymentMethodDetails,
        metadata: {
          status: paymentIntent.status,
          created: paymentIntent.created,
        },
      };
    } catch (error) {
      throw new PaymentProcessingError(
        `Failed to verify Stripe payment: ${error instanceof Error ? error.message : "Unknown error"}`,
        this.providerCode,
        error instanceof Stripe.errors.StripeError ? error.code : undefined,
        { sessionId, originalError: error }
      );
    }
  }

  // =========================================
  // INVOICING METHODS (Future Phase - Stubbed)
  // =========================================

  /**
   * Create invoice (Future Phase)
   *
   * NOT YET IMPLEMENTED - Will use Stripe Invoicing API
   */
  async createInvoice(params: InvoiceParams): Promise<InvoiceResult> {
    throw new Error("Stripe invoicing not yet implemented");
  }

  /**
   * Send invoice (Future Phase)
   *
   * NOT YET IMPLEMENTED
   */
  async sendInvoice(invoiceId: string): Promise<InvoiceSendResult> {
    throw new Error("Stripe invoicing not yet implemented");
  }

  /**
   * Mark invoice as paid (Future Phase)
   *
   * NOT YET IMPLEMENTED
   */
  async markInvoiceAsPaid(invoiceId: string): Promise<void> {
    throw new Error("Stripe invoicing not yet implemented");
  }

  // =========================================
  // WEBHOOK METHODS
  // =========================================

  /**
   * Handle Stripe webhook event
   *
   * Routes the webhook to the appropriate handler based on event type.
   *
   * @param event - Webhook event data
   * @returns Handling result
   */
  async handleWebhook(
    event: ProviderWebhookEvent
  ): Promise<WebhookHandlingResult> {
    // Parse Stripe event
    const stripeEvent = JSON.parse(event.rawPayload);

    try {
      switch (event.eventType) {
        // Account events
        case "account.updated":
          return await this.handleAccountUpdated(stripeEvent.data.object);

        case "account.application.authorized":
          return await this.handleAccountAuthorized(stripeEvent.data.object);

        case "account.application.deauthorized":
          return await this.handleAccountDeauthorized(stripeEvent.data.object);

        case "account.external_account.created":
          return await this.handleExternalAccountCreated(stripeEvent.data.object);

        // Capability events
        case "capability.updated":
          return await this.handleCapabilityUpdated(stripeEvent.data.object);

        // Tax settings events
        case "tax.settings.updated":
          return {
            success: true,
            message: "Tax settings updated (no action required)",
          };

        // Checkout events
        case "checkout.session.completed":
          return await this.handleCheckoutSessionCompleted(stripeEvent.data.object);

        // Payment events
        case "payment_intent.succeeded":
          return await this.handlePaymentSucceeded(stripeEvent.data.object);

        case "payment_intent.payment_failed":
          return await this.handlePaymentFailed(stripeEvent.data.object);

        case "charge.refunded":
          return await this.handleChargeRefunded(stripeEvent.data.object);

        // Invoice events
        case "invoice.created":
          return await this.handleInvoiceCreated(stripeEvent.data.object);

        case "invoice.finalized":
          return await this.handleInvoiceFinalized(stripeEvent.data.object);

        case "invoice.paid":
        case "invoice.payment_succeeded":
          return await this.handleInvoicePaymentSucceeded(stripeEvent.data.object);

        case "invoice.payment_failed":
          return await this.handleInvoicePaymentFailed(stripeEvent.data.object);

        case "invoice.payment_action_required":
          return await this.handleInvoicePaymentActionRequired(stripeEvent.data.object);

        case "invoice.marked_uncollectible":
          return await this.handleInvoiceMarkedUncollectible(stripeEvent.data.object);

        default:
          return {
            success: true,
            message: `Unhandled webhook event: ${event.eventType}`,
          };
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  /**
   * Verify Stripe webhook signature
   *
   * Uses Stripe's webhook signing to verify authenticity.
   *
   * @param payload - Raw webhook payload
   * @param signature - Stripe-Signature header value
   * @returns True if signature is valid
   */
  verifyWebhookSignature(payload: string, signature: string): boolean {
    try {
      this.stripe.webhooks.constructEvent(
        payload,
        signature,
        this.webhookSecret
      );
      return true;
    } catch (error) {
      console.error("Webhook signature verification failed:", error);
      return false;
    }
  }

  // =========================================
  // PRIVATE HELPER METHODS
  // =========================================

  /**
   * Map Stripe Account to our AccountStatus type
   */
  private mapStripeAccountToStatus(account: Stripe.Account): AccountStatus {
    let status: AccountStatus["status"];

    if (account.charges_enabled && account.payouts_enabled) {
      status = "active";
    } else if (account.requirements?.disabled_reason) {
      status = "disabled";
    } else if (account.details_submitted) {
      status = "pending";
    } else {
      status = "restricted";
    }

    return {
      accountId: account.id,
      status,
      chargesEnabled: account.charges_enabled || false,
      payoutsEnabled: account.payouts_enabled || false,
      onboardingCompleted: account.details_submitted || false,
      disabledReason: account.requirements?.disabled_reason || undefined,
      metadata: {
        country: account.country,
        created: account.created,
        type: account.type,
        businessType: account.business_type,
      },
    };
  }

  // =========================================
  // WEBHOOK HANDLER METHODS
  // =========================================

  /**
   * Handle account.updated webhook
   */
  private async handleAccountUpdated(
    account: Stripe.Account
  ): Promise<WebhookHandlingResult> {
    console.log(`Account updated: ${account.id}`, {
      charges_enabled: account.charges_enabled,
      payouts_enabled: account.payouts_enabled,
    });

    return {
      success: true,
      actionTaken: "account_updated",
      message: `Account ${account.id} updated`,
      metadata: {
        accountId: account.id,
        status: account.charges_enabled && account.payouts_enabled ? "active" : "pending",
      },
    };
  }

  /**
   * Handle account.application.authorized webhook
   */
  private async handleAccountAuthorized(
    account: Stripe.Account
  ): Promise<WebhookHandlingResult> {
    console.log(`Account authorized: ${account.id}`);

    return {
      success: true,
      actionTaken: "account_updated",
      message: `Account ${account.id} authorized`,
      metadata: {
        accountId: account.id,
        status: "pending",
      },
    };
  }

  /**
   * Handle account.application.deauthorized webhook
   */
  private async handleAccountDeauthorized(
    account: Stripe.Account
  ): Promise<WebhookHandlingResult> {
    console.log(`Account deauthorized: ${account.id}`);

    return {
      success: true,
      actionTaken: "account_disabled",
      message: `Account ${account.id} deauthorized`,
      metadata: {
        accountId: account.id,
      },
    };
  }

  /**
   * Handle capability.updated webhook
   */
  private async handleCapabilityUpdated(
    capability: Stripe.Capability
  ): Promise<WebhookHandlingResult> {
    console.log(`Capability updated: ${capability.id} - ${capability.status}`);

    return {
      success: true,
      actionTaken: "other",
      message: `Capability ${capability.id} updated to ${capability.status}`,
      metadata: {
        capabilityId: capability.id,
        status: capability.status,
      },
    };
  }

  /**
   * Handle account.external_account.created webhook
   */
  private async handleExternalAccountCreated(
    externalAccount: Stripe.BankAccount | Stripe.Card
  ): Promise<WebhookHandlingResult> {
    console.log(`External account created: ${externalAccount.id}`, {
      type: externalAccount.object,
      last4: externalAccount.last4,
    });

    return {
      success: true,
      actionTaken: "other",
      message: `External account ${externalAccount.id} added`,
    };
  }

  /**
   * Handle checkout.session.completed webhook
   *
   * This is the primary event for Stripe Checkout completion.
   * Contains customer details, payment status, and tax calculation results.
   * Critical for B2B: includes validated tax IDs and reverse charge info.
   */
  private async handleCheckoutSessionCompleted(
    session: Stripe.Checkout.Session
  ): Promise<WebhookHandlingResult> {
    console.log(`Checkout session completed: ${session.id}`, {
      paymentStatus: session.payment_status,
      amountTotal: session.amount_total,
      amountSubtotal: session.amount_subtotal,
      currency: session.currency,
    });

    // Extract tax information
    const taxAmount = session.total_details?.amount_tax || 0;

    // Extract customer tax IDs (B2B)
    const customerTaxIds = session.customer_details?.tax_ids || [];
    const isB2B = session.metadata?.isB2B === "true";

    // Log tax calculation results
    if (taxAmount === 0 && isB2B && customerTaxIds.length > 0) {
      console.log("B2B Reverse Charge Applied:", {
        taxIds: customerTaxIds.map(t => ({
          type: t.type,
          value: t.value,
        })),
      });
    }

    return {
      success: true,
      actionTaken: "checkout_completed",
      message: `Checkout session ${session.id} completed`,
      metadata: {
        sessionId: session.id,
        paymentIntentId: session.payment_intent as string,
        paymentStatus: session.payment_status,
        amountTotal: session.amount_total,
        amountSubtotal: session.amount_subtotal,
        taxAmount,
        currency: session.currency,
        customerEmail: session.customer_details?.email,
        customerTaxIds: customerTaxIds.map(t => ({
          type: t.type,
          value: t.value,
        })),
        isB2B,
        organizationId: session.metadata?.organizationId,
        productId: session.metadata?.productId,
      },
    };
  }

  /**
   * Handle payment_intent.succeeded webhook
   */
  private async handlePaymentSucceeded(
    paymentIntent: Stripe.PaymentIntent
  ): Promise<WebhookHandlingResult> {
    console.log(`Payment succeeded: ${paymentIntent.id}`, {
      amount: paymentIntent.amount,
      currency: paymentIntent.currency,
    });

    return {
      success: true,
      actionTaken: "payment_succeeded",
      message: `Payment ${paymentIntent.id} succeeded`,
      metadata: {
        paymentIntentId: paymentIntent.id,
        amount: paymentIntent.amount,
        currency: paymentIntent.currency,
        organizationId: paymentIntent.metadata?.organizationId,
        productId: paymentIntent.metadata?.productId,
      },
    };
  }

  /**
   * Handle payment_intent.payment_failed webhook
   */
  private async handlePaymentFailed(
    paymentIntent: Stripe.PaymentIntent
  ): Promise<WebhookHandlingResult> {
    console.log(`Payment failed: ${paymentIntent.id}`, {
      amount: paymentIntent.amount,
      error: paymentIntent.last_payment_error,
    });

    return {
      success: true,
      actionTaken: "payment_failed",
      message: `Payment ${paymentIntent.id} failed`,
      metadata: {
        paymentIntentId: paymentIntent.id,
        error: paymentIntent.last_payment_error?.message,
      },
    };
  }

  /**
   * Handle charge.refunded webhook
   */
  private async handleChargeRefunded(
    charge: Stripe.Charge
  ): Promise<WebhookHandlingResult> {
    console.log(`Charge refunded: ${charge.id}`, {
      amount_refunded: charge.amount_refunded,
    });

    return {
      success: true,
      actionTaken: "refund_processed",
      message: `Charge ${charge.id} refunded`,
      metadata: {
        chargeId: charge.id,
        amountRefunded: charge.amount_refunded,
      },
    };
  }

  /**
   * Handle invoice.created webhook
   */
  private async handleInvoiceCreated(
    invoice: Stripe.Invoice
  ): Promise<WebhookHandlingResult> {
    console.log(`Invoice created: ${invoice.id}`, {
      customer: invoice.customer,
      amount_due: invoice.amount_due,
      status: invoice.status,
    });

    return {
      success: true,
      actionTaken: "invoice_created",
      message: `Invoice ${invoice.id} created`,
      metadata: {
        invoiceId: invoice.id,
        customerId: invoice.customer,
        amountDue: invoice.amount_due,
      },
    };
  }

  /**
   * Handle invoice.finalized webhook
   */
  private async handleInvoiceFinalized(
    invoice: Stripe.Invoice
  ): Promise<WebhookHandlingResult> {
    console.log(`Invoice finalized: ${invoice.id}`, {
      number: invoice.number,
      due_date: invoice.due_date,
    });

    return {
      success: true,
      actionTaken: "invoice_finalized",
      message: `Invoice ${invoice.id} finalized`,
      metadata: {
        invoiceId: invoice.id,
        invoiceNumber: invoice.number,
        dueDate: invoice.due_date,
      },
    };
  }

  /**
   * Handle invoice.paid / invoice.payment_succeeded webhook
   */
  private async handleInvoicePaymentSucceeded(
    invoice: Stripe.Invoice
  ): Promise<WebhookHandlingResult> {
    console.log(`Invoice paid: ${invoice.id}`, {
      amount_paid: invoice.amount_paid,
      status: invoice.status,
    });

    return {
      success: true,
      actionTaken: "invoice_paid",
      message: `Invoice ${invoice.id} paid`,
      metadata: {
        invoiceId: invoice.id,
        amountPaid: invoice.amount_paid,
        status: invoice.status,
      },
    };
  }

  /**
   * Handle invoice.payment_failed webhook
   */
  private async handleInvoicePaymentFailed(
    invoice: Stripe.Invoice
  ): Promise<WebhookHandlingResult> {
    console.log(`Invoice payment failed: ${invoice.id}`, {
      attempt_count: invoice.attempt_count,
      next_payment_attempt: invoice.next_payment_attempt,
    });

    return {
      success: true,
      actionTaken: "invoice_failed",
      message: `Invoice ${invoice.id} payment failed`,
      metadata: {
        invoiceId: invoice.id,
        attemptCount: invoice.attempt_count,
        nextAttempt: invoice.next_payment_attempt,
      },
    };
  }

  /**
   * Handle invoice.payment_action_required webhook
   */
  private async handleInvoicePaymentActionRequired(
    invoice: Stripe.Invoice
  ): Promise<WebhookHandlingResult> {
    console.log(`Invoice requires action: ${invoice.id}`, {
      hosted_invoice_url: invoice.hosted_invoice_url,
    });

    return {
      success: true,
      actionTaken: "invoice_action_required",
      message: `Invoice ${invoice.id} requires payment action`,
      metadata: {
        invoiceId: invoice.id,
        hostedUrl: invoice.hosted_invoice_url,
      },
    };
  }

  /**
   * Handle invoice.marked_uncollectible webhook
   */
  private async handleInvoiceMarkedUncollectible(
    invoice: Stripe.Invoice
  ): Promise<WebhookHandlingResult> {
    console.log(`Invoice marked uncollectible: ${invoice.id}`);

    return {
      success: true,
      actionTaken: "invoice_uncollectible",
      message: `Invoice ${invoice.id} marked as uncollectible`,
      metadata: {
        invoiceId: invoice.id,
      },
    };
  }
}

// =========================================
// FACTORY FUNCTION
// =========================================

/**
 * Create Stripe Connect provider instance
 *
 * This is a factory function that creates a properly configured
 * Stripe provider instance.
 *
 * @param secretKey - Stripe secret API key (from env)
 * @param webhookSecret - Stripe webhook signing secret (from env)
 * @returns Configured Stripe provider
 *
 * @example
 * ```typescript
 * const provider = createStripeProvider(
 *   process.env.STRIPE_SECRET_KEY!,
 *   process.env.STRIPE_WEBHOOK_SECRET!
 * );
 * ```
 */
export function createStripeProvider(
  secretKey: string,
  webhookSecret: string
): StripeConnectProvider {
  return new StripeConnectProvider(secretKey, webhookSecret);
}
