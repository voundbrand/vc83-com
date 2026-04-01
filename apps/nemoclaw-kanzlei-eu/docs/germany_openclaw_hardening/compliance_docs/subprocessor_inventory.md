# Pilot-Wide Subprocessor Inventory (Germany-First)

Snapshot date: 2026-03-27
Default policy: no new subprocessor is allowed unless documented here with legal basis and evidence linkage.

## Current decision status

| Function | Tool/provider decision | Hosting/residency target | Subprocessor status | Evidence linkage |
|---|---|---|---|---|
| Core infrastructure | Hetzner | Germany (dedicated hosting) | Approved | `E-LGL-001`, `E-LGL-002`, `E-LGL-003` |
| Object storage/evidence files | Hetzner-hosted storage path | Germany | Approved (under Hetzner) | `E-LGL-001..003` |
| Backups | Hetzner-hosted backup target only | Germany | Approved (under Hetzner) | Backup evidence pending in `NCLAW-010` |
| System monitoring/logging | Self-hosted stack on Hetzner (no SaaS monitor approved) | Germany | No additional processor approved | Runtime evidence pending |
| Incident tracking/ticketing | Local/manual docs workflow (no external SaaS yet) | Germany/local | No additional processor approved | `incident_contact_matrix.md` |
| Transactional email | Not yet approved | Must be Germany/EU with AVV before activation | Blocked until chosen | Future `E-LGL-*` entry required |
| LLM/model inference gateway | OpenRouter Enterprise EU routing + BYOK (MVP) | EU endpoint (`eu.openrouter.ai`) with Germany-hosted app/data plane | Conditionally approved for EU-MVP (evidence pending) | `eu_openapi_setup_runbook.md`; DPA/AVV + subprocessor evidence pending |
| LLM/model upstream provider (via BYOK) | Not yet finalized (EU-only shortlist) | EU region only | Blocked until chosen | Provider legal packet required before go-live |
| Voice runtime provider | ElevenLabs Enterprise EU (planned) | EU residency mode | Conditionally approved for EU-MVP (evidence pending) | Enterprise DPA/AVV + retention configuration proof pending |
| Analytics/session replay | Not approved for pilot start | Germany-only if introduced | Blocked | Future legal review required |

## Compliance gate rule for this inventory

1. If a function is `Blocked until chosen`, production use is not allowed.
2. Any external SaaS addition requires: AVV/DPA, subprocessor list, TOM evidence, transfer basis decision.
3. If transfer basis is unclear, gate remains `NO_GO`.

## Immediate next decisions (step-by-step)

1. Decide transactional email strategy: self-hosted SMTP on Hetzner vs external EU/Germany provider.
2. Finalize BYOK upstream inference provider for OpenRouter EU routing path.
3. Collect OpenRouter + ElevenLabs DPA/AVV and subprocessor evidence files.
4. Keep everything else self-hosted on Hetzner for pilot phase to minimize subprocessors.
