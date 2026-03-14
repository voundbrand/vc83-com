# Provider + Runtime Seam Map

**Date:** 2026-03-13  
**Workstream root:** `/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/deployment-tier-architecture`

---

## Purpose

Lock the extraction order for the provider and runtime boundaries required to support:

1. `Cloud`
2. `Dedicated-EU`
3. `Sovereign Preview`

This seam map is intentionally biased toward the live voice path first.

---

## Design rules

1. Deployment profile selects providers and policy. App code does not branch per customer.
2. All AI provider credentials stay server-side only.
3. Hot-path logs must be transcript-free by default.
4. `Sovereign Preview` may disable features rather than simulate unsafe parity.
5. Contracts come before implementation swaps.
6. The current Convex-based runtime remains the initial binding until each seam exists.

---

## Seam inventory

| Seam ID | Priority | Domain | Current owner/files | Current coupling | Contract to introduce | Cloud binding | Dedicated-EU binding | Sovereign Preview binding |
|---|---:|---|---|---|---|---|---|---|
| `DTA-S01` | 1 | Tier policy + provider allowlist | `src/app/providers.tsx`; `convex/ai/chat.ts`; `convex/ai/modelAdapters.ts`; `convex/ai/voiceRuntimeAdapter.ts` | Provider choice is scattered and fallback-friendly | `DeploymentProfile`; `ProviderPolicy`; `ComplianceMode` | Managed providers allowed | EEA-constrained providers only | Self-hosted or explicitly approved providers only |
| `DTA-S02` | 2 | App backend access boundary | widespread `useQuery/useMutation/useAction`; `generatedApi.*` | UI directly depends on Convex-generated APIs | `AppRuntimeGateway`; `DomainRepositories` | Convex binding | Convex EU or isolated runtime binding | self-hosted runtime binding |
| `DTA-S03` | 3 | Session/auth store | `src/hooks/use-auth.tsx`; `convex/auth.ts` | Sessions are issued, stored, and queried in Convex | `SessionStore`; `AuthGateway`; `SupportAccessPolicy` | current custom auth on Convex | same auth logic on EEA-hosted backend | self-hosted auth/session backend |
| `DTA-S04` | 4 | Blob/media storage | `convex/organizationMedia.ts`; `convex/ai/mediaRetention.ts` | App media and retained voice payloads use Convex storage directly | `ObjectStore`; `RetentionStore`; `SignedUploadGateway` | Convex storage | EEA object storage | customer object storage |
| `DTA-S05` | 5 | Voice session control plane | `convex/ai/voiceRuntime.ts`; `apps/voice-ws-gateway/src/server.mjs` | Voice session open/transcribe/relay depends on Convex HTTP APIs | `VoiceSessionGateway`; `RealtimeTransportGateway` | current Convex + EU gateway | EEA-hosted gateway + EEA runtime | self-hosted gateway + runtime |
| `DTA-S06` | 6 | Telephony | `convex/channels/*`; `convex/http.ts` | Best existing seam, but results still terminate in Convex | `TelephonyProvider`; `InboundCallEvent`; `CallOutcomeSink` | managed telephony integration | EEA SIP/carrier binding | customer PBX/SIP binding |
| `DTA-S07` | 7 | ASR | `convex/ai/voiceRuntimeAdapter.ts`; `apps/operator-mobile/src/services/transcription.ts` | Server path is ElevenLabs-shaped; mobile directly calls vendors | `AsrProvider`; `TranscriptionPolicy` | managed speech provider | region-locked speech provider | self-hosted ASR |
| `DTA-S08` | 8 | TTS | `convex/ai/voiceRuntimeAdapter.ts`; `convex/api/v1/aiChat.ts` | ElevenLabs is first-class assumption | `TtsProvider`; `SynthesisPolicy`; `VoiceCatalogGateway` | managed speech provider | region-locked speech provider | self-hosted TTS |
| `DTA-S09` | 9 | LLM router | `convex/ai/chat.ts`; `convex/ai/agentExecution.ts`; `convex/ai/chatRuntimeOrchestration.ts`; `convex/ai/openrouter.ts` | Implicit OpenRouter fallback breaks policy control | `LlmProvider`; `LlmRouter`; `ProviderFailoverPolicy` | direct managed LLMs | direct region-locked LLMs | self-hosted or approved OpenAI-compatible LLMs |
| `DTA-S10` | 10 | Observability/logging | `src/components/providers/posthog-provider.tsx`; `convex/ai/voiceRuntime.ts`; `apps/voice-ws-gateway/src/server.mjs` | Transcript excerpts and vendor-native logs are mixed into operations | `TelemetrySink`; `AuditLogSink`; `RedactionPolicy` | PostHog + host logs | EEA telemetry / self-hosted logs | self-hosted logs/metrics only |
| `DTA-S11` | 11 | Email | `convex/emailService.ts`; `src/app/api/auth/project-drawer/route.ts` | Resend is hard-wired | `EmailProvider`; `TransactionalMailPolicy` | Resend | EU relay or customer SMTP | customer SMTP or disabled/manual |
| `DTA-S12` | 12 | Payments | `convex/stripe/*`; `src/lib/payment-providers/*`; `src/app/api/stripe/*` | Stripe dominates backend and routes | `PaymentProvider`; `BillingPolicy`; `ManualInvoiceMode` | Stripe | Stripe or local PSP, depending policy | manual invoice or customer PSP |
| `DTA-S13` | 13 | Publishing/deployment plane | `convex/api/v1/externalDomains.ts`; `convex/oauth/vercel.ts`; `convex/actions/mux.ts` | Vercel and Mux assumptions are embedded in delivery workflows | `DeploymentPublisher`; `DomainProvisioner`; `VideoProvider`; `DeploymentOverlay` | managed cloud delivery | EEA-hosted delivery | self-hosted delivery, likely reduced publishing surface |

