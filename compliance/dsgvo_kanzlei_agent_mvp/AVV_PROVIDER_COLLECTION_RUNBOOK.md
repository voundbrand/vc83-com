# AVV Provider Collection Runbook

Stand: 2026-03-27

Purpose: one operational checklist to collect provider AVV/DPA evidence, stage it locally, and then register/link it in Compliance Center.

## Canonical source docs

1. `/Users/foundbrand_001/Development/vc83-com/compliance/dsgvo_kanzlei_agent_mvp/AVV_62A_CHECKLIST.md`
2. `/Users/foundbrand_001/Development/vc83-com/compliance/dsgvo_kanzlei_agent_mvp/PROVIDER_DECISION_EVIDENCE.md`
3. `/Users/foundbrand_001/Development/vc83-com/compliance/dsgvo_kanzlei_agent_mvp/SUBPROCESSOR_TRANSFER_MATRIX.md`
4. `/Users/foundbrand_001/Development/vc83-com/compliance/dsgvo_kanzlei_agent_mvp/TRANSFER_IMPACT_REGISTER.md`
5. `/Users/foundbrand_001/Development/vc83-com/compliance/dsgvo_kanzlei_agent_mvp/TOM_CONTROL_MATRIX.md`

## Operator flow (UI + local staging)

1. Open Compliance Center.
2. If you are super-admin and need write access, switch to `Platform mode` in the scope switcher.
3. Inbox tab: select the `R-002` action and complete the AVV wizard to create/update provider dossier.
4. Download provider artifacts (AVV/DPA, subprocessors, transfer docs, TOM/security docs, portal proof).
5. Save artifacts under local staging folder:
   - `/Users/foundbrand_001/Development/vc83-com/compliance/dsgvo_kanzlei_agent_mvp/provider_dossiers/<provider>/`
6. Evidence Vault tab: upload each artifact with metadata:
   - `Type`: `AVV provider`
   - `Source`: `Provider response` (or `Org uploaded` for internal legal memo)
   - `Risk links`: `R-002` (add `R-003` when transfer evidence is included)
   - `Provider name`: exact provider label
   - If this is platform compliance evidence for all customer orgs: enable `Publish as platform-shared`
7. AVV Outreach panel: link uploaded evidence to the provider dossier and move state forward.
8. Update provider decision docs (`AVV_62A_CHECKLIST.md`, `PROVIDER_DECISION_EVIDENCE.md`) only after evidence is complete.

## Required evidence bundle per provider

Minimum set before provider can move from `abgelehnt` to review-ready:

1. Signed or accepted AVV/DPA artifact.
2. Current subprocessor list artifact.
3. Transfer mechanism evidence (SCC/DPF/TIA path where applicable).
4. TOM/security evidence artifact.
5. Intake proof (portal screenshot, email acceptance, or ticket confirmation).

## Provider workboard

Status values: `todo`, `collecting`, `ready_for_upload`, `uploaded`, `linked`, `decision_updated`.

| Provider | Current baseline decision | Local intake folder | Work status | Missing closure package |
|---|---|---|---|---|
| Convex | `abgelehnt` | `/Users/foundbrand_001/Development/vc83-com/compliance/dsgvo_kanzlei_agent_mvp/provider_dossiers/convex/` | `todo` | Signed AVV/DPA + transfer basis + TOM mapping |
| Stripe | `abgelehnt` | `/Users/foundbrand_001/Development/vc83-com/compliance/dsgvo_kanzlei_agent_mvp/provider_dossiers/stripe/` | `todo` | Signed AVV/DPA + subprocessors + transfer mechanism |
| Resend | `abgelehnt` | `/Users/foundbrand_001/Development/vc83-com/compliance/dsgvo_kanzlei_agent_mvp/provider_dossiers/resend/` | `todo` | Signed AVV/DPA + region + deletion/incident proof |
| OpenRouter | `abgelehnt` | `/Users/foundbrand_001/Development/vc83-com/compliance/dsgvo_kanzlei_agent_mvp/provider_dossiers/openrouter/` | `todo` | DPA/ToS + training exclusion + transfer/TOM proof |
| OpenAI (direct paths) | `abgelehnt` | `/Users/foundbrand_001/Development/vc83-com/compliance/dsgvo_kanzlei_agent_mvp/provider_dossiers/openai_direct/` | `todo` | AVV/DPA + transfer mechanism + TOM proof |
| Twilio (feature-dependent) | `abgelehnt` | `/Users/foundbrand_001/Development/vc83-com/compliance/dsgvo_kanzlei_agent_mvp/provider_dossiers/twilio/` | `todo` | AVV/DPA + region + transfer + incident proof |
| Mux (feature-dependent) | `abgelehnt` | `/Users/foundbrand_001/Development/vc83-com/compliance/dsgvo_kanzlei_agent_mvp/provider_dossiers/mux/` | `todo` | AVV/DPA + subprocessors + transfer proof |
| Radar (feature-dependent) | `abgelehnt` | `/Users/foundbrand_001/Development/vc83-com/compliance/dsgvo_kanzlei_agent_mvp/provider_dossiers/radar/` | `todo` | AVV/DPA + transfer proof + TOM evidence |
| PostHog | `abgelehnt` | `/Users/foundbrand_001/Development/vc83-com/compliance/dsgvo_kanzlei_agent_mvp/provider_dossiers/posthog/` | `todo` | AVV/DPA + region + retention/transfer proof |
| Vercel Analytics (app-specific) | `abgelehnt` | `/Users/foundbrand_001/Development/vc83-com/compliance/dsgvo_kanzlei_agent_mvp/provider_dossiers/vercel_analytics/` | `todo` | scope confirmation + AVV/DPA + transfer + TOM proof |

## Chat collaboration protocol

For each provider, send this in chat and we iterate live:

- `Provider: <name>`
- `Downloaded: <artifact filenames>`
- `Stored at: <local folder path>`
- `Need next: <what is missing>`

I will then give you the exact next step for that provider (what to fetch next, what to upload in Vault, and which dossier state transition to run).

## Compliance note

This runbook is an operational aid and does not replace legal advice.
