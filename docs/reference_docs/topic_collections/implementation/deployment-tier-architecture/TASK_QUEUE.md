# Deployment Tier Architecture Task Queue

**Last updated:** 2026-03-13  
**Workstream root:** `/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/deployment-tier-architecture`  
**Source request:** deployment-tier architecture, sovereign path, provider/runtime seam map lock-in, and platform-managed `Twilio` / `ElevenLabs` / `Infobip` control-plane planning (2026-03-13)

---

## Queue rules

1. Allowed statuses are only: `READY`, `IN_PROGRESS`, `PENDING`, `BLOCKED`, `DONE`.
2. Only one task may be `IN_PROGRESS` globally unless concurrency rules explicitly permit one per lane.
3. Promote from `PENDING` to `READY` only when all dependencies are `DONE`.
4. Selection order is deterministic: highest priority (`P0` -> `P1` -> `P2`) then lowest ID.
5. Every task must include explicit verification commands before moving to `DONE`.
6. Keep lane ownership strict; avoid cross-lane file edits while another active lane owns the same files.
7. If blocked, mark `BLOCKED` with a concrete blocker note and continue with the next `READY` task.
8. Sync `TASK_QUEUE.md`, `INDEX.md`, `MASTER_PLAN.md`, `PROVIDER_RUNTIME_SEAM_MAP.md`, and `PROVIDER_CONTROL_PLANE_IMPLEMENTATION_PLAN.md` after each completed task.

---

## Verification profiles

| Profile | Command |
|---|---|
| `V-DOCS` | `npm run docs:guard` |
| `V-TYPE` | `npm run typecheck` |
| `V-UNIT` | `npm run test:unit` |
| `V-INTEG` | `npm run test:integration` |
| `V-MOBILE-TYPE` | `npm run mobile:typecheck` |
| `V-GATEWAY` | `npm run voice-gateway:check` |

---

## Execution lanes

| Lane | Purpose | Primary ownership | Merge-overlap policy |
|---|---|---|---|
| `A` | Canonical architecture baseline and seam-map lock | workstream docs only | No code edits in this lane |
| `B` | Tier policy, deployment-profile schema, and core runtime/data seams | `src/*`; `convex/*`; future `packages/contracts-*` | Do not touch live voice provider logic until lane `C` starts |
| `C` | Voice hot-path cleanup: server-side key custody, explicit provider routing, ASR/TTS seams | `apps/operator-mobile/*`; `apps/voice-ws-gateway/*`; `convex/ai/*` | Avoid analytics/email/payment files in this lane |
| `D` | Non-hot-path adapters and delivery overlays | analytics, email, payments, branding, publish/deploy docs/code | Do not rework session/media stores in this lane |
| `E` | Dedicated-EU validation, Sovereign preview profile, and final rollout packet | workstream docs plus validation scripts/configs | Starts only after all `P0` rows are `DONE` or explicitly `BLOCKED` |

---

## Concurrency rules

1. Lane `A` is complete and should stay docs-only unless architecture assumptions materially change.
2. Run `DTA-003` first before promoting any other task.
3. After `DTA-003`, run one task from lane `B` and one task from lane `C` in parallel if they do not edit the same files.
4. Lane `D` starts only after `DTA-003` is `DONE`.
5. Lane `E` starts only after all `P0` rows are `DONE` or explicitly `BLOCKED`.
6. `DTA-016` and `DTA-017` should not run in parallel unless file ownership has been explicitly partitioned first.
7. If a task needs a file owned by another active lane, pause and re-queue rather than merging lane scope.

---

## Task queue

