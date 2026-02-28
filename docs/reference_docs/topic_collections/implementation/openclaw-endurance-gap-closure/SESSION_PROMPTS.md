# OpenClaw Endurance Gap Closure Session Prompts

**Workstream root:** `/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/openclaw-endurance-gap-closure`

---

## Lane gating and concurrency

1. Run at most one `IN_PROGRESS` task globally unless explicitly approved for lane-level parallelism.
2. Do not start lanes `B`, `C`, or `D` before `OCG-001` is `DONE`.
3. Do not start lane `E` until all `P0` rows (`OCG-002`, `OCG-004`, `OCG-005`) are `DONE`.
4. After each completed row, update `TASK_QUEUE.md`, `INDEX.md`, and `MASTER_PLAN.md` before moving to the next row.

Status snapshot (2026-02-25):

1. `OCG-001`, `OCG-002`, `OCG-003`, `OCG-004`, `OCG-005`, `OCG-006`, `OCG-007`, and `OCG-008` are `DONE`.
2. Shared `V-MODEL` blocker is resolved: `npm run test:model` remains passing (latest closeout run: `6/6`, `conformance=PASS`, `latency_p95_ms=4554`; prior stability reruns `latency_p95_ms` `5015`-`7347`).
3. OCG-008 closeout verification command set is green (`npm run typecheck`, `npm run lint`, `npx vitest run tests/unit/ai tests/integration/ai`, `npm run test:model`, `npm run docs:guard`).
4. Next deterministic `READY` row: none (workstream queue complete).

---

## Behavioral-System Contract Alignment

1. Runtime hardening in this stream primarily reinforces `policy`, `tools`, `eval`, and `trust` layers of the shared-model contract.
2. Do not present prompt-only wording changes as behavioral-runtime convergence.
3. Any reopened row must preserve auditable trust gates while documenting eval impact.

---

## Prompt A (OCG-001)

You are executing lane `A` for OpenClaw endurance gap closure.
Task: produce evidence-backed implemented-vs-gap matrix from runtime code and tests only.
Requirements:
1. Verify policy router, failover, session stickiness, pricing, and RAG paths directly in code.
2. Do not trust queue/doc status without code evidence.
3. Record acceptance criteria that are testable and deterministic.
4. Update queue status and notes with verification command output summary.

---

## Prompt B (OCG-002, OCG-003)

You are executing lane `B` for chat/agent routing parity.
Tasks:
1. `OCG-002`: persist true model/auth/fallback outputs from agent runtime into conversation model resolution.
2. `OCG-003`: extend conversation session pin policy for auth profile parity with agent sessions.
Requirements:
1. Preserve backward compatibility for existing conversation records.
2. Keep policy behavior deterministic and explicit (`pinReason`, `unlockReason`).
3. Add/update tests for migration-safe reads and multi-turn pin behavior.
4. Update queue notes with exact verification results.

---

## Prompt C (OCG-004)

You are executing lane `C` for failover engine unification.
Task: extract one shared two-stage failover executor consumed by both chat and agent runtimes.
Requirements:
1. Preserve order: auth profile rotation first, model fallback second.
2. Preserve cooldown/failure count semantics.
3. Avoid changing business behavior except removing duplicate orchestration code paths.
4. Prove parity with unit/integration/model validation commands.

---

## Prompt D (OCG-005, OCG-006)

You are executing lane `D` for provider discovery and plugin boundaries.
Tasks:
1. `OCG-005`: implement provider-registry fanout discovery ingestion with deterministic fallback behavior.
2. `OCG-006`: add manifest/schema-based provider plugin contract checks.
Requirements:
1. Keep tenant-safe credential boundaries.
2. Keep OpenRouter support intact while removing single-source coupling.
3. Require conformance checks before new provider registration.
4. Add tests that fail closed on malformed plugin manifests/contracts.

---

## Prompt E (OCG-007, OCG-008)

You are executing lane `E` for docs/runtime contract closeout.
Tasks:
1. Align runtime-adjacent docs/comments to provider-agnostic language where applicable.
2. Finalize regression matrix and release notes for this gap-closure workstream.
Requirements:
1. Explicitly scope intentionally OpenRouter-only sections.
2. Keep layer taxonomy language consistent (BusinessLayer, PolicyLayer, MemoryLayer).
3. Run docs guard and sync all queue-first artifacts before marking done.
