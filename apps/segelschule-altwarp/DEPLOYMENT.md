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
export SEGELSCHULE_SURFACE_APP_SLUG="<frontend-app-slug>"
export SEGELSCHULE_SURFACE_TYPE="<surface-type>"
export SEGELSCHULE_SURFACE_KEY="<surface-key>"
export SEGELSCHULE_BOOKING_CATALOG_JSON="<json-catalog>"
export SEGELSCHULE_COURSE_BINDINGS_JSON="<legacy-json-bindings>"
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

printf '%s' "$SEGELSCHULE_SURFACE_APP_SLUG" | npx vercel@latest env add SEGELSCHULE_SURFACE_APP_SLUG preview
printf '%s' "$SEGELSCHULE_SURFACE_APP_SLUG" | npx vercel@latest env add SEGELSCHULE_SURFACE_APP_SLUG production

printf '%s' "$SEGELSCHULE_SURFACE_TYPE" | npx vercel@latest env add SEGELSCHULE_SURFACE_TYPE preview
printf '%s' "$SEGELSCHULE_SURFACE_TYPE" | npx vercel@latest env add SEGELSCHULE_SURFACE_TYPE production

printf '%s' "$SEGELSCHULE_SURFACE_KEY" | npx vercel@latest env add SEGELSCHULE_SURFACE_KEY preview
printf '%s' "$SEGELSCHULE_SURFACE_KEY" | npx vercel@latest env add SEGELSCHULE_SURFACE_KEY production

printf '%s' "$SEGELSCHULE_BOOKING_CATALOG_JSON" | npx vercel@latest env add SEGELSCHULE_BOOKING_CATALOG_JSON preview
printf '%s' "$SEGELSCHULE_BOOKING_CATALOG_JSON" | npx vercel@latest env add SEGELSCHULE_BOOKING_CATALOG_JSON production

printf '%s' "$SEGELSCHULE_COURSE_BINDINGS_JSON" | npx vercel@latest env add SEGELSCHULE_COURSE_BINDINGS_JSON preview
printf '%s' "$SEGELSCHULE_COURSE_BINDINGS_JSON" | npx vercel@latest env add SEGELSCHULE_COURSE_BINDINGS_JSON production

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
- `SEGELSCHULE_SURFACE_APP_SLUG`, `SEGELSCHULE_SURFACE_TYPE`, `SEGELSCHULE_SURFACE_KEY`
  - Optional but recommended.
  - Identify which backend `frontend_surface_binding` should be resolved for this app surface.
  - Defaults are `segelschule-altwarp` / `booking` / `default`.
- `SEGELSCHULE_BOOKING_CATALOG_JSON`
  - Optional fallback only.
  - Used when no backend surface binding is found or backend lookup fails.
- `SEGELSCHULE_COURSE_BINDINGS_JSON`
  - Legacy optional bridge mapping (`courseId -> bookingResourceId/checkoutProductId`) still supported for backward compatibility.
- `CONTACT_FROM_EMAIL`
  - Optional; contact emails fall back to a default sender string.
- `CONTACT_NOTIFICATION_EMAIL`
  - Optional; enables internal contact notification emails.
- `ORG_API_KEY`
  - Currently unused by this app and not required for deployment.

## Calendar readiness diagnostics (go-live)

- Confirmed booking creation now records additive `calendarDiagnostics` in booking bridge responses.
- `writeReady=true` means at least one linked calendar connection is active, sync-enabled, and has calendar write scope.
- `writeReady=false` does not hard-fail booking; it returns warning/issue codes so ops can fix calendar readiness before launch.
- Issue codes you should treat as launch blockers:
  - `calendar_links_missing`
  - `calendar_links_not_write_ready`
  - `calendar_connection_inactive`
  - `calendar_sync_disabled`
  - `calendar_write_scope_missing`
  - `calendar_google_push_calendar_missing`
  - `calendar_readiness_lookup_failed`

## Local E2E assumptions

- Mother backend: `http://localhost:3000`
- Segelschule app: `http://localhost:3002`
- Ticket lookup checks should target segelschule app host (`/ticket`, `/api/ticket`) while bridge backend checks target mother backend APIs.

Booking catalog example:

```json
{
  "timezone": "Europe/Berlin",
  "defaultAvailableTimes": ["09:00", "10:00", "11:00", "13:00", "14:00", "15:00"],
  "boats": [
    { "id": "fraukje", "name": "Fraukje", "seatCount": 4 },
    { "id": "rose", "name": "Rose", "seatCount": 4 }
  ],
  "courses": [
    {
      "courseId": "schnupper",
      "bookingDurationMinutes": 180,
      "availableTimes": ["09:00", "13:00"],
      "bookingResourceId": "obj_resource_taster",
      "checkoutProductId": "obj_checkout_taster",
      "checkoutPublicUrl": "https://vc83.com/checkout/taster"
    },
    {
      "courseId": "grund",
      "bookingDurationMinutes": 480,
      "bookingResourceId": "obj_resource_weekend",
      "checkoutProductId": "obj_checkout_weekend",
      "checkoutPublicUrl": "https://vc83.com/checkout/weekend"
    },
    {
      "courseId": "intensiv",
      "bookingDurationMinutes": 480,
      "bookingResourceId": "obj_resource_intensive",
      "checkoutProductId": "obj_checkout_intensive",
      "checkoutPublicUrl": "https://vc83.com/checkout/intensive"
    }
  ]
}
```

Agent-assisted setup from mother repo:

- The mother agent can generate an org-specific setup blueprint via tool action:
  - `configure_booking_workflow` with `action: "generate_booking_setup_blueprint"`
- The mother agent can also persist this directly as backend surface binding:
  - `configure_booking_workflow` with `action: "upsert_booking_surface_binding"`
- This returns:
  - `bookingCatalogJson` (`SEGELSCHULE_BOOKING_CATALOG_JSON`)
  - `legacyBindingsJson` (`SEGELSCHULE_COURSE_BINDINGS_JSON`)
  - per-course mapping diagnostics and Google calendar readiness snapshot (if session has access)
- A commit-safe env template is available at:
  - `apps/segelschule-altwarp/.env.example`

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
