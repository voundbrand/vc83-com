# ElevenLabs Landing Demo Harness

This harness makes the repo the source of truth for the landing-demo ElevenLabs staging agents.

It currently manages:

- system prompts from `docs/reference_projects/elevenlabs/implementation-eleven-agents-rollout/landing-demo-agents/*/system-prompt.md`
- repo-managed first-message fields from `.../*/first-message.md` when an agent declares one
- agent knowledge bases from `docs/reference_projects/elevenlabs/implementation-eleven-agents-rollout/landing-demo-agents/*/knowledge-base.md`
- built-in transfer/end-call tools from the JSON files in the same reference folder
- Clara's workflow from `.../clara/workflow.json`

It intentionally preserves the rest of the live agent config:

- voice / TTS settings
- ASR / turn settings
- any live-only settings not represented by the local source files

## Environment

The scripts load env from both repo root and `apps/one-of-one-landing/.env.local`.

Required:

- `ELEVENLABS_API_KEY`

Optional agent-id overrides:

- `CLARA_ELEVENLABS_AGENT_ID`
- `MAREN_ELEVENLABS_AGENT_ID`
- `JONAS_ELEVENLABS_AGENT_ID`
- `TOBIAS_ELEVENLABS_AGENT_ID`
- `LINA_ELEVENLABS_AGENT_ID`
- `KAI_ELEVENLABS_AGENT_ID`
- `NORA_ELEVENLABS_AGENT_ID`
- `SAMANTHA_ELEVENLABS_AGENT_ID`

If an override is not set, the harness falls back to the staging ids currently documented in the repo.

## Sync

Dry-run all agents:

```bash
npm run landing:elevenlabs:sync -- --all
```

Write Clara only:

```bash
npm run landing:elevenlabs:sync -- --agent clara --write
```

Write multiple agents:

```bash
npm run landing:elevenlabs:sync -- --agent clara,kai,maren --write
```

## Simulation

Run the default transfer regression:

```bash
npm run landing:elevenlabs:simulate
```

Run a specific fixture:

```bash
npm run landing:elevenlabs:simulate -- --fixture clara-kai-clara-maren-regression
```

Run the full handoff battery:

```bash
npm run landing:elevenlabs:simulate -- --suite all-handoffs
```

Run the proof-phase gating path:

```bash
npm run landing:elevenlabs:simulate -- --suite proof-phase-gating
```

Run the exploratory proof stress path:

```bash
npm run landing:elevenlabs:simulate -- --suite proof-phase-stress
```

List available fixtures:

```bash
npm run landing:elevenlabs:simulate -- --list-fixtures
```

List built-in suites:

```bash
npm run landing:elevenlabs:simulate -- --list-suites
```

Useful knobs:

```bash
npm run landing:elevenlabs:simulate -- --fixture clara-kai-clara-maren-regression --idle-ms 1800 --handoff-settle-ms 3000 --turn-timeout-ms 25000
```

The simulator:

- opens a signed ElevenLabs text conversation over the official WebSocket flow
- sends the scripted user turns from a local JSON fixture
- fetches the final conversation record from ElevenLabs
- validates transfer order, speaker continuity, and self-identity mismatches from the authoritative transcript

## Fixture Format

Fixtures live in `apps/one-of-one-landing/fixtures/elevenlabs/*.json`.

Shape:

```json
{
  "name": "fixture-name",
  "entryAgent": "clara",
  "userTurns": [
    { "text": "I want Kai.", "expectTransfer": true }
  ],
  "assertions": {
    "expectedTransferSequence": ["kai"],
    "expectedFinalAgent": "kai",
    "requiredAgentsVisited": ["clara", "kai"],
    "forbidUnexpectedTransfers": true,
    "requireAgentSpeechAfterTransfer": true,
    "enforceTransferSpeakerState": true,
    "forbidAgentSelfClaimMismatch": true
  }
}
```

`expectTransfer` is optional, but it should be set on turns where the script expects a real `transfer_to_agent` handoff. The simulator uses it to wait for the transfer event and the target-agent response before advancing to the next scripted turn.

Built-in suites:

- `regressions`: focused known regressions
- `proof-phase-gating`: stable founder proof-demo gate, currently backed by `proof-phase-seven-agent-tour`
- `proof-phase-stress`: exploratory single-call proof path, currently backed by `proof-phase-seven-agent-single-call-stress`
- `specialist-redirects`: cross-lane and off-topic specialist redirect checks back through Clara
- `specialist-ring`: realistic specialist-to-specialist handoff paths via Clara, covering the whole demo roster as a cycle
- `specialist-roundtrips`: Clara -> specialist -> Clara for every phone-demo specialist
- `grand-tour`: one long conversation that walks through every specialist handoff edge in a single stress call
- `all-handoffs`: regressions + roundtrips + specialist ring

Proof fixture categories:

- `proof-phase-seven-agent-tour`: the proof-specific gating artifact that mirrors the founder Phase 0 showcase path across Clara, Maren, Jonas, Lina, Kai, Tobias, and Nora
- `proof-phase-seven-agent-single-call-stress`: the longer exploratory single-call path that leans on wrong-lane specialist redirects and should not be treated as the publish gate

## Notes

- The simulator is text/API-first by design. A voice smoke layer is not included in this first pass.
- Clara is the only agent with a repo-managed workflow file today.
- Samantha is intentionally excluded from the phone handoff suites because she is the web diagnostic layer, not a Clara-routed phone specialist.
