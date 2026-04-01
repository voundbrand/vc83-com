# Landing Demo Agents Rollout

**Last updated:** 2026-03-26  
**Public demo number:** `+49 3973 4409993`  
**Public entry agent:** `Clara` (`agent_4501kkk9m4fdezp8hby997w5v630`)

## Objective

Run the landing page phone demo from one public number while preserving separate voices and specialist experiences for each demo agent.

The operator runbook for `ELA-061` lives in [MANUAL_SETUP_PACKET.md](./MANUAL_SETUP_PACKET.md).

The git-tracked overview layer for the repo-managed prompts, tools, workflow, and test coverage lives in [v2/README.md](./v2/README.md).

## Current `ELA-061` state (`2026-03-17 CET`)

1. All seven landing-demo agents now resolve in live Eleven staging.
2. The real staging agent ids and live voice assignments are now recorded in [MANUAL_SETUP_PACKET.md](./MANUAL_SETUP_PACKET.md).
3. Repo-managed prompt / knowledge-base / tool / workflow surfaces are now in sync for `Clara`, `Maren`, `Jonas`, `Tobias`, `Lina`, `Kai`, and `Nora`.
4. The proof-continuity helper [sync-elevenlabs-tests.ts](/Users/foundbrand_001/Development/vc83-com/scripts/ai/elevenlabs/sync-elevenlabs-tests.ts) was run on `2026-03-17`, and live staging now shows `Clara` at `8/8` attached tests plus every specialist at `5/5`.
5. `ELA-061` remains `IN_PROGRESS`; the only remaining gate is the final ElevenLabs UI spot-check recorded in [MANUAL_SETUP_PACKET.md](./MANUAL_SETUP_PACKET.md).

## Demo business model

1. `Samantha` is separate and should stay tied to the real sevenlayers founder / diagnostic motion.
2. `Clara`, `Maren`, `Jonas`, `Tobias`, `Lina`, `Kai`, and `Nora` should all operate inside one shared fictional demo company.
3. That company should be specific enough to sound operationally real, but still clearly remain a demo environment.
4. The shared company for this kit is documented in [demo-business-core.md](./demo-business-core.md).
5. Shared reference outcomes are documented in [outcomes-reference.md](./outcomes-reference.md).

## Target architecture

1. `Clara` is the only public PSTN entrypoint.
2. `Clara` is both:
   - the public demo concierge for the shared landing-page number
   - the virtual receptionist demo when the caller selected `Clara`
3. `Maren`, `Jonas`, `Tobias`, `Lina`, `Kai`, and `Nora` are specialist agents with their own voices.
4. Routing stays in a star topology:
   - `Clara -> specialist`
   - `specialist -> Clara`
   - no specialist-to-specialist transfers in `v1`
5. The landing app passes pre-call intent so Clara can acknowledge the selected specialist immediately instead of asking the caller to repeat it.

## Important constraints

1. Keep Clara on the native ElevenLabs phone-number flow for this demo. Internal agent transfer is the point of the architecture.
2. Do not move Clara to a `register-call`-only path while you depend on internal agent transfers.
3. Treat every specialist as a guided product demo, not as a live production operator with real CRM, calendar, billing, or HR write access.
4. Keep the Widget tab out of scope for this rollout.
5. The disclosure requirement in [disclosure-requirements.md](./disclosure-requirements.md) is mandatory and must be satisfied both in the landing flow and in Clara's opening behavior.

## Repo integration anchors

