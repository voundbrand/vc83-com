# Office File Tool Suite Session Prompts

Use one prompt per lane/worktree. Follow deterministic queue transitions only.

Workstream root:  
`/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/office-file-tool-suite`

Queue:  
`/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/office-file-tool-suite/TASK_QUEUE.md`

---

## Lane milestone log

1. 2026-03-01: `OFS-001` completed; queue-first scaffold and synchronized workstream docs created.

---

## Global execution rules

1. Execute only rows from this queue.
2. Before each row, list top 3 regression risks and impacted contracts.
3. Keep statuses limited to `READY`, `IN_PROGRESS`, `PENDING`, `BLOCKED`, `DONE`.
4. Enforce dependency token semantics before status transitions.
5. Keep runtime/tool governance fail-closed for unknown capability and mutating/external operations.
6. Do not bypass existing backend permission/license checks in file/sharing flows.
7. Run row `Verify` commands exactly.
8. Sync `TASK_QUEUE.md`, `SESSION_PROMPTS.md`, `INDEX.md`, and `MASTER_PLAN.md` at each lane milestone.

---

## Session A (Lane A: contracts + readiness baseline)

```text
You are Codex in /Users/foundbrand_001/Development/vc83-com.
Execute only Lane A rows from:
/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/office-file-tool-suite/TASK_QUEUE.md

Scope:
- OFS-002
- OFS-003

Rules:
1) Extend AITool metadata contract without breaking existing callable registry behavior.
2) Fail closed on unknown operation class/surface/approval profile values.
3) Align provider readiness source to oauthConnections + granted scopes.
4) Add deterministic tests for contract validation and readiness derivation.
5) Run Verify commands exactly and update queue notes with evidence.

Stop when Lane A has no promotable rows.
```

---

## Session B (Lane B: filesystem/share/artifact tools)

```text
You are Codex in /Users/foundbrand_001/Development/vc83-com.
Execute only Lane B rows from:
/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/office-file-tool-suite/TASK_QUEUE.md

Scope:
- OFS-004
- OFS-005

Rules:
1) Reuse projectFileSystem and projectSharing contracts; never bypass permission/license checks.
2) Keep canonical artifact persistence in projectFiles.
3) Ensure trash/restore/share lifecycle behavior stays deterministic.
4) Add coverage for negative permission and invalid-path cases.
5) Run Verify commands exactly.

Stop when Lane B has no promotable rows.
```

---

## Session C (Lane C: doc/sheet/slides families)

```text
You are Codex in /Users/foundbrand_001/Development/vc83-com.
Execute only Lane C rows from:
/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/office-file-tool-suite/TASK_QUEUE.md

Scope:
- OFS-006
- OFS-007
- OFS-008

Rules:
1) Use deterministic content schemas for docs, sheets, and slides operations.
2) Validate formulas/ranges and slide shape payloads before mutation.
3) Export paths must either fully succeed or fail with deterministic error class.
4) Persist generated artifacts through canonical workspace paths only.
5) Run Verify commands exactly.

Stop when Lane C has no promotable rows.
```

---

## Session D (Lane D: cloud providers)

```text
You are Codex in /Users/foundbrand_001/Development/vc83-com.
Execute only Lane D rows from:
/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/office-file-tool-suite/TASK_QUEUE.md

Scope:
- OFS-009
- OFS-010
- OFS-011

Rules:
1) Sequence providers strictly: Google and Microsoft first, Dropbox after parity.
2) Gate cloud operations on explicit granted scopes and live connection status.
3) Normalize provider errors to deterministic classes (missing_scope, disconnected, forbidden, etc.).
4) Remove “coming soon” UI only after backend/runtime contracts pass tests.
5) Run Verify commands exactly.

Stop when Lane D has no promotable rows.
```

---

## Session E (Lane E: runtime gating + trust telemetry)

```text
You are Codex in /Users/foundbrand_001/Development/vc83-com.
Execute only Lane E rows from:
/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/office-file-tool-suite/TASK_QUEUE.md

Scope:
- OFS-012
- OFS-013

Rules:
1) Offer provider tools only when provider readiness + required scope checks pass.
2) Keep unknown/unavailable capabilities fail-closed with explicit unblocking guidance.
3) Emit trust events for export/cloud/share with correlation/lineage/thread fields.
4) Keep telemetry payload schema machine-verifiable and privacy-safe.
5) Run Verify commands exactly.

Stop when Lane E has no promotable rows.
```

---

## Session F (Lane F: super-admin tool registry)

```text
You are Codex in /Users/foundbrand_001/Development/vc83-com.
Execute only Lane F rows from:
/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/office-file-tool-suite/TASK_QUEUE.md

Scope:
- OFS-014
- OFS-015

Rules:
1) Add global cross-org query surfaces for registry inventory/details/usage and foundry review.
2) Keep access fail-closed to super_admin only.
3) Implement dedicated Tool Registry tab in Organizations window.
4) Phase 1 UI scope is read + decide only.
5) Run Verify commands exactly.

Stop when Lane F has no promotable rows.
```

---

## Session G (Lane G: validation + closeout)

```text
You are Codex in /Users/foundbrand_001/Development/vc83-com.
Execute only Lane G rows from:
/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/office-file-tool-suite/TASK_QUEUE.md

Scope:
- OFS-016
- OFS-017

Rules:
1) Validate end-to-end office workflow including provider-connected and provider-denied branches.
2) Validate admin registry and foundry decision surfaces under global view and org filters.
3) Publish rollout/rollback runbook only after technical verification gates pass.
4) Synchronize all queue artifacts at closeout.
5) Run Verify commands exactly.

Stop when Lane G has no promotable rows.
```
