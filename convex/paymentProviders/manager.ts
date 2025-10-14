/**
 * PAYMENT PROVIDER MANAGER
 *
 * Central manager for all payment providers. This handles:
 * - Provider registration
 * - Provider selection based on organization config
 * - Default provider fallback
 *
 * @module paymentProviders/manager
 */

import { IPaymentProvider } from "./types";
import { createStripeProvider } from "./stripe";

/**
 * Payment Provider Manager
 *
 * Manages all registered payment providers and selects the appropriate
 * provider based on organization configuration.
 *
 * @example
 * ```typescript
 * // In a Convex action
 * const manager = new PaymentProviderManager();
 * const provider = manager.getProvider("stripe-connect");
 *
 * // Or get default provider for organization
 * const defaultProvider = manager.getProviderForOrganization(org);
 * ```
 */
export class PaymentProviderManager {
  private providers = new Map<string, IPaymentProvider>();

  /**
   * Initialize manager and register all available providers
   */
  constructor() {
    this.registerAllProviders();
  }

  /**
   * Register all available payment providers
   *
   * Currently supports:
   * - Stripe Connect (if API keys configured)
   *
   * Future providers:
   * - PayPal
   * - Square
   * - Manual/Offline payments
   */
  private registerAllProviders(): void {
    // Register Stripe Connect (if configured)
    const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
    const stripeWebhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

    if (stripeSecretKey && stripeWebhookSecret) {
      try {
        const stripeProvider = createStripeProvider(
          stripeSecretKey,
          stripeWebhookSecret
        );
        this.registerProvider(stripeProvider);
        console.log("✓ Registered Stripe Connect provider");
      } catch (error) {
        console.error("Failed to register Stripe Connect provider:", error);
      }
    } else {
      console.warn(
        "Stripe Connect not configured (missing STRIPE_SECRET_KEY or STRIPE_WEBHOOK_SECRET)"
      );
    }

    // Future: Register other providers
    // if (process.env.PAYPAL_CLIENT_ID) {
    //   const paypalProvider = createPayPalProvider(...);
    //   this.registerProvider(paypalProvider);
    // }
  }

  /**
   * Register a payment provider
   *
   * @param provider - Provider instance to register
   */
  registerProvider(provider: IPaymentProvider): void {
    this.providers.set(provider.providerCode, provider);
  }

  /**
   * Get provider by code
   *
   * @param code - Provider code (e.g., "stripe-connect")
   * @returns Provider instance
   * @throws Error if provider not found
   */
  getProvider(code: string): IPaymentProvider {
    const provider = this.providers.get(code);
    if (!provider) {
      throw new Error(
        `Payment provider "${code}" not found or not configured. Available providers: ${Array.from(this.providers.keys()).join(", ")}`
      );
    }
    return provider;
  }

  /**
   * Get all registered providers
   *
   * @returns Array of registered providers
   */
  getAllProviders(): IPaymentProvider[] {
    return Array.from(this.providers.values());
  }

  /**
   * Get provider codes
   *
   * @returns Array of registered provider codes
   */
  getProviderCodes(): string[] {
    return Array.from(this.providers.keys());
  }

  /**
   * Check if provider is registered
   *
   * @param code - Provider code to check
   * @returns True if provider is registered
   */
  hasProvider(code: string): boolean {
    return this.providers.has(code);
  }

  /**
   * Get default provider for an organization
   *
   * This looks at the organization's payment provider configuration
   * and returns the default provider (or first active provider if no default).
   *
   * @param org - Organization document
   * @returns Default provider instance
   * @throws Error if no providers configured
   */
  getProviderForOrganization(org: {
    stripeConnectAccountId?: string;
    paymentProviders?: Array<{
      providerCode: string;
      accountId: string;
      status: string;
      isDefault: boolean;
    }>;
  }): IPaymentProvider {
    // Legacy support: If org has stripeConnectAccountId, use Stripe
    if (org.stripeConnectAccountId) {
      return this.getProvider("stripe-connect");
    }

    // New multi-provider support
    if (org.paymentProviders && org.paymentProviders.length > 0) {
      // Find default provider
      const defaultConfig = org.paymentProviders.find((p) => p.isDefault);
      if (defaultConfig) {
        return this.getProvider(defaultConfig.providerCode);
      }

      // Fallback to first active provider
      const activeConfig = org.paymentProviders.find(
        (p) => p.status === "active"
      );
      if (activeConfig) {
        return this.getProvider(activeConfig.providerCode);
      }

      // Fallback to any provider
      return this.getProvider(org.paymentProviders[0].providerCode);
    }

    throw new Error(
      "No payment providers configured for this organization. Please connect a payment provider first."
    );
  }

  /**
   * Get provider for organization with fallback
   *
   * Similar to getProviderForOrganization, but returns null instead of throwing.
   *
   * @param org - Organization document
   * @returns Provider instance or null
   */
  getProviderForOrganizationOrNull(org: {
    stripeConnectAccountId?: string;
    paymentProviders?: Array<{
      providerCode: string;
      accountId: string;
      status: string;
      isDefault: boolean;
    }>;
  }): IPaymentProvider | null {
    try {
      return this.getProviderForOrganization(org);
    } catch {
      return null;
    }
  }
}

// =========================================
// SINGLETON INSTANCE
// =========================================

/**
 * Global payment provider manager instance
 *
 * Use this singleton in Convex functions to access payment providers.
 *
 * @example
 * ```typescript
 * import { paymentProviders } from "./paymentProviders/manager";
 *
 * export const createCheckout = action({
 *   handler: async (ctx, args) => {
 *     const provider = paymentProviders.getProvider("stripe-connect");
 *     const session = await provider.createCheckoutSession({...});
 *     return session;
 *   }
 * });
 * ```
 */
export const paymentProviders = new PaymentProviderManager();

/**
 * Get the singleton payment provider manager
 *
 * @returns Global manager instance
 */
export function getPaymentProviderManager(): PaymentProviderManager {
  return paymentProviders;
}
