# Life Operator One-of-One Cutover Session Prompts

Use these prompts to execute this workstream lane-by-lane with deterministic queue behavior.

**Last synced:** 2026-02-28 (`LOC-001`..`LOC-028`, `LOC-032`, `LOC-036`, and `LOC-037` are `DONE`; `LOC-029` is `IN_PROGRESS`; lane `J` cleanup sprint queued with `LOC-038` `READY`)

Workstream root:
`/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/life-operator-one-of-one-cutover`

Queue:
`/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/life-operator-one-of-one-cutover/TASK_QUEUE.md`

---

## Global execution rules

1. Run only tasks in this queue.
2. Keep statuses limited to `READY`, `IN_PROGRESS`, `PENDING`, `BLOCKED`, `DONE`.
3. Apply one-of-one cut criteria before any status promotion.
4. Do not re-enable AGP rows `AGP-021`..`AGP-035` unless this queue publishes explicit override.
5. Enforce layered behavioral contract language in docs/runtime decisions: `prompt + memory + policy + tools + eval + trust`.
6. Treat `soul` updates as full behavioral-system updates, not prompt-only persona edits.
7. Run row `Verify` commands exactly.
8. Sync `INDEX.md`, `MASTER_PLAN.md`, `TASK_QUEUE.md`, and this file at lane milestones.
9. For demo-lane work, preserve one visible operator UX and keep specialist routing hidden by default.
10. For memory-lane work, keep extraction provenance explicit and fail closed on cross-tenant/cross-org boundaries.
11. Treat five-layer completion as valid only while `LOC-020` remains `DONE` with synced acceptance evidence.
12. For pharmacist-vacation lane work, reuse existing Slack endpoints/provider normalization and existing calendar conflict/readiness primitives; do not create parallel integration stacks.
13. For lane `H`, keep `LOC-032`/`LOC-026` evidence intact (`DONE`), then ship baseline capability (`LOC-027`..`LOC-030`), then hardening + parity closeout (`LOC-031`..`LOC-035`) without weakening trust gates.
14. For lane `I`, enforce iPhone release hygiene: Node runtime contract, icon preflight, and CI/workflow parity with runbook/docs synchronization.
15. For lane `J`, execute cleanup stabilization in strict order starting with user-blocking simulator focus/keyboard UX regressions before broader hygiene/deprecation work.

---

## Session A (Lane A: strategy lock + queue triage)

You are Codex in `/Users/foundbrand_001/Development/vc83-com`.
Execute only lane `A` rows from:
`/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/life-operator-one-of-one-cutover/TASK_QUEUE.md`

Rules:

1. Decide keep/freeze/defer from current queue/code evidence only.
2. Freeze by setting `BLOCKED` with explicit reason and unfreeze condition.
3. Do not perform runtime refactors in this lane.
4. Run `V-DOCS` exactly.
5. Stop when lane `A` has no promotable rows.

---

## Session B (Lane B: runtime/UI cleanup)

You are Codex in `/Users/foundbrand_001/Development/vc83-com`.
Execute only lane `B` rows from:
`/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/life-operator-one-of-one-cutover/TASK_QUEUE.md`

Rules:

1. Remove marketplace/recommender defaults from operator path.
2. Preserve super-admin control center and audit features.
3. Fail-close compatibility flags to `OFF` by default for legacy store paths.
4. Keep one-agent authority and approval invariants unchanged.
5. Run row `Verify` commands exactly.
6. Stop when lane `B` has no promotable rows.

---

## Session C (Lane C: contract simplification)

You are Codex in `/Users/foundbrand_001/Development/vc83-com`.
Execute only lane `C` rows from:
`/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/life-operator-one-of-one-cutover/TASK_QUEUE.md`

Rules:

1. Reframe catalog semantics to capability packs, not runtime persona sprawl.
2. Keep deterministic schema/derivation behavior; do not hand-wave.
3. Publish anti-`Her` invariant explicitly: global updates cannot overwrite personal identity memory.
4. Run row `Verify` commands exactly.
5. Stop when lane `C` has no promotable rows.

---

## Session D (Lane D: verification + closeout)

You are Codex in `/Users/foundbrand_001/Development/vc83-com`.
Execute only lane `D` rows from:
`/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/life-operator-one-of-one-cutover/TASK_QUEUE.md`

Rules:

