# Life Operator One-of-One Rollout and Rollback Playbook

**Status:** Finalized for `LOC-010` closeout  
**Last updated:** 2026-02-25  
**Workstream root:** `/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/life-operator-one-of-one-cutover`

---

## Purpose

Publish deterministic rollout, rollback, and ownership rules for the one-of-one Life Operator pivot after `LOC-009` acceptance evidence.

Goals:

1. keep one visible operator as the default user-facing surface,
2. preserve trust/privacy/cross-org guarantees proven in acceptance,
3. provide explicit rollback triggers and operations,
4. freeze non-closeout rows with clear ownership and unfreeze conditions.

---

## Rollout Gates

Rollout is `GO` only when all are true:

1. `LOC-009` acceptance matrix evidence is current in `/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/life-operator-one-of-one-cutover/MASTER_PLAN.md`.
2. `npm run typecheck` passes.
3. `npm run test:unit` passes.
4. `npm run test:e2e:desktop` passes.
5. `npm run docs:guard` passes.
6. Legacy marketplace defaults are not reachable from default operator UI entrypoints.

Evidence baseline captured on 2026-02-25:

1. Typecheck: pass.
2. Unit: pass (`142` files passed, `4` skipped; `687` tests passed, `80` skipped).
3. Desktop E2E: pass (`1` passed).
4. Docs guard: pass.

---

## Deployment Shape

1. Primary mode: one visible primary operator with hidden specialist routing.
2. Legacy store/recommender compatibility: fail-closed by default.
3. Compatibility toggles (emergency only):
   - `AGENT_STORE_COMPATIBILITY_ENABLED`
   - `AGENT_RECOMMENDER_COMPATIBILITY_ENABLED`
   - alias support: `AGENT_MARKETPLACE_COMPATIBILITY_ENABLED`

Default state is `OFF` for all compatibility toggles.

---

## Rollback Triggers

Trigger rollback if any of the following occur in production:

1. trust boundary regression: mutating behavior bypasses approval/audit,
2. privacy regression: local-only/privacy policy is bypassed,
3. cross-org leakage: data or mutations cross org boundaries,
4. one-operator UX break: default creation path no longer opens primary-operator assistant,
5. severe utility failure: critical mission flows cannot complete at acceptable reliability.

---

## Rollback Procedure

1. Set compatibility flags to `ON` in emergency runtime config:
   - `AGENT_STORE_COMPATIBILITY_ENABLED=true`
   - `AGENT_RECOMMENDER_COMPATIBILITY_ENABLED=true`
2. Re-run smoke verification:
   - `npm run typecheck`
   - `npm run test:unit`
   - `npm run test:e2e:desktop`
3. Capture incident record in cutover log with:
   - trigger reason,
   - timestamp,
   - operator on-call owner,
   - mitigation and follow-up row assignment.
4. Re-freeze compatibility flags to `OFF` once mitigation patch is verified.

Note: rollback re-opens compatibility APIs only; it does not change one-operator default UI policy unless separately approved.

---

## Ownership and Handoff

Post-closeout owners:

1. One-operator runtime integrity owner:
   - `/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/personal-life-operator-agent`
2. Memory and permission-ladder owner:
   - `/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/your-ai-one-agent-core`
3. Demo-lane owner (capability packs/playbooks/scorecard):
   - `/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/life-operator-one-of-one-cutover`

---

## Frozen Row Ledger (Closeout Condition)

Rows intentionally frozen as part of `LOC-010` closeout:

1. `LOC-006` (operator-commerce docs cleanup):
   - Owner: soul docs steward lane.
   - Unfreeze: explicit cutover override after demo-lane priorities are resolved.
2. `LOC-008` (memory graph + permission ladder contract):
   - Owner: one-agent-core and personal-life-operator lanes.
   - Unfreeze: explicit memory-contract scheduling decision in follow-on queue.
3. `LOC-013` and `LOC-014` (demo-lane playbook/scorecard follow-ons):
   - Owner: demo-readiness lane.
   - Unfreeze: explicit instruction to resume demo-lane execution from this queue.

Completed demo-lane baseline rows retained as `DONE`:

1. `LOC-011` (capability-pack taxonomy contract baseline).
2. `LOC-012` (capability gap-explainer contract and fail-closed runtime behavior).

This satisfies the closeout rule that remaining non-`DONE` rows are intentionally `BLOCKED` with ownership and unfreeze conditions.

---

## Ongoing Watch

Track these guardrail signals continuously:

1. trust approval coverage for mutating actions,
2. privacy-mode policy blocks for unsafe routes,
3. cross-org routing integrity,
4. one-operator UX continuity,
5. compatibility flag usage frequency (should remain near zero in steady state).
