# OpenClaw Bridge Import (POC)

This proof-of-concept supports one-way import of OpenClaw auth profiles and private model definitions into vc83 organization AI settings.

## Scope

- One-way import only (OpenClaw -> vc83).
- Strict provider allowlist enforcement.
- Import target:
  - `organizationAiSettings.llm.providerAuthProfiles`
  - `organizationAiSettings.llm.enabledModels` (for private model definitions)

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
