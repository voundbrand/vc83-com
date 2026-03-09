# ATH-020 Canary Rollout Runbook (Step-by-Step)

## Goal

Execute first legacy-linkage canary safely using deterministic gates:

1. dry-run required,
2. apply only with approved `distributionJobId`,
3. staged windows with stop thresholds,
4. rollback readiness validated before each apply stage.

## Required inputs

1. `SESSION_ID`: super-admin session token.
2. `TEMPLATE_ID`: template object id.
3. Optional `TEMPLATE_VERSION_ID`: immutable template version snapshot id.
4. `CANARY_ORG_IDS`: ordered list of org ids for stage 1.
5. `ROLLOUT_REASON`: short audit reason string.

## Step 0: Preflight readiness

Run:

```bash
npm run typecheck
npm run test:unit
npm run docs:guard
```

Gate:

1. all three commands must pass.

## Step 1: Baseline inventory snapshot

Query clone inventory before any distribution action:

```bash
npx convex run agentOntology:listTemplateCloneInventory '{
  "sessionId": "SESSION_ID",
  "filters": { "templateId": "TEMPLATE_ID" },
  "limit": 300
}'
```

Record:

1. current policy-state counts (`in_sync`, `overridden`, `stale`, `blocked`),
2. high-risk rows for manual watchlist.

## Step 2: Drift baseline for canary set

```bash
npx convex run agentOntology:getTemplateCloneDriftReport '{
  "sessionId": "SESSION_ID",
  "templateId": "TEMPLATE_ID",
  "templateVersionId": "TEMPLATE_VERSION_ID",
  "targetOrganizationIds": ["ORG_ID_1", "ORG_ID_2"]
}'
```

Gate:

1. confirm expected target set only,
2. identify blocked fields before dry-run apply planning.

## Step 3: Dry-run distribution plan (mandatory)

```bash
npx convex run agentOntology:distributeAgentTemplateToOrganizations '{
  "sessionId": "SESSION_ID",
  "templateId": "TEMPLATE_ID",
  "templateVersionId": "TEMPLATE_VERSION_ID",
  "targetOrganizationIds": ["ORG_ID_1", "ORG_ID_2"],
  "stagedRollout": { "stageSize": 2, "stageStartIndex": 0 },
  "dryRun": true,
  "reason": "ROLLOUT_REASON",
  "operationKind": "rollout_apply"
}'
```

Capture from response:

1. `distributionJobId`,
2. `summary.plan`,
3. `policyGates`,
4. `reasonCounts`.

Dry-run gate:

1. no unexpected blocked reasons,
2. blocked ratio under `5%`,
3. warn-policy rows have explicit operator plan.

## Step 4: Apply stage 1 (canary only)

Use the same target org set and pass the dry-run job id:

```bash
npx convex run agentOntology:distributeAgentTemplateToOrganizations '{
  "sessionId": "SESSION_ID",
  "templateId": "TEMPLATE_ID",
  "templateVersionId": "TEMPLATE_VERSION_ID",
  "targetOrganizationIds": ["ORG_ID_1", "ORG_ID_2"],
  "stagedRollout": { "stageSize": 2, "stageStartIndex": 0 },
  "dryRun": false,
  "distributionJobId": "DRY_RUN_DISTRIBUTION_JOB_ID",
  "reason": "ROLLOUT_REASON",
  "operationKind": "rollout_apply",
  "overridePolicyGate": {
    "confirmWarnOverride": true,
    "reason": "Approved warn overrides for canary stage"
  }
}'
```

Apply gate:

1. mutated + skipped + blocked totals must reconcile with plan,
2. blocked ratio must remain under `5%`,
3. if threshold breached, stop further stages.

## Step 5: Post-apply telemetry hold

Query telemetry after stage 1:

```bash
npx convex run agentOntology:listTemplateDistributionTelemetry '{
  "sessionId": "SESSION_ID",
  "templateId": "TEMPLATE_ID",
  "limit": 30
}'
```

Hold checklist:

1. latest job status is `completed` or `completed_with_errors` with understood blockers,
2. no unexplained error spike,
3. no unauthorized/policy-gate anomalies in audit stream.

## Step 6: Rollback readiness checkpoint

Before stage 2+, verify rollback trigger conditions:

1. blocked ratio > `5%`,
2. unexpected policy-state shift to `blocked`,
3. severe regression reported by canary org.

If any trigger trips:

1. stop rollout,
2. execute rollback operation using same mutation with `operationKind: "rollout_rollback"` and affected canary org ids,
3. re-check drift report and telemetry after rollback.

## Step 7: Stage advancement rule

Proceed to next stage only when:

1. stage 1 telemetry hold passes,
2. no rollback trigger is active,
3. stakeholder signoff is logged with reason.

## Evidence log template

For each stage, capture:

1. timestamp,
2. operator,
3. command payload hash,
4. `distributionJobId`,
5. plan/apply summary,
6. decision (`advance`, `hold`, `rollback`),
7. reason.
