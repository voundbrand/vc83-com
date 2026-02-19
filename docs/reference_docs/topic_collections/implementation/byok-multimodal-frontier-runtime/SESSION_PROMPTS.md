# BYOK Multimodal Frontier Runtime Session Prompts

**Workstream root:** `/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/byok-multimodal-frontier-runtime`

Use one prompt per lane/worktree.

Always read first:

- `/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/byok-multimodal-frontier-runtime/TASK_QUEUE.md`
- `/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/byok-multimodal-frontier-runtime/MASTER_PLAN.md`
- `/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/byok-multimodal-frontier-runtime/INDEX.md`

---

## Session A (Lane A: contract and schema baseline)

```text
You are Codex in /Users/foundbrand_001/Development/vc83-com.
Execute only Lane A tasks from:
/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/byok-multimodal-frontier-runtime/TASK_QUEUE.md

Scope:
- BMF-002..BMF-003

Rules:
1) Before each task, list top 3 regression risks.
2) Run Verify commands exactly as listed in queue rows.
3) Freeze canonical provider/capability/billing taxonomy before any implementation spread.
4) Keep schema changes migration-safe for existing OpenRouter-only org settings.
5) Update TASK_QUEUE.md status and notes after each completed task.

Stop when Lane A has no promotable tasks.
```

---

## Session B (Lane B: credential vault and registry)

```text
You are Codex in /Users/foundbrand_001/Development/vc83-com.
Execute only Lane B tasks from:
/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/byok-multimodal-frontier-runtime/TASK_QUEUE.md

Scope:
- BMF-004..BMF-006

Rules:
1) Confirm BMF-003 is DONE before starting lane B.
2) Before each task, list top 3 regression risks.
3) Run queue Verify commands exactly.
4) Enforce explicit encrypted-field metadata and decrypt-on-use boundaries.
5) Preserve existing non-AI integration behavior while refactoring credential storage.

Stop when Lane B has no promotable tasks.
```

---

## Session C (Lane C: runtime adapters and routing)

```text
You are Codex in /Users/foundbrand_001/Development/vc83-com.
Execute only Lane C tasks from:
/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/byok-multimodal-frontier-runtime/TASK_QUEUE.md

Scope:
- BMF-007..BMF-009

Rules:
1) Confirm BMF-003 is DONE before BMF-007.
2) Before each task, list top 3 regression risks.
3) Run queue Verify commands exactly.
4) Preserve OpenRouter parity while adding provider-agnostic paths.
5) Normalize tool-call and usage payloads across providers in one adapter contract.

Stop when Lane C has no promotable tasks.
```

---

## Session D (Lane D: credits and monetization)

```text
You are Codex in /Users/foundbrand_001/Development/vc83-com.
Execute only Lane D tasks from:
/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/byok-multimodal-frontier-runtime/TASK_QUEUE.md

Scope:
- BMF-010..BMF-012

Rules:
1) Confirm BMF-005 and BMF-008 are DONE before BMF-010.
2) Before each task, list top 3 regression risks.
3) Run queue Verify commands exactly.
4) Keep billing-source policy explicit and deterministic for every AI request.
5) Resolve legacy token-billing overlap without breaking current credit-ledger accounting.

Stop when Lane D has no promotable tasks.
```

---

## Session E (Lane E: product surfaces)

```text
You are Codex in /Users/foundbrand_001/Development/vc83-com.
Execute only Lane E tasks from:
/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/byok-multimodal-frontier-runtime/TASK_QUEUE.md

Scope:
- BMF-013..BMF-014

Rules:
1) Confirm BMF-005 is DONE before BMF-013.
2) Before each task, list top 3 regression risks.
3) Run queue Verify commands exactly.
4) Keep key material redacted in UI and logs.
5) Replace hardcoded BYOK gating with tier-feature checks and clear fallback UX.

Stop when Lane E has no promotable tasks.
```

---

## Session F (Lane F: quality and multimodal)

```text
You are Codex in /Users/foundbrand_001/Development/vc83-com.
Execute only Lane F tasks from:
/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/byok-multimodal-frontier-runtime/TASK_QUEUE.md

Scope:
- BMF-015..BMF-017

Rules:
1) Confirm BMF-008 is DONE before lane F starts.
2) Before each task, list top 3 regression risks.
3) Run queue Verify commands exactly.
4) Gate model enablement on measurable conformance thresholds.
5) Keep voice provider integration modular so STT/TTS providers can be swapped without runtime rewrites.

Stop when Lane F has no promotable tasks.
```

---

## Session G (Lane G: migration and closeout)

```text
You are Codex in /Users/foundbrand_001/Development/vc83-com.
Execute only Lane G tasks from:
/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/byok-multimodal-frontier-runtime/TASK_QUEUE.md

Scope:
- BMF-018..BMF-019

Rules:
1) Confirm all P0 tasks are DONE or BLOCKED before BMF-018.
2) Before each task, list top 3 regression risks.
3) Run queue Verify commands exactly from queue rows.
4) Validate migration safety with rollback and key-rotation recovery paths.
5) Update TASK_QUEUE.md, MASTER_PLAN.md, and INDEX.md with final status and run docs guard.

Stop when lane G closeout is complete.
```
