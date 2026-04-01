# Vercel Region Snapshot Evidence (GDPRSYS-004)

**Captured at:** 2026-03-26 (Europe/Berlin)  
**Context:** Production region verification for active Vercel projects.

## Data sources

1. `GET https://api.vercel.com/v9/projects/{projectId}?teamId={teamId}`
2. `GET https://api.vercel.com/v6/deployments?projectId={projectId}&teamId={teamId}&limit=...&state=READY`
3. `GET https://api.vercel.com/v13/deployments/{deploymentId}?teamId={teamId}`

Auth path used: local Vercel CLI token from `~/Library/Application Support/com.vercel.cli/auth.json` (token value not stored in this file).

## Snapshot result

### Core project: `vc83-com`

1. `projectId`: `prj_Uu0RLVNE3ikFDQ31r5R4z2fVcC2a`
2. `serverlessFunctionRegion`: `cdg1`
3. Latest production deployment (`vc83-com`, branch `main`) regions: `cdg1`, `dub1`, `fra1`
4. Alias sample: `app.l4yercak3.com`, `vc83-com.vercel.app`

### Side project: `segelschule-altwarp`

1. `projectId`: `prj_w5gbPqn7S0V3zzjojurKyM8fMJZ9`
2. `serverlessFunctionRegion`: `iad1`
3. Latest production deployment regions: `iad1`

### Side project: `guitarfingerstyle`

1. `projectId`: `prj_tnWTAFW2sEBwWqtE7LuhVsHN5p8m`
2. `serverlessFunctionRegion`: `iad1`
3. Latest production deployment regions: `iad1`

## Compliance interpretation

1. Core project `vc83-com` currently has explicit EU-oriented function-region evidence (`cdg1`) with latest deployment regions in EU.
2. Side projects still show `iad1` and must be treated as US-region residual risk unless reconfigured.
3. Vercel transfer posture still needs contract and transfer-basis documentation, and Vercel should not be treated as the sole permanent EU data store.

## Required follow-up evidence

1. Re-run this snapshot after any Vercel project setting change.
2. Align side-project region settings (`iad1`) with intended compliance scope.
3. Keep transfer and DPA evidence linked in:
   - `compliance/gdpr_only/GDPR_COMPLIANCE_PLAN.md`
   - `compliance/dsgvo_kanzlei_agent_mvp/TRANSFER_IMPACT_REGISTER.md`
