# Platform-Managed Provider Control Plane Implementation Plan

**Date:** 2026-03-13  
**Workstream root:** `/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/deployment-tier-architecture`  
**Scope:** bring `Twilio`, `ElevenLabs`, and `Infobip` under a platform-managed control plane that plugs into the underlying agentic runtime and deployment-tier policy.

---

## Mission

Make provider setup a first-class product surface in our platform rather than a collection of vendor-native dashboards and ad hoc environment bindings.

The target product promise is:

1. Customers configure communications providers from our UI and admin APIs.
2. Public numbers, sender identities, and channel entry points bind to our internal routing model.
3. The underlying agent runtime remains authoritative for orchestration, knowledge, tools, and guardrails.
4. Deployment profiles decide which providers are allowed in `Cloud`, `Dedicated-EU`, and `Sovereign Preview`.
5. Provider switches increase deployment flexibility without forcing customer-facing workflow changes.

---

## Why This Workstream Exists

Today, the codebase already has useful seams:

1. Channel provider bindings and route identities exist for telephony and messaging.
2. ElevenLabs settings, voice catalog access, and runtime bindings already exist.
3. Direct telephony ingress already resolves route keys and provider connection metadata.

What is still missing is a unified product-level control plane where:

1. `Twilio` is managed as a telephony ingress/egress provider inside our platform.
2. `ElevenLabs` is managed as a voice-agent runtime and optional telephony companion inside our platform.
3. `Infobip` is managed as a deployment-profile-aware SMS/WhatsApp provider inside our platform.
4. The underlying agent system remains the source of truth for routing and specialist handoff.

---

## Core Design Principle

Public provider resources are ingress surfaces, not agent identities.

Examples:

1. A phone number is a customer-facing entry point.
2. A WhatsApp sender is a customer-facing entry point.
3. An ElevenLabs conversational agent is an execution surface, not the product's canonical agent model.

The canonical model stays inside our platform:

1. organization,
2. deployment profile,
3. provider connection,
4. channel provider binding,
5. agent runtime contract,
6. specialist handoff policy,
7. knowledge base and tool access policy.

---

## Target Operator Experience

An operator should be able to do the following from our platform:

1. Connect `Twilio`, `ElevenLabs`, and `Infobip` using platform-managed, BYOK, or private credentials where policy allows.
2. View number inventory, sender inventory, and deployment eligibility by provider.
3. Bind a public number or sender to a routing policy rather than hard-binding it to a single visible agent.
4. Choose whether a call or message lands on:
   - one generalist agent,
   - one specialist agent,
   - one orchestrator/router agent,
   - or a hidden specialist handoff path.
5. Push prompt, voice, knowledge, and tool settings to provider-specific execution surfaces when needed.
6. Audit every provider binding and webhook route from inside our own admin model.

---

## Provider Roles

### `Twilio`

Primary role:

1. telephony ingress and egress,
2. phone number inventory,
3. voice/SMS webhook termination,
4. routing into our internal agent runtime.

Phase-1 target:

1. inbound call routing,
2. outbound call initiation,
3. SMS-capable number inventory,
4. route-key-backed binding to our channel provider contract.

---

### `ElevenLabs`

Primary role:

1. speech runtime,
2. voice catalog,
3. optional provider-facing telephony execution surface,
4. provider-side conversational agent mirror where deployment policy allows it.

Phase-1 target:

1. server-side voice runtime binding,
2. prompt/voice/knowledge sync contract,
3. telephony handoff binding for calls that should execute on ElevenLabs,
4. webhook ingestion back into our call/outcome model.

Important rule:

Our platform remains the system of record for agent identity. Any ElevenLabs agent record is a mirror or execution binding, not the canonical business agent.

---

### `Infobip`

Primary role:

1. SMS,
2. WhatsApp,
3. channel delivery fallback for deployment profiles that should not depend on Twilio for messaging.

Phase-1 target:

1. platform-managed sender binding,
2. SMS/WhatsApp ingress and outbound delivery,
3. deployment-profile-aware allowlist and disable/manual modes.

Important rule:

`Infobip` is messaging-first in this plan. Voice can be evaluated later per deployment profile, but it is not required for the first control-plane milestone.

---

## Canonical Control-Plane Objects

### `DeploymentProfile`

Owns:

1. tier (`Cloud`, `Dedicated-EU`, `Sovereign Preview`),
2. allowed providers,
3. region lock,
4. support-access mode,
5. recording policy,
6. logging/redaction policy,
7. fallback/disable/manual modes.

---

### `ProviderConnection`

Owns:

1. provider identity,
2. billing source (`platform`, `byok`, `private`),
3. credential custody mode,
4. account/workspace metadata,
5. health state,
6. deployment-profile eligibility.

---

### `ChannelProviderBinding`

Owns:

1. public number or sender identity,
2. provider connection reference,
3. installation/profile/account metadata,
4. route key,
5. channel (`phone_call`, `sms`, `whatsapp`, `webchat`, etc.),
6. enable/disable state,
7. platform fallback policy.

---

### `AgentProviderMirror`

Owns:

