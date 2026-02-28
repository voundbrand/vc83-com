# macOS Native Companion Runtime Session Prompts

**Workstream root:** `/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/macos-native-companion-runtime`

---

## Lane gating and concurrency

1. Run at most one `IN_PROGRESS` task globally unless explicitly approved for lane-level parallelism.
2. Do not start lane `B` before lane `A` `P0` rows (`MCR-001`, `MCR-002`) are `DONE`.
3. Do not start lanes `C` or `D` before `MCR-003` is `DONE`.
4. Do not start lane `E` before `MCR-005` is `DONE`; `MCR-009` cannot move to `DONE` until `AVR-010` is `DONE`.
5. Do not start lane `F` before `MCR-009` is `DONE` and external token `YAI-021` remains `DONE`.
6. Do not start lane `G` before `MCR-007` and `MCR-011` are `DONE`.
7. Do not start lane `H` before `MCR-012` and `MCR-014` are `DONE`.
8. Start lane `I` only after `MCR-018` is `DONE`; lane `I` parity foundation rows (`MCR-020+`) take priority over `MCR-019`.
9. Do not promote `MCR-019` from `PENDING` until `MCR-025` is `DONE`.
10. After each completed row, sync `TASK_QUEUE.md`, `INDEX.md`, and `MASTER_PLAN.md`.

Status snapshot (2026-02-27):

1. Lane `A` `P0` rows are complete (`MCR-001` and `MCR-002` are `DONE`).
2. Lane `B` scaffold kickoff row `MCR-003` is `DONE`; lane `B` follow-up row `MCR-004` is now `DONE`.
3. Lane `C` auth kickoff row `MCR-005` is now `DONE`; lane `C` follow-up row `MCR-006` is now `DONE`.
4. Lane `D` UX kickoff row `MCR-007` is now `DONE`; lane `D` follow-up row `MCR-008` is now `DONE`.
5. Lane `E` kickoff row `MCR-009` is now `DONE`; lane `E` follow-up row `MCR-010` is now `DONE` with deny-by-default system-exec contract scaffolding + fail-closed approval-binding tests.
6. Lane `F` rows are now complete (`MCR-011` is `DONE` after row-external `V-TYPE` baseline recovery and verification rerun; `MCR-012` is `DONE` after observability parity verification across trust events + telemetry bridge metadata).
7. Lane `G` rows are now complete (`MCR-013` is `DONE`; `MCR-014` is now `DONE` with channel-scoped appcast + staged rollout policy + rollback-safe update contract scaffolding).
8. Lane `H` kickoff row `MCR-015` is now `DONE` with QA/go-no-go evidence published under `/Users/foundbrand_001/Development/vc83-com/tmp/reports/macos-companion/mcr-015-20260227T092913Z/*` (including sandbox failure + unrestricted rerun evidence for desktop E2E).
9. Lane `H` closeout row `MCR-016` is now `DONE` with residual-risk/rollback/escalation evidence published under `/Users/foundbrand_001/Development/vc83-com/tmp/reports/macos-companion/mcr-016-20260227T094625Z/*`.
10. Follow-on hardening row `MCR-017` is now `DONE` with monitoring/automation baseline evidence published under `/Users/foundbrand_001/Development/vc83-com/tmp/reports/macos-companion/mcr-017-20260227T095948Z/*`.
11. Production release automation row `MCR-018` is now `DONE` after implementing strict notarization, Sparkle appcast signing, GitHub release upload scripts, and `macos-release` workflow wiring with queue-first doc sync.
12. Credentialed release rehearsal row `MCR-019` remains `PENDING` and intentionally deferred while lane `I` parity foundation rows execute.
13. Lane `I` parity kickoff row `MCR-020` is now `DONE` after unblock verification rerun; evidence bundle: `/Users/foundbrand_001/Development/vc83-com/tmp/reports/macos-companion/mcr-session-20260227T133053Z/*`.
14. Lane `I` native chat window parity slice row `MCR-021A` is `DONE` with evidence at `/Users/foundbrand_001/Development/vc83-com/tmp/reports/macos-companion/mcr-021a-20260227T123334Z/*`.
15. External upstream dependencies are already favorable for later rows:
   - `YAI-021` is `DONE`.
   - `AVR-010` is `DONE`, so `AVR-010@DONE_GATE` is satisfied for downstream rows.
16. Deterministic next promotable row: `MCR-021` (`READY`).
17. Active row count: `0` rows in `IN_PROGRESS`.

---

## Behavioral-System Contract Alignment

1. Keep implementation aligned to the canonical behavioral-system stack: `prompt + memory + policy + tools + eval + trust`.
2. Treat macOS native work as ingress/control + operator ergonomics unless trust/approval evidence allows mutating action.
3. Never classify UI-only polish as completion for policy/trust rows.

---

## Prompt A (Lane A: contract baseline)

You are executing lane `A` for macOS native companion contract freeze.
Tasks:

1. Complete `MCR-001`: establish architecture scope, non-goals, authority invariants, and acceptance criteria.
2. Complete `MCR-002`: publish permission/trust matrix for mic/camera/screen/system/notifications/keychain.

Requirements:

