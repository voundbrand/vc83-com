# Convex Region Snapshot Evidence (GDPRSYS-003, Post-Migration)

**Captured at:** 2026-03-26 (Europe/Berlin)  
**Context:** Verification after operator-reported migration to Convex EU regions.

## Data sources

1. `GET https://api.convex.dev/v1/teams/63201/list_deployments`
2. Runtime configuration references in local env files (masked in terminal output).

Auth path used: local Convex CLI access token from `~/.convex/config.json` (token value not stored in this file).

## Snapshot result (post-migration)

Relevant deployments:

1. `dashing-cuttlefish-674`
   - `deploymentType`: `prod`
   - `projectId`: `1870674`
   - `region`: `aws-eu-west-1`
   - `deploymentUrl`: `https://dashing-cuttlefish-674.eu-west-1.convex.cloud`
2. `handsome-trout-897`
   - `deploymentType`: `dev`
   - `projectId`: `1870674`
   - `region`: `aws-eu-west-1`
   - `deploymentUrl`: `https://handsome-trout-897.eu-west-1.convex.cloud`
3. Legacy production deployment still present in team history:
   - `agreeable-lion-828` (`projectId` `1113135`, region `aws-us-east-1`)

## Compliance interpretation

1. Active migration target project is now region-evidenced in EU (`aws-eu-west-1`) for both dev and prod.
2. Prior same-day pre-cutover snapshot (US prod on `agreeable-lion-828`) is retained as audit history and superseded for current EU target posture.
3. Contract, transfer, and TOM closure obligations remain open independently of region evidence.

## Required follow-up evidence

1. Confirm environment cutover consistency across operational deployment surfaces (Vercel dashboard env, CI secrets, and local runbooks).
2. Keep Convex DPA/AVV and TOM evidence linked in:
   - `compliance/dsgvo_kanzlei_agent_mvp/AVV_62A_CHECKLIST.md`
   - `compliance/dsgvo_kanzlei_agent_mvp/TRANSFER_IMPACT_REGISTER.md`
   - `compliance/dsgvo_kanzlei_agent_mvp/TOM_CONTROL_MATRIX.md`

## Related evidence history

1. Pre-cutover snapshot: `/Users/foundbrand_001/Development/vc83-com/compliance/gdpr_only/evidence/2026-03-26_CONVEX_REGION_SNAPSHOT.md`
