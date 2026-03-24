# Hub GW Deployment

`apps/hub-gw` should be deployed as its own Vercel project, not under the root `vc83-com` project.

## Vercel settings

- Framework Preset: `Next.js`
- Root Directory: `apps/hub-gw`
- Node.js Version: `22.x`
- Install Command: `cd ../.. && npm ci --include=dev && npm ci --prefix apps/hub-gw --include=dev`
- Build Command: `npm run build`
- Output Directory: leave blank
- Ignored Build Step: `bash ../../scripts/ci/vercel-ignored-build.sh apps/hub-gw`

## Why this shape

- The app uses `next.config.ts` with `outputFileTracingRoot` set to the monorepo root.
- The app imports Convex generated files from `convex/_generated/*` outside the app root.
- Because of that external workspace import, Vercel needs both the root install and the app-local install.
- `vercel.json` is committed to avoid dashboard drift on framework/install detection.

## Environment variables

Required:

- `NEXT_PUBLIC_CONVEX_URL`
- `CONVEX_DEPLOY_KEY`
- `AUTH_SECRET`

Optional / conditional:

- `HUB_GW_AUTH_MODE` (`auto` by default; optional override: `platform`, `oidc`, or `mock`)

Review manually:

- Hub-GW resolves organization scope from request host/domain configuration.
- `auto` mode uses platform auth by default and only switches to OIDC when a valid per-org `frontend_oidc` integration is active.
- Real OIDC requires a per-org `frontend_oidc` integration in platform settings (not static `GW_ORG_ID` env wiring).

## Local validation

Run from the repo root:

```bash
export PATH="$HOME/.nvm/versions/node/v22.19.0/bin:$PATH"
npm install --prefix apps/hub-gw
npm --prefix apps/hub-gw run build
npm --prefix apps/hub-gw run typecheck
```
