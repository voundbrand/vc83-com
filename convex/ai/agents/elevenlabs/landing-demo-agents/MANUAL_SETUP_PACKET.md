# Landing Demo Manual Setup Packet

**Last updated:** 2026-03-17  
**Queue row:** `ELA-061`  
**Workstream:** `/Users/foundbrand_001/Development/vc83-com/docs/reference_projects/elevenlabs/implementation-eleven-agents-rollout`

## Purpose

Use this packet while manually creating the landing-demo agent set in ElevenLabs.

This packet is the operator log for:
1. agent creation status
2. real ElevenLabs agent ids
3. chosen voices
4. prompt and knowledge-base upload completion
5. transfer-destination ids captured during `ELA-062`

## Correct execution order

1. Confirm the shared demo number and existing Clara record.
2. Create the six specialist agents first.
3. Record each specialist agent id and chosen voice immediately after creation.
4. Apply prompt, knowledge base, setup, and tests for each specialist.
5. Verify Clara still matches the repo contract.
6. Only after the specialist ids exist, configure Clara transfer destinations in `ELA-062`.
7. Do not treat the system as launch-ready until `ELA-063` disclosure hardening is complete.

## Completion boundary

`ELA-061` is complete only when:
1. all seven landing-demo agents exist in ElevenLabs
2. every agent row in the registry below has a real agent id
3. every agent has a chosen voice recorded
4. prompt, KB, setup, and tests are recorded as complete

`ELA-062` starts after that and fills the transfer-routing registry.

## Audit snapshot (`2026-03-17 CET`)

1. The repo sync harness now resolves all seven landing-demo agents in live Eleven staging.
2. A post-sync dry-run on `2026-03-17` reported no repo-managed drift across prompts, knowledge bases, tools, or Clara's workflow for `Clara`, `Maren`, `Jonas`, `Tobias`, `Lina`, `Kai`, and `Nora`.
3. The live TTS voice ids below were captured from the remote agent configs on `2026-03-17`.
4. A live staging API snapshot on `2026-03-17` also captured the non-repo-managed continuity settings plus each agent's `platform_settings.testing.attached_tests` inventory.
5. The proof-continuity helper [sync-elevenlabs-tests.ts](/Users/foundbrand_001/Development/vc83-com/scripts/ai/elevenlabs/sync-elevenlabs-tests.ts) was run on `2026-03-17` to create and attach the missing specialist `llm`, `tool`, and `simulation` tests from repo definitions.
6. `Clara` currently reports `8/8` attached tests, and `Maren`, `Jonas`, `Tobias`, `Lina`, `Kai`, and `Nora` now each report `5/5` attached tests in staging.
7. `ELA-061` therefore has one remaining gate: open the seven agents in the ElevenLabs UI once and visually confirm that the attached inventory labels and live-only settings match this packet before moving the row to `DONE`.

`verified` in the registry below means the live staging agent matched the repo-managed prompt / KB / tool / workflow surfaces on `2026-03-17`. The `Tests created` column now records the live staging evidence snapshot; it does not mean the final UI spot-check is complete yet.

## Shared assets

Use these files across the roster:
1. [demo-business-core.md](./demo-business-core.md)
2. [outcomes-reference.md](./outcomes-reference.md)
3. [disclosure-requirements.md](./disclosure-requirements.md)

## Agent registry

Fill this table as you create or verify each agent.

