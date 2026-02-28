# Product Rename to sevenlayers Master Plan

**Workstream root:** `/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/product-rename-sevenlayers`  
**Last updated:** 2026-02-25

---

## Mission

Execute a controlled rename from `l4yercak3` / `vc83` to `sevenlayers` across:

1. web/app user-facing identity,
2. backend domain/email defaults,
3. OAuth/callback/payment URL contracts,
4. seed/template/translation content,
5. production manual operations and rollback readiness.

Deliver with compatibility safety and deterministic queue-first execution.

---

## Pause decision (2026-02-25)

1. This stream is non-core under the one-primary-operator cutover.
2. Queue rows `PRN-002`..`PRN-051` are `BLOCKED` by `LOC-003`.
3. Resume only through explicit override from `/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/life-operator-one-of-one-cutover/TASK_QUEUE.md` after `LOC-009` is `DONE`.

---

## Reality Lock (codebase-backed)

As of 2026-02-25:

1. `1144` web/backend references in `src/`, `convex/`, `public/`, plus root config files.
2. `137` mobile references in `apps/operator-mobile` (display names, package IDs, deep-link scheme, bundle IDs).
3. Most critical runtime anchors are concentrated in:
   - `/Users/foundbrand_001/Development/vc83-com/src/middleware.ts`
   - `/Users/foundbrand_001/Development/vc83-com/src/app/layout.tsx`
   - `/Users/foundbrand_001/Development/vc83-com/convex/seedSystemDomainConfig.ts`
   - `/Users/foundbrand_001/Development/vc83-com/convex/emailService.ts`
   - `/Users/foundbrand_001/Development/vc83-com/convex/oauth/*.ts`
   - `/Users/foundbrand_001/Development/vc83-com/convex/stripe/*`

---

## Route Strategy

### Decision for this rollout

Use `app.sevenlayers.io` as the primary app URL in this release.

### Why

1. Current app shell is served at `/` (`src/app/page.tsx`), not `/app`.
2. OAuth/CLI/Integration callbacks are constructed using `NEXT_PUBLIC_APP_URL` throughout Convex and API routes.
3. A simultaneous `/app` base-path migration would increase callback and routing risk in the same release window.

### Deferred option

After rename stabilization, add a separate landing page on `sevenlayers.io` and optionally move app to `/app` via dedicated migration/proxy phase.

---

## Scope

### In scope

1. User-facing copy/labels/domains/emails.
2. Metadata/manifests/middleware domain allowlists.
3. Backend fallback URLs, sender defaults, and integration callback defaults.
4. Seed/template/translation brand references.
5. Manual external configuration updates (DNS, Vercel, Resend, OAuth, Stripe).

### Out of scope (unless separately approved)

1. Full mobile package/bundle/deep-link identity migration.
2. Storage/schema refactors that break compatibility.

### Compatibility protections

1. Preserve localStorage/internal keys unless explicitly migrated.
2. Preserve compatibility-critical enum values (e.g., auth source IDs) unless a migration plan exists.

---

## Implementation Plan by Lane

1. Lane `A`: freeze contract and protected exclusions.
2. Lane `B`: metadata + routing foundations.
3. Lane `C`: web UI and template copy updates.
4. Lane `D`: backend domain/email defaults and sample URL cleanup.
5. Lane `E`: OAuth/CLI/Stripe/webhook URL contract alignment.
6. Lane `F`: translation/seed sweep and deterministic reseed instructions.
7. Lane `G`: verification, cutover checklist, rollback readiness.
8. Lane `H`: optional mobile rename after explicit decision.

Queue source of truth:
`/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/product-rename-sevenlayers/TASK_QUEUE.md`

---

## Risks and Mitigations

1. Callback mismatch outages (OAuth/CLI integrations).
   - Mitigation: lane `E` requires one-pass callback list and dashboard update checklist before cutover.
2. Email deliverability regressions during mail-domain switch.
   - Mitigation: verify Resend domain first, keep previous domain active during transition, smoke test send flows.
3. Missed hardcoded fallback URLs in Convex defaults.
   - Mitigation: lane `D` + `V-GREP` residual sweep.
4. Checkout/payment flow regressions from stale URLs.
   - Mitigation: lane `E` Stripe URL sweep + checkout smoke tests in lane `G`.
5. Over-broad replacements causing compatibility breakage.
   - Mitigation: preserve documented exclusions and review residual references manually.

---

## Acceptance Criteria

1. Core branding/domain/email references are updated to `sevenlayers` contract in code and dashboards.
2. OAuth, CLI, and payment callbacks succeed using `app.sevenlayers.io`.
3. Resend sender/reply-to defaults align to new domain policy.
4. Verification stack passes:
   - `npm run typecheck`
   - `npm run build`
   - `npm run docs:guard`
5. Residual `l4yercak3|vc83` references are only intentional compatibility exceptions.
6. Manual runbook checklist is completed and archived with rollout evidence.

---

## Manual Runbook

Manual external steps and cutover sequence:
`/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/product-rename-sevenlayers/MANUAL_CHANGES_CHECKLIST.docx`
