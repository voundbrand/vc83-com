# ATH-020 Canary Execution Log (2026-03-11)

## Scope

Workstream: Agent Template Distribution Hub (`ATH-020`)

Objective attempted:

1. Execute canary rollout runbook for first legacy-linkage wave.
2. Confirm row-level verification profile.

## Verification profile

Required row profile from `TASK_QUEUE.md`:

1. `npm run typecheck`
2. `npm run test:unit`
3. `npm run docs:guard`

Results (2026-03-11):

1. `npm run typecheck`: pass (`exit 0`)
2. `npm run test:unit`: pass (`272` passed files, `4` skipped; `1538` passed tests, `80` skipped)
3. `npm run docs:guard`: pass (`Docs guard passed.`)

## Canary execution attempt

Attempted Step 1 command:

```bash
npx convex run agentOntology:listTemplateCloneInventory '{"sessionId":"SESSION_ID","filters":{},"limit":25}'
```

Result:

1. fail-closed (`exit 1`)
2. error: `Invalid argument id for db.get: Unable to decode ID: Invalid ID length 10`
3. source: `requireAuthenticatedUser` in `convex/rbacHelpers.ts`

Interpretation:

1. A valid super-admin `sessionId` is required before any canary step can execute.
2. Live canary run cannot continue in this environment without real rollout inputs.

## Unblock inputs required

1. `SESSION_ID` (valid super-admin session token)
2. `TEMPLATE_ID` (template object id)
3. `CANARY_ORG_IDS` (ordered canary org ids for stage 1)
4. Optional `TEMPLATE_VERSION_ID` (immutable version snapshot id)
5. `ROLLOUT_REASON` (audit reason string)

## Status

`ATH-020` remains `BLOCKED` until the above inputs are provided.
