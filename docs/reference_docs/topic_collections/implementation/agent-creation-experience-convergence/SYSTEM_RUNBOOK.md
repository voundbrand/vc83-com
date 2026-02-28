# System Runbook

**Workstream:** `/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/agent-creation-experience-convergence`  
**Date:** 2026-02-20

---

## Purpose

Provide one operator guide for launching, validating, and gating releases for the LayerCake platform-agent system, including unified integration endpoint migration and provider-extension operations.

---

## 1) Startup operating instructions

Run from repository root:

```bash
pwd
npm ci
[ -f .env.local ] || cp .env.local.example .env.local
npm run dev
```

Startup acceptance checks:

1. `npm run dev` boots without runtime exceptions.
2. Root app route renders and no fatal error overlay appears.
3. Creation entry opens AI chat in `slick` mode (no first-run `Talk`/`Type` chooser).
4. Desktop opens welcome + separate AI chat window; mobile opens full-screen AI chat layer.
5. `slick` surface renders the dedicated voice-circle capture control (not only a basic mic icon) and allows mode switch to `single` (basic) and workflow panes.

If startup acceptance fails, stop release activity and set gate state to `hold`.

---

## 2) Verification operating instructions

### Baseline profile (daily local confidence)

Run in this order:

```bash
npm run typecheck
npm run lint
npm run test:unit
npm run test:integration
```

### Lane F release profile (ACE-013 exact queue profile)

Run in this order exactly:

```bash
npm run typecheck
npm run lint
npm run test:unit
npm run test:model
npm run test:e2e:desktop
npm run test:e2e:mobile
npm run test:e2e:atx
npm run docs:guard
```

Verification policy:

1. Capture command outcome and timestamp for each command.
2. Any failed required command is a blocking condition for `proceed`.
3. Any `P0` behavior regression maps to at least `hold`.
4. Missing evidence is a gate failure and maps to at least `hold`.

### Layer 5 privileged control checks (required before `proceed`)

1. `platform_soul_admin` resolves only for authorized super-admin identities.
2. `L3` user-agent soul access is denied.
3. Elevation start requires fresh step-up + passkey (`startPlatformSoulAdminElevationAuth`).
4. Expired elevation blocks privileged writes.
5. Production `approve_apply` requires dual approval before apply.
6. Privileged actions without reason code, ticket id, or elevation id are rejected.
7. `trust.admin.platform_soul_*` events are emitted and schema-valid.

### Layer threshold matrix (deterministic)

| Layer | `proceed` threshold | `hold` threshold | `rollback` threshold |
|---|---|---|---|
| Model conformance | `npm run test:model` passes and meets thresholds from `convex/ai/modelConformance.ts` (`parse>=0.90`, `schema>=0.90`, `refusal>=0.85`, `latency_p95<=12000`, `cost_per_1k<=0.5`) | Missing run artifact, transient non-critical instability, or mitigation not yet closed | Any threshold breach in release candidate run |
| Workflow behavior | Typecheck/lint/unit/integration/E2E required commands all pass; no `P0` contract regressions | Non-`P0` defect with explicit remediation owner/date | Any `P0` regression or consent/guardrail bypass |
| Live soul-binding | Worksheet score `10-12`, no fail-fast, no missing required evidence | Worksheet score `7-9` or missing required evidence | Worksheet score `0-6` or any fail-fast condition |
| Trust telemetry | `evaluateTrustRolloutGuardrails` returns `proceed` | Guardrail returns `hold` (missing/warning metrics) | Guardrail returns `rollback` (critical metrics) |

Overall release decision reduction:

1. If any layer is `rollback`, final decision is `rollback`.
2. Else if any layer is `hold`, final decision is `hold`.
3. Else decision is `proceed`.
4. Missing evidence cannot be promoted to `proceed`.

---

## 3) Release decision matrix

Use:

- `/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/agent-creation-experience-convergence/RELEASE_GATE_CHECKLIST.md`

Checklist contract:

1. Evaluate every gate layer and record status as one of: `proceed`, `hold`, `rollback`.
2. Every row must include evidence references (command output artifact, worksheet id, trust KPI snapshot id, or audit log id).
3. Missing evidence is a blocking condition and maps to at least `hold`.
4. Privileged-control checks are mandatory: step-up auth evidence, non-expired elevation evidence, dual-approval evidence for prod apply, and reason/ticket evidence.
5. Final decision uses deterministic reduction:
   - if any row is `rollback`, final decision is `rollback`,
   - else if any row is `hold`, final decision is `hold`,
   - else final decision is `proceed`.

`Proceed` is disallowed unless all rows are `proceed`.

---

## 4) Live-eval operating instructions

1. Run one interview session using:
   - `/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/agent-creation-experience-convergence/SOUL_BINDING_LIVE_EVAL_PLAYBOOK.md`
2. Complete worksheet fields (identity, guardrails, consent, productivity, handoff, deployment readiness).
3. Assign score and map result:
   - `10-12` -> candidate `proceed`,
   - `7-9` -> `hold`,
   - `0-6` or any fail-fast trigger -> `rollback`.
4. Attach worksheet id and artifact references to:
   - `/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/agent-creation-experience-convergence/RELEASE_GATE_CHECKLIST.md`
5. Missing worksheet evidence blocks `proceed`.

---

## 5) Incident-response operating instructions

When production or canary quality drops:

1. Set release state to `hold` immediately.
2. Capture failing metrics and impacted flows.
3. Run targeted verification for the impacted layer:
   - model issue: `npm run test:model`
   - workflow issue: `npm run test:unit`, then `npm run test:e2e:desktop`, `npm run test:e2e:mobile`, `npm run test:e2e:atx`
   - documentation/process issue: `npm run docs:guard`
4. If consent, safety, or privileged-control boundary is impacted, set gate to `rollback` and remove route exposure until remediated.
5. Open remediation tasks in this workstream queue with owner/date and evidence references.
6. Reopen release only after all failed gates return to passing evidence.
7. For unified integration endpoint incidents, execute section `8` rollback steps.

---

## 6) Daily operator cadence

1. Start runtime and complete startup acceptance checks.
2. Run baseline verification profile.
3. Run model and workflow release-gate checks.
4. Run at least one live soul-binding eval session.
5. Complete release checklist row statuses with evidence.
6. Publish final gate decision (`proceed`, `hold`, `rollback`).

---

## 7) Evidence package requirements

Every release decision must include:

1. command results summary for all eval layers,
2. live soul-binding worksheet output,
3. completed release checklist row set with evidence links,
4. explicit gate outcome (`proceed`, `hold`, `rollback`),
5. linked remediation tasks for non-passing outcomes.

---

## 8) Unified integration endpoint migration + rollback operations

Primary playbook:

- `/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/agent-creation-experience-convergence/INTEGRATION_ENDPOINT_MIGRATION_PROVIDER_PLAYBOOK.md`

Run this command profile before and after migration cutover:

```bash
npm run typecheck
npm run lint
npm run test:unit
npm run test:integration
npm run docs:guard
```

Rollback triggers for unified ingress:

1. confirmed cross-org routing,
2. sustained ambiguous/missing tenant resolution spikes,
3. sustained signature verification mismatch after deployment.

Rollback minimum sequence:

1. Set gate status to `hold`.
2. Shift traffic back to legacy mapping path.
3. Pause migration/backfill writes.
4. Restore pre-cutover metadata snapshot for affected installations.
5. Re-run verification profile and publish incident evidence summary.

---

## 9) Provider-extension operating gates (Google/Microsoft)

Before onboarding a new provider to `/integrations/{provider}/*`:

1. keep endpoint naming aligned with Slack contracts (`oauth/callback`, `events`, `commands`, `interactivity`),
2. require provider-specific verification before tenant resolution,
3. enforce same fail-closed single-tenant resolution contract (`missing` and `ambiguous` reject),
4. preserve super-admin restriction on platform-managed manifest export,
5. run verification profile from section `8` and document decision (`proceed`, `hold`, `rollback`).