| Agent | Purpose | Source folder | Status | Eleven agent id | Voice name | Voice id | Public number attached | Prompt pasted | KB uploaded | Setup applied | Tests created | Notes |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| `Clara` | Shared-line concierge + receptionist demo | [clara](./clara/) | `existing_verified` | `agent_4501kkk9m4fdezp8hby997w5v630` | `Louisa - Warm and Hopeful` | `1iF3vHdwHKuVKSPDK23Z` | `yes` | `verified` | `verified` | `verified` | `8 attached ids (API snapshot)` | Existing public entry agent. Repo-managed workflow + tools verified on `2026-03-17`. Live continuity snapshot: Twilio public number still attached; `scribe_realtime` ASR; `eleven_v3_conversational` TTS; eager/speculative turn profile. Transfer destinations are captured in `ELA-062`. |
| `Maren` | Appointment coordination demo | [maren](./maren/) | `existing_verified` | `agent_8601kknt8xcve37vyqnf4asktczh` | `Mila Winter - Narration (expressive & assured / ausdrucksstark & selbstsicher)` | `dCnu06FiOZma2KVNUoPZ` | `no` | `verified` | `verified` | `verified` | `5 attached ids (API sync)` | Specialist exists in staging. Repo-managed tools were resynced on `2026-03-17`. Live continuity snapshot: no public number; `elevenlabs` ASR provider; `eleven_flash_v2_5` TTS; normal turn eagerness. Final UI spot-check pending. |
| `Jonas` | Lead qualification demo | [jonas](./jonas/) | `existing_verified` | `agent_7501kkntg09qegs8nx4fv8g1js1z` | `Chris - Charming, Down-to-Earth` | `iP95p4xoKVk53GoZ742B` | `no` | `verified` | `verified` | `verified` | `5 attached ids (API sync)` | Specialist exists in staging. Repo-managed tools were resynced on `2026-03-17`. Live continuity snapshot: no public number; `elevenlabs` ASR provider; `eleven_flash_v2_5` TTS; normal turn eagerness. Final UI spot-check pending. |
| `Tobias` | Field documentation demo | [tobias](./tobias/) | `existing_verified` | `agent_1301kknqwgvmezk90qcgmjqtwhr5` | `Will - Relaxed Optimist` | `bIHbv24MWmeRgasZH58o` | `no` | `verified` | `verified` | `verified` | `5 attached ids (API sync)` | Specialist exists in staging. Repo-managed tools were resynced on `2026-03-17`. Live continuity snapshot: no public number; `elevenlabs` ASR provider; `eleven_flash_v2_5` TTS; normal turn eagerness. Final UI spot-check pending. |
| `Lina` | Follow-up and retention demo | [lina](./lina/) | `existing_verified` | `agent_4401kknv2pswe5mb5c8dzgf87bcq` | `Lucy Fennek 1 - Witty Accomplice & Lively Conversation` | `KXxZd16DiBqt82nbarJx` | `no` | `verified` | `verified` | `verified` | `5 attached ids (API sync)` | Specialist exists in staging. Repo-managed tools were resynced on `2026-03-17`. Live continuity snapshot: no public number; `elevenlabs` ASR provider; `eleven_flash_v2_5` TTS; normal turn eagerness. Final UI spot-check pending. |
| `Kai` | Team operations demo | [kai](./kai/) | `existing_verified` | `agent_6301kknv5hd5fr89hby28wvrrzcb` | `Charlie Chatlin - Real & Casual` | `vmVmHDKBkkCgbLVIOJRb` | `no` | `verified` | `verified` | `verified` | `5 attached ids (API sync)` | Specialist exists in staging. Repo-managed tools were resynced on `2026-03-17`. Live continuity snapshot: no public number; `elevenlabs` ASR provider; `eleven_flash_v2_5` TTS; normal turn eagerness. Final UI spot-check pending. |
| `Nora` | Location intelligence demo | [nora](./nora/) | `existing_verified` | `agent_8301kknv8hc9e0pvdgyy7ve8h07t` | `Emilia German` | `Dt2jDzhoZC0pZw5bmy2S` | `no` | `verified` | `verified` | `verified` | `5 attached ids (API sync)` | Specialist exists in staging and matched repo-managed surfaces on `2026-03-17` without further writes. Live continuity snapshot: no public number; `elevenlabs` ASR provider; `eleven_flash_v2_5` TTS; normal turn eagerness. Final UI spot-check pending. |

## Live staging evidence (`2026-03-17 CET`, API snapshot)

1. Evidence source: live `GET /v1/convai/agents/{agent_id}` snapshots against the landing-demo Eleven staging workspace.
2. Repo-managed sync surfaces remain governed by the local sync harness. The evidence below records only live continuity settings and live test attachment state that are not authored from the repo today.
3. All seven agents currently report `auth.enable_auth=false`, `privacy.record_voice=true`, and `user_input_audio_format=pcm_16000`.
4. Clara remains the only public number binding: `+49 3973 4409993` (`phone_number_id=phnum_01jxybccrketh8f8x21vdamc5b`, provider `twilio`).