1. Validate trust, utility, and rollback contracts before closeout.
2. Fail closeout if legacy marketplace defaults are still reachable.
3. Publish rollout and rollback criteria with explicit evidence links.
4. Run row `Verify` commands exactly.
5. Stop when lane `D` has no promotable rows.

---

## Session E (Lane E: demo-readiness capability system)

You are Codex in `/Users/foundbrand_001/Development/vc83-com`.
Execute only lane `E` rows from:
`/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/life-operator-one-of-one-cutover/TASK_QUEUE.md`

Rules:

1. Keep one primary operator as the only default customer-facing surface.
2. Derive capability packs deterministically from catalog/tool contracts; do not introduce ad-hoc persona routing.
3. Require explicit `available_now` vs `blocked` explanations with concrete unblocking steps.
4. Build demo playbooks that prove utility, trust, and clarity in <=7 minutes each.
5. Gate "demo ready" claims on scorecard evidence, not narrative confidence.
6. Run row `Verify` commands exactly.
7. Stop when lane `E` has no promotable rows.

---

## Session F (Lane F: memory runtime completion)

You are Codex in `/Users/foundbrand_001/Development/vc83-com`.
Execute only lane `F` rows from:
`/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/life-operator-one-of-one-cutover/TASK_QUEUE.md`

Rules:

1. Complete memory layers in deterministic order: pinned notes (`L3`) -> rolling summary/recent context (`L2`/`L1`) -> reactivation (`L5`) -> structured contact memory (`L4`) -> `aiAgentMemory` contract closure.
2. Preserve one-visible-operator UX and authority invariants while expanding memory context.
3. Enforce tenant-safe and org-safe memory access; fail closed on ambiguous scope.
4. Prefer extraction from user inputs and verified tool outputs; avoid assistant-text-only memory writes.
5. Keep prompt memory assembly budget-aware by selected model context length.
6. Implement world-class memory contract requirements: typed durable writes, provenance fields, deterministic merge/dedupe rules, and reversible mutation path.
7. Keep runtime memory read layering deterministic: `L3 -> L2 -> L5 -> L4` unless queue/docs explicitly revise this order.
8. Keep memory architecture marked complete only while queue row `LOC-020` stays `DONE` with test and docs evidence.
9. Run row `Verify` commands exactly.
10. Stop when lane `F` has no promotable rows.

---

## Session G (Lane G: pharmacist vacation scheduler runtime)

You are Codex in `/Users/foundbrand_001/Development/vc83-com`.
Execute only lane `G` rows from:
`/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/life-operator-one-of-one-cutover/TASK_QUEUE.md`

Rules:

1. Build on existing Slack ingest contracts (`/integrations/slack/events`, `/integrations/slack/commands`) and provider normalization flow.
2. Build on existing OAuth/profile contracts (`oauthConnections`, `slack_settings`) and existing integration UI surfaces.
3. Use current calendar conflict/readiness primitives (`availabilityOntology`, `calendarSyncOntology`, `calendarSyncSubcalendars`) before introducing any new evaluator code.
4. Conflict outputs must be deterministic and include alternatives + direct colleague-resolution guidance.
5. Calendar mutations are allowed only for approved outcomes with write-ready integration state and trust evidence.
6. Unknown prerequisites fail closed to `blocked` with concrete unblocking steps.
7. Run row `Verify` commands exactly.
8. Stop when lane `G` has no promotable rows.

---

## Session H (Lane H: mobile-first live concierge + parity runtime)

You are Codex in `/Users/foundbrand_001/Development/vc83-com`.
Execute only lane `H` rows from:
`/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/life-operator-one-of-one-cutover/TASK_QUEUE.md`

Rules:

1. Treat iPhone app (`apps/operator-mobile`) as the primary and sufficient runtime surface; do not require webchat relay for baseline completion.
2. Implement in deterministic order: `LOC-027` -> `LOC-028` -> `LOC-029` -> `LOC-030` -> `LOC-031` -> `LOC-033` -> `LOC-034` -> `LOC-035` (`LOC-032`, `LOC-026`, `LOC-027`, and `LOC-028` are already `DONE`; start at `LOC-029`).
3. Keep trust/approval gates fail-closed for mutating intents; preview-first or explicit confirmation is mandatory for booking execution.
4. Copy OpenClaw strong patterns conceptually:
   - provider/ingress registry (explicit source registration, no implicit execution),
   - command gating and allowlisted action routing,
   - node command policy guardrails with explicit denials for non-allowlisted mutations.
