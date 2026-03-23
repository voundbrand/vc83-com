# Segelschule Altwarp Deployment

`apps/segelschule-altwarp` should be deployed as its own Vercel project, using the same monorepo app pattern as `apps/one-of-one-landing`.

## Current repo state

- Do not reuse the root `vc83-com` Vercel project.
- Do not commit `.vercel/`.
- This app intentionally includes an app-local `vercel.json` to pin the Vercel framework/build settings at the app root.
- `apps/segelschule-altwarp/package.json` now declares the app's direct Next/runtime dependencies and uses app-local `next`/`tsc` scripts.
- `apps/segelschule-altwarp/next.config.ts` sets `outputFileTracingRoot` to the monorepo root.
- Monorepo build skipping uses `scripts/ci/vercel-ignored-build.sh`.

## Vercel project settings

Create a separate Vercel project for this app with these values:

- Framework Preset: `Next.js`
- Node.js Version: `22.x`
- Root Directory: `apps/segelschule-altwarp`
- Build Command: `npm run build`
- Output Directory: leave blank / default for `Next.js`
- Install Command: `cd ../.. && npm ci --include=dev && npm ci --prefix apps/segelschule-altwarp --include=dev`
- Ignored Build Step:

```bash
bash ../../scripts/ci/vercel-ignored-build.sh apps/segelschule-altwarp
```

## Exact setup commands

Run these from the repo root:

```bash
cd /Users/foundbrand_001/Development/vc83-com/apps/segelschule-altwarp

# Link this app to its own Vercel project.
# When prompted, create/select a project for this app only.
# Do not pick the root "vc83-com" project.
npx vercel@latest link
```

If you create the project in the Vercel dashboard instead of the CLI, set:

```bash
Node.js Version: 22.x
Install Command: cd ../.. && npm ci --include=dev && npm ci --prefix apps/segelschule-altwarp --include=dev
Build Command: npm run build
Output Directory: leave blank
Ignored Build Step: bash ../../scripts/ci/vercel-ignored-build.sh apps/segelschule-altwarp
```

Required env vars for both `preview` and `production`:

```bash
export NEXT_PUBLIC_CONVEX_URL="<your-convex-url>"
export CONVEX_DEPLOY_KEY="<your-convex-deploy-key>"
export ORG_ID="<your-org-id>"

printf '%s' "$NEXT_PUBLIC_CONVEX_URL" | npx vercel@latest env add NEXT_PUBLIC_CONVEX_URL preview
printf '%s' "$NEXT_PUBLIC_CONVEX_URL" | npx vercel@latest env add NEXT_PUBLIC_CONVEX_URL production

printf '%s' "$CONVEX_DEPLOY_KEY" | npx vercel@latest env add CONVEX_DEPLOY_KEY preview
printf '%s' "$CONVEX_DEPLOY_KEY" | npx vercel@latest env add CONVEX_DEPLOY_KEY production

printf '%s' "$ORG_ID" | npx vercel@latest env add ORG_ID preview
printf '%s' "$ORG_ID" | npx vercel@latest env add ORG_ID production
```

Optional env vars, only if you need the corresponding feature:

