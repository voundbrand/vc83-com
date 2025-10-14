/**
 * CHECKOUT TEMPLATES - MAIN EXPORT
 *
 * Central export point for all checkout-related functionality.
 */

// Core exports
export * from "./core/types";
export * from "./core/utils";
export { CheckoutCore, useCheckout } from "./core/checkout-core";
export type { CheckoutCoreProps, CheckoutContextValue } from "./core/checkout-core";

// Shared components
export { PriceDisplay } from "./components/PriceDisplay";
export { QuantitySelector } from "./components/QuantitySelector";
export { CheckoutSummary } from "./components/CheckoutSummary";

// Template exports
export { TicketCheckoutTemplate } from "./ticket-checkout";
export type { TicketCheckoutProps } from "./ticket-checkout";

export { ProductCheckoutTemplate } from "./product-checkout";
export type { ProductCheckoutProps } from "./product-checkout";

export { ServiceCheckoutTemplate } from "./service-checkout";
export type { ServiceCheckoutProps } from "./service-checkout";

// Registry and loader
export * from "./registry";
export * from "./loader";
export type { CheckoutLoaderProps } from "./loader";
