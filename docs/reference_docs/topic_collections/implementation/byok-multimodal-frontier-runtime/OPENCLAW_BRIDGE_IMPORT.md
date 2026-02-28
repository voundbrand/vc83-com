# OpenClaw Bridge Import (POC)

This proof-of-concept supports one-way import of OpenClaw auth profiles and private model definitions into vc83 organization AI settings.

## Scope

- One-way import only (OpenClaw -> vc83).
- Strict provider allowlist enforcement.
- Compatibility adapter is optional and defaults to `OFF`.
- Import target:
  - `organizationAiSettings.llm.providerAuthProfiles`
  - `organizationAiSettings.llm.enabledModels` (for private model definitions)

## Compatibility adapter policy (`YAI-016`)

- Org feature flag key: `aiOpenClawCompatibilityEnabled`.
- Adapter is enabled only when the org feature flag is explicitly `true`.
- If disabled (or not present), import deterministically falls back to native `vc83` behavior with no imported OpenClaw payload mutations.
- If adapter parsing/mapping fails, import deterministically falls back to native `vc83` behavior and returns fallback warnings.
- Adapter decisions are runtime-validated against native authority invariants before import mutation; any contract violation fails closed to native fallback (`native_authority_contract_violation`).
- Runtime validation also enforces explicit-flag and fallback contract invariants (`feature_flag_required_for_compatibility_mode`, `fallback_contract_mismatch`) so compatibility mode cannot drift into implicit enablement or non-native disablement behavior.
- Native runtime authority precedence remains canonical: `vc83_runtime_policy`.
- Direct mutation bypass is never allowed (`directMutationBypassAllowed=false`).
- Any actionable intent path must still pass native trust/approval gating (`trustApprovalRequiredForActionableIntent=true`).

## Provider allowlist

Allowed providers:

- `openrouter`
- `openai`
- `anthropic`
- `gemini` (including `google` alias)
- `grok` (including `xai` alias)
- `mistral`
- `kimi`
- `elevenlabs`
- `openai_compatible`

Imports with providers outside this allowlist are rejected.

## Mutation

- Function: `integrations.openclawBridge.importOpenClawBridge`
- Supports `dryRun` for preview.
- Response includes deterministic compatibility-policy fields:
  - `compatibilityMode` (`native` or `openclaw_adapter`)
  - `fallbackToNative`, `fallbackReason`
  - `featureFlagEnabled`, `featureFlagKey`
  - `nativePolicyPrecedence`, `directMutationBypassAllowed`, `trustApprovalRequiredForActionableIntent`

### Input payload

```json
{
  "authProfiles": [
    {
      "profileId": "openai-main",
      "provider": "openai",
      "apiKey": "sk-...",
      "baseUrl": "https://api.openai.com/v1",
      "enabled": true,
      "priority": 0
    },
    {
      "profileId": "voice-default",
      "provider": "elevenlabs",
      "token": "xi-...",
      "defaultVoiceId": "voice_123"
    }
  ],
  "privateModels": [
    {
      "modelId": "my-private-model",
      "provider": "openai_compatible",
      "label": "Internal Router",
      "setAsDefault": true
    }
  ]
}
```

## CLI tooling

Use the bridge script:

```bash
npx tsx scripts/openclaw/import-openclaw-bridge.ts \
  --input ./openclaw-import.json \
  --session-id "<session-id>" \
  --organization-id "<organization-id>" \
  --dry-run
```

Run without `--dry-run` to persist.

## Notes

- Imported auth profile keys are stored on org auth profiles with encrypted-field metadata (`apiKey`).
- Imported private models are normalized to canonical model IDs (for non-OpenRouter providers: `provider/model`).
- Existing profile cooldown/failure counters are preserved when re-importing matching profiles.
- Imported OpenClaw auth-profile metadata carries compatibility contract fields for native-authority/no-bypass invariants.
