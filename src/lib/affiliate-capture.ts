/**
 * AFFILIATE REFERRAL CODE CAPTURE (Client-Side)
 *
 * Captures the ?ref= parameter from URLs and stores it in a cookie
 * for 90 days. Used to attribute signups to affiliates.
 *
 * Usage:
 * - Call captureRefCode() on page load (or in a layout effect)
 * - Call getRefCode() when submitting signup to include the code
 * - Call clearRefCode() after successful signup tracking
 *
 * @see docs/layercake-agency-influencers/BACKEND-IMPLEMENTATION-BRIEF.md Phase 4
 */

const COOKIE_NAME = "lc_refcode";
const COOKIE_MAX_AGE_SECONDS = 90 * 24 * 60 * 60; // 90 days

/**
 * Check URL for ?ref= param and store in cookie if found.
 * Safe to call multiple times — only sets cookie if param present.
 */
export function captureRefCode(): string | null {
  if (typeof window === "undefined") return null;

  const params = new URLSearchParams(window.location.search);
  const refCode = params.get("ref");

  if (refCode) {
    document.cookie = `${COOKIE_NAME}=${encodeURIComponent(refCode)}; max-age=${COOKIE_MAX_AGE_SECONDS}; path=/; SameSite=Lax`;
    return refCode;
  }

  return getRefCode();
}

/**
 * Get the stored referral code from cookie.
 */
export function getRefCode(): string | null {
  if (typeof window === "undefined") return null;

  const match = document.cookie.match(
    new RegExp(`(?:^|;\\s*)${COOKIE_NAME}=([^;]*)`)
  );
  return match ? decodeURIComponent(match[1]) : null;
}

/**
 * Clear the referral code cookie after successful tracking.
 */
export function clearRefCode(): void {
  if (typeof window === "undefined") return;
  document.cookie = `${COOKIE_NAME}=; max-age=0; path=/`;
}
