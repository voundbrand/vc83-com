# Web AI Chat Agent Vision Runtime Session Prompts

**Workstream root:** `/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/web-ai-chat-agent-vision-runtime`

Read first:

- `/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/web-ai-chat-agent-vision-runtime/TASK_QUEUE.md`
- `/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/web-ai-chat-agent-vision-runtime/MASTER_PLAN.md`
- `/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/web-ai-chat-agent-vision-runtime/INDEX.md`

Global execution rules:

1. Execute only rows in this queue.
2. Keep status values limited to `READY`, `IN_PROGRESS`, `PENDING`, `BLOCKED`, `DONE`.
3. Respect deterministic priority and dependency order from `TASK_QUEUE.md`.
4. Run row `Verify` commands exactly before marking `DONE`.
5. Keep scope constrained to web AI chat live-vision runtime, not unrelated UI/platform refactors.
6. Keep docs synchronized across `INDEX.md`, `MASTER_PLAN.md`, `TASK_QUEUE.md`, and this file.
7. Lane gating is strict: lane `B` cannot start before lane `A` closeout, lane `C` cannot start before lane `B` closeout.

Progress snapshot (2026-03-11):

- Workstream initialized.
- `WCV-001` is complete (fast-path contract freeze).
- `WCV-002` is complete (backend scoped freshest-frame resolver + strict freshness gate).
- `WCV-003` is complete (voice-turn freshest-frame resolution injected into transcript send path and runtime attachment ingress).
- `WCV-004` is complete (fast-path attach/miss coverage + no-regression voice-path integration evidence; required verify commands passed).
- `WCV-101` is complete (persisted robust rolling frame buffer contract for model-turn attachment selection with deterministic ordering, idempotency window handling, and TTL pruning; required verify commands passed).
- `WCV-102` is complete (retention-policy fail-closed enforcement + org/user/interview-session attachment isolation + resolver auth/policy fallback mapping to `vision_policy_blocked`; targeted integration/doc gates passed).
- `WCV-103` is complete (added `web_chat_vision_attachment_telemetry_v1` reason/counter/freshness taxonomy in `trustTelemetry.ts`, wired resolver telemetry snapshots in `voiceRuntime.ts`, and documented runtime reason-code mapping in retention runbook).
- `WCV-104` is complete (robust-path matrix evidence for policy/auth/freshness is now captured in integration tests and workstream docs; `typecheck`, targeted integration tests, and `docs:guard` passed).
- `WCV-201` is complete (persistent realtime multimodal session contract for audio+video path is frozen, including deterministic fallback precedence, one-way downgrade guardrail to turn-stitch runtime, and pre-`WCV-202` rollout safety constraints).
- `WCV-202` is complete (implemented feature-flagged persistent realtime multimodal backend lifecycle and Gemini Live adapter capability resolution, with resolve/open/close lifecycle metadata surfaced through API while preserving turn-stitch default behavior).
- `WCV-203` is complete (web runtime orchestration now propagates persistent-session-first lifecycle metadata across voice capture/send flows, gates turn-stitch vision-frame resolver usage to fallback mode only, and applies deterministic fallback metadata when persistent path is unavailable).
- `WCV-204` is complete (parity matrix against local VisionClaw/agents references and canary go/no-go evidence is now captured; lane `C` closeout complete).
- `WCV-205` is complete (post-parity hardening continuation: language-lock precedence and turn-vision attachment claim reliability fixes landed with targeted unit-test verification and docs sync).
- `WCV-206` is complete (remaining parity hardening closure: provider setup contract parity surfaced through runtime metadata + persistent lifecycle snapshots, VisionClaw 1fps video cadence guardrails, ambient short-utterance retry reliability, turn-time vision attach/degrade trust-event persistence, and observability/test coverage sync).
- `WCV-207` is complete (native-client parity risk closure: mobile Gemini metadata now asserts provider setup contract usage, and trust-event vision telemetry now deterministically recovers/derives `voice_session_id` when upstream omits it).
- `WCV-208` is complete (tri-reference adoption matrix freeze finalized in `MASTER_PLAN.md` with line-cited equal-weight evidence across VisionClaw + meta-lens-ai + OpenClaw + current vc83 runtime behavior).
- `WCV-209` is complete (voice WS handshake hardening landed: configurable connection-time timeout window, first-valid-frame `voice_session_open` gate before pre-open media/control envelopes, and deterministic fail-closed close reasons/codes; signed-ticket/replay/auth/fallback/kill-switch invariants preserved).
- `WCV-210` is complete (gateway outbound send paths now enforce deterministic slow-consumer buffered-amount guardrails with explicit `drop`/`close` policy branches, deterministic close reason `slow_consumer`, and telemetry counters exposed via `/metrics`; gateway + telemetry contract integration tests updated and passing).
- `WCV-211` is complete (gateway now emits versioned `gateway_ready.policy` envelope for payload/buffer/heartbeat contract, and mobile websocket connect fails closed when policy version/fields are incompatible before `voice_session_open`; targeted gateway/mobile policy tests are passing).
- `WCV-212` is complete (mobile websocket transport now performs bounded reconnect-before-downgrade with deterministic exponential backoff budget; transient close/error/connect failures retry within budget and downgrade one-way after budget exhaustion, while incompatible/missing `gateway_ready` policy still fails closed with immediate downgrade).
- `WCV-213` is complete (explicit relay heartbeat sequence-gap + stall-timeout detection now flows from gateway policy envelope into mobile realtime relay health decisions and transport metadata, with deterministic fail-closed reason codes preserved through telemetry/trust contract tests).
- Next READY-first row: `(none; lane C complete)`.

