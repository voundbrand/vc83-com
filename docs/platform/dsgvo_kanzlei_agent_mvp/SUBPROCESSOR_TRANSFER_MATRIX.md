# Subprocessor and Transfer Matrix (KAMVP-007)

Stand: 2026-03-24  
Status: Arbeitsentwurf fuer providerbasierte Freigabe in `KAMVP-008`/`KAMVP-009`

## Scope and method

Diese Matrix fuehrt nur Dienste auf, die in der Codebasis technisch nachweisbar sind.
Jeder Eintrag braucht vor Produktionsfreigabe:

1. AVV/DPA-Nachweis,
2. Transfergrundlage (falls Drittland),
3. benannte Owner-Rolle,
4. Review-Datum.

## Matrix

| Provider | Category | Runtime evidence (repo) | Processing purpose | Typical data categories | Region/transfer path | Transfer basis status | AVV/DPA status | Owner | Next review | Decision status |
|---|---|---|---|---|---|---|---|---|---|---|
| Convex | Backend/DB | `convex/*`, `src/components/providers/convex-provider.tsx`, `NEXT_PUBLIC_CONVEX_URL` usage | App backend, data persistence, queries/mutations | Account, org, workflow, content, logs | `convex.cloud` / `convex.site` endpoints | `unknown` | `unknown` | Engineering + Datenschutz | 2026-04-24 | `pending_review` |
| Stripe | Payments | `convex/stripe*`, `convex/paymentProviders/stripe.ts`, `src/components/checkout/*` | Checkout, subscriptions, invoicing, webhooks | Billing, transaction metadata, customer identifiers | Provider-specific (potential non-EEA paths) | `unknown` | `unknown` | Finance/Ops + Legal | 2026-04-24 | `pending_review` |
| Resend | Email delivery | `convex/emailService.ts`, `convex/emailDelivery.ts`, `apps/*/api/*/route.ts` | Transactional and notification emails | Email addresses, message payload, delivery metadata | Provider-specific (potential non-EEA paths) | `unknown` | `unknown` | Ops + Legal | 2026-04-24 | `pending_review` |
| OpenRouter | AI inference routing | `convex/ai/chat.ts`, `convex/ai/agentExecution.ts`, `convex/ai/openrouter.ts` | LLM inference for agent/chat/runtime tasks | Prompt/context content, model outputs, telemetry metadata | Provider-specific (potential non-EEA paths) | `unknown` | `unknown` | AI Platform + Datenschutz | 2026-04-24 | `pending_review` |
| OpenAI (direct usage paths) | AI inference | `convex/designEngine.ts`, `convex/ai/tools/shared/transcribeMediaAudio.ts` | Image/text/audio AI features in selected paths | Prompt/media content, outputs, technical metadata | Provider-specific (potential non-EEA paths) | `unknown` | `unknown` | AI Platform + Datenschutz | 2026-04-24 | `pending_review` |
| Twilio (feature-dependent) | Telephony/SMS | `apps/one-of-one-landing/app/api/lead-capture/*`, `convex/agentOntology.ts` | OTP verification and telephony features | Phone numbers, verification events, call/SMS metadata | Provider-specific (potential non-EEA paths) | `unknown` | `unknown` | Product + Datenschutz | 2026-04-24 | `pending_review` |
| Mux (feature-dependent) | Media/video | `convex/http.ts` (`MUX_WEBHOOK_SECRET`), package deps `@mux/*` | Media ingestion, playback/webhook state | Media metadata, processing/webhook payloads | Provider-specific (potential non-EEA paths) | `unknown` | `unknown` | Product + Security | 2026-04-24 | `pending_review` |
| Radar (feature-dependent) | Address/maps | `convex/addressValidation.ts`, `src/components/ui/radar-map.tsx` | Address validation and map experiences | Address/location query data | Provider-specific (potential non-EEA paths) | `unknown` | `unknown` | Product + Datenschutz | 2026-04-24 | `pending_review` |
| PostHog | Analytics | `src/components/cookie-consent-banner.tsx`, `src/components/providers/posthog-provider.tsx` | Product analytics (consent-gated) | Usage events, client metadata | Endpoint/region to be confirmed | `unknown` | `unknown` | Product Analytics + Datenschutz | 2026-04-24 | `pending_review` |
| Vercel Analytics (app-specific) | Analytics/hosting telemetry | `apps/segelschule-altwarp/app/layout.tsx` (`@vercel/analytics/next`) | Web analytics for specific app surfaces | Page interaction metadata | Provider-specific (potential non-EEA paths) | `unknown` | `unknown` | App owner + Datenschutz | 2026-04-24 | `pending_review` |

## Notes per scope

1. `feature-dependent` entries are only relevant if that feature is enabled in production.
2. `unknown` means legal/contract evidence is not yet linked in this workstream.
3. This matrix does not replace provider-level legal review; it is the intake sheet for `AVV_62A_CHECKLIST.md`.

## Required next actions

1. For each row, link DPA/AVV evidence and set `Decision status` to `freigegeben` or `abgelehnt` in `KAMVP-008`.
2. For each non-EEA path, record transfer mechanism and residual risk in `TRANSFER_IMPACT_REGISTER.md` (`KAMVP-009`).
3. Reconcile row set with actual enabled production features before go-live.

## Open items

1. `TODO-KAMVP-007-001`: Confirm production hosting and region topology per environment.
2. `TODO-KAMVP-007-002`: Confirm if `OpenAI (direct usage paths)` is active in production or only fallback.
3. `TODO-KAMVP-007-003`: Confirm if `Vercel Analytics` applies to Kanzlei-agent scope or only to side apps.
4. `TODO-KAMVP-007-004`: Add formal DPA links and signed-date references per provider.
