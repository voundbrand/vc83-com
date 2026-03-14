# Deployment Tier Architecture Master Plan

**Date:** 2026-03-13  
**Scope:** lock the architecture, execution order, and commercial guardrails for `Cloud`, `Dedicated-EU`, and `Sovereign` deployments of the same core product.

---

## Mission

Keep one core product and one core repo while making three deployment promises honest:

1. `Cloud`: practical enterprise-grade GDPR SaaS.
2. `Dedicated-EU`: EEA-only live-call hot path on dedicated or strongly isolated infrastructure.
3. `Sovereign`: customer-controlled or tightly isolated infrastructure with no unapproved third-country processor on the hot path or privileged admin path.

The flagship constraint is the voice agent. The architecture is only credible if the full call path is credible:

1. telephony ingress,
2. media gateway,
3. ASR,
4. TTS,
5. LLM,
6. recordings/transcripts,
7. logs/monitoring,
8. support access.

---

## Main conclusion

The current codebase can support all three tiers from one codebase, but not by turning deployment knobs on the existing system.

1. `Cloud` is already viable.
2. `Dedicated-EU` is viable after a focused refactor around tier policy, voice/runtime seams, server-side key custody, and EEA-constrained logging/storage.
3. `Sovereign` is not a credible parity promise today. The realistic path today is a constrained `Sovereign Preview` profile with a self-hosted or tightly isolated voice/data plane and a deliberately smaller feature envelope.

---

## Locked tier definitions

### `Cloud`

- Fully managed SaaS.
- GDPR/DSGVO posture based on DPA + subprocessor transparency + lawful transfer mechanism.
- US and EU subprocessors are allowed where contractually covered.
- Best fit for current codebase.

### `Dedicated-EU`

- Customer-dedicated or strongly isolated deployment.
- Primary live-call hot path stays in the EEA.
- Fewer non-EEA processors; avoid extra processors on the call path.
- Near-Cloud experience is acceptable if quality remains high.

### `Sovereign`

- Customer-controlled or tightly isolated infra.
- No unapproved third-country processor on hot path or privileged admin path.
- Recordings off by default unless explicitly requested.
- Manual support access, explicit approval, and audited operator entry.
- Not a parity promise with `Cloud`.

---

## Current repo state in this codebase

### Structural state

1. The repo is still one main Next + Convex product with sibling apps, not a formal workspace monorepo.
2. `/apps` exists but only `one-of-one-landing`, `operator-mobile`, and `voice-ws-gateway` are actual app packages.
3. `/packages` exists but only `packages/sdk` is real package infrastructure today.

### Confirmed blockers

1. `Convex` is the frontend client, runtime, session store, database, object storage, and media-retention plane.
2. Voice runtime is effectively shaped around `browser` and `elevenlabs` only.
3. The voice WebSocket gateway is a relay into Convex HTTP APIs, not an independent media/control plane.
4. LLM routing is not strict enough because provider-specific auth can fall back to OpenRouter.
5. Mobile clients currently hold AI vendor keys and call transcription providers directly.
6. Operational logs currently include transcript excerpts in the voice path.
7. Non-hot-path services like analytics, email, payments, publishing, and video are directly wired to managed vendors rather than selected by deployment profile.

---

## Tier matrix

Assumption: `Dedicated-EU` means the live-call hot path must stay inside the EEA. Ancillary systems like invoicing or support email may still be separate if that is disclosed and contractually acceptable. If the target policy is EEA-only for every subsystem, `Email`, `Payments`, and `Analytics` all become stricter.

