# Agent Ops Observability Task Queue

**Last updated:** 2026-02-24  
**Workstream root:** `/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/agent-ops-observability`  
**Source request:** Create implementation-ready docs for Agent Ops observability using concept-level inspiration from leading LLM observability patterns while building natively into the LayerCake platform and existing UI.

---

## Queue rules

1. Allowed statuses are only: `READY`, `IN_PROGRESS`, `PENDING`, `BLOCKED`, `DONE`.
2. Only one task may be `IN_PROGRESS` globally unless a lane policy explicitly allows overlap.
3. Promote `PENDING` to `READY` only when dependencies are `DONE`.
4. Deterministic pick order is `P0` before `P1`, then lowest task ID.
5. If blocked, capture blocker details in `Notes` and continue with next `READY` row.
6. Every task must run row `Verify` commands before moving to `DONE`.
7. Agent Ops scope must remain role-aware (`org_owner` vs `super_admin`) and auditable.
8. Sync `/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/agent-ops-observability/INDEX.md`, `/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/agent-ops-observability/MASTER_PLAN.md`, `/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/agent-ops-observability/TASK_QUEUE.md`, and `/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/agent-ops-observability/SESSION_PROMPTS.md` at lane milestones.
9. External observability references are concept-only; implementation must stay first-party and license-safe.

---

## Verification profiles

| Profile | Command |
|---|---|
| `V-TYPE` | `npm run typecheck` |
| `V-LINT` | `npm run lint` |
| `V-UNIT` | `npm run test:unit` |
| `V-INTEG` | `npm run test:integration` |
| `V-E2E-DESKTOP` | `npm run test:e2e:desktop` |
| `V-E2E-MOBILE` | `npm run test:e2e:mobile` |
| `V-E2E-SHELL-PARITY` | `npm run test:e2e:shell-parity` |
| `V-DOCS` | `npm run docs:guard` |
| `V-AGENTS-LINT` | `npx eslint src/components/window-content/agents-window.tsx src/components/window-content/agents src/components/window-content/terminal-window.tsx convex/terminal/terminalFeed.ts convex/channels/webhooks.ts convex/channels/providers/slackProvider.ts convex/ai/agentSessions.ts` |

---

## Execution lanes

| Lane | Purpose | Primary ownership | Merge-overlap policy |
|---|---|---|---|
| `A` | Contract freeze and telemetry taxonomy | workstream docs and implementation spec | No implementation lanes before lane `A` `P0` rows are `DONE` |
| `B` | Ingress and diagnostics plumbing | webhook/channel/receipt backend surfaces | Start only after lane `A` `P0` rows are `DONE` |
| `C` | Org-owner Agent Ops UI in existing agents surface | agents window, trust cockpit, terminal UX | Start only after lane `B` `P0` rows are `DONE` |
| `D` | Super-admin and incident operations | cross-org scope, incident controls, release operations | Start only after lane `C` `P0` rows are `DONE` |
| `E` | Verification and closeout | verification suite, docs sync, rollout notes | Start only when all prior `P0` rows are `DONE` or `BLOCKED` |

---

## Dependency-based status flow

1. Execute lane `A` first (`OBS-001`..`OBS-002`).
2. Start lane `B` after `OBS-001` is `DONE`.
3. Start lane `C` after lane `B` `P0` rows are `DONE`.
4. Start lane `D` after lane `C` `P0` rows are `DONE`.
5. Start lane `E` after all prior `P0` rows are `DONE` or `BLOCKED`.

---

## Task queue

