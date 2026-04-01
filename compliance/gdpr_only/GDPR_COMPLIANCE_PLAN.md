# GDPR/DSGVO Compliance Plan (System Reality Baseline)

**Project:** vc83-com  
**Date:** 2026-03-26  
**Scope:** End-to-end backend + provider + contract operation for production DSGVO/GDPR compliance

---

## Executive summary

Your platform is no longer at an "early compliance" stage. The technical compliance machinery is already substantial and mostly implemented.  
The primary blocker is no longer architecture, but evidence closure and legal signoff.

Current strategic posture on **March 26, 2026**:

1. Compliance runtime and fail-closed control plane exist.
2. Legal/provider matrices are still largely unresolved (`abgelehnt`/`open`).
3. Convex migration evidence now includes post-cutover EU production (`dashing-cuttlefish-674` in `aws-eu-west-1`) with pre-cutover US snapshot retained for audit history.
4. Consent-dependent analytics handling is still not strict enough in runtime.
5. Release gates in compliance workstreams remain `NO_GO` until legal evidence and owner signoff are complete.

---

## What already exists (high confidence)

### 1. Compliance machinery is in place

1. `compliance/dsgvo_compliance_agent_factory` is queue-complete (`DCAF-001`..`DCAF-038` all `DONE`).
2. `compliance/dsgvo_kanzlei_agent_mvp` is queue-complete (`KAMVP-001`..`KAMVP-018` all `DONE`), but release gate is still `NO_GO`.
3. `compliance/knowledge_compliance_architecture` is queue-complete (`KCA-001`..`KCA-011` all `DONE`).

### 2. Technical controls already implemented

1. Compliance Inbox/Vault/Governance flows with fail-closed gate logic.
2. Evidence lifecycle + audit events.
3. AVV outreach workflow and transfer/security completeness workflows.
4. Owner/super-admin authority split and guardrail tests.
5. Runtime Kanzlei guardrails (approval, allowlists, audit telemetry).

---

## What is still open (and blocking `GO`)

### 1. Legal and transfer evidence closure

Based on current docs:

1. `AVV_62A_CHECKLIST.md`: active providers remain mostly `abgelehnt`.
2. `TRANSFER_IMPACT_REGISTER.md`: active paths remain mostly `open`.
3. `TOM_CONTROL_MATRIX.md`: provider TOM evidence still mostly `missing`.
4. `GO_LIVE_CHECKLIST.md`: mandatory rows are not fully `erfuellt`.

### 2. Runtime consent gap

Current code shows:

1. PostHog is initialized immediately in [`src/components/providers/posthog-provider.tsx`](/Users/foundbrand_001/Development/vc83-com/src/components/providers/posthog-provider.tsx).
2. Cookie banner exists but is not mounted in the app provider tree:
   - [`src/components/cookie-consent-banner.tsx`](/Users/foundbrand_001/Development/vc83-com/src/components/cookie-consent-banner.tsx)
   - no usage found in app shell.
3. No dedicated `privacy`, `terms`, or `cookies` routes are currently present under `src/app`.

This means analytics consent is not yet demonstrably fail-closed.

---

## Backend and subprocessor reality map

Active integrations are code-evidenced across `convex/*`, `src/*`, and app modules.  
Priority active providers to close first:

1. Convex (core backend/database).
2. Vercel (hosting/runtime + platform processing).
3. Stripe (payments and billing webhooks).
4. PostHog (analytics, consent-dependent).
5. Resend (email transport).
6. OpenRouter/OpenAI paths (AI workloads).

Feature-dependent or scope-dependent providers:

1. Twilio
2. Mux
3. Radar
4. ActiveCampaign
5. Vercel Analytics in side apps

---

## Convex + Vercel baseline decisions (2026-03-26)

### Convex

1. Convex documentation states deployments are region-selectable and currently includes **US East** and **EU West (Ireland)**.
2. Convex documentation states infrastructure is hosted in the selected region.
3. Convex documentation states existing deployment regions are not changed in place (migration required).
4. Convex pricing/legal pages state EU hosting availability and a surcharge model.
5. Runtime evidence snapshot on 2026-03-26 shows:
   - pre-cutover: legacy prod `agreeable-lion-828` in `aws-us-east-1`,
   - post-migration: EU target project `sevelayers-eu` with prod `dashing-cuttlefish-674` and dev `handsome-trout-897` in `aws-eu-west-1`.
   - evidence paths:
     - `/Users/foundbrand_001/Development/vc83-com/compliance/gdpr_only/evidence/2026-03-26_CONVEX_REGION_SNAPSHOT.md`
     - `/Users/foundbrand_001/Development/vc83-com/compliance/gdpr_only/evidence/2026-03-26_CONVEX_REGION_SNAPSHOT_POST_MIGRATION.md`.

Operational decision:

1. Treat Convex as your primary personal-data source-of-truth.
2. Keep Convex deployments for active production scope on explicit EU region settings and re-verify after changes.
3. Keep legacy non-EU deployments out of active regulated processing scope unless transfer controls are explicitly approved.
4. Continue fail-closed until Convex DPA/AVV/TOM evidence is fully linked in contract artifacts.