1. Shared-number env: [`apps/one-of-one-landing/.env.local`](/Users/foundbrand_001/Development/vc83-com/apps/one-of-one-landing/.env.local#L49)
2. Shared-number env: [`apps/one-of-one-landing/.env.prod`](/Users/foundbrand_001/Development/vc83-com/apps/one-of-one-landing/.env.prod#L48)
3. Pre-call intent modal: [`apps/one-of-one-landing/components/landing-demo-call-modal.tsx`](/Users/foundbrand_001/Development/vc83-com/apps/one-of-one-landing/components/landing-demo-call-modal.tsx#L11)
4. Personalization webhook: [`apps/one-of-one-landing/app/api/demo-call/personalization/route.ts`](/Users/foundbrand_001/Development/vc83-com/apps/one-of-one-landing/app/api/demo-call/personalization/route.ts#L1)
5. Intent storage helpers: [`apps/one-of-one-landing/lib/demo-call.ts`](/Users/foundbrand_001/Development/vc83-com/apps/one-of-one-landing/lib/demo-call.ts#L1)

## Rollout rules

1. `Clara` must disclose that she is AI and that the call may be recorded/shared with service providers before substantive interaction.
2. The landing-page modal must present written disclosure before the caller dials in. The current privacy note is not sufficient by itself.
3. `Clara` should acknowledge the selected specialist in the first turn whenever the personalization webhook provides that context.
4. Specialists should not pretend they are connected to the caller's real systems unless and until the tool actually exists.
5. If a specialist needs to leave its lane, it transfers back to `Clara`.
6. Every agent gets a small, explicit knowledge base instead of one large shared dump.
7. All seven phone demo agents should share the same company facts, baseline metrics, and benchmark outcomes.
8. `Samantha` and `Clara` can be aware of each other at the operator / founder layer, but `Samantha` is not the primary company model for the seven phone demo agents.
9. `Veronica` stays on the separate office-line receptionist boundary and is excluded from Clara demo transfer routing by default.
10. Promoting `Veronica` into Clara demo flows requires an explicit architecture decision and rollout-task update.

## Related operator agent

`Samantha` is documented separately in [samantha](./samantha/) as the local diagnostic and recommendation layer. She is not part of the seven-agent phone demo roster and should not share Clara's phone role.

`Veronica` is documented separately in [veronica](./veronica/) as the real `Vound Brand Studio` receptionist. She is not part of the seven-agent demo roster and should not replace Clara's demo-concierge role.

### Veronica boundary contract

1. Veronica serves the real office-line receptionist role, not the Clara public-demo specialist flow.
2. Veronica may stay active for maintenance sync on her own line, but she is not a default Clara transfer target.
3. Clara demo transfer maps and specialist suites must remain limited to the seven-agent roster unless a dedicated rollout task explicitly changes this.
4. If Veronica is ever promoted into Clara flows, document the change in this runbook and queue a dedicated verification pass before deployment.

## Agent roster

| Agent | Purpose | Public number | Workflow tab | Primary tool stance | Folder |
|---|---|---:|---|---|---|
| `Clara` | Concierge + virtual receptionist demo | `Yes` | `Required` | `Transfer to agent` is core | [clara](./clara/) |
| `Maren` | Appointment coordination demo | `No` | `Skip in v1` | Optional return transfer to Clara | [maren](./maren/) |
| `Jonas` | Lead qualification demo | `No` | `Skip in v1` | Optional return transfer to Clara | [jonas](./jonas/) |
| `Tobias` | Field documentation demo | `No` | `Skip in v1` | Optional return transfer to Clara | [tobias](./tobias/) |
| `Lina` | Follow-up and retention demo | `No` | `Skip in v1` | Optional return transfer to Clara | [lina](./lina/) |
| `Kai` | Team operations demo | `No` | `Skip in v1` | Optional return transfer to Clara | [kai](./kai/) |
| `Nora` | Location intelligence demo | `No` | `Skip in v1` | Optional return transfer to Clara | [nora](./nora/) |

## Adjacent runtime agents

| Agent | Purpose | Public number | Workflow tab | Primary tool stance | Folder |
|---|---|---:|---|---|---|
| `Samantha` | Diagnostic and recommendation layer | `No` | `Skip` | Human transfer only | [samantha](./samantha/) |
| `Veronica` | Real Vound Brand Studio receptionist | `Separate office line` | `Skip in v1` | Human transfer plus optional transfer to Clara | [veronica](./veronica/) |

## Order of operations

1. Use [MANUAL_SETUP_PACKET.md](./MANUAL_SETUP_PACKET.md) as the execution log for agent ids, voices, and later transfer-destination ids.
2. Create the six specialist agents and assign distinct voices.
3. Upload the system prompt and knowledge-base files for each specialist.
4. Configure Analysis, Tools, Security, Advanced settings, and the minimum test set from each specialist `setup.md`.
5. Verify `Clara`:
   - public number
   - voice
   - personalization webhook
   - workflow nodes
   - prompt, knowledge base, setup, and tests
6. After the specialist agent ids exist, configure Clara `Transfer to agent` destinations and specialist return-to-Clara destinations.
7. Apply the disclosure requirement to the landing-page pre-call flow before opening the number publicly.
8. Run the smoke tests in [ROLLOUT_CHECKLIST.md](./ROLLOUT_CHECKLIST.md).

## Folder contents

1. `system-prompt.md`
   - the prompt to paste into the agent
2. `knowledge-base.md`
   - the role-specific KB document for the agent
3. `setup.md`
   - exact guidance for Workflow, Analysis, Tools, Tests, Security, and Advanced tabs
4. [MANUAL_SETUP_PACKET.md](./MANUAL_SETUP_PACKET.md)
   - the operator log for real agent ids, chosen voices, and later transfer ids
5. [demo-business-core.md](./demo-business-core.md)
   - the shared company facts to upload to all seven phone demo agents
6. [outcomes-reference.md](./outcomes-reference.md)
   - the shared benchmark outcomes to upload to all seven phone demo agents
7. [samantha/system-prompt.md](./samantha/system-prompt.md)
   - the local operator-level diagnostic prompt

## Recommended transfer map

1. `Clara -> Clara`
   - no transfer; Clara stays in receptionist-demo mode
2. `Clara -> Maren`
   - appointment scheduling, rescheduling, no-show recovery, waitlist
3. `Clara -> Jonas`
   - lead qualification, routing, urgency screening
4. `Clara -> Tobias`
   - field note to quote-draft conversion
5. `Clara -> Lina`
   - follow-up, retention, review requests, churn recovery
6. `Clara -> Kai`
   - internal team coordination, vacation, coverage, escalation
7. `Clara -> Nora`
   - dashboards, KPI interpretation, anomaly spotting
8. `Clara -> Veronica`
   - out of scope by default; only allowed via explicit boundary-change decision

## Files to use first

1. [MANUAL_SETUP_PACKET.md](./MANUAL_SETUP_PACKET.md)
2. [clara/system-prompt.md](./clara/system-prompt.md)
3. [clara/knowledge-base.md](./clara/knowledge-base.md)
4. [clara/setup.md](./clara/setup.md)
5. [ROLLOUT_CHECKLIST.md](./ROLLOUT_CHECKLIST.md)
