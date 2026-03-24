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
- `GW_ORG_ID`

Optional / conditional:

- No additional runtime env vars are required by the current app code.

Review manually:

- Any future OAuth / NextAuth provider secrets are not wired into the current `apps/hub-gw` routes yet, so do not add them unless the auth implementation lands in app code.

## Local validation

Run from the repo root:

```bash
export PATH="$HOME/.nvm/versions/node/v22.19.0/bin:$PATH"
npm install --prefix apps/hub-gw
npm --prefix apps/hub-gw run build
npm --prefix apps/hub-gw run typecheck
```
