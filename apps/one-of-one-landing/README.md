# One of One Landing App

Dedicated Next.js app boundary for the One of One landing experience.

## Scope (OOO-053)

- Isolated App Router scaffold under `app/`
- App-local scripts in `package.json`
- Shared webchat API contract boundary in `lib/webchat-api-contract.ts`

## Scripts

- `npm --prefix apps/one-of-one-landing run dev`
- `npm --prefix apps/one-of-one-landing run build`
- `npm --prefix apps/one-of-one-landing run start`
- `npm --prefix apps/one-of-one-landing run typecheck`

## Chat Runtime Wiring

Embedded chat posts to `/api/v1/native-guest/message` and resolves `agentId` in this order:

1. `NEXT_PUBLIC_ONE_OF_ONE_AUDIT_AGENT_ID`
2. `NEXT_PUBLIC_NATIVE_GUEST_AGENT_ID`
3. `NEXT_PUBLIC_PLATFORM_AGENT_ID`
4. `GET /api/native-guest/config` runtime bootstrap (included in this app), which can target a specific agent via:
   - `NEXT_PUBLIC_ONE_OF_ONE_AUDIT_TEMPLATE_ROLE`
   - `NEXT_PUBLIC_ONE_OF_ONE_AUDIT_AGENT_NAME`

Recommended env for local/dev:

- `NEXT_PUBLIC_API_ENDPOINT_URL` (Convex site URL hosting `/api/v1/*`)
- `NEXT_PUBLIC_CONVEX_URL`
- `CONVEX_DEPLOY_KEY`
- `PLATFORM_ORG_ID` (or `TEST_ORG_ID` / `NEXT_PUBLIC_PLATFORM_ORG_ID`)
