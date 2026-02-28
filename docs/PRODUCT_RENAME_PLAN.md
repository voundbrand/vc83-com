# Product Rename Implementation Plan: l4yercak3/vc83 -> sevenlayers

## Objective
Ship a safe, codebase-grounded rename from `l4yercak3` / `vc83` to `sevenlayers` across user-facing web surfaces, backend defaults, domains, email senders, and integration callbacks, while preserving compatibility-critical internal keys.

## Codebase Reality Snapshot (2026-02-25)
- `rg` scan over `src/`, `convex/`, `public/`, and config files found `1144` rename hits in web/backend scope.
- Additional mobile scope (`apps/operator-mobile`) contains `137` hits (including deep-link scheme, bundle IDs, and package naming).
- Domain/email hardcoded references (`l4yercak3.com`, `app.l4yercak3.com`, `vc83.com`, `@l4yercak3.com`, `@vc83.com`) appear in:
  - Next metadata + middleware + UI copy
  - Convex email services/actions and domain seed defaults
  - OAuth callback URL construction via `NEXT_PUBLIC_APP_URL`
  - Stripe/checkout defaults and webhook docs/comments
  - Seed/template/translation content

## Brand Contract
- Display name: `sevenlayers` (lowercase)
- Marketing domain: `https://sevenlayers.io`
- App domain: `https://app.sevenlayers.io`
- Mail domain: `mail.sevenlayers.io`
- Support email: `support@sevenlayers.io`
- Sales email: `sales@sevenlayers.io`

## URL Strategy Decision
Recommended for this rollout: keep app on `app.sevenlayers.io`.

Reason: current app is rooted at `/` (`src/app/page.tsx`) and callbacks/defaults are built around one app base URL (`NEXT_PUBLIC_APP_URL`). Moving to `sevenlayers.io/app` now would require a broader route/basePath migration plus OAuth/CLI callback re-registration in the same release.

Follow-up option (separate phase): introduce marketing site on `/` and proxy app under `/app` after rename is stable.

## Scope Boundaries
In scope:
- User-facing branding, domains, emails, metadata, app links, callback URLs, template/sample copy, and backend defaults.

Out of scope for initial cutover:
- Full internal identifier refactors where compatibility is required.
- Mobile package/bundle ID changes unless explicitly approved as part of the same release.

Compatibility no-change list:
- localStorage keys like `l4yercak3-theme`, `l4yercak3_webchat_*`, `vc83_window_state`
- Internal enum/storage identifiers such as `l4yercak3-oauth`
- Existing DB table names/function names unless specifically migrated

## Execution Plan (Checklist)
### Phase 0: Freeze + External Setup
- [ ] Confirm final production domains: `sevenlayers.io`, `www.sevenlayers.io`, `app.sevenlayers.io`, `mail.sevenlayers.io`
- [ ] Create/verify DNS records and TLS certificates
- [ ] Add domains in Vercel project settings
- [ ] Add and verify `mail.sevenlayers.io` in Resend

### Phase 1: Metadata + Routing
- [ ] Update package/web manifest and metadata defaults:
  - `/Users/foundbrand_001/Development/vc83-com/package.json`
  - `/Users/foundbrand_001/Development/vc83-com/public/site.webmanifest`
  - `/Users/foundbrand_001/Development/vc83-com/src/app/layout.tsx`
  - `/Users/foundbrand_001/Development/vc83-com/src/app/builder/layout.tsx`
  - `/Users/foundbrand_001/Development/vc83-com/src/app/builder/[projectId]/layout.tsx`
  - `/Users/foundbrand_001/Development/vc83-com/src/app/layers/layout.tsx`
  - `/Users/foundbrand_001/Development/vc83-com/src/app/agents/layout.tsx`
- [ ] Update primary domain handling and unknown-domain redirect:
  - `/Users/foundbrand_001/Development/vc83-com/src/middleware.ts`

### Phase 2: Web UI Rename (Customer-Facing)
- [ ] Desktop shell/start menu/welcome/about/tutorial/builder labels
- [ ] Upgrade/auth copy (`l4yercak3 login` messaging)
- [ ] Chat widget "Powered by" link + deployment snippets package docs
- [ ] Privacy/support/sales links and emails in checkout/purchase flows

### Phase 3: Backend Domain + Email Defaults
- [ ] Update system domain seed and domain fallback config:
  - `/Users/foundbrand_001/Development/vc83-com/convex/seedSystemDomainConfig.ts`
  - `/Users/foundbrand_001/Development/vc83-com/convex/emailTemplateRenderer.ts`
- [ ] Update email sender/reply-to defaults across Convex email actions/services:
  - `/Users/foundbrand_001/Development/vc83-com/convex/emailService.ts`
  - `/Users/foundbrand_001/Development/vc83-com/convex/actions/*.ts`
  - `/Users/foundbrand_001/Development/vc83-com/convex/ticketEmailService.ts`
  - `/Users/foundbrand_001/Development/vc83-com/convex/invoiceEmailService.ts`

### Phase 4: OAuth + Callback + Checkout URLs
- [ ] Update `NEXT_PUBLIC_APP_URL` fallbacks to `https://app.sevenlayers.io` where currently hardcoded
- [ ] Re-register OAuth callback URLs (Google/GitHub/Microsoft/Slack/WhatsApp/Vercel)
- [ ] Update CLI and auth callback/redirect URL references
- [ ] Update Stripe return/success/cancel URLs and webhook endpoint registrations

### Phase 5: Seed/Template/Translation Sweep
- [ ] Replace `vc83.com`/`cdn.vc83.com`/`l4yercak3.com` sample URLs in templates and seed registries
- [ ] Update translation seeds and support-email strings
- [ ] Re-run required seed/migration scripts where defaults are persisted in data

### Phase 6: Validation + Cutover
- [ ] Run rename grep validation and inspect remaining intentional exceptions
- [ ] Run docs/type/build checks
- [ ] Execute smoke checks on domain routing, auth callbacks, email sending, checkout, and onboarding
- [ ] Keep rollback mapping ready (old domain redirects + env rollback)

## Workstream Artifacts
Queue-first execution artifacts for this plan:
- `/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/product-rename-sevenlayers/TASK_QUEUE.md`
- `/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/product-rename-sevenlayers/SESSION_PROMPTS.md`
- `/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/product-rename-sevenlayers/INDEX.md`
- `/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/product-rename-sevenlayers/MASTER_PLAN.md`

Manual operations runbook (`.docx`):
- `/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/product-rename-sevenlayers/MANUAL_CHANGES_CHECKLIST.docx`

## Verification Commands
- `rg -n -i '(l4yercak3|vc83)' src convex public package.json .env*`
- `npm run typecheck`
- `npm run build`
- `npm run docs:guard`