5. Preserve tenant/org scoping invariants and idempotency semantics in all mobile-originated execution paths.
6. Track and emit payload-generation + execution latency telemetry with `<60s` demo target.
7. Run row `Verify` commands exactly.
8. `LOC-035` cannot close until external parity gates are also green: `AVR-012` and `FOG2-016` must both be `DONE` (both are satisfied as of 2026-02-27).

Copy/paste implementation prompt:

```text
You are implementing lane H in /Users/foundbrand_001/Development/vc83-com.

Goal:
Ship a mobile-first (iPhone-first, Meta-glasses-capable) live concierge runtime that captures voice/camera context, assembles meeting concierge payloads, and executes guarded booking actions with world-class parity across webchat and iPhone chat.

Scope for this pass (ship now):
1) LOC-029: add concierge entity extraction + intent mapping from mobile voice/camera context into manage_bookings action run_meeting_concierge_demo fields.
2) LOC-029 guardrails: preview-first and explicit confirm/approval before mutating execute path.
3) LOC-030: add telemetry + tests for payload assembly, missing-field fallback, tool invocation success, and end-to-end latency visibility.
4) LOC-033: close webchat/iPhone metadata parity (`commandPolicy`, `transportRuntime`, `avObservability`) in the shared send envelope.

Baseline already complete:
- LOC-027: operator-mobile send/sync + pending approvals now backend-authoritative.
- LOC-028: mobile AV source registry + allowlisted command gating is `DONE` (explicit source registration, fail-closed unknown/unsafe command policy).

Non-goals for this pass:
- Do not require webchat as a dependency.
- Do not add broad new marketplace/catalog surfaces.
- Do not weaken trust/approval gates.

"Do it right after baseline" follow-up:
- LOC-031 + LOC-034: full realtime Meta DAT/WebRTC bridge hardening, stronger source attestation, and stricter node command policy enforcement.
- LOC-035: publish world-class parity acceptance/runbook after external gates are fully green (`AVR-012` and `FOG2-016` are both `DONE`).

Design constraints:
- Preserve tenant/org scoping and idempotency behavior.
- Keep mutating actions fail-closed by default.
- Reuse existing trust and approval systems.

Validation:
- npm run typecheck
- cd apps/operator-mobile && npm run typecheck
- npm run test:unit
- npx vitest run tests/integration/ai

Return:
- changed files,
- exact mobile/web parity demo steps,
- known deferred hardening items under LOC-034/LOC-035 gates.
```

---

## Session J (Lane J: cleanup stabilization sprint)

You are Codex in `/Users/foundbrand_001/Development/vc83-com`.
Execute only lane `J` rows from:
`/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/life-operator-one-of-one-cutover/TASK_QUEUE.md`

Rules:

1. Execute deterministic order exactly: `LOC-038` -> `LOC-039` -> `LOC-040` -> `LOC-041` -> `LOC-042`.
2. Treat `LOC-038` as user-blocking and preemptive over ongoing lane-`H` work.
3. Keep fixes narrow and lane-scoped; do not broaden unrelated refactors while worktree churn remains high.
4. Preserve fail-closed trust/approval/runtime invariants when touching onboarding or voice runtime.
5. Run row `Verify` commands exactly.
6. Sync `TASK_QUEUE.md`, `INDEX.md`, `MASTER_PLAN.md`, and `SESSION_PROMPTS.md` after each lane-`J` milestone.
7. Stop when lane `J` has no promotable rows.

---

## Session I (Lane I: iPhone GTM CI + release hygiene)

You are Codex in `/Users/foundbrand_001/Development/vc83-com`.
Execute only lane `I` rows from:
`/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/life-operator-one-of-one-cutover/TASK_QUEUE.md`

Rules:

1. Enforce supported Node runtime for Expo local iOS commands with deterministic fail-fast guidance.
2. Keep iOS preflight contract deterministic and machine-verifiable (`typecheck` + icon alpha/size checks).
3. Keep workflow scope focused to `apps/operator-mobile/**` and iPhone preflight checks.
4. Keep release runbook in sync with executable CI contract; no docs/runtime drift.
5. Link lane `I` artifacts back to lane `H` parity gates (`LOC-032`, `LOC-033`, `LOC-035`).
6. Run row `Verify` commands exactly.
7. Stop when lane `I` has no promotable rows.
