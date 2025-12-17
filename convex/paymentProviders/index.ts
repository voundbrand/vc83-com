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
export { InvoicePaymentProvider, createInvoiceProvider, invoicePaymentProvider, initiateInvoicePayment } from "./invoice";

// Manager
export { PaymentProviderManager, paymentProviders, getPaymentProviderManager } from "./manager";

// Helpers
export {
  getProviderForOrg,
  getProviderByCode,
  getOrgProviderConfig,
  getOrgProviderConfigFromObjects,
  updateOrgProviderConfig,
  removeOrgProviderConfig,
  getConnectedAccountId,
  hasProviderConnected,
  getAvailableProviders,
  getDefaultProvider,
} from "./helpers";