| Component | Cloud | Dedicated-EU | Sovereign | Notes |
|---|---|---|---|---|
| Frontend hosting | Cloud approved | Dedicated-EU approved | Sovereign approved | Next is portable; deployment flows must stop assuming Vercel-managed publishing. |
| Backend/runtime | Cloud approved | Needs adapter | Current blocker | Current app runtime is structurally Convex-centric. |
| Database/state | Cloud approved | Needs adapter | Current blocker | Sessions, objects, chats, voice outcomes, and retained media metadata sit in Convex. |
| Auth | Cloud approved | Needs adapter | Needs adapter | Custom auth logic is portable, but session storage and auth queries are not abstracted yet. |
| Email | Cloud approved | Needs adapter | Needs adapter | Managed email is fine for Cloud; tighter tiers need EU relay, customer SMTP, or disable/manual paths. |
| Analytics | Cloud approved | Needs adapter | Needs adapter | PostHog EU can stay in Cloud; stricter tiers need self-host or disable mode. |
| Payments | Cloud approved | Needs adapter | Needs adapter | Stripe is acceptable for Cloud; Sovereign should allow manual invoice/off-platform billing. |
| Telephony | Cloud approved | Needs adapter | Needs adapter | Existing direct/telephony seam is useful, but the media/results path still lands in Convex. |
| ASR | Cloud approved | Needs adapter | Current blocker | Current server path is effectively ElevenLabs-shaped and mobile is not server-custodied. |
| TTS | Cloud approved | Needs adapter | Current blocker | ElevenLabs-only today. |
| LLM | Cloud approved | Needs adapter | Current blocker | OpenRouter fallback prevents strict routing control. |
| Logs/monitoring | Cloud approved | Needs adapter | Needs adapter | Need per-tier sinks, redaction, and transcript-free hot-path logging. |
| File storage | Cloud approved | Needs adapter | Current blocker | Convex storage is used for org media and retained voice payloads. |

---

## Target repo architecture

### What stays in `/apps`

Keep runtime entrypoints in `/apps`:

1. `platform-web` (eventual home of the current root app),
2. `operator-mobile`,
3. `voice-gateway`,
4. `one-of-one-landing`.

Do not add customer forks under `/apps`.

### What moves into `/packages`

Create capability-first shared packages:

1. `packages/core-domain`
2. `packages/contracts-runtime`
3. `packages/contracts-providers`
4. `packages/deployment-profiles`
5. `packages/branding`
6. `packages/providers-telephony`
7. `packages/providers-asr`
8. `packages/providers-tts`
9. `packages/providers-llm`
10. `packages/providers-email`
11. `packages/providers-analytics`
12. `packages/providers-payments`
13. `packages/observability`

### Where provider adapters live

Provider adapters live by capability, not by app and not by customer.

Examples:

1. `packages/providers-llm/openai`
2. `packages/providers-llm/openai-compatible`
3. `packages/providers-tts/elevenlabs`
4. `packages/providers-asr/self-hosted`
5. `packages/providers-telephony/direct-sip`

### Branding and white-label overlays

Customer variance belongs in deployment overlays:

1. theme tokens,
2. logos,
3. copy pack,
4. domain map,
5. legal/compliance profile,
6. provider bindings,
7. feature gates,
8. support-access mode.

### How to avoid code forks and customer branches

1. Put all tier and customer variance into deployment-profile manifests.
2. Make provider choice a runtime binding, not an application `if customer === X`.
3. Keep brand assets and copy separate from feature code.
4. Allow `disable` and `manual` modes where a tier-safe provider does not yet exist.
5. Keep the core domain model shared even when the sovereign profile disables features.

---

## Voice strategy by tier

### Difference in legal posture

1. `GDPR-compliant SaaS` means lawful transfers and disclosed subprocessors. It does not mean no US vendor.
2. `EEA-only hot path` means the live-call processing path stays inside the EEA.
3. `Germany-only policy posture` is stronger optics, but still not sovereign if foreign processors or foreign privileged access remain.
4. `True sovereign/on-prem` means customer-controlled or tightly isolated infra and approved operator access only.

### `Cloud`

Use a high-quality managed voice stack with explicit routing:

1. EU-hosted app/runtime where possible,
2. EU voice gateway,
3. managed telephony integration,
4. managed speech stack,
5. direct LLM provider binding,
6. managed storage/logging with disclosed subprocessors.

