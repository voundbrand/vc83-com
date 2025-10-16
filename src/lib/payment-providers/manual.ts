/**
 * MANUAL PAYMENT PROVIDER
 *
 * Fallback provider for manual payment processing.
 * Used when no automated provider is configured.
 */

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

export class ManualPaymentProvider implements IPaymentProvider {
  readonly providerCode = "manual";
  readonly providerName = "Manual Payment";

  private config: PaymentProviderConfig | null = null;

  async initialize(config: PaymentProviderConfig): Promise<void> {
    this.config = config;
  }

  async createSession(options: CreateSessionOptions): Promise<CheckoutSession> {
    // Generate a simple session ID
    const sessionId = `manual_${Date.now()}_${Math.random().toString(36).slice(2)}`;

    return {
      id: sessionId,
      status: "pending",
      items: options.items,
      quantity: options.quantity,
      total: this.calculateTotal(options.items, options.quantity),
      currency: options.currency || options.items[0]?.currency || "usd",
      customerId: options.customerId,
      metadata: {
        ...options.metadata,
        provider: "manual",
        paymentInstructions: this.getPaymentInstructions(),
      },
    };
  }

  async redirectToCheckout(session: CheckoutSession): Promise<void> {
    // Manual provider doesn't redirect
    // Instead, display payment instructions
    console.log("Manual payment session created:", session);
    console.log("Payment Instructions:", this.getPaymentInstructions());
  }

  async validateSession(sessionId: string): Promise<SessionValidationResult> {
    // For manual provider, validation must be done manually by admin
    return {
      valid: false,
      error: "Manual payment validation required by administrator",
    };
  }

  async getPaymentResult(sessionId: string): Promise<PaymentResult> {
    return {
      success: false,
      error: "Manual payment verification required",
    };
  }

  async cancelSession(sessionId: string): Promise<void> {
    // Nothing to cancel for manual sessions
    console.log("Manual payment session cancelled:", sessionId);
  }

  isConfigured(): boolean {
    return !!this.config;
  }

  getMetadata(): ProviderMetadata {
    return {
      displayName: "Manual Payment",
      description: "Process payments manually via bank transfer, check, or cash",
      capabilities: {
        supportsSubscriptions: false,
        supportsRefunds: false,
        supportsPartialRefunds: false,
        supportsPromoCodes: false,
        supportsMultipleCurrencies: true,
        supportsPaymentMethods: ["bank_transfer", "check", "cash"],
        requiresRedirect: false,
        supportsEmbeddedCheckout: true,
      },
      supportedCurrencies: ["usd", "eur", "gbp", "cad", "aud"],
    };
  }

  private calculateTotal(items: CheckoutSession["items"], quantity: number): number {
    return items.reduce((sum, item) => sum + item.price * quantity, 0);
  }

  private getPaymentInstructions(): string {
    return `
Please complete your payment using one of the following methods:

1. Bank Transfer:
   Account Name: [Your Organization]
   Account Number: [Account Number]
   Routing Number: [Routing Number]
   Reference: Your order number

2. Check:
   Make payable to: [Your Organization]
   Mail to: [Mailing Address]
   Include order number on check memo

3. Cash:
   Visit us at: [Physical Address]
   Hours: [Business Hours]

After payment, please email proof of payment to: [Email Address]

Your order will be processed once payment is verified.
    `.trim();
  }
}
