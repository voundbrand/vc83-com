# Agent Ops Observability Master Plan

**Date:** 2026-02-24  
**Scope:** Ship an operations-grade Agent Ops observability system in the existing LayerCake platform by reusing proven observability concepts and implementing them as first-party platform behavior.

---

## Mission

Deliver one coherent Agent Ops operating model where:

1. org owners can see what their agents are doing and why,
2. super admins can oversee cross-org health and incidents,
3. Slack and other channel ingress flows are diagnosable end to end,
4. model/tool/retrieval performance and failures are visible through deterministic metrics,
5. release and incident decisions are runbook-driven and auditable.

---

## Why this workstream

Current foundations are strong but fragmented:

1. the terminal feed and trust cockpit surfaces already exist,
2. advanced telemetry queries exist in backend but are not fully surfaced,
3. webhook ingress diagnostics are incomplete in UI and persistence,
4. super-admin operations visibility is distributed across windows rather than one Agent Ops view.

---

## Concept reuse policy

This workstream reuses concepts, not vendor code.

Concept patterns to reuse:

1. trace-first debugging (session and turn timelines),
2. eval-aware operations (quality signals tied to runtime traces),
3. prompt/model/tool cost and fallback visibility,
4. incident-centric workflows (filter, triage, drill-down, mitigation evidence).

Hard boundary:

1. no third-party proprietary/EE code ingestion into platform codebase,
2. open-source references are for architecture patterns and operator UX decisions only.

### OBS-001 contract freeze (locked)

This workstream now treats these as non-negotiable execution invariants:

1. Agent Ops is implemented in existing AI Agents surfaces; no parallel standalone observability app is introduced in this stream.
2. Access is role-scoped by default (`org_owner` org scope, `super_admin` cross-org scope).
3. Observability naming and status semantics must be deterministic across ingress, routing, runtime, delivery, and incident categories.
4. External observability tools are concept references only; all implementation remains first-party and license-safe.
5. Missing evidence is not treated as success in rollout decisions.

---

## Current state in this codebase

Primary assets already available:

1. terminal feed aggregation:
   `/Users/foundbrand_001/Development/vc83-com/convex/terminal/terminalFeed.ts`
2. terminal UI shell:
   `/Users/foundbrand_001/Development/vc83-com/src/components/window-content/terminal-window.tsx`
3. trust cockpit and control-center drilldown:
   `/Users/foundbrand_001/Development/vc83-com/src/components/window-content/agents/agent-trust-cockpit.tsx`
4. channel webhook ingestion and Slack processing:
   `/Users/foundbrand_001/Development/vc83-com/convex/http.ts`
   `/Users/foundbrand_001/Development/vc83-com/convex/channels/webhooks.ts`
   `/Users/foundbrand_001/Development/vc83-com/convex/channels/providers/slackProvider.ts`
5. backend observability metrics (fallback, tools, retrieval, scoping, receipts):
   `/Users/foundbrand_001/Development/vc83-com/convex/ai/agentSessions.ts`
6. existing agents management surface:
   `/Users/foundbrand_001/Development/vc83-com/src/components/window-content/agents-window.tsx`

Known gaps to close in this stream:

1. webhook ingress instrumentation now covers Slack/WhatsApp accepted/skipped/error outcomes, but broader provider parity is still pending,
2. receipt reliability diagnostics and deterministic incident workflow controls are integrated with lane `E` evidence now passing the full verification profile,
3. super-admin scoped Agent Ops controls and closeout synchronization are complete; shell deep-link safeguards are now operationalized and must stay enforced during rollout windows.

---

## Target state

### Product surface

1. Agent Ops is implemented inside the existing AI Agents ecosystem,
2. org-owner mode defaults to current organization scope,
3. super-admin mode can switch to cross-org and layer-aware scope,
4. terminal timeline, trust timeline, and KPI dashboards are linked by common session/turn identifiers.

### Operational capabilities

1. ingress diagnostics: verified, routed, skipped, failed, delivered,
2. routing diagnostics: selected agent, policy source, channel binding match, fallback reason,
3. runtime diagnostics: model fallback rate, tool success/failure ratio, retrieval citation quality,
4. reliability diagnostics: aging/stuck/duplicate receipt views and replay-safe debugging,
5. incident operations: severity labeling, ownership assignment, mitigation notes, closure evidence.

