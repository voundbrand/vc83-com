# Slack Integration Workstream Master Plan

**Date:** 2026-02-18  
**Scope:** Add Slack as a first-party integration on the platform with secure OAuth, inbound event processing, and outbound messaging support.

---

## Mission

Deliver a production-safe Slack integration where organizations can:

1. connect and manage Slack from the Integrations UI,
2. route Slack inbound events into the platform agent runtime,
3. send outbound replies/notifications back to Slack channels and threads.

---

## Current state in this codebase

1. `oauthConnections` schema already includes `provider: "slack"` in `convex/schemas/coreSchemas.ts`.
2. Integrations UI already shows a Slack card, but it is `coming_soon` in `src/components/window-content/integrations-window/index.tsx`.
3. There is no Slack OAuth module under `convex/oauth/` (no `convex/oauth/slack.ts`).
4. There is no Slack OAuth callback route under `src/app/api/oauth/slack/callback/route.ts`.
5. Channel provider stack currently supports Chatwoot/ManyChat/WhatsApp/Infobip/Telegram, but not Slack in `convex/channels/providers/` and `convex/channels/registry.ts`.
6. `convex/http.ts` has many webhook endpoints but no Slack Events API endpoint/signature verification path.

---

## Option set

| Option | Description | Pros | Cons |
|---|---|---|---|
| `A` (recommended) | Full Slack v1: OAuth + Events API + outbound thread replies + optional slash command | Real first-party integration; reusable for future channel growth; clear security model | Larger implementation scope and test surface |
| `B` | Outbound-only Slack notifications (no inbound events) | Faster initial launch | Not interactive; limited product value |
| `C` | Manual webhook + static bot token, no OAuth lifecycle | Low setup effort | Weak security posture; no org-managed credential lifecycle |

### Recommendation

Adopt **Option A** for launch-quality Slack support and long-term maintainability.

---

## Lane A scope freeze (`SLI-001`)

**Freeze date:** 2026-02-17  
**Gate:** This section is the lane-`A` contract. Lane `B`/`C` execution starts only after this scope and non-goals are accepted as locked.

### Baseline audit snapshot

1. `convex/schemas/coreSchemas.ts` already allows `provider: "slack"` in both `oauthConnections` and `oauthStates`.
2. `src/components/window-content/integrations-window/index.tsx` already renders Slack but keeps it as `coming_soon`.
3. `convex/oauth/` has no `slack.ts`, so Slack OAuth lifecycle logic is not yet implemented.
4. `convex/channels/types.ts` and `convex/channels/router.ts` currently have no Slack-specific channel/provider handling.
5. Slack webhook endpoint/signature flow is not present in `convex/http.ts` (must be added in lane `C`).

### Frozen v1 scope

1. OAuth connect/disconnect/reconnect lifecycle for Slack in Integrations UI.
2. OAuth callback exchange with state validation and encrypted token storage.
3. Slack Events API ingress with signature validation, URL verification challenge handling, and idempotent retry-safe processing.
4. Inbound routing for app mentions and configured message events into the existing agent runtime.
5. Outbound Slack delivery for channel posts and thread replies.
6. Optional slash command support, guarded by rollout controls defined in lane `A`.

### Frozen v1 exclusions

1. No Slack Workflow Builder custom steps/actions in v1.
2. No Slack Marketplace publishing workflow in this workstream.
3. No Enterprise Grid-specific admin or multi-workspace orchestration features.
4. No interactive Slack modals/home tab UX in v1.
5. No migration/backfill of historical Slack message history.

### Scope change control

Any scope changes after this freeze require a new queue row and explicit updates to `TASK_QUEUE.md`, `MASTER_PLAN.md`, and `INDEX.md` before implementation continues.

---

## Lane A environment and rollout contract (`SLI-002`)

### Environment and secrets contract

