# Agent Orchestration Hardening Session Prompts (DEV-Only)

**Workstream root:** `/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/agent-orchestration-hardening`

Read before execution:

- `/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/agent-orchestration-hardening/TASK_QUEUE.md`
- `/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/agent-orchestration-hardening/MASTER_PLAN.md`
- `/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/agent-orchestration-hardening/INDEX.md`

Execution policy:

1. DEV scope only (`define -> warm up`); do not add migration/canary/cutover/rollback work.
2. Respect queue dependency gates exactly.
3. Update row status/notes immediately after verification commands pass.
4. Keep changes contract-first and deterministic.

---

## Session A (Lane A: Agent Spec + schema contracts)

```text
You are Codex in /Users/foundbrand_001/Development/vc83-com.
Execute Lane A from TASK_QUEUE.md.

Primary scope:
- (No active Lane A tasks)

Rules:
1) Implement versioned agent_spec_v1 contracts before runtime behavior changes.
2) Fail closed on unknown contractVersion/tool/policy/outcome refs.
3) Keep schema normalization deterministic.
4) Run Verify commands exactly as listed in each queue row.
5) Update TASK_QUEUE.md, MASTER_PLAN.md, and INDEX.md state when done.

Lane A status note: `ARH-A-001` and `ARH-A-002` are complete; no promotable Lane A tasks remain.
```

---

## Session B (Lane B: Policy Compiler + manifest hash determinism)

```text
You are Codex in /Users/foundbrand_001/Development/vc83-com.
Execute Lane B from TASK_QUEUE.md.

Primary scope:
- (No active Lane B tasks)

Rules:
1) Compiler output must be deterministic (stable hash for same logical input).
2) Emit sourceLayer decision provenance and normalized deny catalog.
3) Persist manifest artifacts by hash-addressed key.
4) Keep compile behavior independent of channel-specific runtime patching.
5) Run Verify commands exactly as listed in each queue row.

Lane B status note: `ARH-B-001` and `ARH-B-002` are complete; no promotable Lane B tasks remain.
```

---

## Session C (Lane C: Admission control + structured denial contract)

```text
You are Codex in /Users/foundbrand_001/Development/vc83-com.
Execute Lane C from TASK_QUEUE.md.

Primary scope:
- (No active Lane C tasks)

Rules:
1) Admission happens before processInboundMessage execution.
2) Denials must return admission_denial_v1, never ad-hoc strings.
3) Keep reason codes/stages machine-readable and deterministic.
4) Preserve compatibility fields only as additive shims.
5) Run Verify commands exactly as listed in each queue row.

Lane C status note: `ARH-C-001` is complete; `ARH-C-002` implementation landed but is currently blocked on unrelated failing baseline tests in `tests/unit/ai/mobileMetaBridgeContracts.test.ts`.
```

---

## Session D (Lane D: Action completion evidence + failure taxonomy)

```text
You are Codex in /Users/foundbrand_001/Development/vc83-com.
Execute Lane D from TASK_QUEUE.md.

Primary scope:
- (No active Lane D tasks)
- ARH-D-002 (after ARH-D-001 and ARH-C-002 are DONE)

Rules:
1) Completion must be evidence-backed (tool observation + precondition checks).
2) Enforce canonical failure taxonomy and compatibility mapping.
3) Fail closed on contract mismatch in enforce mode.
4) Avoid phrase-dependent completion decisions.
5) Run Verify commands exactly as listed in each queue row.

Lane D status note: `ARH-D-001` implementation landed but is currently blocked on unrelated failing baseline tests in `tests/unit/ai/mobileMetaBridgeContracts.test.ts`.
```

---

## Session E (Lane E: Idempotency tuple + replay matrix behavior)

```text
You are Codex in /Users/foundbrand_001/Development/vc83-com.
Execute Lane E from TASK_QUEUE.md.

Primary scope:
- (No active Lane E tasks)
- ARH-E-002 (after ARH-E-001 and ARH-C-002 are DONE)

Rules:
1) Implement canonical tuple (ingressKey, scopeKey, payloadHash, intentType).
2) Enforce replay matrix outcomes deterministically.
3) TTL and cleanup behavior must be explicit and test-covered.
4) Distinguish changed-payload retry from true duplicate.
5) Run Verify commands exactly as listed in each queue row.

Lane E status note: `ARH-E-001` is complete; `ARH-E-002` remains pending on `ARH-C-002` and `ARH-E-001` gates.
```

---

## Session F (Lane F: Observability + SLO/incident thresholds)

```text
You are Codex in /Users/foundbrand_001/Development/vc83-com.
Execute Lane F from TASK_QUEUE.md.

Primary scope:
- (No active Lane F tasks)
- ARH-F-002 (after ARH-F-001, ARH-D-002, and ARH-E-002 are DONE)

Rules:
1) Add required dimensions on all runtime spans/metrics (manifest and idempotency context).
2) Implement deterministic incident dedupe keys and threshold windows.
3) Keep thresholds directly aligned with RFC §11.3.
4) Emit alert payloads without user-facing operational internals.
5) Run Verify commands exactly as listed in each queue row.

Lane F status note: `ARH-F-001` is complete; `ARH-F-002` remains pending on dependency gates.
```

---

## Session G (Lane G: CI/warmup pipeline wiring, DEV gates only)

