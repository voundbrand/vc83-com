# Reusable AV Core + Agent Harness Session Prompts

**Workstream root:** `/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/reusable-av-core-agent-harness`

---

## Lane gating and concurrency

1. Run at most one `IN_PROGRESS` task globally unless explicitly approved for lane-level parallelism.
2. Do not start lanes `B` or `C` before lane `A` `P0` rows (`AVR-001`, `AVR-002`) are `DONE`.
3. Do not start lane `D` before `AVR-003` and `AVR-005` are `DONE`.
4. Do not start lane `E` before `AVR-007` is `DONE` and external dependency `YAI-021` is `DONE`.
5. Do not start lane `F` before `AVR-009` is `DONE`.
6. `AVR-012` and `AVR-013` must enforce external `OCG-008` gates exactly as defined in `TASK_QUEUE.md`.
7. After each completed row, sync `TASK_QUEUE.md`, `INDEX.md`, and `MASTER_PLAN.md` before moving on.

Status snapshot (2026-02-27):

1. `AVR-001` and `AVR-002` are `DONE`: reusable AV contract matrix and deterministic ingress-envelope/schema contracts remain the lane `A` baseline.
2. `AVR-003` and `AVR-004` are `DONE`: desktop capture adapters and orchestration fallback contracts are complete with `YAI-020@DONE_GATE` cleared.
3. `AVR-005` and `AVR-006` are `DONE`: webcam/UVC/digital-video plus mobile/glasses ingress contracts are complete with deterministic source/provenance metadata.
4. `AVR-007` is `DONE`: low-latency runtime transport/session contracts (packet flow, clocking, diagnostics, adaptive buffering) are complete.
5. `AVR-008` is `DONE`: downgrade-policy contract closeout is complete with required verification rerun passing (`typecheck`, `test:unit`, `lint`).
6. `AVR-009` is `DONE`: AV media-session ingress metadata is integrated through chat send contract into canonical inbound envelope + mutation authority invariants, with required verification profile passing (`typecheck`, `test:unit`, focused AV-contract vitest).
7. `AVR-010` is `DONE`: no-bypass trust/approval bridge enforcement is complete, and required verify profile rerun now passes (`typecheck`, `test:unit`, focused AV-contract vitest).
8. External upstream dependency state: `YAI-021` is `DONE` and `OCG-008` is `DONE`.
9. `AVR-011` moved `READY -> IN_PROGRESS -> BLOCKED -> IN_PROGRESS -> BLOCKED -> IN_PROGRESS -> DONE` on 2026-02-26: observability contracts remain landed and required verify closeout now passes (`typecheck`, `test:unit`, `lint`).
10. `AVR-012` moved `READY -> IN_PROGRESS -> BLOCKED -> IN_PROGRESS -> DONE` by 2026-02-27: device-matrix regression artifacts remained valid and required verify profile is now fully green (`typecheck`, `test:unit`, `test:e2e:desktop`, `docs:guard`).
11. `AVR-013` moved `READY -> IN_PROGRESS -> DONE` on 2026-02-27: residual-risk + rollback runbook notes and production rollout-wave lock are now published in lane `F` closeout docs, and queue-first artifacts are synchronized.
12. Resulting promotion state right now: no queue row is `READY`; all rows `AVR-001`..`AVR-013` are `DONE`.

---

## Behavioral-System Contract Alignment

1. Treat AV lanes as implementation of `tools`, `eval`, and `trust` layers under the shared model contract (`prompt + memory + policy + tools + eval + trust`).
2. Do not classify prompt-only persona/tone edits as AV contract progress.
3. Any behavior-impacting AV row must record policy-gate and trust-evidence implications in queue notes.

---

## Prompt A (AVR-001, AVR-002)

You are executing lane `A` for reusable AV core + harness planning.
Tasks:

1. `AVR-001`: freeze source-class coverage, low-latency SLO targets, and authority/trust invariants.
2. `AVR-002`: define canonical media session schema and ingress metadata compatibility contract.

Requirements:

1. Keep contracts explicitly aligned to `YAI-014`/`YAI-015` invariants.
2. Avoid implementation edits outside contract/schema boundaries.
3. Keep contracts provider-agnostic and OpenClaw-optional.
4. Run row `Verify` commands exactly.

---

## Prompt B (AVR-003, AVR-004)

You are executing lane `B` for desktop capture core.
Tasks:

1. Implement deterministic screenshot + recording capture adapters.
2. Add bounded retry/fallback orchestration with explicit reason codes.

Requirements:

1. Keep API surface reusable across desktop shells and chat surfaces.
2. Do not mutate AI chat UI behavior while `YAI-018..020` remains open.
3. Keep capture contracts deterministic and test-backed.
4. Run row `Verify` commands exactly.

---

## Prompt C (AVR-005, AVR-006)

You are executing lane `C` for external device ingress adapters.
Tasks:

1. Implement webcam/UVC/digital-video ingest contract.
2. Implement mobile/glasses ingress bridge contract.

Requirements:

1. Preserve source provenance metadata and stable source identity.
2. Keep transport abstraction reusable for iOS/Android/glasses without hard vendor lock.
3. Keep runtime policy out of this lane.
4. Run row `Verify` commands exactly.

---

## Prompt D (AVR-007, AVR-008)

You are executing lane `D` for low-latency runtime transport.
Tasks:

1. Deliver real-time AV session runtime.
2. Add adaptive downgrade ladder and deterministic fallback reasons.

Requirements:

1. Favor continuity over hard drop when degradation occurs.
2. Keep latency/jitter accounting explicit and machine-verifiable.
3. No silent mode changes; every fallback must be reported.
4. Run row `Verify` commands exactly.

---

## Prompt E (AVR-009, AVR-010)

You are executing lane `E` for harness integration.
Tasks:

1. Integrate AV metadata into chat send contract and canonical ingress envelope.
2. Enforce trust/approval/no-bypass constraints for AV-originated actionable intents.

Requirements:

1. Do not begin until `YAI-021` is `DONE`.
2. Preserve native `vc83_runtime_policy` precedence.
3. Keep direct device-side mutation paths fail-closed.
4. Run row `Verify` commands exactly.

---

## Prompt F (AVR-011..AVR-013)

You are executing lane `F` for observability and closeout.
Tasks:

1. Add AV observability parity and correlation contracts.
2. Execute device matrix + latency regression suite.
3. Publish residual-risk and rollback notes; sync queue-first artifacts.

Requirements:

1. Keep latency thresholds and failure evidence explicit.
2. Respect `OCG-008` dependency gates exactly.
3. Do not close out with missing verification evidence.
4. Run row `Verify` commands exactly.
