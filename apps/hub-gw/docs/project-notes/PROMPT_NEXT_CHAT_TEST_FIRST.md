# Prompt For New Chat (Test-First, Then Platform-Native Work)

```text
You are Codex in `/Users/foundbrand_001/Development/vc83-com`.

Read and follow `AGENTS.md` instructions in this repo.

Context:
- Hub-GW reusable frontend OIDC bridge is implemented.
- Live authorize checks already confirm these client+redirect pairs are accepted by GW auth server (302 to /login):
  - hub -> https://sevenlayers.ngrok.pizza/api/auth/callback/gruendungswerft
  - hub_production -> https://app.l4yercak3.com/api/auth/callback/gruendungswerft
  - hub_prod_2 -> https://app.sevenlayers.io/api/auth/callback/gruendungswerft
- Current blocker is token exchange `invalid_client`.

Mission order (strict):

Phase 1: Test-first verification and evidence
1. Re-run deterministic smoke checks for OIDC flow and capture evidence:
   - authorize response per client
   - token exchange failure shape/code
   - exact URL/params used by Hub-GW bridge
2. Confirm current Hub-GW runtime config:
   - NEXTAUTH_URL
   - NEXT_PUBLIC_API_ENDPOINT_URL
   - auth mode + resolved org scope
3. Publish pass/fail/block table with exact command evidence.

Phase 2: Stabilize our side without waiting
1. Keep backward-compatible auth modes (`mock|platform|oidc|auto`).
2. Prepare platform-native identity path for Hub-GW:
   - move authority toward `users + organizationMembers`
   - keep compatibility bridge during migration
3. Add deterministic multi-company context resolver:
   - memberships[] + active org selection rules
4. Add capability/licensing resolver contract + table-driven tests.

Phase 3: External contract docs
1. Update internal requirements doc for Chuck:
   - focus on invalid_client root-cause items and final token auth contract
   - keep member sync API contract (`/me`, `/me/companies`)
2. Do not ask again for redirect URIs unless a new failing test proves mismatch.

Primary files:
- /Users/foundbrand_001/Development/vc83-com/apps/hub-gw/lib/auth.ts
- /Users/foundbrand_001/Development/vc83-com/apps/hub-gw/lib/server-convex.ts
- /Users/foundbrand_001/Development/vc83-com/convex/auth.ts
- /Users/foundbrand_001/Development/vc83-com/convex/frontendOidcInternal.ts
- /Users/foundbrand_001/Development/vc83-com/apps/hub-gw/docs/project-notes/GW_MEMBER_SYNC_REQUIREMENTS.md
- /Users/foundbrand_001/Development/vc83-com/apps/hub-gw/docs/project-notes/PROMPT_CHUCK_AI_PHP_OIDC.md

Verification commands:
- npm run hub-gw:typecheck
- npx tsc -p convex/tsconfig.json --noEmit
- npm run typecheck
- rg -n "frontendOidc|invalid_client|client_secret_post|client_secret_basic|organizationMembers|parentOrganizationId|membership|active org" apps/hub-gw convex docs

Expected output format:
1. Test evidence (commands + outcomes)
2. Root-cause hypothesis ranking
3. Code/doc changes
4. Deterministic matrix (scenario/result/evidence)
5. Verification results
6. Next actions (internal vs Chuck-dependent)
```

