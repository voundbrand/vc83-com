# AI Script Surface

Canonical AI/agent operational entrypoints are exposed from the repo root `package.json`.

## ElevenLabs harness

- `npm run ai:elevenlabs:sync`
- `npm run ai:elevenlabs:simulate`
- `npm run ai:elevenlabs:test-sync`

Compatibility aliases kept for existing operator workflows:

- `npm run landing:elevenlabs:sync`
- `npm run landing:elevenlabs:simulate`
- `npm run landing:elevenlabs:test-sync`
- `npm --prefix apps/one-of-one-landing run elevenlabs:sync`
- `npm --prefix apps/one-of-one-landing run elevenlabs:simulate`
- `npm --prefix apps/one-of-one-landing run elevenlabs:test-sync`

Script implementations live in `scripts/ai/elevenlabs/*`.
