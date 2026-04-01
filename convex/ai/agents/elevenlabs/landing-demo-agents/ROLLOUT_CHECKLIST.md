# Landing Demo Rollout Checklist

Use [MANUAL_SETUP_PACKET.md](./MANUAL_SETUP_PACKET.md) while executing this checklist. Record real agent ids and chosen voices there as you go.

## Current audit snapshot (`2026-03-17 CET`)

1. The repo sync harness confirms all seven landing-demo agents resolve in live Eleven staging.
2. Repo-managed prompt / knowledge-base / tool / workflow surfaces are in sync for the seven-agent roster after the specialist tool resync on `2026-03-17`.
3. Live staging evidence now shows `Clara` at `8/8` attached tests and each specialist at `5/5` attached tests after the proof-continuity API sync.

## Pre-flight

1. Confirm the landing-page shared number is `+49 3973 4409993`.
2. Confirm `Clara` remains the public phone-number agent.
3. Confirm the landing page still stores pre-call intent before dialing.
4. Confirm the landing privacy policy link is available to callers before the call starts.
5. Treat written disclosure hardening as a launch blocker owned by `ELA-063`, not as a prerequisite to creating the agent set in `ELA-061`.

## ELA-061 agent creation pass

1. Create each specialist with its own voice:
   - `Maren`
   - `Jonas`
   - `Tobias`
   - `Lina`
   - `Kai`
   - `Nora`
2. For each specialist:
   - paste `system-prompt.md`
   - upload `demo-business-core.md`
   - upload `outcomes-reference.md`
   - upload `knowledge-base.md`
   - apply `setup.md`
   - create the minimum tests listed in `setup.md`
   - record the real agent id and voice in [MANUAL_SETUP_PACKET.md](./MANUAL_SETUP_PACKET.md)
3. Verify Clara:
   - [clara/system-prompt.md](./clara/system-prompt.md) is current
   - KB upload order matches [clara/setup.md](./clara/setup.md)
   - configuration matches [clara/setup.md](./clara/setup.md)
   - the public phone number still points to Clara
   - Clara's existing agent id remains `agent_4501kkk9m4fdezp8hby997w5v630`
4. In the phone-number configuration, point Clara's personalization webhook to:
   - `/api/demo-call/personalization`
5. If you use webhook auth, set `LANDING_DEMO_CALL_PERSONALIZATION_SECRET` in the landing app and send the same secret from ElevenLabs.
6. Do not mark `ELA-061` `DONE` until the attached inventories are manually confirmed in the ElevenLabs UI and noted in [MANUAL_SETUP_PACKET.md](./MANUAL_SETUP_PACKET.md).

## ELA-062 routing pass

1. Create Clara `Transfer to agent` destinations for:
   - `Maren`
   - `Jonas`
   - `Tobias`
   - `Lina`
   - `Kai`
   - `Nora`
2. Enable return transfer to `Clara` on specialists that need it.
3. Record every created transfer-destination id in [MANUAL_SETUP_PACKET.md](./MANUAL_SETUP_PACKET.md).
4. Do not attach public phone numbers to specialist agents in `v1`.

## Samantha

1. Keep Samantha on the local sevenlayers runtime, not on the Clara phone number.
2. Sync Samantha to the current diagnostic contract in [samantha/setup.md](./samantha/setup.md).
3. Make sure Samantha can explain Clara's role correctly:
   - Samantha diagnoses and recommends
   - Clara runs the live phone demo

## Acceptance criteria

1. Caller clicks `Talk with Maren now`.
2. Landing page stores the caller's phone number and requested agent.
3. Caller dials Clara's public number.
4. Clara opens with disclosure and immediately acknowledges that the caller wanted `Maren`.
5. Clara transfers to `Maren` without asking the caller to restate the selection.
6. `Maren` demonstrates the scheduling flow in her own voice.
7. If the transfer fails, Clara falls back gracefully and offers a callback or overview.

## Smoke tests

1. `Clara` selected on the landing page:
   - Clara stays in receptionist-demo mode and does not transfer
2. `Maren` selected:
   - Clara acknowledges `Maren` and transfers
3. `Jonas` selected:
   - Clara acknowledges `Jonas` and transfers
4. No pre-call intent found:
   - Clara asks which demo the caller wants
5. Transfer failure:
   - Clara apologizes once, gives a short overview, and offers follow-up
6. Specialist asks to change demos:
   - specialist transfers back to Clara
7. Caller asks if they are speaking to AI:
   - every agent answers clearly and directly

## Launch blockers

1. Missing disclosure in the landing-page pre-call flow
2. Clara has no personalization webhook
3. Clara lacks `Transfer to agent`
4. Specialists are created without unique voices
5. Tests are skipped
6. A specialist is exposed publicly before the one-number flow is stable
