/**
 * STRIPE PAYMENT PROVIDER
 *
 * Implementation of IPaymentProvider for Stripe.
 */

import { loadStripe, Stripe } from "@stripe/stripe-js";
import {
  IPaymentProvider,
  PaymentProviderConfig,
  CreateSessionOptions,
  SessionValidationResult,
  ProviderMetadata,
  ProviderError,
  ProviderErrorType,
} from "./types";
import { CheckoutSession, PaymentResult } from "../../templates/checkout/core/types";

export class StripePaymentProvider implements IPaymentProvider {
  readonly providerCode = "stripe";
  readonly providerName = "Stripe";

  private stripe: Stripe | null = null;
  private config: PaymentProviderConfig | null = null;
  private publishableKey: string | null = null;

  async initialize(config: PaymentProviderConfig): Promise<void> {
    this.config = config;

    // Extract Stripe publishable key from credentials
    this.publishableKey = config.credentials.publishableKey;

    if (!this.publishableKey) {
      throw new ProviderError(
        ProviderErrorType.CONFIGURATION_ERROR,
        "Stripe publishable key not found in configuration"
      );
    }

    // Load Stripe.js
    try {
      this.stripe = await loadStripe(this.publishableKey);

      if (!this.stripe) {
        throw new Error("Failed to load Stripe.js");
      }
    } catch (error) {
      throw new ProviderError(
        ProviderErrorType.CONFIGURATION_ERROR,
        "Failed to initialize Stripe",
        error
      );
    }
  }

  async createSession(options: CreateSessionOptions): Promise<CheckoutSession> {
    if (!this.isConfigured()) {
      throw new ProviderError(
        ProviderErrorType.CONFIGURATION_ERROR,
        "Stripe provider not properly configured"
      );
    }

    try {
      // Prepare tax configuration from options
      const taxConfig = options.taxSettings ? {
        automaticTaxEnabled: options.taxSettings.taxEnabled,
        originAddress: options.taxSettings.originAddress,
        stripeSettings: options.taxSettings.stripeSettings,
      } : undefined;

      // Extract tax codes from items
      const itemsWithTax = options.items.map((item) => ({
        ...item,
        taxCode: item.taxCode || options.taxSettings?.defaultTaxCode,
        taxBehavior: item.taxBehavior || options.taxSettings?.defaultTaxBehavior || "exclusive",
      }));

      // Call Convex action to create Stripe session
      // This would be replaced with actual Convex action call
      const response = await fetch("/api/checkout/create-stripe-session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items: itemsWithTax,
          quantity: options.quantity,
          organizationId: options.organizationId,
          successUrl: options.successUrl,
          cancelUrl: options.cancelUrl,
          metadata: options.metadata,
          taxConfig,
          customerAddress: options.customerAddress,
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();

      return {
        id: data.sessionId,
        url: data.url,
        status: "pending",
        items: options.items,
        quantity: options.quantity,
        total: this.calculateTotal(options.items, options.quantity),
        currency: options.currency || options.items[0]?.currency || "usd",
        customerId: options.customerId,
        metadata: {
          ...options.metadata,
          provider: "stripe",
        },
      };
    } catch (error) {
      throw new ProviderError(
        ProviderErrorType.PROVIDER_ERROR,
        "Failed to create Stripe checkout session",
        error
      );
    }
  }

  async redirectToCheckout(session: CheckoutSession): Promise<void> {
    if (!this.stripe) {
      throw new ProviderError(
        ProviderErrorType.CONFIGURATION_ERROR,
        "Stripe not initialized"
      );
    }

    // Redirect to Stripe Checkout URL directly
    if (session.url) {
      window.location.href = session.url;
    } else {
      throw new ProviderError(
        ProviderErrorType.PROVIDER_ERROR,
        "No checkout URL provided in session"
      );
    }
  }

  async validateSession(sessionId: string): Promise<SessionValidationResult> {
    try {
      // Call Convex action to validate session
      const response = await fetch(`/api/checkout/validate-stripe-session/${sessionId}`);

      if (!response.ok) {
        return {
          valid: false,
          error: `HTTP error! status: ${response.status}`,
        };
      }

      const data = await response.json();

      return {
        valid: data.valid,
        session: data.session,
      };
    } catch (error) {
      return {
        valid: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  async getPaymentResult(sessionId: string): Promise<PaymentResult> {
    try {
      const validation = await this.validateSession(sessionId);

      if (!validation.valid || !validation.session) {
        return {
          success: false,
          error: validation.error || "Session validation failed",
        };
      }

      return {
        success: validation.session.status === "complete",
        transactionId: sessionId,
        receipt: validation.session,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  async cancelSession(sessionId: string): Promise<void> {
    try {
      await fetch(`/api/checkout/cancel-stripe-session/${sessionId}`, {
        method: "POST",
      });
    } catch (error) {
      throw new ProviderError(
        ProviderErrorType.PROVIDER_ERROR,
        "Failed to cancel Stripe session",
        error
      );
    }
  }

  isConfigured(): boolean {
    return !!(this.stripe && this.config && this.publishableKey);
  }

  getMetadata(): ProviderMetadata {
    return {
      displayName: "Stripe",
      description: "Accept payments with credit cards, debit cards, and more",
      logoUrl: "https://stripe.com/img/v3/newsroom/social.png",
      websiteUrl: "https://stripe.com",
      capabilities: {
        supportsSubscriptions: true,
        supportsRefunds: true,
        supportsPartialRefunds: true,
        supportsPromoCodes: true,
        supportsMultipleCurrencies: true,
        supportsPaymentMethods: ["card", "bank_transfer", "apple_pay", "google_pay"],
        requiresRedirect: true,
        supportsEmbeddedCheckout: true,
      },
      supportedCurrencies: ["usd", "eur", "gbp", "cad", "aud", "jpy"],
      supportedCountries: ["US", "CA", "GB", "AU", "EU"],
    };
  }

  private calculateTotal(items: CheckoutSession["items"], quantity: number): number {
    return items.reduce((sum, item) => sum + item.price * quantity, 0);
  }
}