---

## Extraction order

### Phase 1: control policy before provider swaps

1. `DTA-S01` tier policy + provider allowlists
2. `DTA-S02` app backend boundary
3. `DTA-S03` session/auth store
4. `DTA-S04` blob/media storage

### Phase 2: make the voice hot path honest

1. `DTA-S10` observability redaction
2. `DTA-S07` ASR
3. `DTA-S09` LLM router
4. `DTA-S08` TTS
5. `DTA-S05` voice session control plane
6. `DTA-S06` telephony

### Phase 3: clean non-hot-path variance

1. `DTA-S11` email
2. `DTA-S12` payments
3. `DTA-S13` publishing/deployment

---

## Provider Control-Plane Mapping

Use this section when translating seam work into provider-specific implementation tasks.

| Provider | Role in platform model | Primary seams | Key architectural rule |
|---|---|---|---|
| `Twilio` | telephony ingress/egress and public number inventory | `DTA-S01`, `DTA-S05`, `DTA-S06` | phone numbers are route-bound ingress surfaces, not canonical agent identities |
| `ElevenLabs` | speech runtime and provider-side execution mirror | `DTA-S01`, `DTA-S05`, `DTA-S07`, `DTA-S08` | provider-side agent objects must remain mirrors of internal agent state |
| `Infobip` | SMS/WhatsApp delivery and messaging fallback path | `DTA-S01`, `DTA-S06`, `DTA-S11` | channel delivery must stay swappable by deployment profile and fallback policy |

### Interpretation rule

When a customer-facing resource exists at the provider layer:

1. bind it to a `ChannelProviderBinding`,
2. attach it to a `RoutePolicy`,
3. keep orchestration authority inside the internal agent runtime.

---

## First package targets

| Package | Owns | First consumers |
|---|---|---|
| `packages/deployment-profiles` | tier schema, provider allowlists, region lock, support-access mode, recording mode | web app, mobile app, voice gateway |
| `packages/contracts-runtime` | app backend, session store, object store, voice session gateway | web app, mobile app |
| `packages/contracts-providers` | telephony, ASR, TTS, LLM, email, analytics, payments | runtime adapters |
| `packages/providers-llm` | direct LLM bindings and failover policy | AI runtime |
| `packages/providers-asr` | managed and self-hosted ASR bindings | voice runtime, gateway |
| `packages/providers-tts` | managed and self-hosted TTS bindings | voice runtime |
| `packages/providers-telephony` | SIP/direct/provider-specific telephony bindings | call ingress/egress |
| `packages/observability` | redaction policy and sink interfaces | runtime, gateway, admin tooling |
| `packages/branding` | theme tokens, logo/copy packs, domain overlays | web app, landing app |

---

## Immediate no-go assumptions to remove

1. `EXPO_PUBLIC_*` AI keys on mobile.
2. OpenRouter as an implicit live-path fallback.
3. ElevenLabs as the only first-class server speech provider.
4. Convex storage as the only retained-media store.
5. Transcript text in operational logs.
6. Vercel publishing as the implicit deployment model.

---

## Acceptance tests per seam

1. `DTA-S01`: app boots with a deployment profile that blocks forbidden providers.
2. `DTA-S02`: app runtime can resolve through a contract boundary without direct UI dependency on provider internals.
3. `DTA-S03`: session issuance and validation work without raw Convex-specific assumptions at the UI edge.
4. `DTA-S04`: retained voice payloads can target a non-Convex object store.
5. `DTA-S05`: voice gateway can validate and route without being a thin Convex-only relay.
6. `DTA-S06`: telephony ingress/egress can bind to a non-Eleven route.
7. `DTA-S07`: ASR path runs entirely server-side under deployment policy.
8. `DTA-S08`: TTS path can resolve a non-Eleven provider or a self-hosted binding.
9. `DTA-S09`: LLM path rejects disallowed providers and never silently falls back.
10. `DTA-S10`: transcript text is absent from operational logs by default.
11. `DTA-S11`..`DTA-S13`: non-hot-path services can be switched, disabled, or made manual by profile.
