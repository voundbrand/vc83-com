# Slack Multi-Tenant Endpoint + Pre-Manifest UX Implementation Plan

**Date:** 2026-02-20  
**Workstream root:** `/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/agent-creation-experience-convergence`  
**Related queue lane:** `G` (`ACE-017`..`ACE-020`)

---

## 1) Decision summary

### Architecture decision (ADR)

Chosen strategy is **Option 3: unified API ingress with internal tenant routing**.

Canonical Slack endpoints:

- `https://api.l4yercak3.com/integrations/slack/oauth/callback`
- `https://api.l4yercak3.com/integrations/slack/events`
- `https://api.l4yercak3.com/integrations/slack/commands`
- `https://api.l4yercak3.com/integrations/slack/interactivity`

Routing and isolation happen server-side using verified provider context (`team_id`, `api_app_id`, `enterprise_id`) plus installation mapping. This pattern is reusable across Slack, Google, Microsoft, and future integrations.

Why this option:

1. Avoids per-org DNS/cert/subdomain operational burden.
2. Keeps ingress stable while tenant routing evolves internally.
3. Preserves strict isolation using cryptographic verification + installation registry.

---

## 2) Target architecture (Option 3 detailed design)

## 2.1 Ingress and resolver components

Add shared integration primitives under a provider-agnostic namespace:

- `IntegrationEndpointResolver`
- `IntegrationTenantResolver`
- `IntegrationInstallationRegistry`
- `IntegrationManifestBuilder`

### `IntegrationEndpointResolver`

Purpose: deterministic endpoint generation from environment + provider.

```ts
export type IntegrationProvider = "slack" | "google" | "microsoft";

export interface IntegrationEndpointBundle {
  oauthCallbackUrl: string;
  eventsUrl?: string;
  commandsUrl?: string;
  interactivityUrl?: string;
}

export function resolveIntegrationEndpoints(provider: IntegrationProvider): IntegrationEndpointBundle {
  const apiBase = resolvePublicApiBaseUrl();
  if (provider === "slack") {
    return {
      oauthCallbackUrl: `${apiBase}/integrations/slack/oauth/callback`,
      eventsUrl: `${apiBase}/integrations/slack/events`,
      commandsUrl: `${apiBase}/integrations/slack/commands`,
      interactivityUrl: `${apiBase}/integrations/slack/interactivity`,
    };
  }
  throw new Error(`Unsupported provider: ${provider}`);
}
```

### `IntegrationTenantResolver`

Purpose: map inbound verified provider payload to exactly one org/profile installation.

Slack routing order:

1. Verify Slack signature and timestamp first.
2. Extract `team_id`, `api_app_id`, optional `enterprise_id`.
3. Resolve installation record by `(provider=slack, team_id, app_id)`.
4. Bind request to `organizationId` + `profileType`.
5. Fail closed (`401`/`404`) if mapping is missing or ambiguous.

---

## 2.2 Data contracts

Add/confirm provider-neutral installation contract:

```ts
interface IntegrationInstallation {
  provider: "slack";
  organizationId: string;
  profileType: "platform" | "organization";
  providerWorkspaceId: string; // Slack team_id
  providerAppId?: string; // Slack api_app_id
  providerEnterpriseId?: string;
  botUserId?: string;
  scopes: string[];
  status: "active" | "revoked";
  connectedAt: number;
  updatedAt: number;
}
```

Indexes required:

1. `(provider, providerWorkspaceId, providerAppId)` for routing.
2. `(organizationId, provider, profileType)` for settings UX.
3. `(provider, status)` for ops audits.

---

## 2.3 Endpoint pattern for future integrations

Define a platform-wide URL contract:

- OAuth callback: `/integrations/{provider}/oauth/callback`
- Events/webhooks: `/integrations/{provider}/events`
- Commands/actions: `/integrations/{provider}/commands` and `/integrations/{provider}/interactivity`

Future providers implement only provider-specific verification and payload extraction while reusing shared resolver and registry contracts.

---

## 3) Pre-manifest modal UX (Slack-native flow)

Goal: collect only operator-required inputs before generating JSON/YAML manifest.

## 3.1 Modal steps

### Step 1: Workspace context

Collect/confirm:

1. Setup target profile (`Platform` or `Org BYOA`).
2. Workspace context label (if already connected).
3. Link: `Sign in to a different workspace` (opens Slack app dashboard).

Notes:

- Slack controls final workspace/app ownership during app import/create.
- We capture target context for operator clarity and downstream connect flow.

### Step 2: Manifest basics

Collect:

1. `App Name` (required).
2. Optional `Slash Command` override.
3. Preset selection (`v1`, `v2`, `v2.1`).
4. Format toggle (`JSON`, `YAML`).

Auto-generated (read-only preview):

- OAuth redirect URL
- Events URL
- Slash command URL
- Interactivity URL
- Required scopes/events for selected preset

### Step 3: Review and generate

Show summary:

- App name
- Selected preset and capabilities
- Endpoint bundle
- Scope/event set

Actions:

- `Back`
- `Download manifest`
- `Open Slack App Dashboard`

---

## 3.2 Component design

New UI components:

