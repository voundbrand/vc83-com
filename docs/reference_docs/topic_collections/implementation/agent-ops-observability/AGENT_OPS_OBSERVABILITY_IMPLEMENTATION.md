# Agent Ops Observability Implementation

**Workstream root:** `/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/agent-ops-observability`  
**Queue source of truth:** `/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/agent-ops-observability/TASK_QUEUE.md`

---

## Objective

Implement a first-party Agent Ops observability system inside existing LayerCake surfaces using concept-level inspiration from mature LLM observability patterns.

The implementation target is not a separate product. The target is an operations mode layered into:

- `/Users/foundbrand_001/Development/vc83-com/src/components/window-content/agents-window.tsx`
- `/Users/foundbrand_001/Development/vc83-com/src/components/window-content/agents/agent-trust-cockpit.tsx`
- `/Users/foundbrand_001/Development/vc83-com/src/components/window-content/terminal-window.tsx`

---

## Product decision

Agent Ops is a capability of the existing AI Agents UI, not a standalone app.

Reasons:

1. users already navigate to AI Agents for runtime state and intervention,
2. trust, sessions, and terminal streams already exist in this area,
3. introducing a separate UI would split operator attention and duplicate controls.

### Contract freeze invariants (`OBS-001`)

1. existing AI Agents surfaces are the canonical product destination for Agent Ops,
2. role boundaries are explicit and enforced for every query and panel,
3. telemetry categories and statuses are deterministic and shared across backend and UI,
4. concept inspiration from external tools does not change first-party implementation ownership.

---

## Concept map (inspiration only)

The platform will reuse these concepts while keeping implementation native:

1. Trace timeline concept:
   - map to `agentSessions`, `agentTurns`, `agentSessionMessages`, and terminal entries.
2. Runtime quality signal concept:
   - map to existing backend aggregations in `convex/ai/agentSessions.ts` (fallback, tools, retrieval, tool scoping).
3. Ingress observability concept:
   - map to webhook processing and receipt-first ingestion (`convex/http.ts`, `convex/channels/webhooks.ts`, `convex/ai/agentExecution.ts`).
4. Incident workflow concept:
   - map to deterministic lifecycle states and operator drilldown in trust cockpit and control-center rows.

---

## Existing telemetry assets to wire

### Terminal and session assets

1. Terminal feed query:
   `/Users/foundbrand_001/Development/vc83-com/convex/terminal/terminalFeed.ts`
2. Terminal UI:
   `/Users/foundbrand_001/Development/vc83-com/src/components/window-content/terminal-window.tsx`
3. Control-center rows and drilldown:
   `/Users/foundbrand_001/Development/vc83-com/convex/ai/agentSessions.ts`

### Runtime KPI assets

1. retrieval telemetry: `getRetrievalTelemetry`
2. model fallback: `getModelFallbackRate`
3. tool success/failure: `getToolSuccessFailureRatio`
4. tool scoping audit: `getToolScopingAudit`
5. receipt diagnostics: `getAgingReceipts`, `getDuplicateReceipts`, `getStuckReceipts`

All are located in:

- `/Users/foundbrand_001/Development/vc83-com/convex/ai/agentSessions.ts`

### Channel ingress assets

1. Slack events and command routes:
   `/Users/foundbrand_001/Development/vc83-com/convex/http.ts`
2. webhook normalization and org resolution:
   `/Users/foundbrand_001/Development/vc83-com/convex/channels/webhooks.ts`
3. Slack inbound event parsing constraints:
   `/Users/foundbrand_001/Development/vc83-com/convex/channels/providers/slackProvider.ts`

---

## Gaps to close

1. ingress outcome visibility gap:
   operators need deterministic visibility when payloads are accepted, skipped, rejected, or errored.
2. UI wiring gap:
   runtime KPI queries exist but are not fully represented in Agent Ops screens.
3. reliability diagnostics gap:
   receipt diagnostics are not visible to operators in one workflow.
4. scope clarity gap:
   org-owner and super-admin capabilities need explicit UI and query scope boundaries.

---

## Agent Ops information architecture

### Org-owner mode

