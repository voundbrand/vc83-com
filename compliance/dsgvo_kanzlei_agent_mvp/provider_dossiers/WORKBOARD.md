# Provider Contract Workboard

Stand: 2026-03-27

Purpose: deterministic execution board for provider-by-provider AVV/DPA closure.

## Execution order

1. convex
2. stripe
3. resend
4. openrouter
5. openai_direct
6. twilio
7. mux
8. radar
9. posthog
10. vercel_analytics

## Status values

`todo` -> `collecting` -> `ready_for_upload` -> `uploaded` -> `linked` -> `decision_updated`

## Providers

| Provider | Checklist | Status | Next missing artifact |
|---|---|---|---|
| convex | `/Users/foundbrand_001/Development/vc83-com/compliance/dsgvo_kanzlei_agent_mvp/provider_dossiers/convex/CHECKLIST.md` | `collecting` | Account acceptance proof + intake screenshot |
| stripe | `/Users/foundbrand_001/Development/vc83-com/compliance/dsgvo_kanzlei_agent_mvp/provider_dossiers/stripe/CHECKLIST.md` | `collecting` | Account acceptance proof + transfer/TOM proof |
| resend | `/Users/foundbrand_001/Development/vc83-com/compliance/dsgvo_kanzlei_agent_mvp/provider_dossiers/resend/CHECKLIST.md` | `collecting` | Account acceptance proof + transfer/TOM proof |
| openrouter | `/Users/foundbrand_001/Development/vc83-com/compliance/dsgvo_kanzlei_agent_mvp/provider_dossiers/openrouter/CHECKLIST.md` | `collecting` | Direct DPA artifact/support confirmation + intake proof |
| openai_direct | `/Users/foundbrand_001/Development/vc83-com/compliance/dsgvo_kanzlei_agent_mvp/provider_dossiers/openai_direct/CHECKLIST.md` | `collecting` | Account-level applicability/acceptance proof + TOM evidence |
| twilio | `/Users/foundbrand_001/Development/vc83-com/compliance/dsgvo_kanzlei_agent_mvp/provider_dossiers/twilio/CHECKLIST.md` | `collecting` | Account acceptance proof + transfer evidence |
| mux | `/Users/foundbrand_001/Development/vc83-com/compliance/dsgvo_kanzlei_agent_mvp/provider_dossiers/mux/CHECKLIST.md` | `collecting` | Account acceptance proof + subprocessors/transfer evidence |
| radar | `/Users/foundbrand_001/Development/vc83-com/compliance/dsgvo_kanzlei_agent_mvp/provider_dossiers/radar/CHECKLIST.md` | `collecting` | Account acceptance proof + subprocessor/transfer evidence |
| posthog | `/Users/foundbrand_001/Development/vc83-com/compliance/dsgvo_kanzlei_agent_mvp/provider_dossiers/posthog/CHECKLIST.md` | `collecting` | Account acceptance proof + transfer evidence |
| vercel_analytics | `/Users/foundbrand_001/Development/vc83-com/compliance/dsgvo_kanzlei_agent_mvp/provider_dossiers/vercel_analytics/CHECKLIST.md` | `collecting` | Scope confirmation + account acceptance proof |

## Completion rule

Do not set any provider to `decision_updated` until all closure package items in the provider checklist are complete and linked in Compliance Evidence Vault.
