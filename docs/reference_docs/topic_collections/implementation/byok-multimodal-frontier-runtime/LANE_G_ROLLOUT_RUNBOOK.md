# Lane G Rollout Runbook (BMF-018)

**Date:** 2026-02-19  
**Scope:** Provider-agnostic AI settings migration/backfill, canary rollout, emergency rollback, and key-rotation recovery hardening.

---

## P0 Gate Confirmation

All prerequisite `P0` rows before `BMF-018` are `DONE`:

- `BMF-001`, `BMF-002`, `BMF-003`, `BMF-004`, `BMF-005`, `BMF-007`, `BMF-008`, `BMF-010`, `BMF-013`, `BMF-015`.

Lane `G` start condition in queue is satisfied.

---

## Top Regression Risks (Pre-Execution)

1. Backfill updates unintentionally modify orgs already running provider-agnostic settings.
2. Key rotation keeps stale cooldown/failure counters and blocks recovered connections.
3. Rollback path is incomplete and leaves mixed legacy/provider-agnostic contract fields.

---

## Rollout Command Set

### 1) Canary audit (no writes)

```bash
npx convex run migrations/byokProviderAgnosticRollout:auditProviderAgnosticSettingsBackfill '{"organizationIds":["<ORG_ID_1>","<ORG_ID_2>"]}'
```

### 2) Canary dry-run backfill (writes disabled)

```bash
npx convex run migrations/byokProviderAgnosticRollout:runProviderAgnosticSettingsBackfillBatch '{"organizationIds":["<ORG_ID_1>","<ORG_ID_2>"],"dryRun":true}'
```

### 3) Canary write pass

```bash
npx convex run migrations/byokProviderAgnosticRollout:runProviderAgnosticSettingsBackfillBatch '{"organizationIds":["<ORG_ID_1>","<ORG_ID_2>"],"dryRun":false}'
```

### 4) Full rollout (paged batches)

```bash
npx convex run migrations/byokProviderAgnosticRollout:runProviderAgnosticSettingsBackfillBatch '{"numItems":25,"dryRun":false}'
```

Re-run with returned `nextCursor` until `hasNextPage=false`.

### 5) Emergency rollback (canary or paged)

```bash
npx convex run migrations/byokProviderAgnosticRollout:rollbackProviderAgnosticSettingsBatch '{"organizationIds":["<ORG_ID_1>"],"dryRun":false}'
```

For paged rollback:

```bash
npx convex run migrations/byokProviderAgnosticRollout:rollbackProviderAgnosticSettingsBatch '{"numItems":25,"dryRun":false}'
```

---

## Feature-Flag Rollout Sequence

1. Keep BYOK availability tier-gated (`aiEnabled` + `aiByokEnabled`) during canary.
2. Enable canary org cohort first; verify provider probes and migration receipts.
3. Expand cohorts in deterministic batches only after canary is healthy.
4. If probe health or runtime fallback metrics regress, stop rollout and run rollback batch.

---

## Key-Rotation Recovery Path

`convex/integrations/aiConnections.ts` now clears cooldown/failure counters when a connection API key changes, so rotated keys are immediately eligible for routing.

Operational recovery path:

1. Rotate key via save mutation (UI or API).
2. Run provider probe:
   - `integrations/aiConnections:testAIConnection`
3. Confirm healthy status before re-expanding rollout cohort.

---

## Rollback Safety Guarantees

Rollback mutation (`internal.ai.settings.rollbackProviderAgnosticSettings`) does the following per org:

1. Resets contract marker to `openrouter_v1`.
2. Removes provider-agnostic fields (`llm.providerId`, `llm.providerAuthProfiles`, `billingSource`).
3. Writes rollback receipt state to `aiSettingsMigrations` (`status=failed`, rollback metadata).

This keeps legacy OpenRouter fields in place for emergency continuity.