This is the fastest path and the best quality envelope.

### `Dedicated-EU`

Use an EEA-only hot path:

1. EEA telephony ingress,
2. EEA voice gateway,
3. EEA runtime/data plane,
4. EEA object/media storage,
5. direct LLM routing with region lock,
6. transcript-free operational logs,
7. support access outside the hot path and explicitly governed.

This can remain close to Cloud quality if the managed speech and LLM providers are region-constrained and the gateway stays server-side.

### `Sovereign`

Ship only a constrained `Sovereign Preview` today:

1. customer PBX/SIP or approved carrier,
2. self-hosted voice gateway,
3. self-hosted data plane and object storage,
4. self-hosted ASR,
5. self-hosted TTS,
6. self-hosted LLM behind an OpenAI-compatible contract,
7. no SaaS analytics on the hot path,
8. manual billing/email paths or customer-owned bindings,
9. recordings disabled by default,
10. audited and approved support access only.

Tradeoff is explicit:

1. lower speech quality and multilingual robustness,
2. more GPU and ops cost,
3. slower deployment and debugging,
4. lower parity with Cloud.

---

## Practical path to Sovereign today

### What can be offered today

Offer `Sovereign Preview`, not generic `Sovereign`.

### What `Sovereign Preview` includes

1. customer-controlled or tightly isolated infrastructure,
2. self-hosted live-call data plane,
3. self-hosted or explicitly approved speech and LLM providers,
4. no client-held AI keys,
5. no call recordings by default,
6. manual or customer-owned email/payment bindings,
7. transcript-free logs and self-hosted observability.

### What `Sovereign Preview` explicitly does not promise

1. Cloud feature parity,
2. current builder/Vercel publish experience,
3. self-serve Stripe checkout,
4. Resend dependency,
5. PostHog dependency,
6. Mux dependency,
7. current ElevenLabs-only speech assumptions.

### Required acceptance criteria

1. A full demo call must run without implicit Convex cloud dependency on the hot path.
2. A full demo call must run without OpenRouter fallback.
3. Provider keys must remain server-side only.
4. Logs must not contain transcript text by default.
5. Support access must be explicit, auditable, and revocable.

---

## Provider/runtime seam map summary

The full seam plan lives in `PROVIDER_RUNTIME_SEAM_MAP.md`.

The extraction order is locked:

1. tier policy and provider allowlists,
2. backend/session/media/storage seams,
3. transcript-free observability,
4. server-side key custody,
5. strict LLM routing,
6. telephony/voice/ASR/TTS contracts,
7. non-hot-path adapters,
8. deployment and branding overlays,
9. Dedicated-EU validation,
10. Sovereign Preview validation.

---

## Platform-Managed Provider Control Plane

This workstream now also treats platform-managed provider control as a first-class architecture goal.

Target product shape:

1. `Twilio` is managed as telephony ingress/egress under our platform control plane.
2. `ElevenLabs` is managed as a voice-runtime and provider-mirror surface under our platform control plane.
3. `Infobip` is managed as a deployment-profile-aware messaging provider under our platform control plane.

The key rule is:

1. public numbers and sender identities are ingress surfaces,
2. internal agent identity stays canonical in our own runtime,
3. provider-native execution objects are mirrors or bindings, not the source of truth.

The companion execution doc is:

- `PROVIDER_CONTROL_PLANE_IMPLEMENTATION_PLAN.md`

### Why this matters

1. Customers buy one operator platform, not three vendor dashboards.
2. Deployment tiers can allow, restrict, or disable providers without forking the product.
3. Internal routing can stay stable even when the provider mix changes by customer or by tier.

### Provider role summary

| Provider | Primary role in this plan | Notes |
|---|---|---|
| `Twilio` | telephony ingress/egress, number inventory, route binding | becomes a front-door provider into our runtime |
| `ElevenLabs` | voice runtime, speech execution, provider-side agent mirror | must remain subordinate to our canonical agent model |
| `Infobip` | SMS/WhatsApp channel delivery and fallback path | phase 1 is messaging-first, not voice-first |

