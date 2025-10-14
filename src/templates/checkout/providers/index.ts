/**
 * PAYMENT PROVIDERS - MAIN EXPORT
 *
 * Central export point for payment provider functionality.
 */

export * from "./types";
export { StripePaymentProvider } from "./stripe";
export { ManualPaymentProvider } from "./manual";

import { IPaymentProvider, PaymentProviderConfig, ProviderError, ProviderErrorType } from "./types";
import { StripePaymentProvider } from "./stripe";
import { ManualPaymentProvider } from "./manual";

/**
 * Registry of available payment providers.
 */
const providerRegistry: Record<string, new () => IPaymentProvider> = {
  stripe: StripePaymentProvider,
  manual: ManualPaymentProvider,
  // Add more providers here:
  // paypal: PayPalPaymentProvider,
  // square: SquarePaymentProvider,
};

/**
 * Get a payment provider instance by code.
 *
 * @param config - Provider configuration
 * @returns Initialized provider instance
 */
export async function getPaymentProvider(
  config: PaymentProviderConfig
): Promise<IPaymentProvider> {
  const ProviderClass = providerRegistry[config.providerCode];

  if (!ProviderClass) {
    throw new ProviderError(
      ProviderErrorType.CONFIGURATION_ERROR,
      `Unknown payment provider: ${config.providerCode}`
    );
  }

  const provider = new ProviderClass();
  await provider.initialize(config);

  return provider;
}

/**
 * Get all available provider codes.
 *
 * @returns Array of provider codes
 */
export function getAvailableProviders(): string[] {
  return Object.keys(providerRegistry);
}

/**
 * Check if a provider code is valid.
 *
 * @param code - Provider code to check
 * @returns True if provider exists
 */
export function isValidProvider(code: string): boolean {
  return code in providerRegistry;
}
