/**
 * SHARED CONSTANTS
 *
 * Replaces magic numbers and repeated string literals scattered across the codebase.
 * These values were previously calculated inline (e.g., 30 * 24 * 60 * 60 * 1000)
 * in 46+ files.
 *
 * Usage:
 *   import { DURATION_MS, PAYMENT_TERMS, DEFAULTS } from "../lib/constants";
 *   const expiresAt = Date.now() + DURATION_MS.THIRTY_DAYS;
 *
 * Migration: Import and replace inline calculations one file at a time.
 */

// ============================================================================
// TIME DURATIONS (in milliseconds)
// ============================================================================

export const DURATION_MS = {
  /** 1 minute = 60,000ms */
  ONE_MINUTE: 60 * 1000,
  /** 5 minutes = 300,000ms */
  FIVE_MINUTES: 5 * 60 * 1000,
  /** 15 minutes = 900,000ms */
  FIFTEEN_MINUTES: 15 * 60 * 1000,
  /** 30 minutes = 1,800,000ms */
  THIRTY_MINUTES: 30 * 60 * 1000,
  /** 1 hour = 3,600,000ms */
  ONE_HOUR: 60 * 60 * 1000,
  /** 1 day = 86,400,000ms */
  ONE_DAY: 24 * 60 * 60 * 1000,
  /** 7 days */
  SEVEN_DAYS: 7 * 24 * 60 * 60 * 1000,
  /** 14 days (used for account deletion grace period) */
  FOURTEEN_DAYS: 14 * 24 * 60 * 60 * 1000,
  /** 30 days (used for session expiry, portal auth, usage stats) */
  THIRTY_DAYS: 30 * 24 * 60 * 60 * 1000,
  /** 365 days (used for availability calendar lookahead) */
  ONE_YEAR: 365 * 24 * 60 * 60 * 1000,
} as const;

// ============================================================================
// PAYMENT TERMS
// ============================================================================

/**
 * Full set of payment terms used across invoicing, checkout, and B2B flows.
 * Source of truth - replaces repeated arrays in:
 * - convex/invoicingOntology.ts
 * - convex/consolidatedInvoicing.ts
 * - convex/b2bInvoiceHelper.ts
 * - convex/workflows/workflowValidation.ts
 */
export const PAYMENT_TERMS = [
  "due_on_receipt",
  "net7",
  "net15",
  "net30",
  "net60",
  "net90",
] as const;

export type PaymentTerm = (typeof PAYMENT_TERMS)[number];

export const DEFAULT_PAYMENT_TERM: PaymentTerm = "net30";

/**
 * Maps payment term strings to number of days.
 * Used for due date calculation in invoicing.
 */
export const PAYMENT_TERM_DAYS: Record<PaymentTerm, number> = {
  due_on_receipt: 0,
  net7: 7,
  net15: 15,
  net30: 30,
  net60: 60,
  net90: 90,
};

// ============================================================================
// LEGACY PAYMENT TERMS (for backward compatibility)
// ============================================================================

/**
 * Some older records use "dueonreceipt" instead of "due_on_receipt".
 * Used in convex/invoicingOntology.ts normalizePaymentTerms().
 */
export const LEGACY_PAYMENT_TERMS_MAP: Record<string, PaymentTerm> = {
  dueonreceipt: "due_on_receipt",
};

// ============================================================================
// DEFAULTS
// ============================================================================

export const DEFAULTS = {
  /** Default timezone when none is specified (used in availabilityOntology) */
  TIMEZONE: "America/Los_Angeles",

  /** Default currency code */
  CURRENCY: "EUR",

  /** Minimum event/booking duration in ms (15 minutes) */
  MIN_EVENT_DURATION_MS: 15 * 60 * 1000,

  /** Default session expiry (30 days) */
  SESSION_EXPIRY_MS: 30 * 24 * 60 * 60 * 1000,

  /** Default portal invitation expiry (7 days) */
  INVITATION_EXPIRY_DAYS: 7,

  /** Account deletion grace period (14 days) */
  ACCOUNT_DELETION_GRACE_PERIOD_MS: 14 * 24 * 60 * 60 * 1000,
} as const;

// ============================================================================
// BCRYPT
// ============================================================================

export const BCRYPT_SALT_ROUNDS = 10;