---

## Role contracts

### Organization owner

1. see only their org data,
2. investigate channel messages to session/turn outcome,
3. monitor operational KPIs for day-to-day health,
4. execute documented incident-response playbook without privileged platform controls.

### Super admin

1. switch between org and cross-org/layer scopes,
2. compare error and fallback hotspots across orgs,
3. enforce global guardrails and release blocks,
4. access privileged diagnostics with explicit auditability.

---

## Lane mapping

| Phase | Objective | Queue lane | Queue tasks |
|---|---|---|---|
| Phase 1 | Contract freeze + telemetry taxonomy | `A` | `OBS-001`..`OBS-002` |
| Phase 2 | Ingestion and runtime diagnostics plumbing | `B` | `OBS-003`..`OBS-004` |
| Phase 3 | Org-owner Agent Ops UX in existing agents UI | `C` | `OBS-005`..`OBS-007` |
| Phase 4 | Super-admin cross-org operations and incident controls | `D` | `OBS-008`..`OBS-010` |
| Phase 5 | Verification gates and closeout docs sync | `E` | `OBS-011`..`OBS-012` |

---

## Rollout strategy

1. Stage 0: docs and contracts only.
2. Stage 1: ingest diagnostics + org-owner visibility in canary org.
3. Stage 2: super-admin cross-org panels with restricted operator cohort.
4. Stage 3: generalized rollout only after deterministic verification profile passes (lane `E` gate now `PASSED`; run `npm run test:e2e:shell-parity` before each rollout window).
5. Rollback: preserve existing agents and terminal surfaces, disable Agent Ops entry points behind feature flag if regression risk appears.

---

## Acceptance criteria

1. `TASK_QUEUE.md`, `SESSION_PROMPTS.md`, `INDEX.md`, and this plan remain synchronized.
2. Agent Ops implementation spec maps concepts to existing LayerCake runtime primitives.
3. Queue defines deterministic verification commands for each row.
4. Org-owner and super-admin scope boundaries are explicit.
5. Slack/webhook ingress diagnostics have explicit instrumentation tasks.
6. Runtime KPI tasks explicitly consume existing backend telemetry queries.
7. `npm run docs:guard` passes.

---

## Non-goals

1. replacing the entire existing agents UI with a separate observability product,
2. cloning external observability platforms into this repository,
3. introducing unscoped super-admin access without audit constraints,
4. changing trust schema contracts unrelated to operations visibility.

---

## Initial status

- Workstream initialized.
- Queue lanes and task dependencies defined.
- Lane `A` is complete (`OBS-001`, `OBS-002`).
- Lane `B` is complete (`OBS-003`, `OBS-004`).
- Lane `C` is complete (`OBS-005`, `OBS-006`, `OBS-007`).
- Lane `D` is complete (`OBS-008`, `OBS-009`, `OBS-010`).
- Lane `E` is complete (`OBS-011`, `OBS-012`) with rollout gate status `PASSED` after desktop/mobile deep-link verification rerun.

---

## Execution updates