| Variable | Required | Contract |
|---|---|---|
| `SLACK_INTEGRATION_ENABLED` | Yes | Global kill switch for Slack OAuth/events runtime; must be `true` to activate Slack integration behavior. |
| `SLACK_CLIENT_ID` | Conditional | Required when `SLACK_INTEGRATION_ENABLED=true`; Slack OAuth client identifier. |
| `SLACK_CLIENT_SECRET` | Conditional | Required when `SLACK_INTEGRATION_ENABLED=true`; Slack OAuth client secret. |
| `SLACK_SIGNING_SECRET` | Conditional | Required when `SLACK_INTEGRATION_ENABLED=true`; used for Events API signature verification. |
| `SLACK_SLASH_COMMANDS_ENABLED` | No | Optional rollout gate for slash command behavior; defaults to `false` in v1. |
| `SLACK_BOT_TOKEN_POLICY` | Yes | Token policy enum: `oauth_connection_only` (default) or `oauth_or_env_fallback`. |
| `SLACK_BOT_TOKEN` | Conditional | Optional and allowed only when `SLACK_BOT_TOKEN_POLICY=oauth_or_env_fallback`; never required for normal OAuth flow. |

### Bot token handling policy

1. Default policy is `oauth_connection_only`: bot tokens must come from OAuth exchange and be persisted encrypted in `oauthConnections`.
2. `SLACK_BOT_TOKEN` is forbidden under default policy and treated as config error.
3. `oauth_or_env_fallback` is breakglass-only for controlled troubleshooting windows and must remain disabled by default.
4. Lane `B`/`C` implementations must not log access tokens, refresh tokens, or signing secrets.

### Rollout policy

1. Stage 0 (default): `SLACK_INTEGRATION_ENABLED=false` and `SLACK_SLASH_COMMANDS_ENABLED=false`.
2. Stage 1 (OAuth/events rollout): set `SLACK_INTEGRATION_ENABLED=true`, keep slash commands disabled.
3. Stage 2 (optional commands): enable `SLACK_SLASH_COMMANDS_ENABLED=true` only after lane `D` acceptance criteria are met.
4. Emergency rollback: set `SLACK_INTEGRATION_ENABLED=false` to disable Slack runtime path immediately.

---

## Strategy pillars

1. **Connection lifecycle parity:** Slack connection flow must match existing provider patterns (Google/GitHub/Microsoft) for RBAC, audit logging, and encryption.
2. **Channel runtime parity:** Slack inbound/outbound behavior should use existing channel provider abstractions rather than parallel custom flows.
3. **Security-first webhook handling:** strict signature verification, replay controls, and rate-limit protections are required before rollout.
4. **Deterministic UX:** integrations window must provide clear connect/disconnect status, scope visibility, and actionable errors.
5. **Operational readiness:** test matrix, docs runbook, and rollout gates must be complete before enabling broadly.

---

## Phase-to-lane mapping

| Phase | Objective | Queue lanes | Queue tasks |
|---|---|---|---|
| Phase 1 | Scope lock + contracts + env policy | `A` | `SLI-001`..`SLI-002` |
| Phase 2 | OAuth lifecycle + settings UI | `B` | `SLI-003`..`SLI-004` |
| Phase 3 | Provider + events + outbound channel runtime | `C` | `SLI-005`..`SLI-007` |
| Phase 4 | Mention/slash behavior + response UX | `D` | `SLI-008` |
| Phase 5 | Security hardening + validation matrix | `E` | `SLI-009`..`SLI-010` |
| Phase 6 | Rollout readiness + docs closeout | `F` | `SLI-011`..`SLI-012` |

---

## Delivery waves

1. **Wave 0:** complete lane `A` so scope/contract decisions are fixed before implementation.
2. **Wave 1:** run lanes `B` and `C` in parallel once `SLI-002` is done.
3. **Wave 2:** implement command/mention behavior (lane `D`) and hardening (lane `E`).
4. **Wave 3:** finalize docs, rollout controls, and closeout (lane `F`).

---

## Acceptance criteria

1. Slack card is connectable in integrations UI and supports reconnect/disconnect lifecycle.
2. OAuth state validation, encrypted token storage, and RBAC checks match existing provider standards.
3. Slack Events endpoint validates signatures and handles URL verification/retry semantics correctly.
4. Inbound Slack messages can be routed into agent runtime with deterministic channel metadata.
5. Outbound messages support top-level and thread reply delivery paths.
6. Security controls (scope minimums, rate limits, audit events, replay safeguards) are active.
7. Automated tests cover both happy-path and failure-path scenarios for OAuth/webhooks/message delivery.
8. Queue verification commands pass for completed rows, including `npm run docs:guard`.

