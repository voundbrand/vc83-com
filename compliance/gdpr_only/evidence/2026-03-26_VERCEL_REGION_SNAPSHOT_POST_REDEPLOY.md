# Vercel Region Snapshot Evidence (GDPRSYS-004, Post-Redeploy)

**Captured at:** 2026-03-26 (Europe/Berlin)  
**Context:** Verification after operator-reported redeploy to EU regions.

## Data sources

1. `GET https://api.vercel.com/v9/projects/{projectId}?teamId={teamId}`
2. `GET https://api.vercel.com/v6/deployments?projectId={projectId}&teamId={teamId}&limit=1&state=READY`
3. `GET https://api.vercel.com/v13/deployments/{deploymentId}?teamId={teamId}`

Auth path used: local Vercel CLI token from `~/Library/Application Support/com.vercel.cli/auth.json` (token value not stored in this file).

## Snapshot result (post-redeploy)

All tracked linked projects now show EU-oriented function region settings and latest production deployments in EU regions:

1. `vc83-com` (`prj_Uu0RLVNE3ikFDQ31r5R4z2fVcC2a`)
   - `serverlessFunctionRegion`: `cdg1`
   - latest production deployment regions: `cdg1`, `dub1`, `fra1`
2. `segelschule-altwarp` (`prj_w5gbPqn7S0V3zzjojurKyM8fMJZ9`)
   - `serverlessFunctionRegion`: `cdg1`
   - latest production deployment regions: `cdg1`, `dub1`, `fra1`
3. `guitarfingerstyle` (`prj_tnWTAFW2sEBwWqtE7LuhVsHN5p8m`)
   - `serverlessFunctionRegion`: `cdg1`
   - latest production deployment regions: `cdg1`, `dub1`, `fra1`

## Compliance interpretation

1. Prior same-day snapshot with `iad1` side-project defaults is superseded for current runtime posture.
2. Region evidence is now consistently EU-oriented across the tracked linked Vercel projects.
3. Transfer/DPA/TOM evidence obligations still remain and must stay linked in contract artifacts.

## Related evidence history

1. Pre-redeploy snapshot: `/Users/foundbrand_001/Development/vc83-com/compliance/gdpr_only/evidence/2026-03-26_VERCEL_REGION_SNAPSHOT.md`
