# EU Open API Setup Runbook (MVP Path)

Snapshot date: 2026-03-27
Workstream row: `NCLAW-009`
Decision scope: `EU-compliant MVP` runtime path.

## Decision record

1. MVP inference path is `OpenRouter Enterprise EU routing + BYOK`.
2. MVP voice path remains `ElevenLabs Enterprise EU`.
3. Strict `Germany-only` promise is kept as a separate future track and is not blocked by MVP go-live.

## Architecture contract (MVP)

1. Core app, DB, logs, and orchestration stay on Hetzner in Germany.
2. External inference leaves Germany only through explicitly approved EU endpoints.
3. Every external processor must have AVV/DPA, subprocessor evidence, and transfer-basis mapping.

## Step-by-step setup

### 1) OpenRouter enterprise control-plane setup (human action)

1. Enable enterprise EU in-region routing with OpenRouter.
2. Use the EU endpoint: `https://eu.openrouter.ai/api/v1`.
3. Confirm contract packet includes DPA/AVV and current subprocessor list.

### 2) OpenRouter key hardening (human action)

1. Create dedicated MVP API key (separate from dev/test keys).
2. Set key policy to always use configured BYOK route (no shared-capacity fallback).
3. Enable privacy controls required for MVP policy:
   - zero data retention route (`zdr` policy),
   - deny provider data collection (`data_collection: "deny"`),
   - disable fallback routing (`allow_fallbacks: false`).

### 3) BYOK provider setup (human action)

1. Add only EU-scoped upstream provider credentials for this key.
2. Keep a strict allowlist of upstream providers for MVP.
3. Do not attach non-EU keys to the same key profile.

### 4) Runtime configuration in this repo (implementation)

1. Set `OPENROUTER_BASE_URL=https://eu.openrouter.ai/api/v1`.
2. Keep `OPENROUTER_API_KEY` in dedicated MVP secret scope.
3. Keep `OPENROUTER_SITE_URL` and `OPENROUTER_APP_NAME` set for request attribution.

Code support status:

1. `convex/ai/openrouter.ts` now supports `OPENROUTER_BASE_URL` override.
2. Existing provider-auth-profile `baseUrl` overrides remain valid and take precedence when set.

### 5) Runtime routing policy (implementation)

Use provider constraints in request patches wherever model routing is configurable:

```json
{
  "provider": {
    "allow_fallbacks": false,
    "only": ["google-vertex"],
    "data_collection": "deny",
    "zdr": true
  }
}
```

Notes:

1. `only` must contain approved EU path(s) only.
2. Keep one contingency provider approved but disabled by default.

## Evidence required to close `NCLAW-009`

1. OpenRouter enterprise EU routing confirmation (contract or support confirmation).
2. OpenRouter DPA/AVV and subprocessor list saved to `compliance_docs/`.
3. BYOK provider legal packet (DPA/AVV + subprocessors + transfer-basis evidence).
4. Configuration evidence:
   - `OPENROUTER_BASE_URL` set to EU endpoint in MVP environment,
   - fallback disabled proof,
   - allowlist proof for provider routing.

## Human checklist

1. Complete OpenRouter enterprise EU + DPA paperwork.
2. Complete ElevenLabs enterprise EU + DPA paperwork.
3. Choose primary BYOK upstream provider for MVP.
4. Confirm legal wording in sales/site is `EU-compliant MVP tier` and not `Germany-only`.