---

## Non-goals

1. Slack Marketplace public listing/review process automation in this workstream.
2. Enterprise Grid-specific admin features in v1.
3. Broad redesign of integrations window beyond Slack-focused changes.
4. Migration/backfill of historical Slack conversation data.
5. Workflow Builder custom steps/actions.
6. Interactive Slack modals/home tab UX.

---

## Risks and mitigations

1. **Webhook spoofing or replay**
Mitigation: enforce signing secret verification, replay windows, and idempotency keys before dispatch.

2. **Permission overscope**
Mitigation: define minimum Slack scopes in lane `A`; validate requested vs granted scopes in settings UI.

3. **Message loop/echo storms**
Mitigation: ignore bot-origin events and maintain outbound correlation metadata to prevent self-triggering.

4. **Operational blind spots after launch**
Mitigation: add structured logs/metrics for connect failures, webhook rejects, and delivery latency/error rates.

---

## Success metrics

1. Slack connection success rate (connect + callback completion).
2. Webhook signature rejection rate (expected malicious/noisy traffic vs false rejects).
3. Inbound-to-agent processing latency (p95).
4. Outbound Slack delivery success rate and retry rate.
5. Integration stability (no Sev-1 incidents attributable to Slack in first rollout window).

---

## Slack app registration quick setup (external prerequisite)