### Vercel

1. Vercel docs state new projects default Functions to `iad1` (Washington, D.C.) unless overridden.
2. Vercel docs support explicit function region configuration via project settings or config.
3. Vercel lists EU compute regions (for example `fra1`, `cdg1`, `lhr1`).
4. Vercel security FAQ states no permanent data storage inside EU regions (EU cache behavior can be ephemeral).
5. Vercel DPA includes SCC/UK IDTA transfer mechanisms and subprocessor references.
6. Runtime evidence snapshot on 2026-03-26 shows:
   - pre-redeploy: side projects on `iad1` (recorded for audit history),
   - post-redeploy: tracked linked projects (`vc83-com`, `segelschule-altwarp`, `guitarfingerstyle`) all on `serverlessFunctionRegion=cdg1` with latest prod deployment regions `cdg1/dub1/fra1`.
   - evidence paths:
     - `/Users/foundbrand_001/Development/vc83-com/compliance/gdpr_only/evidence/2026-03-26_VERCEL_REGION_SNAPSHOT.md`
     - `/Users/foundbrand_001/Development/vc83-com/compliance/gdpr_only/evidence/2026-03-26_VERCEL_REGION_SNAPSHOT_POST_REDEPLOY.md`.

Operational decision:

1. Configure function regions intentionally (do not rely on defaults).
2. Keep all tracked linked projects on explicit EU function-region settings and re-verify after every project-setting change.
3. Do not treat Vercel alone as your "EU-only permanent data store."
4. Keep sensitive personal-data storage in explicitly EU-region data systems, and document residual Vercel processing in transfer records.

---

## Contract system you should run now

Use the existing machinery, not a new parallel process:

1. `compliance/dsgvo_kanzlei_agent_mvp/AVV_62A_CHECKLIST.md` as canonical provider approval log.
2. `compliance/dsgvo_kanzlei_agent_mvp/TRANSFER_IMPACT_REGISTER.md` as canonical transfer risk register.
3. `compliance/dsgvo_kanzlei_agent_mvp/TOM_CONTROL_MATRIX.md` as technical/organizational evidence map.
4. `compliance/dsgvo_kanzlei_agent_mvp/GO_LIVE_CHECKLIST.md` as mandatory release criteria.
5. `compliance/dsgvo_kanzlei_agent_mvp/RELEASE_GATE_DECISION.md` as authoritative `GO/NO_GO` record.
6. `/Users/foundbrand_001/Development/vc83-com/docs/strategy/one-of-one-v4/existing-avvs-docs/` as the currently available AVV/SaaS/SLA baseline dossier to be mapped into provider-specific rows.

Sensitive contracts and signed documents:

1. Keep outside git as source-of-truth.
2. Store only metadata/evidence links in repo docs.
3. Keep checksum/hash + access logs in your evidence vault process.

---

## 10-business-day execution sequence

1. `Day 1`: Complete stack reality refresh and mark active vs feature-dependent providers.
2. `Day 1-2`: Prove production Convex region and Vercel region configuration with evidence links.
3. `Day 2-4`: Fix runtime consent path (PostHog opt-out default + mounted banner + consent persistence).
4. `Day 3-6`: Close AVV/DPA evidence for active providers first.
5. `Day 4-7`: Close transfer-impact rows for every active non-EEA or uncertain path.
6. `Day 5-8`: Close TOM evidence rows for active providers.
7. `Day 8-9`: Re-run docs/type/unit/integration validation and capture logs.
8. `Day 10`: Update release gate decision with named owner signoffs.

Queue-first execution artifact for this sequence:

- [`TASK_QUEUE.md`](/Users/foundbrand_001/Development/vc83-com/compliance/gdpr_only/TASK_QUEUE.md)

---

## Definition of done for "mastering the system"

Your system is "mastered" only when all are true:

1. Active provider rows are evidence-backed and not unresolved placeholders.
2. Transfer register has no unresolved active-path blockers.
3. Consent-dependent analytics is verified fail-closed in production runtime.
4. Go-live checklist mandatory rows are `erfuellt` with evidence links.
5. Release gate decision has explicit owner signoff and final verdict.

Until then, `NO_GO` is the correct and legally safer status.

---

## Linked workstream artifacts

1. [`INDEX.md`](/Users/foundbrand_001/Development/vc83-com/compliance/gdpr_only/INDEX.md)
2. [`MASTER_PLAN.md`](/Users/foundbrand_001/Development/vc83-com/compliance/gdpr_only/MASTER_PLAN.md)
3. [`TASK_QUEUE.md`](/Users/foundbrand_001/Development/vc83-com/compliance/gdpr_only/TASK_QUEUE.md)
4. [`SESSION_PROMPTS.md`](/Users/foundbrand_001/Development/vc83-com/compliance/gdpr_only/SESSION_PROMPTS.md)