```bash
export NEXT_PUBLIC_CMS_EDITOR_ENABLED="<true-or-false>"
export NEXT_PUBLIC_API_ENDPOINT_URL="<https://your-main-platform-host>"
export NEXT_PUBLIC_APP_URL="<https://your-main-platform-host>"
export RESEND_API_KEY="<your-resend-api-key>"
export BOOKING_FROM_EMAIL="<from-address>"
export BOOKING_NOTIFICATION_EMAIL="<team-booking-address>"
export CONTACT_FROM_EMAIL="<from-address>"
export CONTACT_NOTIFICATION_EMAIL="<team-contact-address>"

printf '%s' "$NEXT_PUBLIC_CMS_EDITOR_ENABLED" | npx vercel@latest env add NEXT_PUBLIC_CMS_EDITOR_ENABLED preview
printf '%s' "$NEXT_PUBLIC_CMS_EDITOR_ENABLED" | npx vercel@latest env add NEXT_PUBLIC_CMS_EDITOR_ENABLED production

printf '%s' "$NEXT_PUBLIC_API_ENDPOINT_URL" | npx vercel@latest env add NEXT_PUBLIC_API_ENDPOINT_URL preview
printf '%s' "$NEXT_PUBLIC_API_ENDPOINT_URL" | npx vercel@latest env add NEXT_PUBLIC_API_ENDPOINT_URL production

printf '%s' "$NEXT_PUBLIC_APP_URL" | npx vercel@latest env add NEXT_PUBLIC_APP_URL preview
printf '%s' "$NEXT_PUBLIC_APP_URL" | npx vercel@latest env add NEXT_PUBLIC_APP_URL production

printf '%s' "$RESEND_API_KEY" | npx vercel@latest env add RESEND_API_KEY preview
printf '%s' "$RESEND_API_KEY" | npx vercel@latest env add RESEND_API_KEY production

printf '%s' "$BOOKING_FROM_EMAIL" | npx vercel@latest env add BOOKING_FROM_EMAIL preview
printf '%s' "$BOOKING_FROM_EMAIL" | npx vercel@latest env add BOOKING_FROM_EMAIL production

printf '%s' "$BOOKING_NOTIFICATION_EMAIL" | npx vercel@latest env add BOOKING_NOTIFICATION_EMAIL preview
printf '%s' "$BOOKING_NOTIFICATION_EMAIL" | npx vercel@latest env add BOOKING_NOTIFICATION_EMAIL production

printf '%s' "$CONTACT_FROM_EMAIL" | npx vercel@latest env add CONTACT_FROM_EMAIL preview
printf '%s' "$CONTACT_FROM_EMAIL" | npx vercel@latest env add CONTACT_FROM_EMAIL production

printf '%s' "$CONTACT_NOTIFICATION_EMAIL" | npx vercel@latest env add CONTACT_NOTIFICATION_EMAIL preview
printf '%s' "$CONTACT_NOTIFICATION_EMAIL" | npx vercel@latest env add CONTACT_NOTIFICATION_EMAIL production
```

## Required vs optional env vars

Required for the current site runtime:

- `NEXT_PUBLIC_CONVEX_URL`
- `CONVEX_DEPLOY_KEY`
- one of `ORG_ID`, `TEST_ORG_ID`, or `NEXT_PUBLIC_ORG_ID`

Optional / conditional:

- `NEXT_PUBLIC_CMS_EDITOR_ENABLED`
  - Defaults to disabled unless set to `true`.
- `NEXT_PUBLIC_API_ENDPOINT_URL` or `NEXT_PUBLIC_APP_URL`
  - Needed for CMS editor sign-in against the main platform app.
- `RESEND_API_KEY`
  - Only needed if email should send from env-backed Resend credentials.
  - Not needed when org-level Resend credentials already resolve through Convex.
- `BOOKING_FROM_EMAIL`
  - Optional; booking emails fall back to a default sender string.
- `BOOKING_NOTIFICATION_EMAIL`
  - Optional; enables internal booking notification emails.
- `CONTACT_FROM_EMAIL`
  - Optional; contact emails fall back to a default sender string.
- `CONTACT_NOTIFICATION_EMAIL`
  - Optional; enables internal contact notification emails.
- `ORG_API_KEY`
  - Currently unused by this app and not required for deployment.

## Validation

Local sanity checks against the current repo state:

- `npm --prefix apps/segelschule-altwarp run build` passes.
- `npm --prefix apps/segelschule-altwarp run typecheck` passes after `.next/types` are generated by a build.
- The app package is pinned to `node: 22.x` to avoid Vercel defaulting this project to Node 24.
- The app package declares its direct Next/runtime dependencies so Vercel can detect the framework from `apps/segelschule-altwarp/package.json`.
- The app uses app-local `next` and `typescript`, but it also imports `convex/_generated/*` and `@cms` from outside the app root.
- Because those external files resolve packages via ancestor `node_modules`, Vercel must install both the repo root dependencies and the app-local dependencies.
- Do not override `Output Directory` to `.next` for a `Next.js` project on Vercel; leave it on the framework default so Vercel handles the Next build output correctly.

## Reference pattern

`apps/one-of-one-landing` already matches the intended monorepo shape:

- app-local `package.json` scripts
- app-local `next.config.ts` with `outputFileTracingRoot`
- `segelschule-altwarp` intentionally adds a committed app-local `vercel.json` because Vercel was previously resolving this project as a static build
- no committed app-local `.vercel/`
