# Upstream Capability Inventory (NCLAW-013)

**Workstream:** Germany OpenClaw hardening (`apps/nemoclaw-kanzlei-eu`)  
**Date:** 2026-03-27  
**Status:** Completed inventory for anti-duplication lock (`NCLAW-014` input)

---

## Scope audited (local repos)

1. `/Users/foundbrand_001/Development/vc83-com/apps/nemoclaw-kanzlei-eu/repos/openclaw`
2. `/Users/foundbrand_001/Development/vc83-com/apps/nemoclaw-kanzlei-eu/repos/NemoClaw`

Inventory snapshot from local clone:

- OpenClaw extensions: `83`
- OpenClaw skills: `51`

---

## Concrete upstream capabilities

## 1) Plugin/skill platform (do not re-build)

- OpenClaw already provides first-class plugin install, discovery, enable/disable, config schemas, and precedence rules.
- Evidence:
  - `/Users/foundbrand_001/Development/vc83-com/apps/nemoclaw-kanzlei-eu/repos/openclaw/docs/tools/plugin.md`
  - `/Users/foundbrand_001/Development/vc83-com/apps/nemoclaw-kanzlei-eu/repos/openclaw/docs/tools/skills.md`

Reuse decision:

- Keep architecture on native OpenClaw plugin/skill surfaces.
- Do not create a parallel plugin runtime in `apps/nemoclaw-kanzlei-eu`.

## 2) Telephony/voice surfaces already exist

- Voice-call plugin exists and is operationally documented (Twilio/Telnyx/Plivo/mock, webhook security, streaming, tool usage).
- Voice-call skill exists and already maps tool actions for agent use.
- Evidence:
  - `/Users/foundbrand_001/Development/vc83-com/apps/nemoclaw-kanzlei-eu/repos/openclaw/extensions/voice-call/openclaw.plugin.json`
  - `/Users/foundbrand_001/Development/vc83-com/apps/nemoclaw-kanzlei-eu/repos/openclaw/extensions/voice-call/index.ts`
  - `/Users/foundbrand_001/Development/vc83-com/apps/nemoclaw-kanzlei-eu/repos/openclaw/docs/plugins/voice-call.md`
  - `/Users/foundbrand_001/Development/vc83-com/apps/nemoclaw-kanzlei-eu/repos/openclaw/skills/voice-call/SKILL.md`

Reuse decision:

- Clara MVP should integrate with existing `voice-call` channel/tool path.
- No new custom telephony orchestrator should be introduced for MVP.

## 3) ElevenLabs support is already upstream-native

- ElevenLabs speech provider plugin is bundled.
- Voice-call plugin includes ElevenLabs TTS config fields.
- Evidence:
  - `/Users/foundbrand_001/Development/vc83-com/apps/nemoclaw-kanzlei-eu/repos/openclaw/extensions/elevenlabs/openclaw.plugin.json`
  - `/Users/foundbrand_001/Development/vc83-com/apps/nemoclaw-kanzlei-eu/repos/openclaw/extensions/elevenlabs/index.ts`
  - `/Users/foundbrand_001/Development/vc83-com/apps/nemoclaw-kanzlei-eu/repos/openclaw/extensions/voice-call/openclaw.plugin.json`

Reuse decision:

- Do not build a new ElevenLabs adapter layer unless upstream surfaces prove insufficient in integration tests.

## 4) OpenRouter provider path is already upstream-native

- OpenRouter provider plugin exists with auth/env wiring and provider registration.
- Evidence:
  - `/Users/foundbrand_001/Development/vc83-com/apps/nemoclaw-kanzlei-eu/repos/openclaw/extensions/openrouter/openclaw.plugin.json`
  - `/Users/foundbrand_001/Development/vc83-com/apps/nemoclaw-kanzlei-eu/repos/openclaw/extensions/openrouter/index.ts`

Reuse decision:

- Keep model-routing on OpenClaw provider/plugin model.
- Avoid custom sidecar inference router for MVP.

## 5) Additional voice/control plugins exist (evaluate before custom code)

- `talk-voice` plugin present.
- `phone-control` plugin present.
- Evidence:
  - `/Users/foundbrand_001/Development/vc83-com/apps/nemoclaw-kanzlei-eu/repos/openclaw/extensions/talk-voice/openclaw.plugin.json`
  - `/Users/foundbrand_001/Development/vc83-com/apps/nemoclaw-kanzlei-eu/repos/openclaw/extensions/phone-control/openclaw.plugin.json`

Reuse decision:

- Evaluate these as extension points before creating bespoke command/control code.

## 6) NemoClaw already supplies hardening baseline and sandbox policy model

- NemoClaw provides OpenShell-based sandbox orchestration, image hardening, and policy-first execution.
- Default policy expresses deny-by-default-style constraints and explicit endpoint/binary allow rules.
- Evidence:
  - `/Users/foundbrand_001/Development/vc83-com/apps/nemoclaw-kanzlei-eu/repos/NemoClaw/README.md`
  - `/Users/foundbrand_001/Development/vc83-com/apps/nemoclaw-kanzlei-eu/repos/NemoClaw/nemoclaw-blueprint/policies/openclaw-sandbox.yaml`
  - `/Users/foundbrand_001/Development/vc83-com/apps/nemoclaw-kanzlei-eu/repos/NemoClaw/Dockerfile`
  - `/Users/foundbrand_001/Development/vc83-com/apps/nemoclaw-kanzlei-eu/repos/NemoClaw/nemoclaw-blueprint/blueprint.yaml`

Reuse decision:

- Use NemoClaw policy and image seams as primary hardening path.
- Keep Germany-specific restrictions as policy/config overlays, not runtime rewrites.

---

## Capability map for Germany Kanzlei MVP

| MVP Need | Upstream capability already present | Decision |
|---|---|---|
| Voice intake channel | `voice-call` plugin + skill + docs | Reuse directly |
| ElevenLabs speech | bundled `elevenlabs` + voice-call TTS config | Reuse directly |
| Provider flexibility (OpenRouter path) | `openrouter` plugin + auth/config surfaces | Reuse directly |
| Agent skill orchestration | OpenClaw AgentSkills model + plugin-shipped skills | Reuse directly |
| Runtime hardening boundary | NemoClaw + OpenShell sandbox policy model | Reuse with Germany overlay |
| Germany-specific compliance artifacts | Not fully upstream (org/legal evidence + operations) | Implement in `apps/nemoclaw-kanzlei-eu` docs/runbooks/policies |

---

## Explicit anti-duplication implications for NCLAW-014

`NCLAW-014` must lock these rules:

1. No parallel telephony stack for MVP while `voice-call` can satisfy requirements.
2. No custom ElevenLabs transport while bundled provider + voice-call config satisfies requirements.
3. No custom inference routing sidecar while provider plugins satisfy requirements.
4. Custom code allowed only at clear seams:
   - plugin config overlays,
   - sandbox policy overlays,
   - Kanzlei-specific prompts/contracts/workers,
   - Germany compliance evidence/runbooks.
5. Any runtime fork must include a written “why upstream seam failed” note in queue row notes.

---

## Remaining verified gaps (expected and acceptable)

1. No upstream Germany-specific legal evidence pack for your entity/processes.
2. No upstream Kanzlei-specific worker contracts for your exact intake packet format.
3. No upstream customer-tenancy policy for your commercial model.

These are expected local responsibilities and should be handled in `apps/nemoclaw-kanzlei-eu` without duplicating core runtime systems.
