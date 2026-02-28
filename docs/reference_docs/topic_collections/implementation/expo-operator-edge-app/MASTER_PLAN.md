# Expo Operator Edge App Master Plan

**Date:** 2026-02-24  
**Workstream root:** `/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/expo-operator-edge-app`

---

## Mission

Deliver a first-party Expo operator app that can operate as a real-world edge client (phone camera/mic first, optional glasses adapters), while preserving one-agent authority, trust governance, and operator-grade usability.

---

## Product Decisions (Locked)

1. **One app, multiple input adapters**
   - One Expo app is the operator mobile surface.
   - Device adapters are interchangeable capture paths:
     - phone adapter (`Android`/`iPhone` camera + mic),
     - optional glasses adapter bridge.
2. **Primary authority remains server-side**
   - Mobile app is an ingress and control surface.
   - All mutating actions route through one-agent authority policy on backend.
3. **Native-first tool path**
   - Production path is native `vc83` tool-calling.
   - OpenClaw remains optional compatibility mode only.
4. **Operator UX must make trust understandable**
   - Trust gates are visible in plain language.
   - Override actions are explicit, scoped, and auditable.

---

## Trust Gate UX Contract

### Gate classes

1. **Hard gate (non-overridable in app)**
   - security-sensitive, legal/compliance, or platform-forbidden actions.
   - UX outcome: blocked + escalation path only.
2. **Soft gate (operator-overridable)**
   - potentially risky but allowed with explicit confirmation.
   - UX outcome: operator can approve with scope.

### Override scopes (soft gates only)

1. `Approve once` (single action token)
2. `Allow for this session` (session-scoped token)
3. `Allow for 1 hour in this domain` (time-bound domain token)
4. Persistent/autonomous policy changes are backend-governed and role-gated, not ad hoc mobile toggles.

### Explanation model (every gate card)

1. **What is being requested** (plain verb + object)
2. **Why this is gated** (one sentence)
3. **Risk if approved** (one sentence)
4. **What happens next** (approve/deny/escalate outcomes)
5. **Evidence trail** (decision reason and token scope logged)

---

## Lane A Contract Freeze (`EXPO-001`, `EXPO-002`)

### One-agent authority invariant (non-negotiable)

1. Expo mobile is ingress/control surface only.
2. Backend policy runtime is the only mutation authority.
3. Mobile can request actions, but cannot execute mutable tool operations directly.
4. Every mutable intent must pass backend trust-policy checks and approval-token validation before execution.

### Hard vs soft gate definitions (frozen)

1. **Hard gate**
   - Trigger class: legal/compliance blocks, platform forbidden actions, high-confidence abuse/security events.
   - App behavior: show blocked state plus escalation guidance; no override controls rendered.
2. **Soft gate**
   - Trigger class: potentially risky operations permitted with explicit operator accountability.
   - App behavior: show scoped override options with confirmation + reason capture.
3. **Override scope constraints**
   - Allowed scopes are exactly: `approve_once`, `session_allow`, `allow_1h_domain`.
   - Scope expansion beyond these three requires backend policy/workflow change, not client-side config.

### Backend ingress contract assumptions (frozen)

1. Mobile emits a canonical ingress envelope for all edge inputs (`chat`, `voice`, `camera`) with:
   - identity/context fields (`orgId`, `sessionId`, `operatorUserId`),
   - event metadata (`eventId`, `sourceAdapter`, `modality`, `submittedAt`),
   - payload reference fields (content or attachment references, not direct mutation execution).
2. Envelope versioning and validation logic are owned by backend policy contracts (`YAI-014`).
3. Mobile sends intent + context only; backend decides trust class and execution eligibility.

### Approval contract assumptions (frozen)