1. provider-specific execution object ID,
2. sync status,
3. mirrored prompt/voice/knowledge metadata,
4. drift detection,
5. last successful push/pull,
6. deployment-profile compatibility.

Use this for `ElevenLabs` conversational/voice execution surfaces. Do not let it replace internal agent IDs.

---

### `RoutePolicy`

Owns:

1. default target agent,
2. orchestrator mode vs direct-entry mode,
3. specialist handoff rules,
4. fallback behavior,
5. human escalation rules,
6. recording/transcript behavior by provider and tier.

---

## Execution Phases

### Phase 0: Publish the plan and lock the model

Deliverables:

1. this implementation plan,
2. queue rows in the deployment-tier workstream,
3. session prompts updated to include provider-control-plane work.

Status: completed in docs on 2026-03-13.

---

### Phase 1: Contracts and policy

Goal:

Define the canonical provider-control-plane contracts before provider-specific UI or runtime swaps.

Deliverables:

1. deployment-profile provider allowlist contract,
2. provider connection health + credential policy,
3. channel binding contract,
4. provider mirror contract for `ElevenLabs`,
5. route policy contract for one-number/multi-agent routing.

Depends on:

1. `DTA-003`

---

### Phase 2: `Twilio` platform-managed telephony

Goal:

Move number/webhook/routing management behind our platform so Twilio becomes an ingress provider feeding our agent runtime.

Deliverables:

1. Twilio connection and account metadata model,
2. number inventory and binding UI/API,
3. webhook configuration and verification flow,
4. inbound call routing into our channel binding + route policy model,
5. outbound calling through deployment-profile policy.

Acceptance:

1. one public number can bind to a route policy rather than one hard-coded visible agent,
2. inbound call routing is auditable in our platform,
3. Twilio remains a provider binding, not a source of truth for agent identity.

---

### Phase 3: `ElevenLabs` platform-managed runtime mirror

Goal:

Make ElevenLabs a managed execution layer under our platform rather than a separately configured agent universe.

Deliverables:

1. provider mirror model for ElevenLabs runtime objects,
2. sync for prompt, voice, knowledge, tool hints, and telephony binding metadata,
3. webhook ingestion for call/transcript/outcome events,
4. drift detection between our agent contract and ElevenLabs execution state.

Acceptance:

1. our agent model remains canonical,
2. mirrored ElevenLabs objects can be recreated or switched without losing business-level agent identity,
3. deployment profile can allow, restrict, or disable ElevenLabs by tier.

---

### Phase 4: `Infobip` platform-managed messaging

Goal:

Bring SMS/WhatsApp delivery under the same deployment-aware control plane.

Deliverables:

1. Infobip sender/binding management,
2. unified channel binding contract for SMS and WhatsApp,
3. deployment-profile-aware fallback and disable/manual modes,
4. inbound webhook normalization into the same runtime model.

Acceptance:

1. message channels can switch providers without rewriting agent workflows,
2. `Dedicated-EU` and `Sovereign Preview` can constrain messaging providers independently from telephony/voice.

---

### Phase 5: Cross-provider validation

Goal:

Prove that provider choice is now a deployment decision instead of a hard-coded runtime assumption.

Acceptance criteria:

1. `Cloud` can run with Twilio + ElevenLabs + Infobip under platform-managed or BYOK policies.
2. `Dedicated-EU` can restrict providers and reject disallowed ones at configuration time.
3. `Sovereign Preview` can disable unsafe providers or force manual/customer-owned bindings.
4. The customer-facing operating model remains stable even when provider bindings change.

---

## Sequencing Against Existing Seam Work

This plan does not replace the seam map. It sits on top of it.

Mapping:

1. `Twilio` work primarily depends on `DTA-S01`, `DTA-S05`, and `DTA-S06`.
2. `ElevenLabs` work primarily depends on `DTA-S01`, `DTA-S05`, `DTA-S07`, and `DTA-S08`.
3. `Infobip` work primarily depends on `DTA-S01`, `DTA-S06`, and non-hot-path adapter policy where relevant.

Practical sequence:

1. finish `DTA-003`,
2. lock the provider-control-plane contracts,
3. complete live-path contract extraction,
4. execute Twilio and ElevenLabs platform-managed work,
5. execute Infobip platform-managed messaging work,
6. validate switching by deployment profile.

---

## Non-Goals for Phase 1

1. Do not promise full vendor parity across all tiers.
2. Do not move every provider feature into our UI on day one.
3. Do not treat provider-native objects as the product's canonical agent model.
4. Do not implement one-off customer forks to support provider variance.

---

## Commercial Impact

This plan improves three things simultaneously:

1. better sales positioning:
   customers buy one operator platform, not three vendor dashboards,
2. better deployment flexibility:
   provider choice can change by customer and by tier,
3. better architecture:
   the agent runtime stays authoritative while providers become swappable execution layers.

---

## Exit Condition

We can say the provider-control-plane work is real when:

1. a customer configures provider bindings from our platform,
2. a public number or sender maps to our routing model,
3. internal agents and hidden specialists remain transparent to the caller,
4. deployment tiers can allow or reject providers by policy,
5. switching provider bindings no longer requires rewriting business-agent logic.