1. OpenClaw remains a reference pattern only.
2. Keep production source-of-truth in this workstream + runtime files.
3. Explicitly distinguish read-only context from mutating tool intent.
4. Run row `Verify` commands exactly.

---

## Prompt B (Lane B: scaffold + bridge envelope)

You are executing lane `B` for macOS app bootstrap.
Tasks:

1. Complete `MCR-003`: scaffold `apps/macos` native menu bar shell.
2. Complete `MCR-004`: implement canonical bridge envelope mapping with no local mutation authority.

Requirements:

1. Keep app scaffold additive and testable (`swift build`, `swift test`).
2. Preserve canonical ingress envelope compatibility.
3. Do not add direct backend mutation paths from the mac app.
4. Run row `Verify` commands exactly.

---

## Prompt C (Lane C: auth + lifecycle)

You are executing lane `C` for authentication and process lifecycle.
Tasks:

1. Complete `MCR-005`: web auth callback + keychain token lifecycle.
2. Complete `MCR-006`: LaunchAgent login/background lifecycle.

Requirements:

1. Keep token handling least-privilege and auditable.
2. Keep startup/reconnect behavior deterministic and reversible.
3. No system-exec capability work in this lane.
4. Run row `Verify` commands exactly.

---

## Prompt D (Lane D: menu bar UX)

You are executing lane `D` for native operator UX.
Tasks:

1. Complete `MCR-007`: quick chat popover, hotkey, approval badges.
2. Complete `MCR-008`: notification bridge and deep-link flows.

Requirements:

1. Optimize for rapid operator context, not UI clone parity with web/mobile.
2. Keep actions routed to backend trust/approval gates.
3. Keep correlation IDs visible for approvals/escalations.
4. Run row `Verify` commands exactly.

---

## Prompt E (Lane E: local connectors)

You are executing lane `E` for local computer capability adapters.
Tasks:

1. Complete `MCR-009`: capture connectors (screen/camera/mic) mapped to AV contracts.
2. Complete `MCR-010`: optional system-exec connector contract with deny-by-default policy.

Requirements:

1. `MCR-009` cannot move to `DONE` until `AVR-010` is `DONE`.
2. Preserve `vc83_runtime_policy` precedence.
3. No broad root-level command execution paths.
4. Run row `Verify` commands exactly.

---

## Prompt F (Lane F: trust + ingress)

You are executing lane `F` for backend authority alignment.
Tasks:

1. Complete `MCR-011`: canonical ingress + no-bypass trust/approval enforcement for mac events.
2. Complete `MCR-012`: observability/taxonomy parity for mac-originated flows.

Requirements:

1. Backend remains mutation authority.
2. All mutating intents require explicit approval artifacts.
3. Keep regressions covered by authority-matrix tests.
4. Run row `Verify` commands exactly.

---

## Prompt G (Lane G: release pipeline)

You are executing lane `G` for packaging and distribution.
Tasks:

1. Complete `MCR-013`: signing/notarization pipeline baseline.
2. Complete `MCR-014`: DMG + appcast update contract.

Requirements:

1. Build metadata must be deterministic and auditable.
2. Release channel defaults must be conservative.
3. Keep rollback pathways explicit before rollout.
4. Run row `Verify` commands exactly.

---

## Prompt H (Lane H: validation + closeout)

You are executing lane `H` for operational closeout and release hardening.
Tasks:

1. Complete `MCR-015`: full QA matrix + go/no-go evidence.
2. Complete `MCR-016`: closeout docs, residual risk log, rollback runbook, owner map.
3. Complete `MCR-017`: post-closeout monitoring cadence + automation hardening package.
4. Complete `MCR-018`: strict notarization + appcast-sign + GitHub release automation and runbook sync.
5. Complete `MCR-019` only after lane `I` parity foundation (`MCR-025`) is `DONE`.

Requirements:

1. Do not close with open `P0` rows.
2. Policy/trust compliance is release-blocking.
3. Keep escalation ownership explicit.
4. Fail closed on signing/notary/appcast/release publish errors in strict mode.
5. Run row `Verify` commands exactly.

---

## Prompt I (Lane I: desktop deep integration parity)

You are executing lane `I` for post-release deep desktop integration parity.
Tasks:

1. Keep `MCR-020` baseline intact: node/gateway transport + capability discovery + approval-gated screen snapshot vertical slice with telemetry.
2. Keep `MCR-021A` behavior stable while implementing downstream rows.
3. Complete `MCR-021`: concrete camera + microphone providers with permission preflight and fail-closed session lifecycle.
4. Complete `MCR-022`: voice wake/push-to-talk loop with transcript forwarding ingress envelopes.
5. Complete `MCR-023`: exec approvals UX/policy hardening with non-bypass artifact bindings.
6. Complete `MCR-024`: deep-link/trust portal + notification action handling for node-originated flows.
7. Complete `MCR-025`: parity closeout for observability + safe failure/rollback behavior.

Requirements:

1. OpenClaw remains reference-only architecture input; do not copy source verbatim.
2. `vc83` backend remains mutation authority; desktop actions remain fail-closed and approval-gated.
3. Every vertical slice must emit telemetry with correlation/session context and gate outcomes.
4. `MCR-019` stays deferred until `MCR-025` is `DONE`.
5. Run row `Verify` commands exactly.
