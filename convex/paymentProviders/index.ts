/**
 * PAYMENT PROVIDERS - PUBLIC API
 *
 * Unified export for all payment provider functionality.
 *
 * @module paymentProviders
 */

// Core types
export * from "./types";

// Providers
export { StripeConnectProvider, createStripeProvider } from "./stripe";

// Manager
export { PaymentProviderManager, paymentProviders, getPaymentProviderManager } from "./manager";

// Helpers
export {
  getProviderForOrg,
  getProviderByCode,
  getOrgProviderConfig,
  updateOrgProviderConfig,
  removeOrgProviderConfig,
  getConnectedAccountId,
  hasProviderConnected,
} from "./helpers";
