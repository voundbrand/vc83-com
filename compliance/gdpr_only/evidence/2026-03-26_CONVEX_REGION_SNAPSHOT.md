# Convex Region Snapshot Evidence (GDPRSYS-003)

**Captured at:** 2026-03-26 (Europe/Berlin)  
**Context:** Pre-cutover snapshot while EU migration is in progress.

## Data sources

1. `GET https://api.convex.dev/api/dashboard/teams`
2. `GET https://api.convex.dev/v1/teams/63201/list_deployments`

Auth path used: local Convex CLI access token from `~/.convex/config.json` (token value not stored in this file).

## Snapshot result

Team metadata:

1. `teamId`: `63201`
2. `slug`: `remington-splettstoesser`
3. `defaultRegion`: `aws-eu-west-1`

Project `1113135` deployments:

1. `production`:
   - `name`: `agreeable-lion-828`
   - `deploymentType`: `prod`
   - `region`: `aws-us-east-1`
   - `deploymentUrl`: `https://agreeable-lion-828.convex.cloud`
2. `development`:
   - `name`: `aromatic-akita-723`
   - `deploymentType`: `dev`
   - `region`: `aws-us-east-1`
   - `deploymentUrl`: `https://aromatic-akita-723.convex.cloud`

## Compliance interpretation

1. As captured on 2026-03-26, active production deployment is not in an EU region.
2. EU migration was reported as in progress by the operator.
3. GDPR/DSGVO records must stay fail-closed until post-cutover evidence confirms EU production region and corresponding env cutover.

## Required follow-up evidence

1. Re-run the same two API checks after migration cutover.
2. Attach the post-cutover snapshot in this folder.
3. Update:
   - `compliance/gdpr_only/TASK_QUEUE.md`
   - `compliance/dsgvo_kanzlei_agent_mvp/SUBPROCESSOR_TRANSFER_MATRIX.md`
   - `compliance/dsgvo_kanzlei_agent_mvp/TRANSFER_IMPACT_REGISTER.md`