1. `SlackManifestWizardModal`
2. `SlackManifestStepWorkspace`
3. `SlackManifestStepConfig`
4. `SlackManifestStepReview`

State contract:

```ts
interface SlackManifestWizardState {
  profileType: "platform" | "organization";
  workspaceHint?: string;
  appName: string;
  slashCommand?: string;
  preset: "v1" | "v2" | "v2_1";
  format: "json" | "yaml";
}
```

Validation:

1. `appName` non-empty.
2. `slashCommand` starts with `/` and has no spaces.
3. Export permission checks: platform preset exports restricted to super admins.
4. Public HTTPS endpoint checks before generation.

---

## 4) Manifest template system and org-aware injection

Use typed object builders, not free-form string templates.

## 4.1 Builder contract

```ts
interface SlackManifestBuildInput {
  appName: string;
  profileType: "platform" | "organization";
  preset: "v1" | "v2" | "v2_1";
  endpoints: IntegrationEndpointBundle;
  slashCommand: string;
  aiFeaturesEnabled: boolean;
}

function buildSlackManifest(input: SlackManifestBuildInput): SlackManifest;
```

## 4.2 Injection rules

Injected fields:

1. `display_information.name` <- user `appName`
2. `features.bot_user.display_name` <- derived from app name/policy
3. `oauth_config.redirect_urls[0]` <- `endpoints.oauthCallbackUrl`
4. `settings.event_subscriptions.request_url` <- `endpoints.eventsUrl`
5. `features.slash_commands[0].url` <- `endpoints.commandsUrl`
6. `settings.interactivity.request_url` <- `endpoints.interactivityUrl`

Org-aware behavior under Option 3:

1. URLs remain unified platform endpoints.
2. Org routing context is encoded in signed OAuth `state` and persisted installation mapping.
3. Optional `org_hint` query param may be appended for debugging/ops traceability, but auth decisions must never depend on it alone.

---

## 5) Security and tenant isolation

Mandatory controls:

1. Verify provider signature before tenant resolution.
2. Enforce strict installation lookup (single active mapping required).
3. Deny ambiguous or missing mappings.
4. Bind all downstream operations to resolved `organizationId` + `profileType` context.
5. Keep platform-managed manifest export role-gated.
6. Never include secrets in downloadable manifests.

Audit requirements:

1. Log installation create/update/revoke events.
2. Log failed verification and failed mapping events.
3. Emit deterministic reason codes for incident triage.

---

## 6) Migration plan from current endpoint model

## Phase 0: Baseline hardening

1. Keep current Slack endpoints operational.
2. Add shared endpoint resolver abstractions without changing runtime behavior.

## Phase 1: Unified endpoint adoption

1. Route Slack handlers through `IntegrationTenantResolver`.
2. Backfill installation registry with existing platform/org Slack connections.
3. Add dual-read guard (legacy mapping + new mapping) during transition.

## Phase 2: Manifest wizard rollout

1. Replace direct preset download buttons with pre-manifest wizard entry.
2. Preserve existing validation (`assistant_view`, public HTTPS URL checks).
3. Keep BYOA/platform export permission gates.

## Phase 3: Provider-generalization

1. Reuse resolver/registry patterns for Google and Microsoft.
2. Add provider-specific verification adapters only.

Rollback plan:

1. Keep legacy route handlers behind feature flag.
2. On incident, switch ingress to legacy mapping path.
3. Re-run verification suite and audit event checks before re-enable.

---

## 7) Testing strategy

Required test layers:

1. Unit tests
   - endpoint resolver output by environment
   - manifest builder field injection and validation
   - tenant resolver mapping behavior (`success`, `missing`, `ambiguous`)
2. Integration tests
   - Slack webhook signature verification + tenant routing
   - OAuth callback state decode + installation binding
3. E2E tests
   - pre-manifest wizard happy path (v1/v2/v2.1)
   - role-gated platform export restriction
   - BYOA flow with org profile selection
4. Security tests
   - replay/invalid signature rejection
   - cross-org routing isolation
   - revoked installation handling

Verification command profile for implementation tasks:

- `npm run typecheck`
- `npm run lint`
- `npm run test:unit`
- `npm run test:integration`
- `npm run test:e2e:desktop`
- `npm run test:e2e:mobile`
- `npm run docs:guard`

---

## 8) Step-by-step implementation guide

1. Introduce provider-agnostic endpoint/tenant resolver interfaces.
2. Implement Slack adapter for payload extraction + installation lookup.
3. Move Slack ingress handlers to resolver-based routing.
4. Implement typed manifest builder from wizard state.
5. Build pre-manifest wizard modal and replace direct download initiation.
6. Add migration backfill script for installation records.
7. Add test coverage for resolver, builder, and wizard flows.
8. Execute full verification profile and publish release-readiness notes.

---

## 9) Acceptance criteria

1. Slack ingress runs on unified endpoints with deterministic org/profile routing.
2. Pre-manifest wizard collects required data before file generation.
3. Manifest outputs include user-provided app name and auto-generated endpoint fields.
4. Platform manifest exports remain restricted to super admins.
5. Cross-org isolation is enforced by verified payload + installation mapping.
6. Queue docs and runbooks remain synchronized with implementation status.
7. `npm run docs:guard` passes.

