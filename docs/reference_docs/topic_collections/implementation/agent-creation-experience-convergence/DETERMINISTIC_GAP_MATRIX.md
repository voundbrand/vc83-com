# Agent Creation Convergence Deterministic Gap Matrix

**Date:** 2026-02-19  
**Workstream root:** `/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/agent-creation-experience-convergence`

---

## Purpose

Capture the current codebase-to-target contract gaps for Lane `A` with deterministic anchors, without redefining completed runtime/trust foundations.

Status legend:

- `covered (reuse)`: implementation exists and should be reused.
- `partial`: implementation exists but does not satisfy the LayerCake target contract.
- `missing`: required behavior/contract is not yet implemented.

---

## Deterministic matrix

| Gap ID | Domain | Target contract | Current codebase evidence | Status | Deterministic gap to close | Queue closure |
|---|---|---|---|---|---|---|
| `ACE-GAP-001` | Creation flow | `Create Agent` starts with LayerCake platform-agent routing (`L1` -> `L2`) | `src/components/window-content/agents-window.tsx:187` routes directly to `AgentCreateForm`; `src/components/window-content/agents/agent-create-form.tsx:189` renders direct manual create/edit form | `partial` | Creation starts in manual form flow, not orchestrator-led agent handoff flow | `ACE-003`, `ACE-004`, `ACE-005` |
| `ACE-GAP-002` | Creation flow | Canonical platform-agent roster is executable in runtime routing | `convex/ai/sessionRoutingPolicy.ts:1` only handles model/auth pin decisions, not platform-agent role routing | `missing` | No runtime router for `Platform Orchestrator` -> specialist LayerCake agent path | `ACE-003`, `ACE-004`, `ACE-005`, `ACE-006`, `ACE-007` |
| `ACE-GAP-003` | Creation flow | Platform-agent creation and productivity loops share deterministic handoff payloads | `src/components/window-content/ai-chat-window/single-pane/chat-input.tsx:95` sends free-form assistant message flow; no LayerCake handoff payload contract in chat surfaces | `partial` | Chat runtime is available but not constrained to LayerCake creation/productivity handoff contracts | `ACE-004`, `ACE-005`, `ACE-006` |
| `ACE-GAP-014` | Creation flow | First-run launch uses separate chat window in default `slick` mode, without `Talk`/`Type` gate; desktop opens welcome + chat windows, mobile opens full-screen chat layer | `src/app/page.tsx:561` opens welcome window only on signed-in init; `src/app/page.tsx:318`..`:335` opens chat only via explicit helper; `src/components/window-content/ai-chat-window/index.tsx:40`..`:48` shows only `single-pane`/`three-pane`/`four-pane` layout modes | `missing` | No default separate-window `slick` launch contract yet, and no third chat mode for first-run creation | `ACE-005`, `ACE-006` |
| `ACE-GAP-004` | Trust flow | Soul-binding checkpoints are consent-gated and explicitly post-activation capable | `convex/ai/interviewRunner.ts:1470`..`convex/ai/interviewRunner.ts:1595` defines `cp0`..`cp3` checkpoints and source-attributed consent summaries | `covered (reuse)` | Keep this baseline unchanged and consume it in LayerCake workflows; do not mutate `trust-artifacts.v1` contracts | `ACE-008`, `ACE-010` |
| `ACE-GAP-005` | Trust flow | Soul proposal apply path requires explicit approval and rollback traceability | `convex/ai/soulEvolution.ts:1433` enforces approved proposal + explicit owner checkpoint; `convex/ai/soulEvolution.ts:2149` approval mutation + auditable trust event emission | `covered (reuse)` | Reuse existing proposal/rollback trust foundation rather than redefining proposal semantics | `ACE-015`, `ACE-016` |
| `ACE-GAP-006` | Trust flow | Super-admin soul access is constrained to `platform_soul_admin` (`L2` only, explicit actions, step-up/dual-approval/audit) | `docs/reference_docs/topic_collections/implementation/agent-creation-experience-convergence/TASK_QUEUE.md:82` tracks planned implementation; no runtime `platform_soul_admin` implementation in `convex/ai/*` | `missing` | Privileged platform-soul boundary contract is specified in docs but not enforced in runtime | `ACE-015`, `ACE-016` |
| `ACE-GAP-007` | Deployment handoff | Deployment handoff surfaces deterministic config + validation signals | `src/components/window-content/web-publishing-window/webchat-deployment-tab.tsx:633`..`:1049` implements setup/config/snippets/quick checks | `covered (reuse)` | Reuse webchat deployment contract as downstream handoff surface for LayerCake deployment guide | `ACE-006` |
| `ACE-GAP-008` | Deployment handoff | Deployment state is durable and multi-target, not synthesized | `src/components/window-content/web-publishing-window/deployments-tab.tsx:67` and `:103` state current flow uses page deployment info + mock deployment object | `partial` | Deployment list is synthesized from one record; no dedicated deployments-table contract yet | `ACE-006`, `ACE-011` |
| `ACE-GAP-009` | Deployment handoff | Agent creation completion hands off directly into deploy-ready pathway | `src/components/window-content/agents-window.tsx:204`..`:251` and `src/components/window-content/agents/agent-create-form.tsx:134` show standalone create flow without deployment handoff phase | `missing` | Creation and deployment are disconnected surfaces; no deterministic post-create deployment handoff contract | `ACE-006` |
| `ACE-GAP-010` | Release gates | Model conformance gating blocks enablement when thresholds fail | `convex/ai/platformModelManagement.ts:173` uses `evaluateModelEnablementReleaseGates` and blocks enablement on failure | `covered (reuse)` | Keep this gate as Layer 1 baseline; do not replace model gate logic | `ACE-010` |
| `ACE-GAP-011` | Release gates | Trust telemetry guardrails (`proceed`/`hold`/`rollback`) are wired into release control path | `convex/ai/trustTelemetry.ts:324` defines guardrail evaluator; search shows usage only in tests (`tests/unit/ai/trustTelemetryDashboards.test.ts:70`) | `partial` | Guardrail evaluator exists but is not yet wired as a release-blocking operation path | `ACE-010`, `ACE-011` |
| `ACE-GAP-012` | Release gates | Live soul-binding interview eval is a required executable gate before rollout | Playbook exists (`docs/reference_docs/topic_collections/implementation/agent-creation-experience-convergence/SOUL_BINDING_LIVE_EVAL_PLAYBOOK.md`), but no runtime references in `src/*` or `convex/*` | `missing` | Live interview gate is documented but not yet integrated into deterministic release gating flow | `ACE-008`, `ACE-009`, `ACE-011` |
| `ACE-GAP-013` | Release gates | Unified LayerCake release decision uses all four layers (model/workflow/live/telemetry) | Layer-specific logic exists in separate modules (`convex/ai/platformModelManagement.ts:173`, `convex/ai/trustTelemetry.ts:324`), no unified cross-layer aggregator | `missing` | No single gate decision contract composes all required layers into one release block/proceed output | `ACE-010`, `ACE-011`, `ACE-016` |

---

## Domain summary

| Domain | Covered (reuse) | Partial | Missing |
|---|---:|---:|---:|
| Creation flow | 0 | 2 | 2 |
| Trust flow | 2 | 0 | 1 |
| Deployment handoff | 1 | 1 | 1 |
| Release gates | 1 | 1 | 2 |

---

## Lane-A closure statement

Lane `A` is complete when:

1. LayerCake-first sequence is frozen in plan/queue docs (`ACE-001`),
2. this deterministic matrix is published and linked for downstream lanes (`ACE-002`),
3. downstream lanes consume `covered (reuse)` rows as non-rebuild constraints.