## Session A (Phase 1 Fast Path)

```text
You are Codex in /Users/foundbrand_001/Development/vc83-com.
Execute only Lane A rows from TASK_QUEUE.md.

Scope:
- WCV-001 .. WCV-004

Rules:
1) Freeze and follow the fastest shippable contract for per-turn freshest-frame attachment.
2) Keep fallback deterministic: if frame missing/stale/policy-blocked, degrade to voice-only with explicit reason code.
3) Do not widen architecture scope beyond attachment-path changes.
4) Preserve existing transcript continuity and interruption behavior.
5) Run Verify commands exactly as listed per row.
```

## Session B (Phase 2 Robust Path)

```text
You are Codex in /Users/foundbrand_001/Development/vc83-com.
Execute only Lane B rows from TASK_QUEUE.md.

Scope:
- WCV-101 .. WCV-104

Rules:
1) Start only after all lane A rows are DONE.
2) Add robust freshness/buffer/idempotency controls before introducing new UX behavior.
3) Enforce org/session/conversation auth and retention policy modes fail-closed.
4) Add measurable telemetry for attach/miss/drop causes and freshness drift.
5) Run Verify commands exactly as listed per row.
```

## Session C (Phase 3 Tri-reference Parity)

```text
You are Codex in /Users/foundbrand_001/Development/vc83-com.
Execute only Lane C rows from TASK_QUEUE.md.

Scope:
- WCV-201 .. WCV-213

Rules:
1) Start only after all lane B rows are DONE.
2) Move from turn-stitch multimodal payload assembly to persistent realtime multimodal session architecture.
3) Keep backward-compatible fallback to current runtime path until parity and canary evidence are complete.
4) Validate behavior against local references in docs/reference_projects/VisionClaw, docs/reference_projects/meta-lens-ai, and docs/reference_projects/openclaw with equal weighting.
5) For WCV-208..WCV-213, execute in strict order and preserve existing kill-switch, fallback, signed-ticket, replay, and fail-closed semantics.
6) No speculative refactors; parity-hardening deltas only.
7) Add/adjust unit tests for each behavior change and integration tests for gateway/mobile boundary contract changes.
8) Keep TASK_QUEUE.md, SESSION_PROMPTS.md, INDEX.md, and MASTER_PLAN.md synchronized per row.
9) Run Verify commands exactly as listed per row.
```