1. `Overview`
   - active sessions, errors, waiting-on-human count, fallback ratio, tool failure ratio.
2. `Timeline`
   - merged terminal stream plus session/turn drilldown.
3. `Channels`
   - ingress status by provider and recent webhook outcomes.
4. `Reliability`
   - aging/duplicate/stuck receipt panels with replay-safe debug pointers.
5. `Incidents`
   - open incidents for org scope with severity and mitigation notes.

### Super-admin mode

1. all org-owner panels,
2. cross-org and layer scopes,
3. hotspot tables (orgs by errors/fallback/tool failure),
4. release-gate and operations status summaries.

---

## Telemetry taxonomy contract

Use stable categories for all new operator-facing logs/cards:

1. `ingress.*`
   - webhook receive, signature result, normalize result, org resolution result.
2. `routing.*`
   - active agent resolution source, channel binding match, fallback selection.
3. `runtime.*`
   - model selection/fallback, tool results, retrieval quality.
4. `delivery.*`
   - outbound send success/failure and retry/dead-letter outcomes.
5. `incident.*`
   - incident open/ack/mitigate/close with actor and evidence.

### Event naming rules (`OBS-002`)

Use this format for event names:

1. `<category>.<action>.<result>`
2. category is one of: `ingress`, `routing`, `runtime`, `delivery`, `incident`
3. action is a short verb phrase such as `received`, `resolved_agent`, `tool_execution`, `posted`, `acknowledged`
4. result is one of: `success`, `warning`, `error`, `skipped`

Examples:

1. `ingress.received.success`
2. `ingress.normalized.skipped`
3. `routing.resolved_agent.success`
4. `runtime.model_fallback.warning`
5. `delivery.posted.error`
6. `incident.closed.success`

### Status normalization rules

Canonical status vocabulary:

1. `success`
2. `warning`
3. `error`
4. `skipped`

Mapping rules:

1. webhook accepted and processed -> `success`
2. valid but intentionally ignored payload (for example unsupported subtype) -> `skipped`
3. retryable degradation (partial data, fallback path) -> `warning`
4. failed signature/org resolution/runtime delivery -> `error`

Each emitted record must include:

1. `organizationId`,
2. `sessionId` when available,
3. `turnId` when available,
4. timestamp in epoch ms,
5. deterministic status (`success`, `warning`, `error`, `skipped`).

### Backward compatibility mapping

New Agent Ops categories must preserve correlation with existing records:

| Existing source | Existing keys | Compatibility rule |
|---|---|---|
| `agentSessions` | `_id`, `organizationId`, `channel`, `externalContactIdentifier` | Always include `sessionId` and `organizationId`; keep channel reference available in metadata. |
| `agentTurns` | `_id`, `sessionId`, `state`, `updatedAt` | Include `turnId` when turn exists; never emit turn-scoped event without `sessionId`. |
| `objectActions` (`message_processed`) | `actionData.sessionId`, `actionData.turnId` | Preserve existing session/turn pointers when projecting KPI cards and timeline rows. |
| `aiTrustEvents` | `payload.session_id`, trust event name | Keep trust timeline links at session granularity for drilldown joins. |
| `agentInboxReceipts` | `idempotencyKey`, `turnId`, `status` | Receipt diagnostics must retain original idempotency key and associated turn pointer. |

---

## Implementation chunks

1. `OBS-001`..`OBS-002`:
   freeze contract and taxonomy.
2. `OBS-003`..`OBS-004`:
   ensure ingress and receipt diagnostics are persisted and queryable for operations.
3. `OBS-005`..`OBS-007`:
   add Agent Ops panel and wire KPI and timeline views in existing AI Agents surfaces.
4. `OBS-008`..`OBS-010`:
   add super-admin cross-org controls and deterministic incident workflow.
5. `OBS-011`..`OBS-012`:
   run verification profile, publish gate summary, and closeout docs sync.

---

## Verification contract

Queue-defined verification profiles must be used.

Minimum release profile for `P0` rows:

1. `npm run typecheck`
2. `npm run lint`
3. `npm run test:unit`
4. `npm run test:integration`
5. `npm run docs:guard`

For UI-impacting rows and pre-rollout release gates, include:

1. `npm run test:e2e:shell-parity`
2. `npm run test:e2e:mobile:auth` when auth/session flows are touched.

`npm run test:e2e:shell-parity` is the canonical parity gate command and expands to desktop + mobile shell e2e suites.

---

## Incident response operating contract

For any `ingress`, `routing`, `runtime`, or `delivery` regression spike:

1. detect via Agent Ops KPI threshold,
2. isolate affected provider/org/session scope,
3. inspect timeline drilldown and receipt diagnostics,
4. apply mitigation and capture evidence,
5. close only when success criteria are stable across verification window.

### Incident workspace contract (`OBS-009`)

1. Incident states are deterministic and strictly ordered:
   `open` -> `acknowledged` -> `mitigated` -> `closed`.
2. `open` is created from explicit threshold breach or manual operator action.
3. `acknowledged` requires owner assignment (`ownerUserId` or explicit operator self-assignment).
4. `mitigated` requires a non-empty mitigation log entry.
5. `closed` requires closure evidence:
   - summary,
   - at least one evidence reference (runbook, ticket, log link, or replay proof),
   - actor + timestamp.
6. Every state transition emits an auditable `objectActions` record (`incident.opened`, `incident.acknowledged`, `incident.mitigated`, `incident.closed`).

### Threshold + escalation rules (`OBS-010`)

| Metric | Rule ID | Window | Warning | Critical | Escalation owner | Rollback criteria |
|---|---|---:|---:|---:|---|---|
| Model fallback spike | `agent_ops.fallback_spike.v1` | 24h | 25% | 40% | `runtime_oncall` | rollback if critical threshold holds for two consecutive evaluations |
| Tool failure spike | `agent_ops.tool_failure_spike.v1` | 24h | 18% | 30% | `runtime_oncall` | rollback when critical breach persists after mitigation replay checks |
| Ingress failure spike | `agent_ops.ingress_failure_spike.v1` | 24h | 3% | 8% | `ops_owner` | rollback ingress rollout when critical breach aligns with unresolved provider incident |

All threshold evaluations must be stored with observed value, threshold boundary used, sample size, and rule identifier so release/incident decisions remain reproducible.

### Shell deep-link safeguard runbook (`OBS-012` closeout)

| Monitor | Source | Warning threshold | Critical threshold | Owner | Response SLA | Escalation path |
|---|---|---|---|---|---|---|
| Deep-link cleanup telemetry (`shell_deeplink_cleanup`) | shell telemetry stream filtered to reasons `unknown_app_preflight`, `unknown_app_auth_loading`, `auth_required_deeplink` | `>=3` cleanup events with the same reason in any `30m` window | `>=8` cleanup events with the same reason in any `30m` window, or `>=2` consecutive warning windows | `ops_owner` | acknowledge within `15m`; mitigation plan in `60m` | `ops_owner` -> incident commander -> platform on-call |
| Aborted-navigation retry behavior | `npm run test:e2e:shell-parity` results + `shell-abort-retries` Playwright annotations | parity gate passes but records any retry at budget edge (`desktop=2` or `mobile=1`) | parity gate fails, or retry budget is exceeded in any shell test | `runtime_oncall` | acknowledge within `15m`; mitigation PR or rollback decision in `60m` | `runtime_oncall` -> incident commander + release manager + platform on-call |

Operational cadence:

1. run `npm run test:e2e:shell-parity` before every rollout window and attach artifacts to release evidence,
2. review `shell_deeplink_cleanup` counts every `30m` during the first promotion wave,
3. open/attach incident evidence immediately when a critical threshold is breached,
4. keep `.github/workflows/mobile-shell-qa.yml` aligned so CI executes the same `npm run test:e2e:shell-parity` release-gate command.

---

## Exit criteria

1. Agent Ops panels are available inside existing AI Agents UI.
2. Org-owner and super-admin scopes are explicit and enforced.
3. Slack/webhook ingress outcomes are visible even when processing is skipped.
4. Runtime KPI and receipt diagnostics are operator-accessible.
5. Incident flow is deterministic and auditable.
6. Queue docs are synchronized and `npm run docs:guard` passes.