---

## Decision log

1. **2026-03-13: One codebase remains the rule**
   No customer branches. Tier and customer variance must be data/config driven.

2. **2026-03-13: Sovereign is a constrained profile, not a parity promise**
   This avoids dishonest positioning and makes the engineering plan executable.

3. **2026-03-13: Voice hot path drives extraction order**
   Backend/state abstraction should start where call-path compliance actually depends on it, not with broad product CRUD.

4. **2026-03-13: Dedicated-EU is the commercial bridge**
   Dedicated-EU is the near-term path that funds and validates the harder sovereign work.

5. **2026-03-13: Provider control must move inside the platform**
   Twilio, ElevenLabs, and Infobip should become deployment-aware provider bindings under our control plane, not separate product universes.

---

## Risks and mitigations

1. **Risk: trying to abstract the whole platform before isolating the voice hot path**
   Mitigation: contract-first extraction for session/media/voice seams only.

2. **Risk: selling Sovereign before the live path is real**
   Mitigation: position only `Sovereign Preview` until the acceptance criteria are proven.

3. **Risk: accidental customer forks through branding and provider variance**
   Mitigation: overlays and provider bindings only; no branch-based delivery.

4. **Risk: Dedicated-EU degraded by hidden non-EEA logs or fallback routes**
   Mitigation: transcript-free logging, explicit provider allowlists, and validation gating.

---

## Exit criteria

1. `Cloud`, `Dedicated-EU`, and `Sovereign Preview` each have explicit provider/runtime profiles.
2. The live voice path is server-custodied and policy-enforced.
3. Dedicated-EU can be validated end-to-end with an EEA-only hot path.
4. Sovereign Preview can be demonstrated with a constrained, explicit feature envelope.
5. Sales/ops guardrails clearly state what is sellable now versus preview-only.
6. `TASK_QUEUE.md`, `SESSION_PROMPTS.md`, `INDEX.md`, `PROVIDER_RUNTIME_SEAM_MAP.md`, and this `MASTER_PLAN.md` stay synchronized.

---

## Source appendix

Primary/current sources used for vendor and compliance capability claims:

1. Convex production regions: `https://docs.convex.dev/production/regions`
2. Convex self-hosting: `https://stack.convex.dev/self-hosted-develop-and-deploy`
3. OpenAI data controls: `https://platform.openai.com/docs/guides/your-data`
4. OpenAI data residency details: `https://platform.openai.com/docs/models/how-we-use-your-data`
5. ElevenLabs data residency: `https://elevenlabs.io/docs/overview/administration/data-residency`
6. ElevenLabs zero retention: `https://elevenlabs.io/docs/developer-guides/zero-retention-mode`
7. ElevenLabs SIP trunking: `https://elevenlabs.io/docs/conversational-ai/phone-numbers/sip-trunking`
8. ElevenLabs Twilio integration: `https://elevenlabs.io/docs/conversational-ai/phone-numbers/integrations/twilio`
9. Resend GDPR: `https://resend.com/security/gdpr`
10. Resend multi-region: `https://resend.com/changelog/multi-region-for-everyone`
11. Resend DPF certification: `https://resend.com/changelog/data-privacy-framework-certification`
12. Stripe DPA: `https://stripe.com/legal/dpa`
13. Stripe privacy center: `https://stripe.com/legal/privacy-center`
14. Vercel function regions: `https://vercel.com/docs/functions/configuring-functions/region`
15. Vercel regions: `https://vercel.com/docs/regions`
16. PostHog homepage: `https://posthog.com/`
17. PostHog status / EU cloud references: `https://status.posthog.com/`
18. Hetzner European cloud: `https://www.hetzner.com/de/european-cloud/`
19. Hetzner locations: `https://docs.hetzner.com/cloud/general/locations/`
20. HalloPetra public site: `https://www.hallopetra.de/`
21. GetCarl public site: `https://getcarl.de/`
