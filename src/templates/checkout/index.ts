/**
 * CHECKOUT COMPONENTS - SIMPLIFIED EXPORTS
 *
 * Simplified checkout system - no templates, just components.
 * Use TicketCheckoutCard directly in your landing page templates.
 */

// Core types and utilities
export * from "./core/types";
export * from "./core/utils";

// Shared UI components
export { PriceDisplay } from "./components/PriceDisplay";
export { QuantitySelector } from "./components/QuantitySelector";
export { CheckoutSummary } from "./components/CheckoutSummary";

// Main checkout component
export { TicketCheckoutCard } from "./ticket-checkout/ticket-checkout-card";
export type { TicketCheckoutCardProps } from "./ticket-checkout/ticket-checkout-card";