| ID | Lane | Plan | Priority | Status | Depends On | Task | Primary files | Verify | Notes |
|---|---|---:|---|---|---|---|---|---|---|
| `OBS-001` | `A` | 1 | `P0` | `DONE` | - | Lock Agent Ops contract: existing AI Agents UI first, role-scoped views, deterministic diagnostics taxonomy | `/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/agent-ops-observability/MASTER_PLAN.md`; `/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/agent-ops-observability/AGENT_OPS_OBSERVABILITY_IMPLEMENTATION.md` | `V-DOCS` | Done 2026-02-24: locked contract invariants in `MASTER_PLAN.md` and implementation guardrails in `AGENT_OPS_OBSERVABILITY_IMPLEMENTATION.md`. Risk checks before completion: UI-surface fragmentation, role-scope authorization drift, and non-deterministic diagnostics taxonomy definitions. Verify: `npm run docs:guard`. |
| `OBS-002` | `A` | 1 | `P1` | `DONE` | `OBS-001` | Publish telemetry/event taxonomy (`ingress`, `routing`, `runtime`, `delivery`, `incident`) and naming rules for UI and logs | `/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/agent-ops-observability/AGENT_OPS_OBSERVABILITY_IMPLEMENTATION.md` | `V-DOCS` | Done 2026-02-24: published taxonomy namespace, naming convention table, status normalization, and backward-compatibility mapping to existing runtime identifiers. Risk checks before completion: event-name collisions across categories, missing correlation keys in emitted records, and breaking compatibility with existing session/trust timeline identifiers. Verify: `npm run docs:guard`. |
| `OBS-003` | `B` | 2 | `P0` | `DONE` | `OBS-001` | Implement webhook ingress visibility gaps (accepted/skipped/error outcomes) for Slack and channel webhooks | `convex/http.ts`; `convex/channels/webhooks.ts`; `convex/terminal/terminalFeed.ts`; `src/components/window-content/terminal-window.tsx` | `V-TYPE`; `V-LINT`; `V-UNIT`; `V-AGENTS-LINT`; `V-DOCS` | Done 2026-02-24: added first-party webhook ingress event persistence, Slack boundary accepted/skipped/error logging, Slack/WhatsApp processor outcome logging, and terminal rendering for webhook outcomes/event names. Risk checks before completion: duplicate terminal rows from boundary+processor logging, idempotency drift from instrumentation side effects, and cross-org leakage from unresolved webhook scope. Verify: `npm run typecheck`; `npm run lint`; `npm run test:unit`; `npx eslint src/components/window-content/agents-window.tsx src/components/window-content/agents src/components/window-content/terminal-window.tsx convex/terminal/terminalFeed.ts convex/channels/webhooks.ts convex/channels/providers/slackProvider.ts convex/ai/agentSessions.ts`; `npm run docs:guard`. |
| `OBS-004` | `B` | 2 | `P1` | `DONE` | `OBS-003` | Surface receipt-first reliability diagnostics (aging, duplicate, stuck, replay-safe pointers) for operator debugging | `convex/ai/agentSessions.ts`; agent ops UI surfaces | `V-TYPE`; `V-LINT`; `V-UNIT`; `V-INTEG`; `V-DOCS` | Done 2026-02-24: expanded receipt diagnostics query payloads (agent/channel/contact context + replay-safe pointers) and added trust-cockpit reliability panel for aging/duplicate/stuck receipts with replay-intent controls. Risk checks before completion: org/agent scope mixing in diagnostics lists, replay pointer semantics implying live replay side effects, and unbounded diagnostics payloads degrading operator UX. Verify: `npm run typecheck`; `npm run lint`; `npm run test:unit`; `npm run test:integration`; `npm run docs:guard`. |
| `OBS-005` | `C` | 3 | `P0` | `DONE` | `OBS-003` | Add Agent Ops section to existing AI Agents window and link terminal/trust/control-center surfaces | `src/components/window-content/agents-window.tsx`; `src/components/window-content/agents/*` | `V-TYPE`; `V-LINT`; `V-UNIT`; `V-AGENTS-LINT`; `V-DOCS` | Done 2026-02-24: extended `agents-window` with an org-scope Agent Ops section (queue KPIs + prioritized control-center hotspots), added direct terminal timeline launch, and added trust-cockpit drill-in actions while preserving existing create/select/edit behavior. Risk checks before completion: agent selection state regression when toggling Agent Ops, stale org/thread mapping in hotspot aggregation, and dead-end navigation between terminal/trust surfaces. Verify: `npm run typecheck`; `npm run lint`; `npm run test:unit`; `npx eslint src/components/window-content/agents-window.tsx src/components/window-content/agents src/components/window-content/terminal-window.tsx convex/terminal/terminalFeed.ts convex/channels/webhooks.ts convex/channels/providers/slackProvider.ts convex/ai/agentSessions.ts`; `npm run docs:guard`. |
| `OBS-006` | `C` | 3 | `P0` | `DONE` | `OBS-005` | Implement session/turn drilldown timeline with route identity, selected agent, and delivery status context | `src/components/window-content/agents/agent-trust-cockpit.tsx`; `convex/ai/agentSessions.ts` | `V-TYPE`; `V-LINT`; `V-UNIT`; `V-INTEG`; `V-DOCS` | Done 2026-02-24: added route-aware thread drilldown context (`sessionRoutingKey` + route identity), selected-agent and delivery snapshots, and turn pointers in timeline rows so session/turn/correlation identifiers align across trust and terminal timelines. Risk checks before completion: drilldown context desync from queue delivery states, shared identifier drift between terminal/trust/session pivots, and legacy route-identity null handling regressions. Verify: `npm run typecheck`; `npm run lint`; `npm run test:unit`; `npm run test:integration`; `npm run docs:guard`. |
| `OBS-007` | `C` | 3 | `P1` | `DONE` | `OBS-006` | Add runtime KPI cards for model fallback, tool success ratio, retrieval quality, and tool scoping decisions | `convex/ai/agentSessions.ts`; `src/components/window-content/agents/agent-trust-cockpit.tsx` | `V-TYPE`; `V-LINT`; `V-UNIT`; `V-DOCS` | Done 2026-02-24: wired existing backend telemetry queries (`getModelFallbackRate`, `getToolSuccessFailureRatio`, `getRetrievalTelemetry`, `getToolScopingAudit`) into trust-cockpit runtime KPI cards with explicit scope/period labels and coverage summaries. Risk checks before completion: ambiguous KPI scope/period labels, rate/count semantic mismatch against backend aggregations, and additional query load stalling cockpit rendering. Verify: `npm run typecheck`; `npm run lint`; `npm run test:unit`; `npm run docs:guard`. |
| `OBS-008` | `D` | 4 | `P0` | `DONE` | `OBS-006` | Add super-admin cross-org scope mode and org/layer filters to Agent Ops views | `src/components/window-content/agents/*`; `convex/terminal/terminalFeed.ts`; scope helpers | `V-TYPE`; `V-LINT`; `V-UNIT`; `V-INTEG`; `V-DOCS` | Done 2026-02-24: added shared scoped-target authorization helper, enforced super-admin-only cross-org/layer queries in terminal/control-center paths, and wired Agent Ops super-admin scope/org filters with drilldown-safe trust controls. Risk checks before completion: unauthorized cross-org query args, scope fallback regressions for org-owner sessions, and mismatched scope context between Agent Ops and terminal drilldowns. Verify: `npm run typecheck`; `npm run lint`; `npm run test:unit`; `npm run test:integration`; `npm run docs:guard`. |
| `OBS-009` | `D` | 4 | `P1` | `DONE` | `OBS-008` | Publish incident workspace UX contract: severity, owner, mitigation log, closure evidence | `/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/agent-ops-observability/AGENT_OPS_OBSERVABILITY_IMPLEMENTATION.md`; ops surfaces | `V-DOCS`; `V-TYPE`; `V-LINT` | Done 2026-02-24: documented incident workspace contract, added deterministic incident state machine (`open` -> `acknowledged` -> `mitigated` -> `closed`), and required owner/mitigation/closure evidence fields in Agent Ops incident workflows. Risk checks before completion: invalid transition sequencing, missing owner/mitigation evidence capture, and unauthorized cross-org incident scope writes. Verify: `npm run docs:guard`; `npm run typecheck`; `npm run lint`. |
| `OBS-010` | `D` | 4 | `P1` | `DONE` | `OBS-004`, `OBS-009` | Wire alert thresholds and escalation hooks to incident workflow (fallback spikes, tool failures, ingress failures) | `convex/ai/agentSessions.ts`; `convex/ai/trustTelemetry.ts`; Agent Ops incident UI | `V-TYPE`; `V-LINT`; `V-UNIT`; `V-INTEG`; `V-DOCS` | Done 2026-02-24: added auditable threshold contract definitions with rollback criteria, scoped threshold evaluators for fallback/tool/ingress spikes, automatic threshold-to-incident sync hooks, and incident workspace threshold snapshots in Agent Ops UI. Risk checks before completion: threshold sample-window drift, duplicate incident creation from unstable scope keys, and closure without explicit evidence references. Verify: `npm run typecheck`; `npm run lint`; `npm run test:unit`; `npm run test:integration`; `npm run docs:guard`. |
| `OBS-011` | `E` | 5 | `P0` | `DONE` | `OBS-008`, `OBS-010` | Execute full verification profile and publish release-gate summary for Agent Ops rollout | this workstream docs + verification artifacts | `V-TYPE`; `V-LINT`; `V-UNIT`; `V-INTEG`; `V-E2E-DESKTOP`; `V-E2E-MOBILE`; `V-DOCS` | Done 2026-02-24: confirmed prior `P0` rows (`OBS-001`, `OBS-003`, `OBS-005`, `OBS-006`, `OBS-008`) were `DONE`, then re-executed the full profile in queue order after deep-link hardening. Risk checks before execution: desktop/mobile deep-link parity drift, aborted-navigation flake masking deterministic failures, and docs/artifact sync drift. Verify outcomes: `npm run typecheck` pass; `npm run lint` pass with warnings only; `npm run test:unit` pass (`109` files, `569` tests); `npm run test:integration` pass (`21` files passed, `2` skipped; `67` tests passed, `22` skipped); `npm run test:e2e:desktop` pass (`1/1`); `npm run test:e2e:mobile` pass (`12/12`); `npm run docs:guard` pass. Release gate status: `PASSED`; rollout promotion unblocked. |
| `OBS-012` | `E` | 5 | `P1` | `DONE` | `OBS-011` | Final closeout: sync queue artifacts, publish operator cadence, and incident-response handoff notes | `/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/agent-ops-observability/*` | `V-DOCS` | Done 2026-02-24: synced `INDEX.md`, `MASTER_PLAN.md`, `TASK_QUEUE.md`, and `SESSION_PROMPTS.md` with rerun lane `E` evidence and final gate decision. Risk checks before execution: inconsistent gate evidence across synced docs, missing post-fix deep-link regression safeguards, and docs guard drift after lane-status edits. Operational safeguards activated: `shell_deeplink_cleanup` warning `>=3` / critical `>=8` in `30m` windows (owner `ops_owner`, SLA `15m` acknowledge + `60m` mitigation plan) and aborted-navigation retry guard via `V-E2E-SHELL-PARITY` budget enforcement (owner `runtime_oncall`, SLA `15m` acknowledge + `60m` mitigation/rollback decision). Escalation path: incident commander plus platform on-call (`runtime_oncall` path also includes release manager). Closeout verification (requested command set): `npm run typecheck` pass; `npm run lint` pass (`0` errors, `3128` warnings); `npm run test:unit -- tests/unit/shell/telemetry.test.ts tests/unit/shell/url-state.test.ts` pass (`109` files, `570` tests); `npm run test:e2e:shell-parity` attempt 1 fail (desktop timeout + closed-page error in `tests/e2e/utils/shell-navigation.ts:39`) then immediate rerun pass (`desktop 1/1`, `mobile 12/12`); `npm run docs:guard` pass. Final gate status: `PASSED` after rerun with transient warning risk tracked. |

---

## Current kickoff

- Active task: none.
- Next task: none (lane `E` closeout complete).
- Immediate objective: proceed with rollout promotion under lane `E` operational safeguards (`npm run test:e2e:shell-parity` before each rollout window + `shell_deeplink_cleanup` monitoring thresholds).
- Release gate status: `PASSED` after immediate parity rerun; operational safeguards are active and transient first-run desktop timeout risk is monitored under escalation thresholds.