1. **2026-02-24 (`OBS-001` complete):** locked Agent Ops contract invariants for existing-surface-first implementation, role-scoped access, deterministic telemetry semantics, and first-party implementation boundaries.
2. **2026-02-24 (`OBS-002` complete):** published taxonomy and naming conventions with normalized status vocabulary, required correlation keys, and compatibility mapping to existing session/turn/trust identifiers.
3. **2026-02-24 (`OBS-003` complete):** added webhook ingress observability persistence for Slack boundary and Slack/WhatsApp processing outcomes (`accepted`, `skipped`, `error`) and wired terminal feed rendering to show outcome/event-name context for operator triage.
4. **2026-02-24 (`OBS-004` complete):** surfaced receipt reliability diagnostics (aging, duplicate, stuck) and replay-safe debug pointers in the trust cockpit, backed by scoped receipt query payloads in `agentSessions`.
5. **2026-02-24 (`OBS-005` complete):** extended the existing AI Agents window with an Agent Ops section that surfaces org-scope queue metrics and control-center hotspots, and added direct drill-ins to terminal timeline and per-agent trust cockpit without replacing existing agent-management flows.
6. **2026-02-24 (`OBS-006` complete):** upgraded control-center thread drilldown payloads with route identity and session routing keys, selected-agent and delivery snapshots, and explicit turn pointers so trust timeline and terminal timeline correlate on shared session/turn/correlation identifiers.
7. **2026-02-24 (`OBS-007` complete):** integrated existing backend KPI aggregations (`getModelFallbackRate`, `getToolSuccessFailureRatio`, `getRetrievalTelemetry`, `getToolScopingAudit`) into trust-cockpit runtime cards with explicit period and organization/agent scope labels.
8. **2026-02-24 (`OBS-008` complete):** implemented super-admin scoped Agent Ops filters (org/layer) with backend authorization enforcement for cross-org access in terminal/control-center query paths and safe trust-drilldown gating.
9. **2026-02-24 (`OBS-009` complete):** implemented deterministic incident workflow primitives (`open` -> `acknowledged` -> `mitigated` -> `closed`) with owner assignment, mitigation logs, closure evidence requirements, and auditable transition actions.
10. **2026-02-24 (`OBS-010` complete):** wired fallback/tool/ingress threshold definitions to scoped evaluation snapshots and threshold sync hooks that open/update incidents using auditable rule IDs and rollback criteria.
11. **2026-02-24 (`OBS-011` complete):** executed full lane `E` verification profile in queue order; `typecheck`, `lint` (warnings only), `unit`, `integration`, `mobile e2e`, and `docs guard` passed, while `desktop e2e` failed across two runs in `tests/e2e/desktop-shell.spec.ts` (`/store?section=calculator` timeout + `net::ERR_ABORTED`, and unknown `app` deep-link cleanup assertion failure). Release gate marked `FAILED`; rollout promotion blocked.
12. **2026-02-24 (`OBS-012` complete):** synced queue artifacts (`INDEX.md`, `MASTER_PLAN.md`, `TASK_QUEUE.md`, `SESSION_PROMPTS.md`), published operator cadence and incident-response handoff notes, and re-ran `npm run docs:guard` successfully.
13. **2026-02-24 (`OBS-011` rerun closeout):** re-confirmed prior `P0` dependencies (`OBS-001`, `OBS-003`, `OBS-005`, `OBS-006`, `OBS-008`) were `DONE`, then re-ran the full profile in queue order after deep-link hardening: `typecheck` pass, `lint` pass with warnings, `unit` pass (`109` files, `569` tests), `integration` pass (`21` files passed, `2` skipped; `67` tests passed, `22` skipped), `desktop e2e` pass (`1/1`), `mobile e2e` pass (`12/12`), `docs guard` pass. Release gate moved to `PASSED`.
14. **2026-02-24 (`OBS-012` rerun closeout):** re-synced `INDEX.md`, `MASTER_PLAN.md`, `TASK_QUEUE.md`, and `SESSION_PROMPTS.md` to publish final gate verdict and operator cadence (`npm run test:e2e:shell-parity` pre-rollout gate + deep-link cleanup escalation path).
15. **2026-02-24 (Lane `E` safeguards operationalized):** codified runbook thresholds for `shell_deeplink_cleanup` and aborted-navigation retry behavior with explicit owners (`ops_owner`, `runtime_oncall`), response SLA (`15m` acknowledge, `60m` mitigation plan/rollback decision), and escalation routing (incident commander, release manager, platform on-call). Updated CI release workflow (`.github/workflows/mobile-shell-qa.yml`) to execute `npm run test:e2e:shell-parity` as the explicit parity gate command.
16. **2026-02-24 (closeout verification evidence refresh):** executed required command set for Lane `E` safeguards: `npm run typecheck` pass; `npm run lint` pass (`0` errors, `3128` warnings); `npm run test:unit -- tests/unit/shell/telemetry.test.ts tests/unit/shell/url-state.test.ts` pass (`109` files, `570` tests); `npm run test:e2e:shell-parity` first attempt failed (`desktop-shell.spec.ts` timeout + closed-page `page.goto` at `tests/e2e/utils/shell-navigation.ts:39`) and immediate rerun passed (`desktop 1/1`, `mobile 12/12`); `npm run docs:guard` pass. Gate remains `PASSED` with transient first-run desktop timeout treated as non-blocking but monitored.