1. Backend trust decision payload must classify request as `hard_gate`, `soft_gate`, or `allow`.
2. For soft gates, backend returns the allowed override scope subset and policy explanation copy.
3. Override submission from mobile must include chosen scope + operator rationale and is evaluated server-side.
4. Backend-issued approval tokens are required for mutable execution and are scope-bound, time-bound, and context-bound.
5. Hard-gated requests never mint override tokens; only deny/escalate outcomes are valid.
6. Native vision-edge bridge assumptions remain tied to `YAI-015`; no direct bridge bypass is permitted.

---

## Architecture Blueprint

### App layers

1. **Capture adapters**
   - camera frames, microphone stream, push-to-talk, and attachment fallback.
2. **Realtime session runtime**
   - websocket/session lifecycle, reconnect policy, heartbeat, and transcript sync.
3. **Trust and action control**
   - trust-gate queue, approval actions, override scopes, and incident-safe UX.
4. **Operator workspace**
   - chat continuity, pending approvals, delivery statuses, and handoff context.
5. **Observability hooks**
   - ingress, routing, gate, approval, and delivery telemetry correlation IDs.

### Backend integration boundaries

1. Depends on one-agent-core authority contracts (`YAI-014`, `YAI-015`).
2. Mobile sends canonical ingress envelope only.
3. Mobile never executes direct mutations outside approved backend action path.
4. External bridge/tool compatibility (`YAI-016`) is optional and feature-flagged.

---

## Workstream Dependencies

1. `YAI-014@READY`: authority invariants + canonical ingress envelope contract.
2. `YAI-015@READY`: native vision-edge bridge contract.
3. `YAI-016@READY` only if optional compatibility mode is intentionally enabled.

---

## Delivery Phases

1. **Phase A: Trust and authority contract freeze (`EXPO-001`, `EXPO-002`)**
   - lock gate semantics and backend contract dependencies.
2. **Phase B: Expo shell and session foundation (`EXPO-003`, `EXPO-004`)**
   - auth, org context, chat continuity baseline.
3. **Phase C: Capture and transport (`EXPO-005`, `EXPO-006`, `EXPO-007`)**
   - phone camera/mic, live transport, canonical ingress payload.
4. **Phase D: Trust UX and overrides (`EXPO-008`, `EXPO-009`, `EXPO-010`)**
   - understandable gate cards, scoped approvals, hard-stop handling.
5. **Phase E: Action execution (`EXPO-011`, `EXPO-012`, `EXPO-013`)**
   - policy-safe tool requests, autonomy controls, optional compatibility mode.
6. **Phase F: Reliability and telemetry (`EXPO-014`, `EXPO-015`)**
   - offline/retry behavior, incident-grade observability.
7. **Phase G: Release readiness (`EXPO-016`, `EXPO-017`)**
   - QA matrix, rollout guardrails, and team handoff package.

---

## Risks and Mitigations

1. **Operator confusion risk**
   - Mitigation: strict plain-language gate cards and scoped decision UX.
2. **Policy bypass risk from mobile edge**
   - Mitigation: enforce canonical ingress envelope and backend-only mutation path.
3. **Realtime instability risk (mobile networks)**
   - Mitigation: reconnect/backoff, action idempotency keys, and offline queue.
4. **Scope creep risk (glasses + phone + compatibility at once)**
   - Mitigation: ship phone adapter first; gate optional adapters behind readiness tokens.
5. **External dependency risk**
   - Mitigation: native path is canonical; compatibility mode is optional and default `OFF`.

---

## Exit Criteria

1. Operators can use the Expo app with camera/mic edge input and chat fallback.
2. Trust-gate decisions are understandable and auditable in-app.
3. Soft-gate overrides are scoped and logged; hard-gate actions remain non-overridable.
4. All mutation requests flow through one-agent policy gates.
5. Mobile reliability and telemetry pass release thresholds.
6. Workstream docs (`INDEX.md`, `MASTER_PLAN.md`, `TASK_QUEUE.md`, `SESSION_PROMPTS.md`) remain synchronized and `npm run docs:guard` passes.
