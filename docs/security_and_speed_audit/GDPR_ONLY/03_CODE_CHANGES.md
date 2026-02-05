# GDPR Code Changes Required

Your existing technical plan at `docs/plans/compliance_gdpr/gdpr-compliance.md` is comprehensive (10 phases, 584 lines). Use it as the implementation blueprint. This document summarizes priorities and specific files.

---

## Priority 1: Block Tracking Until Consent (Do This First)

**Problem:** PostHog initializes on every page load without asking permission. This is a GDPR violation.

**Files to change:**

| File | Change |
|------|--------|
| `src/components/providers/posthog-provider.tsx` | Wrap `posthog.init()` in consent check. Default to `posthog.opt_out_capturing()`. Only `opt_in_capturing()` after user consents. |
| NEW: `src/components/gdpr/cookie-consent-banner.tsx` | Banner with Accept All / Reject All / Customize buttons. Win95 styling. |
| NEW: `src/hooks/use-cookie-consent.ts` | Hook to read/write consent state from localStorage (anonymous) or database (logged in). |
| `convex/schemas/coreSchemas.ts` | Add `cookieConsent` field to `userPreferences` table. |
| NEW: `convex/userPreferences.ts` | Mutations: `updateCookieConsent`, `getCookieConsent`. |

**For anonymous visitors (not logged in):** Store consent in `localStorage` as fallback. Migrate to database on signup.

**Cookie categories:**
- Essential (always on) - session management, auth
- Analytics (PostHog) - requires consent
- Marketing (future use) - requires consent

---

## Priority 2: Legal Pages

**Files to create:**

| File | Content |
|------|---------|
| `src/app/privacy/page.tsx` | Privacy policy page - use lawyer-drafted content |
| `src/app/terms/page.tsx` | Terms of service page |
| `src/app/cookies/page.tsx` | Cookie policy page with cookie table |

These are simple page shells rendering text content. The actual content should come from your lawyer (see `02_REAL_WORLD_STEPS.md`).

**Footer links:** Add Privacy / Terms / Cookies links visible on all pages. Create or update a footer component.

---

## Priority 3: Consent Tracking

**Files to create/change:**

| File | Change |
|------|--------|
| NEW: `convex/schemas/consentSchemas.ts` | `consentRecords` table with userId, consentType, granted (bool), timestamp, policyVersion, source |
| `convex/schema.ts` | Import new schema |
| NEW: `convex/consent.ts` | `recordConsent` mutation, `getConsentHistory` query, `revokeConsent` mutation |

**Schema for `consentRecords`:**
```
userId: Id<"users">
consentType: "cookie_analytics" | "cookie_marketing" | "email_marketing" | "data_processing"
granted: boolean
timestamp: number
policyVersion: string
source: string  // "cookie_banner", "settings", "signup"
```

Indexes: `by_user`, `by_user_type`

---

## Priority 4: Data Retention Automation

**Files to change:**

| File | Change |
|------|--------|
| `convex/crons.ts` | Add scheduled jobs: expired session cleanup (daily), expired OAuth state cleanup (hourly), audit log archival >2 years (weekly) |
| `convex/accountManagement.ts` | Enhance deletion to also remove: sessions, preferences, consent records, OAuth connections, API keys, passkeys |
| NEW: `convex/lib/anonymization.ts` | `anonymizeUser` - replace PII with hashed values. `anonymizeAuditLogs` - replace userId with "DELETED_USER_{hash}". |

---

## Priority 5: Privacy Settings in User Profile

**Files to change:**

| File | Change |
|------|--------|
| `src/components/window-content/user-settings-window.tsx` | Add "Privacy & Data" tab with: cookie consent toggles, consent history, "Download My Data" button, "Delete My Account" button, third-party service list |

---

## Priority 6: Breach Notification System

**Files to create:**

| File | Purpose |
|------|---------|
| NEW: `convex/schemas/securitySchemas.ts` | `dataBreaches` table |
| NEW: `convex/security/breachNotification.ts` | `reportBreach`, `notifyAuthority`, `notifyAffectedUsers`, `updateBreachStatus` |
| NEW: breach notification email template | Clear user notification + detailed authority report |

---

## Priority 7: Enhanced Compliance Window

**Files to change:**

| File | Change |
|------|--------|
| `src/components/window-content/compliance-window.tsx` | Add "Legal Documents" tab with downloadable DPA. Add subprocessor list. Add compliance checklist for admins. |
| NEW: `convex/compliance/ropa.ts` | `generateROPA` action - produce ROPA document on demand |

---

## Priority 8: Testing

**Test files to create:**

| File | Tests |
|------|-------|
| `tests/gdpr/cookie-consent.test.ts` | Banner display, preference saving, PostHog respects consent, consent withdrawal |
| `tests/gdpr/data-export.test.ts` | Export includes all data, machine-readable format |
| `tests/gdpr/account-deletion.test.ts` | Grace period, restoration, permanent deletion, all related data removed |
| `tests/gdpr/consent-tracking.test.ts` | Consent history accuracy, revocation works |