| Agent | Minimum tests required by `setup.md` | Live attached tests | Live-only settings snapshot | Result |
|---|---:|---:|---|---|
| `Clara` | `8` | `8` | `scribe_realtime` ASR, `eleven_v3_conversational` TTS, expressive mode `on`, turn eagerness `eager`, tags `example/receptionist/front-desk` | Meets the current minimum count. Final label-level UI spot-check pending. |
| `Maren` | `5` | `5` | No public number, `elevenlabs` ASR provider, `eleven_flash_v2_5` TTS, expressive mode `off`, turn eagerness `normal` | Meets the current minimum count via API sync. Final UI spot-check pending. |
| `Jonas` | `5` | `5` | No public number, `elevenlabs` ASR provider, `eleven_flash_v2_5` TTS, expressive mode `off`, turn eagerness `normal` | Meets the current minimum count via API sync. Final UI spot-check pending. |
| `Tobias` | `5` | `5` | No public number, `elevenlabs` ASR provider, `eleven_flash_v2_5` TTS, expressive mode `off`, turn eagerness `normal` | Meets the current minimum count via API sync. Final UI spot-check pending. |
| `Lina` | `5` | `5` | No public number, `elevenlabs` ASR provider, `eleven_flash_v2_5` TTS, expressive mode `off`, turn eagerness `normal` | Meets the current minimum count via API sync. Final UI spot-check pending. |
| `Kai` | `5` | `5` | No public number, `elevenlabs` ASR provider, `eleven_flash_v2_5` TTS, expressive mode `off`, turn eagerness `normal` | Meets the current minimum count via API sync. Final UI spot-check pending. |
| `Nora` | `5` | `5` | No public number, `elevenlabs` ASR provider, `eleven_flash_v2_5` TTS, expressive mode `off`, turn eagerness `normal` | Meets the current minimum count via API sync. Final UI spot-check pending. |

### Specialist test inventory now attached via API sync

1. `Maren`: `cross-location-fallback`, `reschedule-after-cancellation`, `no-show-recovery`, `return-to-clara`, `book-slot-demo`
2. `Jonas`: `hot-lead-qualification`, `early-stage-lead`, `unclear-problem`, `switch-demo`, `qualify-and-summarize`
3. `Tobias`: `rough-voice-note`, `missing-measurements`, `user-asks-for-price`, `switch-back-to-clara`, `voice-note-to-draft`
4. `Lina`: `post-appointment-check-in`, `open-quote-recovery`, `unhappy-customer`, `back-to-clara`, `choose-scenario-and-draft`
5. `Kai`: `vacation-request-impact`, `urgent-shift-gap`, `handoff-summary`, `return-to-clara`, `coverage-coordination`
6. `Nora`: `low-answer-rate-location`, `weak-booking-rate`, `caller-has-no-data`, `back-to-clara`, `compare-locations`

## Transfer-routing registry

Leave the destination-id cells empty during early `ELA-061` work if the route has not been created yet. `ELA-062` completes this table.

| Route | Source agent | Destination agent | Eleven transfer destination id | Status | Notes |
|---|---|---|---|---|---|
| `clara_to_maren` | `Clara` | `Maren` | `[fill in ELA-062]` | `pending` | Requires real `Maren` agent id first. |
| `clara_to_jonas` | `Clara` | `Jonas` | `[fill in ELA-062]` | `pending` | Requires real `Jonas` agent id first. |
| `clara_to_tobias` | `Clara` | `Tobias` | `[fill in ELA-062]` | `pending` | Requires real `Tobias` agent id first. |
| `clara_to_lina` | `Clara` | `Lina` | `[fill in ELA-062]` | `pending` | Requires real `Lina` agent id first. |
| `clara_to_kai` | `Clara` | `Kai` | `[fill in ELA-062]` | `pending` | Requires real `Kai` agent id first. |
| `clara_to_nora` | `Clara` | `Nora` | `[fill in ELA-062]` | `pending` | Requires real `Nora` agent id first. |
| `maren_to_clara` | `Maren` | `Clara` | `[fill in ELA-062]` | `pending` | Optional return transfer in v1. |
| `jonas_to_clara` | `Jonas` | `Clara` | `[fill in ELA-062]` | `pending` | Optional return transfer in v1. |
| `tobias_to_clara` | `Tobias` | `Clara` | `[fill in ELA-062]` | `pending` | Optional return transfer in v1. |
| `lina_to_clara` | `Lina` | `Clara` | `[fill in ELA-062]` | `pending` | Optional return transfer in v1. |
| `kai_to_clara` | `Kai` | `Clara` | `[fill in ELA-062]` | `pending` | Optional return transfer in v1. |
| `nora_to_clara` | `Nora` | `Clara` | `[fill in ELA-062]` | `pending` | Optional return transfer in v1. |

## Operator sequence

1. Confirm Clara still exists with public number `+49 3973 4409993` and agent id `agent_4501kkk9m4fdezp8hby997w5v630`.
2. Create `Maren`, `Jonas`, `Tobias`, `Lina`, `Kai`, and `Nora` as separate agents in ElevenLabs.
3. For each specialist, immediately record:
   - Eleven agent id
   - voice name
   - voice id