```text
You are Codex in /Users/foundbrand_001/Development/vc83-com.
Execute Lane G from TASK_QUEUE.md.

Primary scope:
- (No active Lane G tasks)
- ARH-G-002 (after ARH-G-001, ARH-F-002 are DONE)

Rules:
1) Wire only DEV pipeline stages (spec lint, compile determinism, contracts, synthetic warmup).
2) Exclude migration/canary/promotion/cutover/rollback automation.
3) Artifact outputs must be deterministic and reproducible.
4) Keep package scripts and CI shell contract simple and explicit.
5) Run Verify commands exactly as listed in each queue row.

Lane G status note: `ARH-G-001` is complete; `ARH-G-002` remains pending on `ARH-F-002`.
```

---

## Session H (Lane H: Runtime kernel seam extraction)

```text
You are Codex in /Users/foundbrand_001/Development/vc83-com.
Execute Lane H from TASK_QUEUE.md.

Primary scope:
- ARH-H-001 (DONE)
- ARH-H-002 (DONE)

Rules:
1) Preserve external behavior while extracting kernel boundaries from `processInboundMessage`.
2) Introduce explicit hook contracts; avoid inline agent-specific branching in core path.
3) Keep additive contracts fail-closed on invalid payloads.
4) Run Verify commands exactly as listed in each queue row.
5) Update TASK_QUEUE.md, MASTER_PLAN.md, and INDEX.md after row transitions.

Lane H status note: Lane H complete. Kernel hook contracts are in place; downstream lanes `I` and `J` are unblocked.
```

---

## Session I (Lane I: Samantha isolation + parity)

```text
You are Codex in /Users/foundbrand_001/Development/vc83-com.
Execute Lane I from TASK_QUEUE.md.

Primary scope:
- ARH-I-001 (DONE)
- ARH-I-002 (READY)

Rules:
1) Move Samantha-specific logic into module adapter boundaries.
2) Preserve fail-closed Samantha invariants and trust messaging semantics.
3) Add characterization parity checks before marking row DONE.
4) Run Verify commands exactly as listed in each queue row.
5) Do not relax required-tool or dispatch guardrails.

Lane I status note: `ARH-I-001` completed 2026-03-04 (Samantha runtime adapter seam extracted; decision routing now adapter-backed) and `ARH-I-002` is now the next deterministic pick.
Lane I gate: `ARH-I-002` parity evidence is required before Lane J runtime promotion (`ARH-J-002`).
```

---

## Session J (Lane J: Agent module registry + per-agent tool binding)

```text
You are Codex in /Users/foundbrand_001/Development/vc83-com.
Execute Lane J from TASK_QUEUE.md.

Primary scope:
- ARH-J-001 (READY after `ARH-H-002`; queue order runs after `ARH-I-002`)
- ARH-J-002 (after ARH-J-001 and ARH-I-002 are DONE)

Rules:
1) New agents must be declared by module metadata, not monolith edits.
2) Keep global tool registry as storage; runtime execution scope must resolve per-agent manifests.
3) Ensure deterministic, machine-readable manifest/tool-resolution output.
4) Run Verify commands exactly as listed in each queue row.
5) Keep compatibility shims additive and explicit.

Lane J gate: Lane K cannot start until per-agent manifest resolution is proven in `ARH-J-002`.
```

---

## Session K (Lane K: Der Terminmacher scaffold + stage contract)

```text
You are Codex in /Users/foundbrand_001/Development/vc83-com.
Execute Lane K from TASK_QUEUE.md.

Primary scope:
- ARH-K-001 (after ARH-J-002 is DONE)
- ARH-K-002 (after ARH-K-001 is DONE)

Rules:
1) Scaffold Der Terminmacher as an agent module without core-kernel edits.
2) Keep preview-first + explicit-confirm mutation policy fail-closed.
3) Encode stage outputs as deterministic contracts, not narrative-only strings.
4) Run Verify commands exactly as listed in each queue row.
5) Preserve existing mobile/concierge trust constraints.

Lane K gate: Lane L validation starts only after stage contract is in place (`ARH-K-002`).
```

---

## Session L (Lane L: Tool-chain truth audit + latency contract)

```text
You are Codex in /Users/foundbrand_001/Development/vc83-com.
Execute Lane L from TASK_QUEUE.md.

Primary scope:
- ARH-L-001 (after ARH-K-002 is DONE)
- ARH-L-002 (after ARH-L-001 is DONE)

Rules:
1) Separate inferred capability claims from artifact-backed claims.
2) Validate CRM + booking + calendar push + confirmation + STT/TTS + OCR paths with explicit evidence.
3) Enforce `<20s` processing target contract with breach reason taxonomy.
4) Run Verify commands exactly as listed in each queue row.
5) Keep evidence paths deterministic and reproducible.

Lane L gate: Lane M cannot publish closure until latency/evidence contract is complete.
```

---

## Session M (Lane M: Hardware gate + truth-sync closure)

```text
You are Codex in /Users/foundbrand_001/Development/vc83-com.
Execute Lane M from TASK_QUEUE.md.

Primary scope:
- ARH-M-001 (after ARH-L-002 is DONE)
- ARH-M-002 (after ARH-M-001 is DONE)

Rules:
1) Keep DAT-native readiness blocked unless ORV-023 physical-device evidence exists.
2) Remove stale `GO` claims when evidence is absent or outdated.
3) Publish explicit owner/date for every unresolved blocker.
4) Run Verify commands exactly as listed in each queue row.
5) Synchronize TASK_QUEUE.md, MASTER_PLAN.md, INDEX.md, SESSION_PROMPTS.md on every closure step.

Lane M gate: final closeout requires full acceptance-criteria mapping with pass/fail evidence links.
```
