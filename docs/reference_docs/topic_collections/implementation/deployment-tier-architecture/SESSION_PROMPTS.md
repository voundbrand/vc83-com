# Deployment Tier Architecture Session Prompts

**Workstream root:** `/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/deployment-tier-architecture`

Use one prompt per lane/worktree.

Always read first:

- `/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/deployment-tier-architecture/TASK_QUEUE.md`
- `/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/deployment-tier-architecture/MASTER_PLAN.md`
- `/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/deployment-tier-architecture/PROVIDER_RUNTIME_SEAM_MAP.md`
- `/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/deployment-tier-architecture/PROVIDER_CONTROL_PLANE_IMPLEMENTATION_PLAN.md`
- `/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/deployment-tier-architecture/INDEX.md`

---

## Session A (Lane A: architecture baseline and seam map)

```text
You are Codex in /Users/foundbrand_001/Development/vc83-com.
Execute only Lane A tasks from:
/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/deployment-tier-architecture/TASK_QUEUE.md

Scope:
- DTA-001..DTA-002, DTA-014

Rules:
1) Keep this lane docs-only.
2) Every architecture claim must be labeled as verified fact, assumption, or inference.
3) Keep MASTER_PLAN.md, PROVIDER_RUNTIME_SEAM_MAP.md, TASK_QUEUE.md, and INDEX.md synchronized.
4) If provider-control-plane assumptions change, update PROVIDER_CONTROL_PLANE_IMPLEMENTATION_PLAN.md in the same pass.
5) Run docs guard before marking anything DONE.

Stop when Lane A has no promotable tasks.
```

---

## Session B (Lane B: deployment profile + runtime/data seams)

```text
You are Codex in /Users/foundbrand_001/Development/vc83-com.
Execute only Lane B tasks from:
/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/deployment-tier-architecture/TASK_QUEUE.md

Scope:
- DTA-003..DTA-005, DTA-015

Rules:
1) Confirm DTA-001 and DTA-002 are DONE before starting.
2) Before each task, list top 3 regression risks.
3) Run Verify commands exactly as specified in queue rows.
4) Contract-first: add seams before swapping implementations.
5) Do not change live voice provider behavior here unless the queue row explicitly allows it.
6) Lock the platform-managed vs BYOK vs private credential policy before approving provider-specific implementation work.

Stop when Lane B has no promotable tasks.
```

---

## Session C (Lane C: voice hot path)

```text
You are Codex in /Users/foundbrand_001/Development/vc83-com.
Execute only Lane C tasks from:
/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/deployment-tier-architecture/TASK_QUEUE.md

Scope:
- DTA-006..DTA-008, DTA-016..DTA-017

Rules:
1) Confirm DTA-003 is DONE before starting any task.
2) Before each task, list top 3 regression risks.
3) Run Verify commands exactly from each queue row.
4) All provider keys must remain server-side only.
5) Preserve current voice UX while removing hidden provider assumptions.
6) No implicit OpenRouter or ElevenLabs fallbacks on the live path.
7) Do not run DTA-016 and DTA-017 in parallel unless file ownership is explicitly partitioned first.
8) Treat Twilio as telephony ingress and ElevenLabs as a provider-side execution mirror subordinate to the canonical internal agent model.

Stop when Lane C has no promotable tasks.
```

---

## Session D (Lane D: non-hot-path adapters and overlays)

```text
You are Codex in /Users/foundbrand_001/Development/vc83-com.
Execute only Lane D tasks from:
/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/deployment-tier-architecture/TASK_QUEUE.md

Scope:
- DTA-009..DTA-010, DTA-018

Rules:
1) Confirm DTA-003 is DONE before starting.
2) Before each task, list top 3 regression risks.
3) Run Verify commands exactly from each queue row.
4) Keep customer variance in overlays, not in product forks.
5) Add disable/manual modes where sovereign-safe replacements do not yet exist.
6) Infobip phase 1 is messaging-first; do not expand scope to voice parity unless the queue row explicitly changes.

Stop when Lane D has no promotable tasks.
```

---

## Session E (Lane E: validation, sovereign preview, and closeout)

```text
You are Codex in /Users/foundbrand_001/Development/vc83-com.
Execute only Lane E tasks from:
/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/deployment-tier-architecture/TASK_QUEUE.md

Scope:
- DTA-011..DTA-013, DTA-019

Rules:
1) Confirm all P0 tasks are DONE or BLOCKED before starting.
2) Before each task, list top 3 regression risks.
3) Run Verify commands exactly from each row.
4) Dedicated-EU validation must prove an EEA-only hot path, not just EU marketing copy.
5) Sovereign output must clearly state reduced scope, operational burden, and non-parity tradeoffs.
6) Finalize queue/docs and run docs guard before closeout.
7) Final validation must state what is platform-managed today versus what still requires vendor-side setup.

Stop when Lane E has no promotable tasks.
```
