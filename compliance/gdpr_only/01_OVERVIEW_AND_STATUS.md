# GDPR Compliance Overview & Current Status

**Project:** vc83-com
**Date:** 2026-02-01
**Existing technical plan:** `docs/plans/compliance_gdpr/gdpr-compliance.md`

---

## Current Compliance Score: 35/100

### What's Already Working

| Feature | Status | Details |
|---------|--------|---------|
| Data export (Article 20) | DONE | `convex/compliance.ts` - JSON export of all user data |
| Account deletion (Article 17) | DONE | `convex/accountManagement.ts` - 14-day grace period + immediate deletion |
| Audit logging | DONE | Comprehensive audit trail for account actions |
| RBAC / access control | DONE | Role-based permissions across organizations |
| EU-hosted analytics | DONE | PostHog configured at `eu.i.posthog.com` |
| Password hashing | DONE | bcrypt/PBKDF2 with proper salting |
| Stripe webhook verification | DONE | Signature verification before processing |
| No local payment data storage | DONE | Stripe handles all card data |

### What's Missing

| Feature | Status | Risk Level |
|---------|--------|------------|
| Cookie consent banner | NOT DONE | CRITICAL - PostHog tracks without consent |
| Privacy policy page | NOT DONE | CRITICAL - legally required |
| Terms of service page | NOT DONE | HIGH |
| Cookie policy page | NOT DONE | HIGH |
| Consent tracking in database | NOT DONE | HIGH |
| PostHog blocked until consent | NOT DONE | CRITICAL |
| DPA for B2B customers | NOT DONE | HIGH |
| ROPA document | NOT DONE | HIGH |
| Subprocessor list | NOT DONE | MEDIUM |
| Breach notification process | NOT DONE | MEDIUM |
| DPO appointment | NOT DONE | MEDIUM |
| Data retention automation | PARTIAL | MEDIUM |
| EU Representative (if non-EU) | NOT DONE | HIGH (if applicable) |

---

## PII Inventory (What Personal Data You Store)

### In Your Database (Convex)

| Table/Field | Data | Required? |
|-------------|------|-----------|
| `users.email` | Email address | Yes |
| `users.firstName` | First name | No |
| `users.lastName` | Last name | No |
| `users.timezone` | Timezone | No |
| `users.preferredLanguage` | Language preference | No |
| `users.createdAt` / `updatedAt` | Timestamps | Auto |
| `organizations.email` | Contact email | No |
| `organizations.stripeCustomerId` | Stripe reference | Auto |
| `sessions` | Session tokens | Auto |
| `userPasswords` | Bcrypt hashes | If using password auth |
| `passkeys` | WebAuthn keys | If using passkeys |
| `apiKeys` | API credentials | If generated |
| `oauthConnections` | OAuth tokens | If using OAuth |
| `auditLogs` | User actions | Auto |

### NOT Stored Locally (Good)
- Credit card numbers (Stripe)
- IP addresses (not in schema)
- Browsing history
- Location data
- Device fingerprints

---

## Third-Party Services Processing Personal Data

| Service | What Data | Hosted Where | DPA Signed? |
|---------|-----------|-------------|-------------|
| Convex | All database data | US | [ ] |
| Vercel | Application logs, requests | US/EU | [ ] |
| Stripe | Payment info, customer IDs | US/EU | [ ] |
| PostHog | Analytics events, user email | EU | [ ] |
| Resend | Email addresses, email content | US | [ ] |
| Mux | Video viewing data | US | [ ] |
| Radar | Map/location queries | US | [ ] |
| OpenRouter | AI prompts, conversation context | US | [ ] |
| ActiveCampaign | Contact info, marketing prefs | US | [ ] |
| Font Awesome | Page load data (CDN) | US | [ ] |

---

## File Index

| File | Contents |
|------|----------|
| `01_OVERVIEW_AND_STATUS.md` | This file - current status and PII inventory |
| `02_REAL_WORLD_STEPS.md` | Business and legal actions you must take as a person |
| `03_CODE_CHANGES.md` | Technical implementation priorities |
| `04_SUBPROCESSOR_DPA_CHECKLIST.md` | DPA signing checklist for each third-party service |
| `05_ROPA_TEMPLATE.md` | Records of Processing Activities template |
| `06_BREACH_RESPONSE_PLAN.md` | Incident response process |
| `07_DSR_HANDLING_GUIDE.md` | How to handle Data Subject Requests |
| `08_ONGOING_OBLIGATIONS.md` | Recurring compliance tasks |
| `09_COST_ESTIMATE.md` | Budget for GDPR compliance |
