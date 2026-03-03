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
