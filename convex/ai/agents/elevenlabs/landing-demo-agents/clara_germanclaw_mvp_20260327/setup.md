# Clara GermanClaw MVP Setup

## Variant identity
- key: `clara_germanclaw_mvp`
- lane: `clara_demo_roster` (inactive-by-default candidate)
- required env id: `CLARA_GERMANCLOW_MVP_ELEVENLABS_AGENT_ID`

## Managed files
- `system-prompt.md`
- `first-message.md`
- `knowledge-base.md`
- `guardrails.json`
- `tools.json`
- `workflow.json`

## Runtime boundaries
- no specialist telephony handoffs
- no legal advice
- no fabricated "already completed" system actions
- DSGVO-first intake framing (minimization, purpose limitation, retention marker, org scope)

## Sync commands
Dry-run:

```bash
npm run ai:elevenlabs:sync -- --agent clara_germanclaw_mvp
```

Write:

```bash
npm run ai:elevenlabs:sync -- --agent clara_germanclaw_mvp --write
```

## Simulation suite

```bash
npm run ai:elevenlabs:simulate -- --suite clara-germanclaw-mvp-proof
```