4. After creation, paste the role prompt, upload the three KB files, and apply the settings from the matching `setup.md`.
5. Create the minimum tests listed in the `setup.md` before moving to the next agent.
6. After all six specialists exist, verify Clara's prompt, KB, setup, and tests against the repo docs.
7. Stop and hand off to `ELA-062` for transfer routing and smoke calls.

## Per-agent build cards

### Clara

Use:
1. [clara/system-prompt.md](./clara/system-prompt.md)
2. [clara/knowledge-base.md](./clara/knowledge-base.md)
3. [clara/setup.md](./clara/setup.md)

KB upload order:
1. [demo-business-core.md](./demo-business-core.md)
2. [outcomes-reference.md](./outcomes-reference.md)
3. [clara/knowledge-base.md](./clara/knowledge-base.md)

Notes:
1. Clara is the only public phone-number agent in v1.
2. Clara is the only landing-demo agent that should use the Workflow tab in v1.
3. Do not wire Clara transfer destinations until all specialist agent ids are recorded.

### Maren

Use:
1. [maren/system-prompt.md](./maren/system-prompt.md)
2. [maren/knowledge-base.md](./maren/knowledge-base.md)
3. [maren/setup.md](./maren/setup.md)

KB upload order:
1. [demo-business-core.md](./demo-business-core.md)
2. [outcomes-reference.md](./outcomes-reference.md)
3. [maren/knowledge-base.md](./maren/knowledge-base.md)

### Jonas

Use:
1. [jonas/system-prompt.md](./jonas/system-prompt.md)
2. [jonas/knowledge-base.md](./jonas/knowledge-base.md)
3. [jonas/setup.md](./jonas/setup.md)

KB upload order:
1. [demo-business-core.md](./demo-business-core.md)
2. [outcomes-reference.md](./outcomes-reference.md)
3. [jonas/knowledge-base.md](./jonas/knowledge-base.md)

### Tobias

Use:
1. [tobias/system-prompt.md](./tobias/system-prompt.md)
2. [tobias/knowledge-base.md](./tobias/knowledge-base.md)
3. [tobias/setup.md](./tobias/setup.md)

KB upload order:
1. [demo-business-core.md](./demo-business-core.md)
2. [outcomes-reference.md](./outcomes-reference.md)
3. [tobias/knowledge-base.md](./tobias/knowledge-base.md)

### Lina

Use:
1. [lina/system-prompt.md](./lina/system-prompt.md)
2. [lina/knowledge-base.md](./lina/knowledge-base.md)
3. [lina/setup.md](./lina/setup.md)

KB upload order:
1. [demo-business-core.md](./demo-business-core.md)
2. [outcomes-reference.md](./outcomes-reference.md)
3. [lina/knowledge-base.md](./lina/knowledge-base.md)

### Kai

Use:
1. [kai/system-prompt.md](./kai/system-prompt.md)
2. [kai/knowledge-base.md](./kai/knowledge-base.md)
3. [kai/setup.md](./kai/setup.md)

KB upload order:
1. [demo-business-core.md](./demo-business-core.md)
2. [outcomes-reference.md](./outcomes-reference.md)
3. [kai/knowledge-base.md](./kai/knowledge-base.md)

### Nora

Use:
1. [nora/system-prompt.md](./nora/system-prompt.md)
2. [nora/knowledge-base.md](./nora/knowledge-base.md)
3. [nora/setup.md](./nora/setup.md)

KB upload order:
1. [demo-business-core.md](./demo-business-core.md)
2. [outcomes-reference.md](./outcomes-reference.md)
3. [nora/knowledge-base.md](./nora/knowledge-base.md)

## Evidence to capture before marking `ELA-061` done

1. Every row in the agent registry has a real agent id.
2. Every row in the agent registry has a chosen voice name and voice id.
3. Specialists remain non-public and have no public phone number attached.
4. Clara remains the only public entry agent.
5. The packet is updated with any agent-specific notes that matter for later routing in `ELA-062`.

## Remaining blocker before `ELA-061` can be closed

1. Open each of the seven agents in the ElevenLabs UI and confirm that the attached inventory labels match the repo `setup.md` list. The live API snapshot now reports `Clara 8/8` and each specialist `5/5`, but the row still requires one visual console pass.
2. Record any UI-only or label-level mismatch that the API snapshot does not expose, including any live-only settings that differ from the continuity notes above.
3. If the UI matches this packet, `ELA-061` can move to `DONE` and the queue artifacts should be synced. If not, keep the row `IN_PROGRESS` and record the exact mismatch here.