1. Create a Slack app at [https://api.slack.com/apps](https://api.slack.com/apps) using **From scratch**.
2. In **OAuth & Permissions**, add your bot scopes for v1 (core: `chat:write`, `app_mentions:read`, `channels:history`, `channels:read`; add `commands` only when slash commands rollout is enabled) and set the redirect URL to your callback endpoint (`/api/oauth/slack/callback`).
3. In **Event Subscriptions**, enable events and set the Request URL to your Slack events endpoint (for example `/slack/events` on your Convex HTTP domain); subscribe to bot events you need (at minimum `app_mention`, plus message events if required by scope).
4. In **Basic Information**, copy **Signing Secret**, **Client ID**, and **Client Secret** into environment variables (local + Convex deployment).
5. Install the app to your workspace from **Install App**, complete OAuth consent, and capture a bot token for validation checks.
6. Trigger a test mention or slash command and confirm end-to-end logs before widening rollout.

---

## Lane F operator runbook + user setup guide (`SLI-011`)

### Slack endpoint matrix (register these exact URLs)

| Environment | OAuth callback URL (Slack Redirect URL) | Events API URL (Slack Request URL) |
|---|---|---|
| Local | `http://localhost:3000/api/oauth/slack/callback` | `https://aromatic-akita-723.convex.site/slack/events` |
| Staging | `https://app.vc83.com/api/oauth/slack/callback` | `https://aromatic-akita-723.convex.site/slack/events` |
| Production | `https://app.l4yercak3.com/api/oauth/slack/callback` | `https://agreeable-lion-828.convex.site/slack/events` |

Staging currently uses the app host `app.vc83.com` and the shared non-production Convex site `aromatic-akita-723.convex.site`.

### Operator preflight checklist

1. Confirm `SLACK_INTEGRATION_ENABLED` and `SLACK_SLASH_COMMANDS_ENABLED` match rollout stage (`Stage 0` off by default).
2. Set `SLACK_CLIENT_ID`, `SLACK_CLIENT_SECRET`, and `SLACK_SIGNING_SECRET` for the selected environment.
3. Keep `SLACK_BOT_TOKEN_POLICY=oauth_connection_only` for standard operation; do not set `SLACK_BOT_TOKEN` unless breakglass fallback is explicitly approved.
4. Ensure `NEXT_PUBLIC_APP_URL` and `NEXT_PUBLIC_API_ENDPOINT_URL` match the endpoint matrix for the target environment before opening Slack app settings.
5. Confirm operator has integration-admin permissions (`manage_integrations`) in the target organization.

### Slack app setup (operator)

1. In Slack app settings, create or open the app at [https://api.slack.com/apps](https://api.slack.com/apps).
2. Under **OAuth & Permissions**, add the callback URL for the target environment and required bot scopes:
`chat:write`, `app_mentions:read`, `channels:history`, `channels:read`.
3. Add `commands` scope only when `SLACK_SLASH_COMMANDS_ENABLED=true` and lane `D` behavior is verified.
4. Under **Event Subscriptions**, enable events and set the Request URL to the environment-specific `/slack/events` endpoint.
5. Subscribe to at least `app_mention` bot event (and additional message events only when needed).
6. Install or reinstall the app to workspace after scope or URL changes.

### User-facing setup flow (Integrations UI)

1. Open desktop shell and navigate to `Integrations`.
2. Select Slack card and click `Connect Slack`.
3. Complete Slack consent flow; callback returns to `/?window=integrations`.
4. Verify workspace name and granted scope list are displayed in Slack settings panel.
5. Send one `@bot` mention in a permitted Slack channel and confirm inbound event processing and outbound reply.
6. Use `Reconnect` after scope changes and `Disconnect` for credential revocation.

### Troubleshooting matrix

| Symptom | Likely cause | Operator action |
|---|---|---|
| Slack OAuth returns `invalid_redirect_uri` | Callback URL mismatch between Slack app and `NEXT_PUBLIC_APP_URL` | Update Slack redirect URL to exact matrix value and retry connect. |
| Slack shows Request URL verification failure | Wrong Events URL or signing secret mismatch | Verify `/slack/events` URL and rotate `SLACK_SIGNING_SECRET` (use `SLACK_SIGNING_SECRET_PREVIOUS` during cutover). |
| Integrations UI shows missing required scopes | Slack app missing `chat:write`, `app_mentions:read`, `channels:history`, or `channels:read` | Add missing scopes, reinstall app, then reconnect from UI. |
| Webhook returns `401 Invalid signature` | Secret drift or stale app config | Ensure active signing secret candidate list contains current secret and confirm Slack app secret source. |
| Webhook returns `429 Rate limit exceeded` | Burst traffic from retries/noisy events | Inspect `/slack/events` traffic and retry headers; throttle upstream noise before widening rollout. |
| Slack runtime appears disabled | `SLACK_INTEGRATION_ENABLED=false` | Re-enable flag for the target environment and re-run smoke mention test. |

---

## Lane F launch readiness closeout (`SLI-012`)

### Staged rollout gates

| Stage | Flags | Required gate before entering | Exit gate |
|---|---|---|---|
| `0` (default safe state) | `SLACK_INTEGRATION_ENABLED=false`; `SLACK_SLASH_COMMANDS_ENABLED=false` | Baseline docs and ops runbook published. | `SLI-011` docs complete and `V-DOCS` passing. |
| `1` (OAuth + Events) | `SLACK_INTEGRATION_ENABLED=true`; `SLACK_SLASH_COMMANDS_ENABLED=false` | OAuth callback and events endpoint smoke checks pass on target environment. | Stable connect + mention flow with no signature failures during soak window. |
| `2` (optional slash commands) | `SLACK_INTEGRATION_ENABLED=true`; `SLACK_SLASH_COMMANDS_ENABLED=true` | Lane `D` (`SLI-008`) behavior complete and deterministic command response contract verified. | No P1+ incident regressions in first staged cohort. |

### Kill switch verification checklist

1. Set `SLACK_INTEGRATION_ENABLED=false` and confirm `/slack/events` returns disabled response.
2. Confirm integrations UI remains accessible while Slack connect/reconnect actions do not activate runtime processing.
3. Re-enable `SLACK_INTEGRATION_ENABLED=true` and verify signed event ingestion resumes.
4. Keep `SLACK_SLASH_COMMANDS_ENABLED=false` unless Stage `2` gate is explicitly approved.

### Monitoring and alerting minimums

| Signal | Source | Alert threshold | Owner |
|---|---|---|---|
| OAuth callback failures | Integrations callback route + audit log | sustained error spike for 5 minutes | Integrations Platform |
| Slack signature reject rate | `/slack/events` logs (`401 invalid signature`) | abnormal burst above baseline | Platform Security |
| Slack webhook rate limiting | `/slack/events` logs (`429`) | repeated 429s for same source CIDR/IP | Platform Security |
| Outbound delivery failure/retry rate | Slack provider send path logs | retry/error ratio above baseline | Messaging Runtime |

### Rollback playbook

1. Toggle `SLACK_INTEGRATION_ENABLED=false` to stop inbound webhook/event handling immediately.
2. If needed, disable Slack app event delivery in Slack admin to reduce retry pressure.
3. Keep OAuth records intact unless compromise is suspected; if compromised, rotate `SLACK_CLIENT_SECRET` and `SLACK_SIGNING_SECRET` with `*_PREVIOUS` overlap.
4. Announce incident state in platform operations channel and track time-to-mitigation.
5. Re-enable only after root cause and verification replay pass are complete.

### Incident-owner mapping

| Incident scenario | Primary owner | Secondary owner | Escalate when |
|---|---|---|---|
| OAuth/connect failure wave | Integrations Platform | Identity/Auth | callback success rate degrades across multiple orgs |
| Signature failures/replay abuse | Platform Security | Messaging Runtime | invalid-signature burst or replay abuse exceeds threshold |
| Outbound delivery degradation | Messaging Runtime | Integrations Platform | retry-after / delivery failures breach SLO |
| Misconfiguration in rollout flags | On-call App Platform | Integrations Platform | environment drift impacts customer-facing integration state |

### Closeout verification outcomes (2026-02-18)

1. `npm run typecheck`: pass.
2. `npm run lint`: pass (`0` errors, warnings only).
3. `npm run test:unit`: pass (`54` files, `278` tests).
4. `npm run test:integration`: pass (`11` files passed, `2` skipped).
5. `npm run docs:guard`: pass.

Lane `F` launch-readiness execution gate is now clear.

---

## Status snapshot

- `SLI-001` completed: v1 scope and exclusions are frozen for lane execution.
- `SLI-002` completed: environment/secrets contract and rollout policy verified (`V-TYPE`, `V-LINT`, `V-DOCS` passed on 2026-02-17).
- Lane `B` implementation for `SLI-003`/`SLI-004` landed on 2026-02-17: `convex/oauth/slack.ts`, `/api/oauth/slack/callback`, and Slack integrations settings panel with scope/status/reconnect/disconnect UX; Slack card moved to `available`.
- `SLI-006` completed on 2026-02-18: `/slack/events` verification gate now passes (`V-TYPE`, `V-LINT`, `V-SLACK-LINT`, `V-UNIT`, `V-INTEG`).
- Lane `E` `SLI-009` completed on 2026-02-18: scope minimization + granted-scope validation, integration-admin RBAC hardening, rotation candidates (`SLACK_CLIENT_SECRET_PREVIOUS`, `SLACK_SIGNING_SECRET_PREVIOUS`), webhook IP rate limiting, and failure/abuse-path unit tests (`tests/unit/slack/*`).
- `SLI-011` completed on 2026-02-18: lane-`F` operator runbook and user-facing setup guide published with exact local/staging/prod callback + events URLs.
- `SLI-012` closeout executed on 2026-02-18: rollout gates, kill switch verification, monitoring matrix, rollback plan, and incident-owner mapping documented.
- `SLI-008` completed on 2026-02-18: mention/slash runtime mapping + deterministic response formatting verified with full lane `D` profile (`V-TYPE`, `V-LINT`, `V-SLACK-LINT`, `V-UNIT`, `V-INTEG`, `V-MODEL`).
- `SLI-010` completed on 2026-02-18: expanded Slack failure-path matrix for OAuth token exchange errors, signature/header failures, replay/idempotency assertions, and delivery regressions (`V-UNIT`, `V-INTEG`, `V-MODEL` all passed).
- Launch blocker cleared: `tests/unit/ai/freeOnboardingRolloutGuardrails.test.ts` phase assertion updated and `SLI-012` verification now passes in full.
