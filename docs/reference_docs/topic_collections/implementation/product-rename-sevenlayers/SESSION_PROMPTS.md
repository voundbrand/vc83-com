# Product Rename to sevenlayers Session Prompts

Use these prompts to execute this workstream lane-by-lane with deterministic queue behavior.

**Last synced:** 2026-02-25  
**Workstream root:** `/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/product-rename-sevenlayers`  
**Queue:** `/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/product-rename-sevenlayers/TASK_QUEUE.md`

Pause state (2026-02-25): rows `PRN-002`..`PRN-051` are `BLOCKED` by one-of-one cutover row `LOC-003`. Do not resume this queue without explicit cutover override after `LOC-009` is `DONE`.

---

## Global execution rules

1. Do not execute any row while the `LOC-003` pause lock is active.
2. Execute only rows from this queue.
3. Before each row, confirm dependency tokens and current status eligibility.
4. Preserve compatibility-critical identifiers unless a queue row explicitly migrates them.
5. Keep changes lane-scoped to reduce merge conflicts.
6. Run row `Verify` commands exactly as listed.
7. Keep statuses limited to `READY`, `IN_PROGRESS`, `PENDING`, `BLOCKED`, `DONE`.
8. Sync `TASK_QUEUE.md`, `SESSION_PROMPTS.md`, `INDEX.md`, and `MASTER_PLAN.md` at each lane milestone.
9. Do not mark cutover complete until manual dashboard steps in `MANUAL_CHANGES_CHECKLIST.docx` are completed.

---

## Session A (Lane A: reality lock + contract freeze)

You are Codex in `/Users/foundbrand_001/Development/vc83-com`.
Execute only lane `A` rows from:
`/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/product-rename-sevenlayers/TASK_QUEUE.md`

Rules:
1. Keep the brand/domain contract explicit and unambiguous.
2. Keep compatibility exclusions explicit (no accidental storage/schema breakage).
3. Run `V-DOCS` before closing the lane.
4. Stop when lane `A` has no promotable rows.

---

## Session B (Lane B: metadata + routing foundations)

You are Codex in `/Users/foundbrand_001/Development/vc83-com`.
Execute only lane `B` rows from:
`/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/product-rename-sevenlayers/TASK_QUEUE.md`

Rules:
1. Update identity and routing foundations first (`package`, `manifest`, root metadata, middleware).
2. Keep domain redirects deterministic and fail-safe.
3. Run row `Verify` commands exactly.
4. Stop when lane `B` has no promotable rows.

---

## Session C (Lane C: web UI rename)

You are Codex in `/Users/foundbrand_001/Development/vc83-com`.
Execute only lane `C` rows from:
`/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/product-rename-sevenlayers/TASK_QUEUE.md`

Rules:
1. Prioritize customer-facing labels, links, and copy before lower-impact comments.
2. Preserve compatibility-protected keys and enum IDs.
3. Keep copy consistent with `sevenlayers` lowercase brand rule.
4. Run row `Verify` commands exactly.
5. Stop when lane `C` has no promotable rows.

---

## Session D (Lane D: backend defaults)

You are Codex in `/Users/foundbrand_001/Development/vc83-com`.
Execute only lane `D` rows from:
`/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/product-rename-sevenlayers/TASK_QUEUE.md`

Rules:
1. Update fallback domains and sender/reply-to defaults first.
2. After defaults are stable, sweep sample/template URLs.
3. Keep reseed requirements documented as you go.
4. Run row `Verify` commands exactly.
5. Stop when lane `D` has no promotable rows.

---

## Session E (Lane E: auth/callback/payment URLs)

You are Codex in `/Users/foundbrand_001/Development/vc83-com`.
Execute only lane `E` rows from:
`/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/product-rename-sevenlayers/TASK_QUEUE.md`

Rules:
1. Keep callback URL construction aligned to `NEXT_PUBLIC_APP_URL` contract.
2. Update OAuth, CLI, Stripe, and webhook URL defaults coherently.
3. Record every external dashboard callback/webhook URL that must be changed manually.
4. Run row `Verify` commands exactly.
5. Stop when lane `E` has no promotable rows.

---

## Session F (Lane F: translation + seed sweep)

You are Codex in `/Users/foundbrand_001/Development/vc83-com`.
Execute only lane `F` rows from:
`/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/product-rename-sevenlayers/TASK_QUEUE.md`

Rules:
1. Update translation and seed text deterministically; avoid partial or locale-skewed replacements.
2. Document reseed/migration order and safety checks.
3. Run row `Verify` commands exactly.
4. Stop when lane `F` has no promotable rows.

---

## Session G (Lane G: verification + cutover)

You are Codex in `/Users/foundbrand_001/Development/vc83-com`.
Execute only lane `G` rows from:
`/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/product-rename-sevenlayers/TASK_QUEUE.md`

Rules:
1. Run full verification stack and capture residual exceptions.
2. Treat cutover as incomplete until manual runbook steps are checked off.
3. Confirm rollback path before declaring done.
4. Run row `Verify` commands exactly.
5. Stop when lane `G` has no promotable rows.

---

## Session H (Lane H: optional mobile rename)

You are Codex in `/Users/foundbrand_001/Development/vc83-com`.
Execute only lane `H` rows from:
`/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/product-rename-sevenlayers/TASK_QUEUE.md`

Rules:
1. Start only after explicit go/no-go decision for mobile package/scheme/bundle migration.
2. Include deep-link continuity and app-store submission requirements.
3. Run `V-MOBILE` and capture platform-specific impact notes.
4. Stop when lane `H` has no promotable rows.