| ID | Lane | Plan | Priority | Status | Depends On | Task | Primary files | Verify | Notes |
|---|---|---:|---|---|---|---|---|---|---|
| `DTA-001` | `A` | 1 | `P0` | `DONE` | - | Publish canonical tier definitions, current blockers, tier matrix, target architecture, voice strategy, and practical sovereign path | `/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/deployment-tier-architecture/MASTER_PLAN.md`; `/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/deployment-tier-architecture/INDEX.md` | `V-DOCS` | Done 2026-03-13: baseline architecture pack created with tier definitions, source appendix, and explicit distinction between Cloud, Dedicated-EU, and Sovereign. |
| `DTA-002` | `A` | 1 | `P0` | `DONE` | `DTA-001` | Publish provider/runtime seam map with extraction order, target packages, and tier bindings | `/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/deployment-tier-architecture/PROVIDER_RUNTIME_SEAM_MAP.md`; `/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/deployment-tier-architecture/MASTER_PLAN.md` | `V-DOCS` | Done 2026-03-13: seam map created and linked from master plan + index. |
| `DTA-003` | `B` | 2 | `P0` | `READY` | `DTA-001`, `DTA-002` | Define deployment-profile schema and provider allowlist contract so the app can select `Cloud`, `Dedicated-EU`, and `Sovereign` without branches | `src/*` composition entrypoints; `convex/ai/*`; future `packages/deployment-profiles/*`; future `packages/contracts-providers/*` | `V-TYPE`; `V-DOCS` | Must define allowed providers, region lock, retention policy, support-access mode, analytics mode, recording mode, and branding/deployment overlay hooks. |
| `DTA-004` | `B` | 3 | `P0` | `PENDING` | `DTA-003` | Extract backend/session/media/storage seams around Convex so voice state, auth, and retained media can be re-bound per tier | `src/hooks/use-auth.tsx`; `src/components/providers/convex-provider.tsx`; `convex/auth.ts`; `convex/organizationMedia.ts`; `convex/ai/mediaRetention.ts`; future `packages/contracts-runtime/*` | `V-TYPE`; `V-INTEG`; `V-DOCS` | Scope is contract-first. Do not replace all Convex CRUD at once; isolate the hot path and sensitive state first. |
| `DTA-005` | `B` | 3 | `P0` | `PENDING` | `DTA-003` | Remove transcript content from operational logs and add tier-specific observability/redaction policy for voice/runtime paths | `convex/ai/voiceRuntime.ts`; `apps/voice-ws-gateway/src/server.mjs`; `src/components/providers/posthog-provider.tsx`; future observability contracts | `V-TYPE`; `V-UNIT`; `V-GATEWAY`; `V-DOCS` | Fail closed for `Sovereign`; `Dedicated-EU` must keep hot-path logs inside EEA and transcript-free unless explicitly enabled. |
| `DTA-006` | `C` | 4 | `P0` | `PENDING` | `DTA-003` | Remove client-held AI vendor keys from mobile and route all ASR/TTS/LLM activity through server-approved providers only | `apps/operator-mobile/src/config/env.ts`; `apps/operator-mobile/src/services/transcription.ts`; `apps/operator-mobile/src/lib/voice/*`; server-side voice/AI ingress | `V-MOBILE-TYPE`; `V-TYPE`; `V-INTEG` | This is a hard prerequisite for any credible Dedicated-EU or Sovereign story. |
| `DTA-007` | `C` | 4 | `P0` | `PENDING` | `DTA-003` | Remove automatic OpenRouter fallback on the live path and enforce explicit LLM binding per deployment profile | `convex/ai/chat.ts`; `convex/ai/agentExecution.ts`; `convex/ai/chatRuntimeOrchestration.ts`; `convex/ai/agentSessions.ts`; `convex/ai/modelAdapters.ts` | `V-TYPE`; `V-UNIT`; `V-INTEG` | OpenRouter may remain for non-sensitive tooling later, but not as an implicit live-call fallback. |
| `DTA-008` | `C` | 5 | `P0` | `PENDING` | `DTA-006`, `DTA-007` | Extract explicit telephony, voice-session, ASR, and TTS contracts so the live stack is not structurally ElevenLabs-only | `convex/ai/voiceRuntimeAdapter.ts`; `convex/ai/voiceRuntime.ts`; `convex/api/v1/aiChat.ts`; `apps/voice-ws-gateway/src/server.mjs`; `convex/channels/*` | `V-TYPE`; `V-INTEG`; `V-GATEWAY`; `V-DOCS` | First success condition is additive: new provider slots and policy gating, not immediate vendor replacement everywhere. |
| `DTA-009` | `D` | 5 | `P1` | `PENDING` | `DTA-003` | Add tier-aware adapters for analytics, email, payments, and deployment publishing so non-hot-path services are selectable per profile | `src/components/providers/posthog-provider.tsx`; `convex/emailService.ts`; `src/app/api/auth/project-drawer/route.ts`; `convex/stripe/*`; `src/lib/payment-providers/*`; `convex/api/v1/externalDomains.ts`; `convex/actions/mux.ts` | `V-TYPE`; `V-UNIT`; `V-DOCS` | `Cloud` can keep managed providers; `Dedicated-EU` and `Sovereign` need explicit alternatives, disable modes, or customer-owned bindings. |
| `DTA-010` | `D` | 5 | `P1` | `PENDING` | `DTA-003`, `DTA-009` | Implement branding and deployment overlays so white-labeling and customer-specific delivery happen by config, not code forks or branches | future `packages/branding/*`; future `packages/deployment-profiles/*`; app composition entrypoints; workstream docs | `V-TYPE`; `V-DOCS` | Overlay payload must cover theme tokens, logos, copy pack, domain map, legal profile, provider bindings, and feature gates. |
| `DTA-011` | `E` | 6 | `P0` | `PENDING` | `DTA-004`, `DTA-005`, `DTA-006`, `DTA-007`, `DTA-008`, `DTA-010` | Validate a `Dedicated-EU` reference stack end-to-end with EEA-only hot path, transcript-free logs, and policy-enforced provider choices | workstream docs; deployment config; validation scripts; voice gateway config; runtime/provider bindings | `V-TYPE`; `V-INTEG`; `V-GATEWAY`; `V-DOCS` | Must prove live call ingress, ASR/TTS/LLM routing, storage, and logs all stay inside the intended EEA boundary. |
| `DTA-012` | `E` | 6 | `P0` | `PENDING` | `DTA-004`, `DTA-005`, `DTA-006`, `DTA-007`, `DTA-008`, `DTA-010` | Build a constrained `Sovereign Preview` profile and reference demo on customer-controlled or tightly isolated infra | workstream docs; deployment profile; validation checklist; sovereign runbook | `V-TYPE`; `V-INTEG`; `V-GATEWAY`; `V-DOCS` | Scope is intentionally reduced: no implicit SaaS analytics, no self-serve Stripe, no Resend dependency, recordings off by default, manual support access. |
| `DTA-013` | `E` | 6 | `P1` | `PENDING` | `DTA-011`, `DTA-012` | Publish final readiness packet: quoting guardrails, acceptance matrix, rollback rules, and sales/ops positioning for all three tiers | `/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/deployment-tier-architecture/*` | `V-DOCS` | Closeout requires explicit statements for what is sellable now, what is preview-only, and what is not promised. |
| `DTA-014` | `A` | 2 | `P0` | `DONE` | `DTA-001`, `DTA-002` | Publish the platform-managed provider control-plane plan for `Twilio`, `ElevenLabs`, and `Infobip` inside the deployment-tier workstream | `/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/deployment-tier-architecture/PROVIDER_CONTROL_PLANE_IMPLEMENTATION_PLAN.md`; `/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/deployment-tier-architecture/MASTER_PLAN.md`; `/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/deployment-tier-architecture/INDEX.md` | `V-DOCS` | Done 2026-03-13: provider control-plane model published with roles for telephony ingress, voice-runtime mirrors, and deployment-aware messaging. |
| `DTA-015` | `B` | 3 | `P0` | `PENDING` | `DTA-003`, `DTA-014` | Define canonical provider-control-plane contracts for deployment profile, provider connection, channel binding, route policy, and provider mirrors across `Twilio`, `ElevenLabs`, and `Infobip` | future `packages/deployment-profiles/*`; future `packages/contracts-providers/*`; `convex/channels/*`; `convex/integrations/*`; admin surfaces under `src/components/window-content/integrations-window/*` | `V-TYPE`; `V-DOCS` | Must lock platform-managed vs BYOK vs private credential policy, route identity semantics, and tier-level provider eligibility before provider-specific implementation begins. |
| `DTA-016` | `C` | 4 | `P0` | `PENDING` | `DTA-008`, `DTA-015` | Implement `Twilio` as a platform-managed telephony front door with number inventory, webhook configuration, inbound route binding, and agent-router entry policy | `convex/channels/*`; `convex/http.ts`; `src/components/window-content/integrations-window/*`; future `packages/providers-telephony/*` | `V-TYPE`; `V-INTEG`; `V-GATEWAY`; `V-DOCS` | Success means one public number can bind to our route policy and agent runtime without treating Twilio resources as the canonical agent model. |
| `DTA-017` | `C` | 4 | `P0` | `PENDING` | `DTA-008`, `DTA-015` | Implement `ElevenLabs` as a platform-managed runtime mirror with server-side sync for prompt, voice, knowledge, telephony binding metadata, and webhook outcomes | `convex/integrations/elevenlabs.ts`; `convex/ai/voiceRuntime*`; `convex/channels/*`; `src/components/window-content/integrations-window/*`; future `packages/providers-asr/*`; future `packages/providers-tts/*` | `V-TYPE`; `V-INTEG`; `V-GATEWAY`; `V-DOCS` | Our internal agent stays canonical. Provider-side execution objects are mirrors or bindings that can be recreated or replaced without changing business-agent identity. |
| `DTA-018` | `D` | 5 | `P1` | `PENDING` | `DTA-015` | Implement `Infobip` as a platform-managed SMS/WhatsApp provider with sender binding, deployment-profile policy, and explicit fallback, disable, and manual modes | `convex/integrations/infobip.ts`; `convex/channels/providers/infobipProvider.ts`; `src/components/window-content/integrations-window/infobip-settings.tsx`; future `packages/contracts-providers/*` | `V-TYPE`; `V-UNIT`; `V-DOCS` | Phase 1 is messaging-first. Voice parity is not required to complete this task. |
| `DTA-019` | `E` | 6 | `P0` | `PENDING` | `DTA-016`, `DTA-017`, `DTA-018` | Validate provider switching across deployment tiers and publish the rollout and readiness packet for platform-managed `Twilio`, `ElevenLabs`, and `Infobip` | `/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/deployment-tier-architecture/*`; deployment config; validation scripts | `V-TYPE`; `V-INTEG`; `V-GATEWAY`; `V-DOCS` | Must prove provider choice is now a deployment decision rather than a product fork, with explicit statements for Cloud, Dedicated-EU, and Sovereign Preview. |

---

## Current kickoff

- Active promotable task: `DTA-003`.
- Lane `B` starts first.
- `DTA-015` becomes the next provider-control-plane gate after `DTA-003`.
- Lanes `C` and `D` may begin after `DTA-015` is `DONE`, with `DTA-016` and `DTA-017` sequenced unless file ownership is clearly split.
