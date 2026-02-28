# Manual Changes Checklist: Product Rename to sevenlayers

Date: 2026-02-25
Owner: __________________________________________
Environment: `production` / `staging` (circle one)

## 1) Final target values

- App URL: `https://app.sevenlayers.io`
- Marketing URL: `https://sevenlayers.io`
- Sender domain: `mail.sevenlayers.io`
- Support email: `support@sevenlayers.io`
- Sales email: `sales@sevenlayers.io`

## 2) DNS and certificates

- [ ] Create/update DNS record for `sevenlayers.io` (landing host)
- [ ] Create/update DNS record for `www.sevenlayers.io`
- [ ] Create/update DNS record for `app.sevenlayers.io` (Vercel app host)
- [ ] Create/update DNS record for `mail.sevenlayers.io` (Resend domain)
- [ ] (If used) Create/update DNS record for `cdn.sevenlayers.io`
- [ ] (If used) Create/update DNS record for `checkout.sevenlayers.io`
- [ ] Confirm TLS certificates are valid for all active domains

## 3) Vercel project settings

- [ ] Add custom domains to project:
  - `sevenlayers.io`
  - `www.sevenlayers.io`
  - `app.sevenlayers.io`
- [ ] Update production environment variables (Vercel runtime):
  - `NEXT_PUBLIC_APP_URL=https://app.sevenlayers.io`
  - `NEXT_PUBLIC_SITE_URL=https://sevenlayers.io` (recommended)
  - `RESEND_FROM_EMAIL=sevenlayers <hello@mail.sevenlayers.io>`
  - `OPENROUTER_SITE_URL=https://app.sevenlayers.io` (optional on Vercel; primary use is Convex runtime)
- [ ] Keep unchanged unless you are migrating Convex deployment hostnames:
  - `NEXT_PUBLIC_CONVEX_URL`
  - `NEXT_PUBLIC_API_ENDPOINT_URL`
  - `NEXT_PUBLIC_CONVEX_SITE_URL`
- [ ] Trigger fresh production deploy after variable update

## 3b) Convex deployment environment variables

Set in Convex Dashboard for the active deployment (`dev` / `prod` as needed):

- [ ] `NEXT_PUBLIC_APP_URL=https://app.sevenlayers.io`
- [ ] `NEXT_PUBLIC_SITE_URL=https://sevenlayers.io`
- [ ] `OPENROUTER_SITE_URL=https://app.sevenlayers.io`
- [ ] `AUTH_RESEND_FROM=sevenlayers <hello@mail.sevenlayers.io>`
- [ ] `REPLY_TO_EMAIL=support@sevenlayers.io`
- [ ] `SALES_EMAIL=sales@sevenlayers.io`
- [ ] `SUPPORT_EMAIL=support@sevenlayers.io`

These are read directly by Convex handlers for callback URLs, generated links, sender defaults, and sales/support routing.

## 3c) Optional integration identity env vars

Only change these if you also want those integration identities renamed now:

- [ ] `VERCEL_INTEGRATION_SLUG` (current fallback if unset is `l4yercak3`)
- [ ] `TELEGRAM_BOT_USERNAME` (current fallback includes `l4yercak3`)
- [ ] `INFOBIP_APPLICATION_ID` / `INFOBIP_SMS_SENDER_ID` (if brand rename is required in Infobip setup)

## 4) Resend settings

- [ ] Add `mail.sevenlayers.io` in Resend Domains
- [ ] Add required DNS records (SPF/DKIM/DMARC) from Resend
- [ ] Confirm domain status is `verified`
- [ ] Keep old domain active until post-cutover email verification is complete
- [ ] Send one manual test email from production and verify SPF/DKIM pass

## 5) OAuth provider dashboards (callback URLs)

Register/verify these callback URLs:

- [ ] Google OAuth callback:
  - `https://app.sevenlayers.io/api/oauth/google/callback`
- [ ] GitHub OAuth callback:
  - `https://app.sevenlayers.io/api/oauth/github/callback`
- [ ] Microsoft OAuth callback:
  - `https://app.sevenlayers.io/api/oauth/microsoft/callback`
- [ ] Slack OAuth callback:
  - `https://app.sevenlayers.io/api/oauth/slack/callback`
- [ ] WhatsApp OAuth callback:
  - `https://app.sevenlayers.io/api/oauth/whatsapp/callback`
- [ ] Vercel OAuth callback:
  - `https://app.sevenlayers.io/api/oauth/vercel/callback`
- [ ] Unified auth callback (OAuth signup/login flow):
  - `https://app.sevenlayers.io/api/auth/oauth/callback`
- [ ] CLI callback host route:
  - `https://app.sevenlayers.io/api/auth/cli/callback`

## 6) Stripe dashboards and webhook endpoints

- [ ] Update checkout/return URL allowlists to new app domain
- [ ] Confirm these paths are accepted where applicable:
  - `https://app.sevenlayers.io/checkout/success`
  - `https://app.sevenlayers.io/checkout/cancel`
  - `https://app.sevenlayers.io/payments/return`
  - `https://app.sevenlayers.io/payments/refresh`
  - `https://app.sevenlayers.io/upgrade`
- [ ] Confirm webhook endpoints in Stripe:
  - `https://app.sevenlayers.io/api/stripe/ai-billing-webhooks`
  - `https://app.sevenlayers.io/api/webhooks/stripe-affiliate`

## 7) Convex post-deploy seed/migration commands

Run in the deployed environment you are cutting over:

- [ ] `npx convex run seedSystemDomainConfig:seedSystemDomainConfig '{"overwrite":true}'`
- [ ] `npx convex run seedInvoiceEmailTemplate:seedInvoiceEmailTemplate`
- [ ] `npx convex run seedInvoiceEmailTemplateV2:seedInvoiceEmailTemplateV2`
- [ ] `npx convex run seedConsolidatedInvoiceWorkflow:seedConsolidatedInvoiceWorkflow`
- [ ] `npx convex run translations/seedWelcomeTranslations:seed`
- [ ] `npx convex run translations/seedIntegrationsSlack:seed`
- [ ] `npx convex run translations/seedCheckoutFailed:seed`
- [ ] (If needed) `npx convex run translations/updateBranding:updateAllUppercaseReferences`

## 8) Application smoke checks

- [ ] Landing domain resolves and loads
- [ ] App domain resolves and loads desktop shell
- [ ] Login and OAuth connect flows succeed
- [ ] Checkout flow succeeds and redirect URLs are correct
- [ ] Email flows send from `mail.sevenlayers.io` with correct reply-to
- [ ] Support/sales links point to `@sevenlayers.io`
- [ ] Middleware unknown-domain redirect goes to `https://sevenlayers.io`

## 9) Rollback readiness

- [ ] Keep old domain DNS/certs available for rollback window
- [ ] Preserve previous Vercel env snapshot
- [ ] Preserve previous OAuth callback list and Stripe endpoint config
- [ ] Define rollback owner and maximum rollback window

## 10) Optional mobile identity migration (separate release)

- [ ] Decide go/no-go for mobile rename of:
  - Expo scheme (`l4yercak3` -> new scheme)
  - iOS bundle identifier
  - Android application ID/package
  - App display names and store listing metadata
- [ ] If yes, run as dedicated release with deep-link migration plan

## Sign-off

- Engineering lead: ____________________ Date: ___________
- Product owner: ______________________ Date: ___________
- Operations owner: ___________________ Date: ___________
